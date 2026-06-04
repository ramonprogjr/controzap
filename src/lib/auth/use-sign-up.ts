"use client";

import { clearSupabaseAuthCookies } from "@/lib/auth/clear-supabase-cookies";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function useSignUp() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(email: string, password: string) {
    setError(null);
    setLoading(true);
    clearSupabaseAuthCookies();

    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (signError) {
      setError(signError.message);
      setLoading(false);
      return;
    }
    if (!data.user) {
      setError("Erro ao criar conta.");
      setLoading(false);
      return;
    }
    window.location.assign("/onboarding");
  }

  return { signUp, error, loading };
}
