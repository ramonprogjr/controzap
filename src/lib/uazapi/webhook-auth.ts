/** Validação opcional do webhook principal UAZAPI (POST /api/webhook/uazapi). */

export function getUazapiWebhookSecret(): string | undefined {
  return process.env.UAZAPI_WEBHOOK_SECRET?.trim();
}

export function isUazapiWebhookAuthorized(request: Request): boolean {
  const expected = getUazapiWebhookSecret();
  if (!expected) return true;
  const url = new URL(request.url);
  const fromQuery =
    url.searchParams.get("secret")?.trim() || url.searchParams.get("token")?.trim();
  const fromHeader = request.headers.get("x-uazapi-webhook-secret")?.trim();
  return fromQuery === expected || fromHeader === expected;
}

/** URL pública do webhook com query secret quando configurado. */
export function buildUazapiWebhookPublicUrl(baseUrl: string): string {
  const host = baseUrl.replace(/\/$/, "");
  const path = `${host}/api/webhook/uazapi`;
  const secret = getUazapiWebhookSecret();
  if (!secret) return path;
  return `${path}?secret=${encodeURIComponent(secret)}`;
}
