import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { getProfileForCompany, requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  invalidateConversationDetail,
  invalidateConversationList,
} from "@/lib/redis/inbox-state";
import { linkConversationToDefaultChannel } from "@/lib/inbox/link-conversation-channel";
import {
  getQueueAgentUserIds,
  isOrphanAssignee,
  isSoleActiveAgent,
  isSoleAgentInQueue,
} from "@/lib/inbox/sole-agent";
import { isCommercialQueue } from "@/lib/queue/commercial";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function canTakeOverFromOtherAgent(companyId: string, userId: string): Promise<boolean> {
  const profile = await getProfileForCompany(companyId);
  if (!profile) return false;
  if (profile.is_owner || (profile.role === "admin" && !profile.role_id)) return true;
  const [assignErr, manageErr] = await Promise.all([
    requirePermission(companyId, PERMISSIONS.inbox.assign),
    requirePermission(companyId, PERMISSIONS.inbox.manage_tickets),
  ]);
  return assignErr === null || manageErr === null;
}

/**
 * POST /api/conversations/[id]/claim
 * Assume o atendimento (atribui a conversa ao usuário logado).
 * Nunca cria conversa nova: só atualiza assigned_to e status da conversa existente.
 * Só funciona se a conversa estiver sem atendente (assigned_to null).
 * Exige permissão inbox.claim.
 * Atualiza status para in_progress (ticket em atendimento).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claimErr = await requirePermission(companyId, PERMISSIONS.inbox.claim);
  if (claimErr) {
    return NextResponse.json({ error: claimErr.error }, { status: claimErr.status });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: conversation, error: fetchErr } = await supabase
    .from("conversations")
    .select("id, assigned_to, status, company_id, queue_id, channel_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (fetchErr || !conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const statusSlug = String(conversation.status || "").toLowerCase();
  const { data: statusRow } = await supabase
    .from("company_ticket_statuses")
    .select("is_closed")
    .eq("company_id", companyId)
    .eq("slug", statusSlug)
    .limit(1)
    .maybeSingle();
  const isClosedStatus = statusRow?.is_closed === true || statusSlug === "closed";
  if (isClosedStatus) {
    return NextResponse.json(
      {
        error:
          "Ticket encerrado não pode ser assumido. Novas mensagens do cliente abrem um novo atendimento.",
      },
      { status: 400 }
    );
  }

  const existingAssignee = conversation.assigned_to as string | null;

  if (existingAssignee === user.id) {
    const linkedChannelId = await linkConversationToDefaultChannel(companyId, id);
    let assigned_to_name: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();
    assigned_to_name = (profile as { full_name?: string } | null)?.full_name?.trim() ?? null;
    return NextResponse.json({
      ...conversation,
      channel_id: linkedChannelId ?? conversation.channel_id,
      assigned_to_name,
      status: conversation.status ?? "in_progress",
    });
  }

  const soleCompany = await isSoleActiveAgent(companyId, user.id);
  const soleInQueue =
    conversation.queue_id &&
    (await isSoleAgentInQueue(companyId, conversation.queue_id as string, user.id));
  const takeOver = await canTakeOverFromOtherAgent(companyId, user.id);

  if (existingAssignee != null && existingAssignee !== user.id) {
    const orphan = await isOrphanAssignee(companyId, existingAssignee);
    let onlyMeInQueue = false;
    let assigneeNotInQueue = false;
    if (conversation.queue_id) {
      const queueId = conversation.queue_id as string;
      const queueAgents = await getQueueAgentUserIds(companyId, queueId);
      onlyMeInQueue =
        queueAgents.length > 0 && queueAgents.every((agentId) => agentId === user.id);
      assigneeNotInQueue = !queueAgents.includes(existingAssignee);
    }
    if (
      !orphan &&
      !soleCompany &&
      !soleInQueue &&
      !takeOver &&
      !onlyMeInQueue &&
      !assigneeNotInQueue
    ) {
      const admin = createServiceRoleClient();
      const { data: otherProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", existingAssignee)
        .eq("company_id", companyId)
        .maybeSingle();
      const otherName =
        (otherProfile as { full_name?: string } | null)?.full_name?.trim() || "outro atendente";
      return NextResponse.json(
        {
          error: `Chamado está com ${otherName}. Peça a um gestor para transferir ou use um usuário com permissão de atribuir atendimentos.`,
        },
        { status: 400 }
      );
    }
  }

  if (conversation.queue_id) {
    const [seeAllErr, manageErr] = await Promise.all([
      requirePermission(companyId, PERMISSIONS.inbox.see_all),
      requirePermission(companyId, PERMISSIONS.inbox.manage_tickets),
    ]);
    const canBypassCommercial =
      seeAllErr === null || manageErr === null || soleCompany || soleInQueue;
    if (!canBypassCommercial) {
      const commercial = await isCommercialQueue(supabase, companyId, conversation.queue_id);
      if (commercial) {
        return NextResponse.json(
          { error: "Chamados da fila comercial são distribuídos automaticamente." },
          { status: 400 }
        );
      }
    }
  }

  const now = new Date().toISOString();
  const writeClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServiceRoleClient()
    : supabase;
  const { data: updated, error: updateErr } = await writeClient
    .from("conversations")
    .update({
      assigned_to: user.id,
      status: "in_progress",
      updated_at: now,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id, channel_id, external_id, wa_chat_jid, kind, is_group, customer_phone, customer_name, queue_id, assigned_to, status, last_message_at, created_at, updated_at")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const linkedChannelId = await linkConversationToDefaultChannel(companyId, id);
  if (linkedChannelId && updated) {
    (updated as { channel_id?: string | null }).channel_id = linkedChannelId;
  }

  let assigned_to_name: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .single();
  assigned_to_name = (profile as { full_name?: string } | null)?.full_name?.trim() ?? null;

  await Promise.all([
    invalidateConversationList(companyId),
    invalidateConversationDetail(id),
  ]);

  return NextResponse.json({ ...updated, assigned_to_name });
}
