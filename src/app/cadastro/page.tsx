"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";

export default function CadastroPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);
  return (
    <main className="flex min-h-screen flex-col bg-muted/40 pt-14">
      <PublicHeader />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Redirecionando…</p>
      </div>
    </main>
  );
}
