/** Rotas que não precisam de sessão Supabase no middleware (login renderiza offline). */
const PUBLIC_FIRST_SEGMENTS = new Set([
  "login",
  "cadastro",
  "recuperar-senha",
  "sem-empresa",
  "onboarding",
  "auth",
]);

export function isMiddlewarePublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  return PUBLIC_FIRST_SEGMENTS.has(segments[0]);
}
