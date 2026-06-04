import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getGlobalWebhook } from "@/lib/uazapi/client";
import { ensureGlobalUazWebhook } from "@/lib/uazapi/ensure-global-webhook";
import { NextResponse } from "next/server";

/**
 * GET /api/uazapi/global-webhook
 * Retorna a configuração atual do webhook global no servidor UAZAPI.
 */
export async function GET(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getGlobalWebhook();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to get global webhook" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    config: result.data,
  });
}

/**
 * POST /api/uazapi/global-webhook
 * Configura o webhook global no servidor UAZAPI (uma URL para todas as instâncias).
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

  const result = await ensureGlobalUazWebhook(request);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to set global webhook" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    webhookUrl: result.webhookUrl,
    message: "Global webhook configured. New instances will use it automatically.",
  });
}
