import { createServiceRoleClient } from "@/lib/supabase/admin";

/** user_ids com perfil ativo na empresa (atendentes cadastrados). */
export async function getActiveAgentUserIdsForCompany(companyId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id")
    .eq("company_id", companyId);
  if (error || !data) return [];
  const ids = new Set<string>();
  for (const row of data as { user_id?: string }[]) {
    const id = row.user_id?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Empresa com um único atendente cadastrado e é o usuário informado. */
export async function isSoleActiveAgent(companyId: string, userId: string): Promise<boolean> {
  const agents = await getActiveAgentUserIdsForCompany(companyId);
  return agents.length === 1 && agents[0] === userId;
}

/** Atendentes vinculados à fila (queue_assignments). */
export async function getQueueAgentUserIds(companyId: string, queueId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("queue_assignments")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("queue_id", queueId);
  if (error || !data) return [];
  const ids = new Set<string>();
  for (const row of data as { user_id?: string }[]) {
    const id = row.user_id?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Único atendente na fila e é o usuário informado. */
export async function isSoleAgentInQueue(
  companyId: string,
  queueId: string,
  userId: string
): Promise<boolean> {
  const agents = await getQueueAgentUserIds(companyId, queueId);
  return agents.length === 1 && agents[0] === userId;
}

/** assigned_to não corresponde a nenhum perfil ativo na empresa. */
export async function isOrphanAssignee(companyId: string, assignedTo: string | null): Promise<boolean> {
  if (!assignedTo) return false;
  const agents = await getActiveAgentUserIdsForCompany(companyId);
  return !agents.includes(assignedTo);
}

/** Quantidade de perfis (atendentes) cadastrados na empresa. */
export async function countActiveAgentsForCompany(companyId: string): Promise<number> {
  const agents = await getActiveAgentUserIdsForCompany(companyId);
  return agents.length;
}
