/** Slugs de rotas reservadas — não são empresas (espelha middleware). */
export const RESERVED_PATH_SLUGS = new Set([
  "login",
  "cadastro",
  "recuperar-senha",
  "sem-empresa",
  "auth",
  "api",
  "_next",
  "favicon.ico",
  "static",
  "onboarding",
  "admin",
]);

export function isReservedPathSlug(slug: string | null | undefined): boolean {
  if (!slug) return true;
  return RESERVED_PATH_SLUGS.has(slug.toLowerCase());
}

/** Normaliza slug (decode, minúsculas, espaços → hífen). */
export function normalizeCompanySlug(raw: string | null | undefined): string {
  if (!raw) return "";
  return decodeURIComponent(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Slug da empresa a partir da URL ou cookie `clicvend_slug`. */
export function getCompanySlugFromPath(pathname: string | null | undefined): string {
  const fromPath = normalizeCompanySlug(pathname?.split("/").filter(Boolean)[0] ?? "");
  if (fromPath && !isReservedPathSlug(fromPath)) return fromPath;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/\bclicvend_slug=([^;]+)/);
    if (match?.[1]) {
      const fromCookie = normalizeCompanySlug(match[1]);
      if (fromCookie && !isReservedPathSlug(fromCookie)) return fromCookie;
    }
  }
  return "";
}
