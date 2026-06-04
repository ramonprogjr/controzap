import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { setWebhook, UAZ_WEBHOOK_DEFAULT_EVENTS } from "@/lib/uazapi/client";
import { resolveUazapiWebhookBaseUrl } from "@/lib/uazapi/ensure-global-webhook";
import { buildUazapiWebhookPublicUrl } from "@/lib/uazapi/webhook-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/uazapi/webhook
 * Configura webhook da instância para a URL do nosso backend.
 * Body: { channel_id: string } ou { token: string }
 */
export async function POST(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const permErr = await requirePermission(companyId, PERMISSIONS.channels.manage);
  if (permErr) {
    return NextResponse.json({ error: permErr.error }, { status: permErr.status });
  }

  let body: { channel_id?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let token: string | undefined = typeof body?.token === "string" ? body.token.trim() : undefined;
  if (!token && body?.channel_id) {
    const supabase = await createClient();
    const { data: ch } = await supabase
      .from("channels")
      .select("id, uazapi_token_encrypted")
      .eq("id", body.channel_id)
      .eq("company_id", companyId)
      .single();
    if (!ch?.uazapi_token_encrypted) {
      return NextResponse.json({ error: "Channel not found or token missing" }, { status: 404 });
    }
    token = ch.uazapi_token_encrypted;
  }

  if (!token) {
    return NextResponse.json({ error: "token or channel_id is required" }, { status: 400 });
  }

  const webhookUrl = buildUazapiWebhookPublicUrl(resolveUazapiWebhookBaseUrl(request));

  const result = await setWebhook(token, webhookUrl, {
    events: [...UAZ_WEBHOOK_DEFAULT_EVENTS],
    excludeMessages: ["wasSentByApi"],
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to set webhook" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    webhookUrl,
    message: "Webhook configured",
  });
}
