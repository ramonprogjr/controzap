import { createClient } from "@supabase/supabase-js";
import { toHeaderSafeLatin1 } from "@/lib/env/header-safe-latin1";
import { getPublicSupabaseUrl } from "@/lib/env/supabase-public";
import { fetchWithTimeout } from "./fetch-with-timeout";

/**
 * Cliente Supabase com service role para uso no backend (webhook, jobs).
 * Bypassa RLS. NUNCA exponha esta chave no front-end.
 */
export function createServiceRoleClient() {
  const url = getPublicSupabaseUrl();
  const key = toHeaderSafeLatin1(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    fetch: fetchWithTimeout,
  } as Parameters<typeof createClient>[2]);
}
