import { createServiceRoleClient } from "@/lib/supabase/admin";

type ActiveChannel = { id: string };

async function listActiveChannels(companyId: string): Promise<ActiveChannel[]> {
  const admin = createServiceRoleClient();
  const { data: channels } = await admin
    .from("channels")
    .select("id, uazapi_token_encrypted, is_active")
    .eq("company_id", companyId)
    .not("uazapi_token_encrypted", "is", null);

  return (channels ?? []).filter(
    (ch) =>
      (ch as { is_active?: boolean }).is_active !== false &&
      typeof (ch as { uazapi_token_encrypted?: string }).uazapi_token_encrypted === "string" &&
      (ch as { uazapi_token_encrypted: string }).uazapi_token_encrypted.trim().length > 0
  ) as ActiveChannel[];
}

/** Escolhe canal ativo: único da empresa, ou o da fila da conversa, ou o primeiro conectado. */
async function pickChannelForConversation(
  companyId: string,
  queueId: string | null | undefined
): Promise<string | null> {
  const active = await listActiveChannels(companyId);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0]!.id;

  if (queueId) {
    const admin = createServiceRoleClient();
    const activeIds = active.map((c) => c.id);
    const { data: cqRows } = await admin
      .from("channel_queues")
      .select("channel_id, is_default")
      .eq("queue_id", queueId)
      .in("channel_id", activeIds)
      .order("is_default", { ascending: false });
    const matches = (cqRows ?? []) as { channel_id: string }[];
    if (matches.length === 1) return matches[0]!.channel_id;
    if (matches.length > 1) return matches[0]!.channel_id;
  }

  return active[0]!.id;
}

/**
 * Se a conversa não tem canal, vincula um canal WhatsApp ativo da empresa.
 */
export async function linkConversationToDefaultChannel(
  companyId: string,
  conversationId: string
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: conv } = await admin
    .from("conversations")
    .select("id, channel_id, queue_id")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!conv) return null;
  const existing = (conv as { channel_id?: string | null }).channel_id;
  if (existing) return existing;

  const channelId = await pickChannelForConversation(
    companyId,
    (conv as { queue_id?: string | null }).queue_id ?? null
  );
  if (!channelId) return null;

  const { error } = await admin
    .from("conversations")
    .update({ channel_id: channelId, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("company_id", companyId);
  if (error) return null;
  return channelId;
}

/** Canal único ativo da empresa (para UI/dev). */
export async function getSingleActiveChannelId(companyId: string): Promise<string | null> {
  const active = await listActiveChannels(companyId);
  return active.length === 1 ? active[0]!.id : active[0]?.id ?? null;
}
