#!/usr/bin/env node
/**
 * Substitui cores hardcoded por tokens semanticos em src (tsx e css)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = join(import.meta.dirname, "..", "src");

const REPLACEMENTS = [
  ["bg-[#FFF7ED]", "bg-amber-50/50 dark:bg-amber-950/20"],
  ["bg-[#FAFBFC]", "bg-muted/40"],
  ["bg-[#F8FAFC]", "bg-muted/40"],
  ["bg-[#F1F5F9]", "bg-muted/60"],
  ["hover:bg-[#F8FAFC]", "hover:bg-muted/40"],
  ["hover:bg-[#F1F5F9]", "hover:bg-muted/60"],
  ["hover:bg-green-50/80", "hover:bg-emerald-500/10"],
  ["border-[#E2E8F0]", "border-border"],
  ["border-[#CBD5E1]", "border-border"],
  ["hover:border-[#CBD5E1]", "hover:border-border"],
  ["text-[#1E293B]", "text-foreground"],
  ["text-[#0F172A]", "text-foreground"],
  ["text-[#64748B]", "text-muted-foreground"],
  ["text-[#475569]", "text-muted-foreground"],
  ["text-[#94A3B8]", "text-muted-foreground"],
  ["placeholder:text-[#94A3B8]", "placeholder:text-muted-foreground"],
  ["placeholder-[#94A3B8]", "placeholder:text-muted-foreground"],
  ["focus:border-clicvend-orange", "focus:border-amber-500"],
  ["focus:ring-clicvend-orange", "focus:ring-amber-500/20"],
  ["focus:ring-1 focus:ring-clicvend-orange", "focus:ring-1 focus:ring-amber-500/20"],
  ["hover:border-clicvend-orange/50", "hover:border-amber-500/50"],
  ["hover:text-clicvend-orange", "hover:text-amber-600 dark:hover:text-amber-400"],
  ["text-clicvend-orange", "text-amber-600 dark:text-amber-400"],
  ["bg-white", "bg-card"],
  ["divide-y divide-[#E2E8F0]/40", "divide-y divide-border/40"],
  ["divide-y divide-[#E2E8F0]", "divide-y divide-border"],
  ["divide-[#E2E8F0]", "divide-border"],
  ["hover:bg-[#E2E8F0]", "hover:bg-muted/60"],
  ["bg-[#E2E8F0]", "bg-muted"],
  ["border-[#64748B]", "border-muted-foreground"],
  ["bg-[#64748B]/10", "bg-muted-foreground/10"],
  ["from-[#F1F5F9] to-[#E2E8F0]", "from-muted/60 to-border"],
  ["ring-1 ring-white/80", "ring-1 ring-card/80"],
  ["!border-2 !border-white", "!border-2 !border-card"],
  ["text-[#334155]", "text-foreground"],
  ["disabled:bg-[#94A3B8]", "disabled:bg-muted"],
  ["!bg-[#94A3B8]", "!bg-muted-foreground"],
  ["border-2 border-[#1E293B]", "border-2 border-foreground"],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, files);
    } else {
      const ext = extname(p);
      if (ext === ".tsx" || ext === ".css") files.push(p);
    }
  }
  return files;
}

let total = 0;
for (const file of walk(ROOT)) {
  if (file.includes("icon.svg")) continue;
  let content = readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    writeFileSync(file, content, "utf8");
    total++;
    console.log("updated:", file.replace(ROOT, "src"));
  }
}
console.log(`Done. ${total} files updated.`);
