import { createBrowserClient } from "@supabase/ssr";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/env/supabase-public";
import { headerSafeFetch } from "@/lib/supabase/header-safe-fetch";

export function createClient() {
  return createBrowserClient(getPublicSupabaseUrl(), getPublicSupabaseAnonKey(), {
    global: { fetch: headerSafeFetch },
  });
}
