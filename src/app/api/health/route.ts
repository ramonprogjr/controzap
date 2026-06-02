import { NextResponse } from "next/server";

/**
 * GET /api/health — health check para Render e monitoramento.
 * Não expõe segredos; só confirma que o processo responde e env mínima está definida.
 */
export async function GET() {
  const checks = {
    ok: true,
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    redis: process.env.USE_REDIS === "true" ? Boolean(process.env.REDIS_URL || process.env.REDIS_HOST) : "disabled",
  };
  const ready =
    checks.supabaseUrl &&
    checks.supabaseAnon &&
    checks.serviceRole &&
    checks.appUrl &&
    (checks.redis === "disabled" || checks.redis === true);

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
