"use client";

import { useEffect, useState } from "react";
import { isBrowserLocalhost } from "@/lib/dev/local-webhook-hint";

/**
 * Aviso em Conexões / Conversas: em localhost o webhook da UAZAPI não recebe mensagens externas.
 */
export function LocalDevWebhookNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isBrowserLocalhost());
  }, []);

  if (!show) return null;

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
      role="status"
    >
      <p className="font-medium">Desenvolvimento local (localhost)</p>
      <p className="mt-1 text-muted-foreground">
        Mensagens enviadas de outro celular só entram no sistema se a UAZAPI conseguir chamar seu servidor.
        Use um túnel (ngrok, Cloudflare Tunnel), defina{" "}
        <code className="text-xs">NEXT_PUBLIC_APP_URL</code> com essa URL pública e reconfigure o webhook em
        Conexões. Sem túnel, use &quot;Carregar mais&quot; / sincronizar no chat para puxar histórico manualmente.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        No Supabase: Database → Replication — habilite <code className="text-xs">messages</code> e{" "}
        <code className="text-xs">conversations</code> para atualização em tempo real no painel.
      </p>
    </div>
  );
}
