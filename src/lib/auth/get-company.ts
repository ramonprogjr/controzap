import { cookies } from "next/headers";
import { getCurrentUserProfiles, getProfileForCompany, type ProfileRow } from "@/lib/auth/get-profile";
import { normalizeCompanySlug } from "@/lib/company-slug";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const COOKIE_COMPANY_ID = "clicvend_company_id";
const COOKIE_SLUG = "clicvend_slug";
const HEADER_COMPANY_SLUG = "x-company-slug";

export async function getCompanyIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_COMPANY_ID)?.value ?? null;
}

export async function getSlugFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_SLUG)?.value ?? null;
}

async function resolveCompanyIdBySlug(slug: string): Promise<string | null> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("company_links")
      .select("company_id")
      .ilike("slug", slug)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return data?.company_id ?? null;
  } catch {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_links")
      .select("company_id")
      .ilike("slug", slug)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return data?.company_id ?? null;
  }
}

function slugFromProfile(profile: ProfileRow): string {
  const companies = profile.companies;
  const row = Array.isArray(companies) ? companies[0] : companies;
  return normalizeCompanySlug(row?.slug);
}

async function companyIdIfMember(companyId: string): Promise<string | null> {
  const profile = await getProfileForCompany(companyId);
  return profile ? companyId : null;
}

/**
 * Obtém company_id: header X-Company-Slug (com lookup confiável) ou cookie.
 * Exige usuário autenticado com perfil na empresa.
 */
export async function getCompanyIdFromRequest(request: Request): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const slugFromHeader = normalizeCompanySlug(request.headers.get(HEADER_COMPANY_SLUG));
  if (slugFromHeader) {
    const companyId = await resolveCompanyIdBySlug(slugFromHeader);
    if (companyId) {
      const member = await companyIdIfMember(companyId);
      if (member) return member;
    }
    const profiles = await getCurrentUserProfiles();
    const bySlug = profiles.find((p) => slugFromProfile(p) === slugFromHeader);
    if (bySlug?.company_id) return bySlug.company_id;
  }

  const fromCookie = await getCompanyIdFromCookie();
  if (fromCookie) return companyIdIfMember(fromCookie);

  const cookieSlug = normalizeCompanySlug((await getSlugFromCookie()) ?? "");
  if (cookieSlug) {
    const profiles = await getCurrentUserProfiles();
    const bySlug = profiles.find((p) => slugFromProfile(p) === cookieSlug);
    if (bySlug?.company_id) return bySlug.company_id;
  }

  return null;
}
