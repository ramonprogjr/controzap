/** URL pública configurada aponta para localhost (webhook UAZ não alcança o PC). */
export function isLocalhostAppUrl(): boolean {
  const url = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Navegador em localhost (desenvolvimento local). */
export function isBrowserLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}
