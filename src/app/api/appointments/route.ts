import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notifyAppointmentCreated, countPendingAppointmentsToday } from "@/lib/notifications/appointment-created";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const APPOINTMENT_SELECT = `
  id, detected_date, detected_time, location, status, ai_confidence, notes,
  lead_id, seller_id,
  leads(name, phone),
  users(name)
`;

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function resolveSellerId(
  admin: ReturnType<typeof createServiceRoleClient>,
  companyId: string,
  sellerUserId: string | undefined,
  fallbackUserId: string
): Promise<string | null> {
  const target = sellerUserId?.trim() || fallbackUserId;
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", target)
    .maybeSingle();
  if (!profile?.user_id) return null;
  const { data: userRow } = await admin.from("users").select("id").eq("id", profile.user_id).maybeSingle();
  return userRow?.id ?? profile.user_id;
}

async function resolveLeadIdsByPhone(
  admin: ReturnType<typeof createServiceRoleClient>,
  companyId: string,
  phone: string
): Promise<string[]> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];

  const { data: leads } = await admin
    .from("leads")
    .select("id, phone")
    .eq("company_id", companyId);

  return (leads ?? [])
    .filter((l: { id: string; phone: string | null }) => {
      const leadDigits = (l.phone ?? "").replace(/\D/g, "");
      return leadDigits === digits || leadDigits.endsWith(digits) || digits.endsWith(leadDigits);
    })
    .map((l: { id: string }) => l.id);
}

export async function GET(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewErr = await requirePermission(companyId, PERMISSIONS.calendar.view);
  if (viewErr) return NextResponse.json({ error: viewErr.error }, { status: viewErr.status });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const phone = searchParams.get("phone");
  const leadId = searchParams.get("lead_id");
  const today = searchParams.get("today");

  const admin = createServiceRoleClient();

  if (today === "1") {
    const count = await countPendingAppointmentsToday(admin, companyId);
    return NextResponse.json({ count });
  }

  let query = admin
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("company_id", companyId)
    .order("detected_date", { ascending: true })
    .order("detected_time", { ascending: true });

  if (leadId) {
    query = query.eq("lead_id", leadId);
  } else if (phone) {
    const leadIds = await resolveLeadIdsByPhone(admin, companyId, phone);
    if (leadIds.length === 0) {
      return NextResponse.json({ appointments: [] });
    }
    query = query.in("lead_id", leadIds);
  }

  if (month) {
    const [year, m] = month.split("-");
    if (year && m) {
      const start = `${year}-${m}-01`;
      const lastDay = new Date(parseInt(year, 10), parseInt(m, 10), 0).getDate();
      const end = `${year}-${m}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("detected_date", start).lte("detected_date", end);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const manageErr = await requirePermission(companyId, PERMISSIONS.calendar.manage);
  if (manageErr) return NextResponse.json({ error: manageErr.error }, { status: manageErr.status });

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    clientName?: string;
    clientPhone?: string;
    lead_id?: string;
    detected_date?: string;
    detected_time?: string;
    location?: string;
    notes?: string;
    seller_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const clientPhone = typeof body.clientPhone === "string" ? body.clientPhone.trim() : "";
  const detected_date = typeof body.detected_date === "string" ? body.detected_date.trim() : "";
  const providedLeadId = typeof body.lead_id === "string" ? body.lead_id.trim() : "";

  if (!detected_date) {
    return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const sellerId = await resolveSellerId(admin, companyId, body.seller_id, userId);
  if (!sellerId) return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });

  let leadId: string;
  let resolvedClientName = clientName;

  if (providedLeadId) {
    const { data: leadRow } = await admin
      .from("leads")
      .select("id, name, phone")
      .eq("company_id", companyId)
      .eq("id", providedLeadId)
      .maybeSingle();
    if (!leadRow?.id) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 400 });
    }
    leadId = leadRow.id;
    if (!resolvedClientName) {
      resolvedClientName = (leadRow as { name?: string }).name ?? "Cliente";
    }
  } else {
    if (!clientName) {
      return NextResponse.json({ error: "Nome do cliente e data são obrigatórios" }, { status: 400 });
    }

    const phone = clientPhone.replace(/\D/g, "");
    let existingLead: { id: string } | null = null;
    if (phone) {
      const leadIds = await resolveLeadIdsByPhone(admin, companyId, phone);
      if (leadIds.length > 0) {
        existingLead = { id: leadIds[0] };
      }
    }

    if (existingLead?.id) {
      leadId = existingLead.id;
      if (clientName) {
        await admin.from("leads").update({ name: clientName }).eq("id", leadId);
      }
    } else {
      const { data: newLead, error: leadError } = await admin
        .from("leads")
        .insert({
          company_id: companyId,
          name: clientName,
          phone: phone || clientPhone,
          status: "contacted",
          first_contact: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (leadError || !newLead) {
        return NextResponse.json({ error: leadError?.message ?? "Erro ao criar cliente" }, { status: 500 });
      }
      leadId = newLead.id;
    }
  }

  const { data: companyRow } = await admin.from("companies").select("slug").eq("id", companyId).maybeSingle();
  const companySlug = (companyRow as { slug?: string } | null)?.slug ?? "";

  const { data, error } = await admin
    .from("appointments")
    .insert({
      company_id: companyId,
      lead_id: leadId,
      seller_id: sellerId,
      detected_date,
      detected_time: body.detected_time?.trim() || null,
      location: body.location?.trim() || null,
      notes: body.notes?.trim() || null,
      status: "pending",
      ai_confidence: 1,
    })
    .select("id, detected_date, detected_time, location, status, notes, lead_id, leads(name, phone), users(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (companySlug) {
    await notifyAppointmentCreated(admin, {
      companyId,
      companySlug,
      appointmentId: data.id,
      clientName: resolvedClientName || (data as { leads?: { name?: string } }).leads?.name || "Cliente",
      detectedDate: detected_date,
      detectedTime: body.detected_time?.trim() || null,
      sellerUserId: userId,
    }).catch((e) => console.error("[appointments] notification error", e));
  }

  return NextResponse.json({ success: true, appointment: data });
}

export async function PATCH(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const manageErr = await requirePermission(companyId, PERMISSIONS.calendar.manage);
  if (manageErr) return NextResponse.json({ error: manageErr.error }, { status: manageErr.status });

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !status) return NextResponse.json({ error: "id e status obrigatórios" }, { status: 400 });

  const admin = createServiceRoleClient();
  const { error } = await admin.from("appointments").update({ status }).eq("id", id).eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const manageErr = await requirePermission(companyId, PERMISSIONS.calendar.manage);
  if (manageErr) return NextResponse.json({ error: manageErr.error }, { status: manageErr.status });

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const admin = createServiceRoleClient();
  const { error } = await admin.from("appointments").delete().eq("id", id).eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
