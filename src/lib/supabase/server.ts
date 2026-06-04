import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/env/supabase-public";
import { fetchWithTimeout } from "./fetch-with-timeout";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getPublicSupabaseUrl(),
    getPublicSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component – ignore
          }
        },
      },
      fetch: fetchWithTimeout,
    }
  );
}
