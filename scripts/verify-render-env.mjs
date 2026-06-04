#!/usr/bin/env node
/**
 * Garante env Supabase antes do next build.
 * Usa defaults públicos se o host (ex. Render) não tiver NEXT_PUBLIC_* configuradas.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applySupabasePublicDefaults } from "./supabase-public-defaults.mjs";

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
applySupabasePublicDefaults();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anon) {
  console.error("[build] Supabase URL/anon indisponíveis após defaults.");
  process.exit(1);
}

const fromEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

console.log(
  fromEnv
    ? "[build] Supabase env OK (variáveis do host)"
    : "[build] Supabase env OK (defaults públicos; opcional: definir no Render)"
);
