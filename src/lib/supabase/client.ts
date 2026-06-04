import { createBrowserClient } from "@supabase/ssr";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/env/supabase-public";

export function createClient() {
  return createBrowserClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey()
  );
}
