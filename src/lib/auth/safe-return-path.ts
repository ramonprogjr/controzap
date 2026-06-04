import { normalizeCompanySlug } from "@/lib/company-slug";

const RESERVED = new Set(["login", "cadastro", "onboarding"]);

/**
 * Path relativo seguro para redirect pós-login (só segmentos ASCII/canônicos).
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;

  try {
    const decoded = decodeURIComponent(raw);
    const segments = decoded.split("/").filter(Boolean);
    if (segments.length === 0) return "/";
    if (RESERVED.has(segments[0].toLowerCase())) return null;

    const normalized = segments.map((s) => normalizeCompanySlug(s)).filter(Boolean);
    if (normalized.length === 0) return null;

    let path = `/${normalized.join("/")}`;
    if (decoded.endsWith("/login")) {
      path = path.replace(/\/login$/, "") || "/";
    }
    return path;
  } catch {
    return null;
  }
}

/** Valor seguro para query returnUrl no redirect para /login. */
export function buildLoginReturnUrl(pathname: string): string {
  return safeReturnPath(pathname) ?? "/";
}
