"use client";

import Link from "next/link";
import { ClicVendLogo } from "@/components/ClicVendLogo";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-card">
      <div className="mx-auto flex w-[92%] max-w-6xl items-center justify-between py-4">
        <Link href="/" className="rounded focus:outline-none focus:ring-2 focus:ring-[#34B097] focus:ring-offset-2">
          <ClicVendLogo size="lg" />
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border-2 border-foreground bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
          >
            Login
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[#34B097] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D9B85]"
          >
            Cadastrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
