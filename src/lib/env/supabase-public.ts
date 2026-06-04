import { toHeaderSafeLatin1 } from "@/lib/env/header-safe-latin1";

/** Manter em sync com scripts/supabase-public-defaults.mjs */
const SUPABASE_URL = "https://ncvwocdinqudlgivnmpz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdndvY2RpbnF1ZGxnaXZubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTkzMDEsImV4cCI6MjA5NDUzNTMwMX0.u3iDJC9YmjWzLMI5CUGk3-MjZR9QhyxTADQtLaCaNIo";

function pickEnvOrDefault(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  const candidate = trimmed ? toHeaderSafeLatin1(trimmed) : "";
  const safeFallback = toHeaderSafeLatin1(fallback);
  return candidate || safeFallback;
}

/** Auth no browser exige anon JWT (eyJ...), não chave publishable sb_publishable_*. */
function isValidAnonJwt(key: string): boolean {
  return key.startsWith("eyJ") && key.split(".").length === 3 && key.length > 80;
}

export function getPublicSupabaseUrl(): string {
  const url = pickEnvOrDefault(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL);
  if (!url.includes("supabase.co")) return SUPABASE_URL;
  return url;
}

export function getPublicSupabaseAnonKey(): string {
  const fromEnv = pickEnvOrDefault(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY
  );
  if (isValidAnonJwt(fromEnv)) return fromEnv;
  return SUPABASE_ANON_KEY;
}
