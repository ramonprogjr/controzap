import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BATCH_SIZE = 200;

/**
 * POST /api/contacts/bulk-delete
 * Body: { contact_ids: string[] }
 * Remove contatos da lista em lote (channel_contacts e, se não encontrados, company_contacts históricos).
 */
export async function POST(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permErr = await requirePermission(companyId, PERMISSIONS.contacts.manage);
  if (permErr) {
    return NextResponse.json({ error: permErr.error }, { status: permErr.status });
  }

  let body: { contact_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contactIds = Array.isArray(body?.contact_ids)
    ? body.contact_ids.map((v) => String(v || "").trim()).filter(Boolean)
    : [];
  if (contactIds.length === 0) {
    return NextResponse.json({ error: "contact_ids é obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < contactIds.length; i += BATCH_SIZE) {
    const batch = contactIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("channel_contacts")
      .delete()
      .eq("company_id", companyId)
      .in("id", batch)
      .select("id");

    if (error) {
      errors.push(error.message);
      continue;
    }

    const removedChannel = new Set((data ?? []).map((r) => r.id as string));
    deleted += removedChannel.size;

    const remaining = batch.filter((id) => !removedChannel.has(id));
    if (remaining.length === 0) continue;

    const { data: histData, error: histError } = await supabase
      .from("company_contacts")
      .delete()
      .eq("company_id", companyId)
      .in("id", remaining)
      .select("id");

    if (histError) {
      errors.push(histError.message);
      continue;
    }
    deleted += (histData ?? []).length;
  }

  const failed = contactIds.length - deleted;
  if (deleted === 0 && errors.length > 0) {
    return NextResponse.json(
      { error: errors[0] ?? "Falha ao excluir contatos", deleted, failed },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted,
    failed,
    ...(errors.length > 0 ? { warnings: errors.slice(0, 3) } : {}),
  });
}
