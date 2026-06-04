#!/usr/bin/env node
/**
 * Valida env mínima antes do next build (Render / CI).
 * Carrega .env local se existir para não quebrar build no PC.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) return;
      const key = m[1].trim();
      if (process.env[key]) return;
      process.env[key] = m[2].trim().replace(/^["']|["']$/g, "");
    });
}

loadDotEnv();

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

let failed = false;
for (const key of required) {
  const v = process.env[key]?.trim();
  if (!v) {
    console.error(`[build] Falta ${key} — defina no Render (Environment) com "Available during build".`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "[build] Supabase: https://supabase.com/dashboard/project/ncvwocdinqudlgivnmpz/settings/api"
  );
  process.exit(1);
}

console.log("[build] Supabase env OK");
