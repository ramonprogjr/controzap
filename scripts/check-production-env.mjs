#!/usr/bin/env node
/**
 * Valida variáveis mínimas para produção (Render).
 * Uso: node scripts/check-production-env.mjs
 */
const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UAZAPI_BASE_URL",
  "UAZAPI_ADMIN_TOKEN",
];

const recommended = [
  "USE_REDIS",
  "REDIS_URL",
  "REDIS_NAMESPACE",
  "CRON_SECRET",
  "AI_API_KEY",
  "UAZAPI_WEBHOOK_SECRET",
];

let failed = false;

for (const key of required) {
  const v = process.env[key]?.trim();
  if (!v) {
    console.error(`[FAIL] ${key} — obrigatório`);
    failed = true;
  } else {
    console.log(`[OK] ${key}`);
  }
}

if (process.env.USE_REDIS === "true" && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
  console.error("[FAIL] USE_REDIS=true mas REDIS_URL/REDIS_HOST ausente");
  failed = true;
}

for (const key of recommended) {
  const v = process.env[key]?.trim();
  if (!v) console.warn(`[WARN] ${key} — recomendado em produção`);
  else console.log(`[OK] ${key}`);
}

if (process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
  console.warn("[WARN] NEXT_PUBLIC_APP_URL aponta para localhost — webhooks UAZAPI não funcionarão");
}

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
if (anon.startsWith("sb_publishable_")) {
  console.warn(
    "[WARN] NEXT_PUBLIC_SUPABASE_ANON_KEY parece chave publishable inválida — use o JWT anon (eyJ...) do Supabase"
  );
}

process.exit(failed ? 1 : 0);
