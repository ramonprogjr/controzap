"use client";

import { clearSupabaseAuthCookies } from "@/lib/auth/clear-supabase-cookies";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

function readReturnUrlFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("returnUrl");
}

export function useLogin() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function login(email: string, password: string) {
    setError(null);
    setLoading(true);
    setSuccess(false);

    clearSupabaseAuthCookies();

    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signError) {
      const msg = signError.message.toLowerCase().includes("invalid login credentials")
        ? "E-mail ou senha incorretos. Verifique os dados ou fale com o administrador da empresa."
        : signError.message;
      setError(msg);
      setLoading(false);
      return;
    }
    if (!data.user) {
      setError("Erro ao obter usuário.");
      setLoading(false);
      return;
    }

    setSuccess(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("company_id, companies(slug)")
      .eq("user_id", data.user.id)
      .limit(1);
    const slug =
      profiles?.[0] && profiles[0].companies && typeof (profiles[0].companies as { slug?: string }).slug === "string"
        ? (profiles[0].companies as unknown as { slug: string }).slug
        : null;

    let target = slug ? `/${slug}` : "/sem-empresa";
    const safeReturn = safeReturnPath(readReturnUrlFromBrowser());
    if (safeReturn) {
      target = safeReturn;
    }

    window.location.assign(target);
  }

  return {
    login: (e: string, p: string) =>
      login(e, p).catch(() => {
        setLoading(false);
        setSuccess(false);
      }),
    error,
    loading,
    success,
  };
}
