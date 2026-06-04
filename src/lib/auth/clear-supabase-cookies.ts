/** Remove cookies de sessão Supabase (sb-*) antes de novo login. */
export function clearSupabaseAuthCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-") || name.startsWith("supabase"));

  const host = window.location.hostname;
  const paths = ["/", window.location.pathname.split("/").slice(0, 2).join("/") || "/"];

  for (const name of names) {
    for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; path=${path}`;
      document.cookie = `${name}=; Max-Age=0; path=${path}; domain=${host}`;
      if (host.includes(".")) {
        document.cookie = `${name}=; Max-Age=0; path=${path}; domain=.${host}`;
      }
    }
  }
}
