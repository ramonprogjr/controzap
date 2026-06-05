"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Smartphone, Plus, Loader2, Settings, Wifi, WifiOff, Link2, Trash2, MessageSquare, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { SideOver } from "@/components/SideOver";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ChannelTableSkeleton } from "@/components/Skeleton";
import { ChannelConfigSideOver } from "./ChannelConfigSideOver";
import { formInputClass } from "@/lib/ui/form-input-class";

type Channel = {
  id: string;
  name: string;
  uazapi_instance_id: string;
  queue_id: string | null;
  is_active: boolean;
  created_at: string;
};

type Queue = { id: string; name: string; slug: string };

// Estado de conexão do canal com a instância UAZAPI.
// "error" indica falha ao consultar o status (por ex. token inválido ou API indisponível),
// não necessariamente que o WhatsApp esteja desconectado.
type ChannelStatus = "connected" | "connecting" | "disconnected" | "error" | null;

const MAX_CHANNELS_PER_COMPANY = 3;

export default function ConexoesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const slug = pathname?.split("/").filter(Boolean)[0] ?? "";
  const apiHeaders = slug ? { "X-Company-Slug": slug } : undefined;

  const { data: permissionsData } = useQuery({
    queryKey: queryKeys.permissions(slug ?? ""),
    queryFn: () =>
      fetch("/api/auth/permissions", { credentials: "include", headers: apiHeaders }).then((r) => r.json()),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
  const permissions = Array.isArray(permissionsData?.permissions) ? permissionsData.permissions : [];
  const canAccessChannels = permissions.includes("channels.view") || permissions.includes("channels.manage");
  const canManageChannels = permissions.includes("channels.manage");
  const [webhookConfigLoading, setWebhookConfigLoading] = useState(false);

  useEffect(() => {
    if (slug && permissionsData !== undefined && !canAccessChannels) {
      router.replace(`/${slug}/conversas`);
    }
  }, [slug, permissionsData, canAccessChannels, router]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [sideOverOpen, setSideOverOpen] = useState(false);
  const [name, setName] = useState("");
  const [queueId, setQueueId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [configSideOverOpen, setConfigSideOverOpen] = useState(false);
  const [configChannelId, setConfigChannelId] = useState<string | null>(null);
  const [configChannelName, setConfigChannelName] = useState("");
  const [configChannelQueueId, setConfigChannelQueueId] = useState<string | null>(null);
  const [channelStatuses, setChannelStatuses] = useState<Record<string, ChannelStatus>>({});
  /** Motivo quando status é "error" (ex.: token inválido) — exibido no tooltip. */
  const [channelStatusErrors, setChannelStatusErrors] = useState<Record<string, string>>({});
  const [channelConnectedNumbers, setChannelConnectedNumbers] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [channelStats, setChannelStats] = useState<Record<string, { conversations_count: number; messages_count: number; open_conversations: number }>>({});

  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<Channel | null>(null);
  /** Após falha ao apagar na UAZ: segundo passo para apagar só o registro em `channels`. */
  const [deleteLocalOnlyChannel, setDeleteLocalOnlyChannel] = useState<Channel | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{ type: "disconnect" | "delete"; ids: string[] } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const canAddChannel = channels.length < MAX_CHANNELS_PER_COMPANY;

  const fetchChannels = useCallback(() => {
    setLoading(true);
    return fetch("/api/channels", { credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined })
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const fetchStatus = useCallback(async (chId: string) => {
    try {
      const r = await fetch(`/api/uazapi/instance/status?channel_id=${encodeURIComponent(chId)}`, { credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined });
      const data = await r.json();
      if (r.ok) {
        setChannelStatusErrors((prev) => {
          const next = { ...prev };
          delete next[chId];
          return next;
        });
        const s: ChannelStatus = data.connected || data.loggedIn ? "connected" : data.qrcode || data.paircode ? "connecting" : "disconnected";
        setChannelStatuses((prev) => ({ ...prev, [chId]: s }));
        if (data.connectedNumber) {
          setChannelConnectedNumbers((prev) => ({ ...prev, [chId]: data.connectedNumber }));
        } else {
          setChannelConnectedNumbers((prev) => {
            const next = { ...prev };
            delete next[chId];
            return next;
          });
        }
        return data;
      } else {
        const errMsg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : `Não foi possível ler o status (HTTP ${r.status}).`;
        setChannelStatusErrors((prev) => ({ ...prev, [chId]: errMsg }));
        setChannelStatuses((prev) => ({ ...prev, [chId]: "error" }));
      }
    } catch {
      setChannelStatusErrors((prev) => ({
        ...prev,
        [chId]: "Falha de rede ao consultar a UAZAPI.",
      }));
      setChannelStatuses((prev) => ({ ...prev, [chId]: "error" }));
    }
    return null;
  }, [slug]);

  const fetchStats = useCallback(() => {
    fetch("/api/channels/stats", { credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined })
      .then((r) => r.json())
      .then((data: Array<{ channel_id: string; conversations_count: number; messages_count: number; open_conversations: number }>) => {
        const map: Record<string, { conversations_count: number; messages_count: number; open_conversations: number }> = {};
        (data ?? []).forEach((s) => {
          map[s.channel_id] = {
            conversations_count: s.conversations_count ?? 0,
            messages_count: s.messages_count ?? 0,
            open_conversations: s.open_conversations ?? 0,
          };
        });
        setChannelStats(map);
      })
      .catch(() => setChannelStats({}));
  }, [slug]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (channels.length === 0) return;
    channels.forEach((c) => fetchStatus(c.id));
  }, [channels, fetchStatus]);

  useEffect(() => {
    if (channels.length > 0) fetchStats();
  }, [channels.length, fetchStats]);

  useEffect(() => {
    fetch("/api/queues", { credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined })
      .then((r) => r.json())
      .then((data) => setQueues(Array.isArray(data) ? data : []))
      .catch(() => setQueues([]));
  }, [slug]);

  useEffect(() => {
    if (sideOverOpen) {
      fetch("/api/queues", { credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined })
        .then((r) => r.json())
        .then((data) => setQueues(Array.isArray(data) ? data : []))
        .catch(() => setQueues([]));
    }
  }, [sideOverOpen, slug]);

  const openSideOver = () => {
    if (!canAddChannel) return;
    if (!canManageChannels) {
      setFeedback({
        type: "error",
        message:
          "Seu cargo não tem permissão para gerenciar conexões (channels.manage). Peça ao administrador em Cargos e usuários.",
      });
      return;
    }
    setName("");
    setQueueId("");
    setCreateError("");
    setSideOverOpen(true);
  };

  const closeSideOver = () => {
    setSideOverOpen(false);
    setCreating(false);
    fetchChannels();
  };

  const openConfig = (ch: Channel) => {
    setConfigChannelId(ch.id);
    setConfigChannelName(ch.name);
    setConfigChannelQueueId(ch.queue_id);
    setConfigSideOverOpen(true);
  };

  const closeConfig = () => {
    setConfigSideOverOpen(false);
    setConfigChannelId(null);
    setConfigChannelName("");
    setConfigChannelQueueId(null);
    fetchChannels();
  };

  const configureGlobalWebhook = async () => {
    setWebhookConfigLoading(true);
    try {
      const r = await fetch("/api/uazapi/global-webhook", {
        method: "POST",
        credentials: "include",
        headers: apiHeaders,
      });
      const data = await r.json().catch(() => ({}));
      setFeedback({
        type: r.ok ? "success" : "error",
        message: r.ok
          ? `Webhook global configurado${data.webhookUrl ? `: ${data.webhookUrl}` : ""}.`
          : (data.error ?? "Falha ao configurar webhook"),
      });
    } catch {
      setFeedback({ type: "error", message: "Erro de rede ao configurar webhook." });
    } finally {
      setWebhookConfigLoading(false);
    }
  };

  const createInstance = async () => {
    const n = name.trim();
    if (!n) {
      setCreateError("Informe o nome da conexão.");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const createRes = await fetch("/api/uazapi/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders },
        body: JSON.stringify({
          name: n,
          createChannel: true,
          queue_id: queueId.trim() || undefined,
        }),
        credentials: "include",
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setCreateError(createData?.error ?? "Falha ao criar instância");
        setCreating(false);
        return;
      }
      if (!createData.channel?.id) {
        setCreateError(createData?.error ?? createData?.channelError ?? "Canal não foi criado. Tente novamente.");
        setCreating(false);
        return;
      }
      fetchChannels().then(() => {
        fetchStats();
        fetchStatus(createData.channel.id);
        setSideOverOpen(false);
        const webhook = createData.webhook as { ok?: boolean; error?: string } | undefined;
        const webhookNote =
          webhook && webhook.ok === false
            ? ` Aviso: webhook não configurado (${webhook.error ?? "erro UAZAPI"}). Use «Configurar webhook» ou contate o suporte.`
            : "";
        setFeedback({
          type: webhook && webhook.ok === false ? "error" : "success",
          message:
            (createData.reused
              ? "Conexão vinculada a instância existente na UAZAPI."
              : "Conexão criada com sucesso.") + webhookNote,
        });
      });
    } catch {
      setCreateError("Erro de rede. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const handleDisconnect = async (ch: Channel) => {
    setActionLoading(ch.id);
    try {
      const r = await fetch("/api/uazapi/instance/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(slug ? { "X-Company-Slug": slug } : {}) },
        body: JSON.stringify({ channel_id: ch.id }),
        credentials: "include",
      });
      if (r.ok) {
        setChannelStatuses((prev) => ({ ...prev, [ch.id]: "disconnected" }));
        setChannelConnectedNumbers((prev) => {
          const next = { ...prev };
          delete next[ch.id];
          return next;
        });
        fetchChannels();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (ch: Channel) => {
    setDeleteConfirmChannel(ch);
  };

  const removeChannelFromUi = (ch: Channel) => {
    setChannels((prev) => prev.filter((c) => c.id !== ch.id));
    setChannelStatuses((prev) => {
      const next = { ...prev };
      delete next[ch.id];
      return next;
    });
    setChannelConnectedNumbers((prev) => {
      const next = { ...prev };
      delete next[ch.id];
      return next;
    });
    setChannelStatusErrors((prev) => {
      const next = { ...prev };
      delete next[ch.id];
      return next;
    });
  };

  const doDeleteChannel = async () => {
    const ch = deleteConfirmChannel;
    if (!ch) return;
    setDeleteConfirmChannel(null);
    setActionLoading(ch.id);
    try {
      const r = await fetch(`/api/uazapi/instance/delete?channel_id=${encodeURIComponent(ch.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: slug ? { "X-Company-Slug": slug } : undefined,
      });
      const errData = (await r.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        hint?: string;
        code?: string;
        info?: string;
      };
      if (r.ok) {
        removeChannelFromUi(ch);
        const extra = errData.warning ? ` ${errData.warning}` : "";
        const infoExtra = errData.info ? ` ${errData.info}` : "";
        setFeedback({ type: "success", message: `Conexão "${ch.name}" removida.${extra}${infoExtra}` });
      } else {
        const detail =
          typeof errData.error === "string" && errData.error.trim()
            ? errData.error.trim()
            : `HTTP ${r.status}`;
        const hint = typeof errData.hint === "string" ? ` ${errData.hint}` : "";
        setFeedback({
          type: "error",
          message: `Não foi possível excluir na UAZAPI: ${detail}.${hint}`,
        });
        setDeleteLocalOnlyChannel(ch);
      }
    } catch {
      setFeedback({ type: "error", message: "Erro de rede ao excluir conexão." });
      setDeleteLocalOnlyChannel(ch);
    } finally {
      setActionLoading(null);
    }
  };

  const doDeleteChannelLocalOnly = async () => {
    const ch = deleteLocalOnlyChannel;
    if (!ch) return;
    setDeleteLocalOnlyChannel(null);
    setActionLoading(ch.id);
    try {
      const r = await fetch(
        `/api/uazapi/instance/delete?channel_id=${encodeURIComponent(ch.id)}&force_local=1`,
        { method: "DELETE", credentials: "include", headers: slug ? { "X-Company-Slug": slug } : undefined }
      );
      const data = (await r.json().catch(() => ({}))) as { error?: string; warning?: string };
      if (r.ok) {
        removeChannelFromUi(ch);
        setFeedback({
          type: "success",
          message:
            typeof data.warning === "string"
              ? data.warning
              : `Registro "${ch.name}" removido do sistema. Verifique o painel UAZAPI se precisar apagar a instância lá.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error ?? "Não foi possível remover o registro local.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Erro de rede ao remover conexão." });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = (status: ChannelStatus) => {
    const map: Record<string, string> = {
      connected: "Conectado",
      connecting: "Conectando…",
      disconnected: "Desconectado",
      error: "Indisponível",
    };
    return status ? map[status] ?? "—" : "—";
  };

  const getStatusColor = (status: ChannelStatus) => {
    const map: Record<string, string> = {
      connected: "text-[#16A34A] bg-[#DCFCE7]",
      connecting: "text-[#CA8A04] bg-[#FEF9C3]",
      disconnected: "text-[#DC2626] bg-[#FEE2E2]",
      error: "text-[#DC2626] bg-[#FEF2F2]",
    };
    return status ? map[status] ?? "text-muted-foreground bg-muted/60" : "text-muted-foreground bg-muted/60";
  };

  const formatConnectedNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("55")) {
      const ddd = digits.slice(2, 4);
      const rest = digits.slice(4);
      const part = rest.length > 5 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : rest;
      return `+55 (${ddd}) ${part}`;
    }
    return raw;
  };

  const executeBulkDisconnect = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        ids.map((id) => {
          const ch = channels.find((c) => c.id === id);
          if (!ch) return Promise.resolve();
          return fetch("/api/uazapi/instance/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(slug ? { "X-Company-Slug": slug } : {}) },
            body: JSON.stringify({ channel_id: ch.id }),
            credentials: "include",
          });
        })
      );
      setSelectedChannelIds(new Set());
      ids.forEach((id) => setChannelStatuses((prev) => ({ ...prev, [id]: "disconnected" })));
      ids.forEach((id) =>
        setChannelConnectedNumbers((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        })
      );
      fetchChannels();
      setFeedback({
        type: "success",
        message: ids.length === 1 ? "Conexão desconectada com sucesso." : `${ids.length} conexões desconectadas com sucesso.`,
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const executeBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/uazapi/instance/delete?channel_id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: "include",
            headers: slug ? { "X-Company-Slug": slug } : undefined,
          })
        )
      );
      setChannels((prev) => prev.filter((c) => !ids.includes(c.id)));
      setChannelStatuses((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setChannelConnectedNumbers((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setSelectedChannelIds(new Set());
      setFeedback({
        type: "success",
        message: ids.length === 1 ? "Conexão excluída com sucesso." : `${ids.length} conexões excluídas com sucesso.`,
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (slug && permissionsData !== undefined && !canAccessChannels) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
        <div className="flex items-center gap-2">
          {canManageChannels && (
            <button
              type="button"
              onClick={configureGlobalWebhook}
              disabled={webhookConfigLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              title="Registra a URL do ControlZap no servidor UAZAPI para receber mensagens no inbox"
            >
              {webhookConfigLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Configurar webhook
            </button>
          )}
          <button
            type="button"
            onClick={openSideOver}
            disabled={!canAddChannel}
            className="inline-flex items-center gap-1.5 rounded-lg bg-clicvend-orange px-4 py-2 text-sm font-medium text-white hover:bg-clicvend-orange-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!canAddChannel ? "Limite de 3 números por empresa" : undefined}
          >
            <Plus className="h-4 w-4" />
            Nova conexão WhatsApp
          </button>
          <button
            type="button"
            onClick={() => { fetchChannels(); fetchStats(); channels.forEach((c) => fetchStatus(c.id)); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <ChannelTableSkeleton rows={4} />
      ) : channels.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Smartphone className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Nenhum canal cadastrado.</p>
          <p className="mt-1 text-xs text-muted-foreground">Cada empresa pode conectar até {MAX_CHANNELS_PER_COMPANY} números.</p>
          <button
            type="button"
            onClick={openSideOver}
            disabled={!canAddChannel}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-clicvend-orange px-4 py-2 text-sm font-medium text-white hover:bg-clicvend-orange-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova conexão WhatsApp
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Resumo total */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {channels.length} de {MAX_CHANNELS_PER_COMPANY} números ·{" "}
              <span className="font-medium text-foreground">
                {channels.filter((c) => channelStatuses[c.id] === "connected").length} conectados
              </span>
              {channels.filter((c) => channelStatuses[c.id] === "connecting").length > 0 && (
                <span className="ml-1 text-amber-600">
                  · {channels.filter((c) => channelStatuses[c.id] === "connecting").length} conectando
                </span>
              )}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="uppercase text-[10px] font-medium tracking-wider text-muted-foreground">Conversas</span>
                <strong className="text-foreground">{channels.reduce((s, c) => s + (channelStats[c.id]?.conversations_count ?? 0), 0)}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-clicvend-blue" />
                <span className="uppercase text-[10px] font-medium tracking-wider text-muted-foreground">Mensagens</span>
                <strong className="text-foreground">{channels.reduce((s, c) => s + (channelStats[c.id]?.messages_count ?? 0), 0)}</strong>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="uppercase text-[10px] font-medium tracking-wider text-muted-foreground">Abertas</span>
                <strong className="text-[#16A34A]">{channels.reduce((s, c) => s + (channelStats[c.id]?.open_conversations ?? 0), 0)}</strong>
              </span>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            {selectedChannelIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-clicvend-orange/10 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedChannelIds.size} conexão(ões) selecionada(s)
                </span>
                <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  <button
                    type="button"
                    disabled={bulkActionLoading || !channels.some((c) => selectedChannelIds.has(c.id) && (channelStatuses[c.id] === "disconnected" || channelStatuses[c.id] === "error"))}
                    onClick={async () => {
                      const ids = Array.from(selectedChannelIds);
                      const toConnect = ids.filter((id) => {
                        const ch = channels.find((c) => c.id === id);
                        const status = ch ? (channelStatuses[ch.id] ?? null) : null;
                        return status === "disconnected" || status === "error";
                      });
                      if (toConnect.length === 0) return;
                      setBulkActionLoading(true);
                      try {
                        await Promise.all(
                          toConnect.map((id) => {
                            const ch = channels.find((c) => c.id === id);
                            if (!ch) return Promise.resolve();
                            return fetch("/api/uazapi/instance/connect", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", ...(slug ? { "X-Company-Slug": slug } : {}) },
                              body: JSON.stringify({ channel_id: ch.id }),
                              credentials: "include",
                            });
                          })
                        );
                        setSelectedChannelIds(new Set());
                        toConnect.forEach((id) => setChannelStatuses((prev) => ({ ...prev, [id]: "connecting" })));
                        toConnect.forEach((id) => fetchStatus(id));
                      } finally {
                        setBulkActionLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 border-r border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-60 last:border-r-0"
                    title="Conectar ao WhatsApp as conexões selecionadas (apenas as desconectadas)."
                  >
                    {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Conectar
                  </button>
                  <button
                    type="button"
                    disabled={bulkActionLoading || !channels.some((c) => selectedChannelIds.has(c.id) && channelStatuses[c.id] === "connected")}
                    onClick={() => {
                      const ids = Array.from(selectedChannelIds);
                      const toDisconnect = ids.filter((id) => channelStatuses[id] === "connected");
                      if (toDisconnect.length === 0) return;
                      setBulkConfirm({ type: "disconnect", ids: toDisconnect });
                    }}
                    className="inline-flex items-center gap-1.5 border-r border-border bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60 last:border-r-0 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
                    title="Desconectar do WhatsApp as conexões selecionadas (apenas as conectadas)."
                  >
                    {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
                    Desconectar
                  </button>
                  <button
                    type="button"
                    disabled={bulkActionLoading}
                    onClick={() => {
                      const ids = Array.from(selectedChannelIds);
                      if (ids.length === 0) return;
                      setBulkConfirm({ type: "delete", ids });
                    }}
                    className="inline-flex items-center gap-1.5 border-r border-border bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 last:border-r-0 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/40"
                    title="Excluir permanentemente as conexões selecionadas."
                  >
                    {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChannelIds(new Set())}
                    disabled={bulkActionLoading}
                    className="inline-flex items-center gap-1.5 bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30 disabled:opacity-60 last:border-r-0"
                    title="Desmarcar todas as conexões selecionadas."
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            )}
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 w-10 text-left">
                    <input
                      type="checkbox"
                      checked={channels.length > 0 && channels.every((c) => selectedChannelIds.has(c.id))}
                      onChange={() => {
                        if (channels.every((c) => selectedChannelIds.has(c.id))) {
                          setSelectedChannelIds(new Set());
                        } else {
                          setSelectedChannelIds(new Set(channels.map((c) => c.id)));
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-amber-600 dark:text-amber-400 focus:ring-amber-500/20"
                      aria-label="Selecionar todas"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número WhatsApp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Caixa de entrada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversas</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagens</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abertas</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const status = channelStatuses[ch.id] ?? null;
                  const loading = actionLoading === ch.id;
                  const stats = channelStats[ch.id];
                  const conv = stats?.conversations_count ?? 0;
                  const msgs = stats?.messages_count ?? 0;
                  const open = stats?.open_conversations ?? 0;
                  return (
                    <tr
                      key={ch.id}
                      className="border-b border-border transition-colors hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedChannelIds.has(ch.id)}
                          onChange={() => {
                            setSelectedChannelIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(ch.id)) next.delete(ch.id);
                              else next.add(ch.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-border text-amber-600 dark:text-amber-400 focus:ring-amber-500/20"
                          aria-label={`Selecionar ${ch.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{ch.name}</p>
                          <p className="font-mono text-xs text-muted-foreground" title={ch.uazapi_instance_id}>
                            {ch.uazapi_instance_id.length > 16 ? `${ch.uazapi_instance_id.slice(0, 12)}…` : ch.uazapi_instance_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {status === "connected" && channelConnectedNumbers[ch.id] ? (
                          <span className="font-medium text-foreground" title={channelConnectedNumbers[ch.id]}>
                            {formatConnectedNumber(channelConnectedNumbers[ch.id])}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ch.queue_id ? (queues.find((q) => q.id === ch.queue_id)?.name ?? "—") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
                          title={
                            status === "error" && channelStatusErrors[ch.id]
                              ? channelStatusErrors[ch.id]
                              : status === "disconnected"
                                ? "Sessão WhatsApp não está ativa nesta instância. Abra Configurar e conecte de novo (QR)."
                                : undefined
                          }
                        >
                          {status === "connected" ? (
                            <Wifi className="h-3.5 w-3.5" />
                          ) : status === "connecting" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <WifiOff className="h-3.5 w-3.5" />
                          )}
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">{conv}</td>
                      <td className="px-4 py-3 text-center font-medium text-foreground">{msgs}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-[#16A34A]">{open}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {loading ? (
                            <span className="rounded-lg p-2 text-muted-foreground">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </span>
                          ) : (
                            <>
                              {status === "connected" && (
                                <button
                                  type="button"
                                  onClick={() => handleDisconnect(ch)}
                                  title="Desconectar"
                                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-amber-600 transition-colors"
                                >
                                  <WifiOff className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openConfig(ch)}
                                title="Configurar"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                              >
                                <Settings className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(ch)}
                                title="Excluir"
                                className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SideOver Nova conexão - apenas cria a instância; conectar via Config */}
      <SideOver open={sideOverOpen} onClose={closeSideOver} title="Nova conexão WhatsApp" width={600}>
        <p className="mb-4 text-sm text-muted-foreground">
          Crie a instância primeiro. Depois, clique em <strong>Configurar</strong> na tabela para gerar o QR Code e conectar o WhatsApp.
        </p>
        <label className="mb-1 block text-sm font-medium text-foreground">Nome da conexão</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Atendimento"
          className={`${formInputClass} mb-4`}
        />
        <label className="mb-1 block text-sm font-medium text-foreground">Caixa de entrada</label>
        <select
          value={queueId}
          onChange={(e) => setQueueId(e.target.value)}
          className={`${formInputClass} mb-4`}
        >
          <option value="">Nenhuma</option>
          {queues.map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
        <p className="mb-4 text-xs text-muted-foreground">
          As conversas deste número serão agrupadas nesta caixa. Para criar novas caixas, vá em{" "}
          <strong>Filas</strong> no topo da tela.
        </p>
        {createError && <p className="mb-3 text-sm text-red-600">{createError}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeSideOver}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={createInstance}
            disabled={creating || !canManageChannels}
            className="inline-flex items-center gap-2 rounded-lg bg-clicvend-orange px-4 py-2 text-sm font-medium text-white hover:bg-clicvend-orange-dark disabled:opacity-60"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando…
              </>
            ) : (
              "Criar"
            )}
          </button>
        </div>
      </SideOver>

      {/* SideOver Configuração do canal */}
      {configChannelId && (
        <ChannelConfigSideOver
          open={configSideOverOpen}
          onClose={closeConfig}
          channelId={configChannelId}
          channelName={configChannelName}
          channelQueueId={configChannelQueueId}
          queues={queues}
          companySlug={slug}
          onSaved={() => {
            fetchChannels();
            fetchStats();
            if (configChannelId) fetchStatus(configChannelId);
          }}
        />
      )}

      {/* Modal de confirmação de exclusão de conexão */}
      <ConfirmDialog
        open={!!deleteConfirmChannel}
        onClose={() => setDeleteConfirmChannel(null)}
        title="Excluir conexão"
        message={deleteConfirmChannel ? `Excluir a conexão "${deleteConfirmChannel.name}"? Primeiro tentamos apagar na UAZAPI; em seguida o registro é removido do banco.` : ""}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={doDeleteChannel}
        onCancel={() => setDeleteConfirmChannel(null)}
      />
      <ConfirmDialog
        open={!!deleteLocalOnlyChannel}
        onClose={() => setDeleteLocalOnlyChannel(null)}
        title="Remover só do ControlZap?"
        message={
          deleteLocalOnlyChannel
            ? `A UAZAPI não aceitou excluir a instância (token inválido ou instância já removida lá). Deseja remover apenas o registro da conexão "${deleteLocalOnlyChannel.name}" no sistema? As mensagens deixam de ser roteadas para esta empresa; se a instância ainda existir na UAZ, apague-a manualmente no painel da UAZ.`
            : ""
        }
        confirmLabel="Remover do sistema"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={doDeleteChannelLocalOnly}
        onCancel={() => setDeleteLocalOnlyChannel(null)}
      />
      <ConfirmDialog
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        title={bulkConfirm?.type === "disconnect" ? "Desconectar conexões selecionadas?" : "Excluir conexões selecionadas?"}
        message={
          bulkConfirm?.type === "disconnect"
            ? `Desconectar ${bulkConfirm.ids.length} conexão(ões) do WhatsApp? Será necessário escanear o QR Code novamente para reconectar.`
            : `Excluir ${bulkConfirm?.ids.length ?? 0} conexão(ões)? Esta ação não pode ser desfeita.`
        }
        confirmLabel={bulkConfirm?.type === "disconnect" ? "Desconectar" : "Excluir"}
        cancelLabel="Cancelar"
        variant={bulkConfirm?.type === "disconnect" ? "warning" : "danger"}
        onConfirm={async () => {
          const pending = bulkConfirm;
          setBulkConfirm(null);
          if (!pending) return;
          if (pending.type === "disconnect") {
            await executeBulkDisconnect(pending.ids);
          } else {
            await executeBulkDelete(pending.ids);
          }
        }}
        onCancel={() => setBulkConfirm(null)}
      />
    </div>
  );
}
