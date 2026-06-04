import { setGlobalWebhook, UAZ_WEBHOOK_DEFAULT_EVENTS } from "@/lib/uazapi/client";
import { buildUazapiWebhookPublicUrl } from "@/lib/uazapi/webhook-auth";

/** Monta a URL pública do webhook (global ou por instância) a partir de env ou do request. */
export function resolveUazapiWebhookBaseUrl(request?: Request): string {
  const fromEnv = process.env.UAZAPI_WEBHOOK_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    request?.headers.get("x-forwarded-host")?.trim() ||
    request?.headers.get("host")?.trim() ||
    "";

  const protocol = raw.includes("localhost") ? "http" : "https";
  const host = raw.replace(/^https?:\/\//, "").split("/")[0] || "localhost:3000";
  return `${protocol}://${host}`;
}

/**
 * Configura o webhook global na UAZAPI (idempotente). Usado após criar conexão e em POST /api/uazapi/global-webhook.
 */
export async function ensureGlobalUazWebhook(request?: Request): Promise<{
  ok: boolean;
  webhookUrl?: string;
  error?: string;
}> {
  const base = resolveUazapiWebhookBaseUrl(request);
  const webhookUrl = buildUazapiWebhookPublicUrl(base);

  const result = await setGlobalWebhook(webhookUrl, {
    events: [...UAZ_WEBHOOK_DEFAULT_EVENTS],
    excludeMessages: ["wasSentByApi"],
  });

  if (!result.ok) {
    return { ok: false, webhookUrl, error: result.error ?? "Failed to set global webhook" };
  }
  return { ok: true, webhookUrl };
}
