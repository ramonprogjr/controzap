/**
 * Valores públicos do Supabase (anon) — mesmo que vão no bundle do cliente.
 * Render/outros hosts podem omitir NEXT_PUBLIC_* no painel; o build usa estes defaults.
 */
export const SUPABASE_URL = "https://ncvwocdinqudlgivnmpz.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdndvY2RpbnF1ZGxnaXZubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTkzMDEsImV4cCI6MjA5NDUzNTMwMX0.u3iDJC9YmjWzLMI5CUGk3-MjZR9QhyxTADQtLaCaNIo";

export function toHeaderSafeLatin1(value) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[^\u0000-\u00FF]/g, "");
}

function isValidAnonJwt(key) {
  return key.startsWith("eyJ") && key.split(".").length === 3 && key.length > 80;
}

function pickEnvOrDefault(raw, fallback) {
  const trimmed = raw?.trim();
  const candidate = trimmed ? toHeaderSafeLatin1(trimmed) : "";
  const safeFallback = toHeaderSafeLatin1(fallback);
  return candidate || safeFallback;
}

export function applySupabasePublicDefaults() {
  const url = pickEnvOrDefault(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL);
  process.env.NEXT_PUBLIC_SUPABASE_URL = url.includes("supabase.co") ? url : SUPABASE_URL;

  const anon = pickEnvOrDefault(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY);
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = isValidAnonJwt(anon) ? anon : SUPABASE_ANON_KEY;
}
