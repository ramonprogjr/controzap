import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeCompanySlug } from "@/lib/company-slug";
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from "@/lib/env/supabase-public";

const RESERVED_SLUGS = new Set([
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = getPublicSupabaseUrl();
  const supabaseAnonKey = getPublicSupabaseAnonKey();

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    const canonicalSlug = firstSegment ? normalizeCompanySlug(firstSegment) : "";

    // /login/conversas/... trata "login" como slug dinâmico — redireciona para o tenant real
    if (firstSegment === "login" && segments.length > 1) {
      const tenantSlug = normalizeCompanySlug(request.cookies.get("clicvend_slug")?.value);
      if (tenantSlug && !RESERVED_SLUGS.has(tenantSlug)) {
        const rest = segments.slice(1).join("/");
        return NextResponse.redirect(new URL(`/${tenantSlug}/${rest}`, request.url));
      }
    }

    // Slug com espaços ou caracteres inválidos → URL canônica
    if (
      canonicalSlug &&
      firstSegment &&
      canonicalSlug !== firstSegment &&
      !RESERVED_SLUGS.has(canonicalSlug)
    ) {
      const rest = segments.slice(1).join("/");
      const target = rest ? `/${canonicalSlug}/${rest}` : `/${canonicalSlug}`;
      return NextResponse.redirect(new URL(target, request.url));
    }

    // Rotas de tenant: /[slug]/...
    const tenantSlug = canonicalSlug || firstSegment;
    if (tenantSlug && !RESERVED_SLUGS.has(tenantSlug) && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
      if (!user) {
        const url = new URL("/login", request.url);
        const returnPath = pathname.endsWith("/login") ? `/${firstSegment}` : pathname;
        url.searchParams.set("returnUrl", returnPath);
        return NextResponse.redirect(url);
      }

      const { data: link } = await supabase
        .from("company_links")
        .select("company_id")
        .ilike("slug", tenantSlug)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!link) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      response.cookies.set("clicvend_company_id", link.company_id, { path: "/" });
      response.cookies.set("clicvend_slug", tenantSlug, { path: "/" });
    }

    return response;
  } catch (err) {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];
    const isTenantRoute = firstSegment && !RESERVED_SLUGS.has(firstSegment) && !pathname.startsWith("/_next") && !pathname.startsWith("/api");
    if (process.env.NODE_ENV === "development") {
      console.warn("[middleware] Supabase request failed (timeout or network):", err instanceof Error ? err.message : err);
    }
    if (isTenantRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
