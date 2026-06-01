import type { SupabaseClient } from "@supabase/supabase-js";

const KIND = "appointment" as const;

export async function notifyAppointmentCreated(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    companySlug: string;
    appointmentId: string;
    clientName: string;
    detectedDate: string;
    detectedTime?: string | null;
    sellerUserId: string;
  }
): Promise<void> {
  const { companyId, companySlug, appointmentId, clientName, detectedDate, detectedTime } = params;

  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const userIds = [...new Set((profs ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean))];
  if (userIds.length === 0) return;

  const dateLabel = new Date(`${detectedDate}T12:00:00`).toLocaleDateString("pt-BR");
  const timePart = detectedTime ? ` às ${detectedTime.slice(0, 5)}` : "";
  const title = `Novo agendamento — ${clientName}`;
  const body = `Retirada em ${dateLabel}${timePart}`;
  const link = `/${companySlug}/calendario?date=${detectedDate}`;
  const data = { appointment_id: appointmentId, lead_name: clientName };

  for (const userId of userIds) {
    const { error: insErr } = await supabase.from("notifications").insert({
      company_id: companyId,
      user_id: userId,
      kind: KIND,
      title,
      body,
      link,
      data,
      is_read: false,
    });
    if (insErr) {
      console.error("[appointment-notifications] insert falhou", { userId, appointmentId, insErr });
    }
  }
}

export async function countPendingAppointmentsToday(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("detected_date", today)
    .eq("status", "pending");

  if (error) {
    console.error("[appointments] count today error", error);
    return 0;
  }
  return count ?? 0;
}
