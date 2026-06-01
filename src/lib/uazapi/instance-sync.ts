import type { SupabaseClient } from "@supabase/supabase-js";
import { listInstances, type InstanceResponse } from "@/lib/uazapi/client";

export type UazInstanceRow = InstanceResponse & {
  adminField01?: string;
  adminField02?: string;
  token?: string;
  apikey?: string;
  instance?: InstanceResponse & {
    id?: string;
    token?: string;
    apikey?: string;
    adminField01?: string;
  };
};

function normalizeUazInstances(raw: InstanceResponse[] | undefined): UazInstanceRow[] {
  if (!raw?.length) return [];
  return raw.map((item) => {
    const nested = (item as UazInstanceRow).instance;
    const row = nested ?? item;
    return {
      ...item,
      id: row.id ?? item.id ?? item.name,
      adminField01:
        (item as UazInstanceRow).adminField01 ??
        nested?.adminField01 ??
        (row as UazInstanceRow).adminField01,
      token:
        (item as UazInstanceRow).token ??
        (item as UazInstanceRow).apikey ??
        nested?.token ??
        nested?.apikey ??
        item.token,
    } as UazInstanceRow;
  });
}

export async function listUazInstances(): Promise<{
  ok: boolean;
  instances: UazInstanceRow[];
  error?: string;
}> {
  const result = await listInstances();
  if (!result.ok) {
    return { ok: false, instances: [], error: result.error };
  }
  return { ok: true, instances: normalizeUazInstances(result.data) };
}

export async function getLinkedInstanceIds(admin: SupabaseClient): Promise<Set<string>> {
  const linked = new Set<string>();

  const { data: channels } = await admin.from("channels").select("uazapi_instance_id");
  for (const row of channels ?? []) {
    const id = String((row as { uazapi_instance_id?: string }).uazapi_instance_id ?? "").trim();
    if (id) linked.add(id);
  }

  const { data: legacyInstances, error: legacyErr } = await admin
    .from("instances")
    .select("uazapi_instance_id");
  if (!legacyErr) {
    for (const row of legacyInstances ?? []) {
      const id = String((row as { uazapi_instance_id?: string }).uazapi_instance_id ?? "").trim();
      if (id) linked.add(id);
    }
  }

  return linked;
}

function instanceIdOf(row: UazInstanceRow): string {
  return String(row.id ?? row.instance?.id ?? row.name ?? "").trim();
}

export function findOrphanForCompany(
  companyId: string,
  uazList: UazInstanceRow[],
  linkedIds: Set<string>
): UazInstanceRow | null {
  const company = companyId.trim();
  if (!company) return null;

  for (const row of uazList) {
    const id = instanceIdOf(row);
    if (!id || linkedIds.has(id)) continue;
    const field01 = String(row.adminField01 ?? row.instance?.adminField01 ?? "").trim();
    if (field01 === company) return row;
  }
  return null;
}

export async function resolveInstanceToken(
  instance: UazInstanceRow,
  allInstances?: UazInstanceRow[]
): Promise<string | null> {
  const direct =
    instance.token ??
    instance.apikey ??
    instance.instance?.token ??
    instance.instance?.apikey;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const id = instanceIdOf(instance);
  if (!id) return null;

  const pool = allInstances ?? (await listUazInstances()).instances;
  const match = pool.find((item) => instanceIdOf(item) === id);
  const token =
    match?.token ??
    match?.apikey ??
    match?.instance?.token ??
    match?.instance?.apikey;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

export function isUazInstanceLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("maximum number of instances") ||
    lower.includes("max instances") ||
    lower.includes("instance limit") ||
    lower.includes("connected reached") ||
    lower.includes("limite") ||
    lower.includes("máximo") ||
    lower.includes("maximo") ||
    lower.includes("quota")
  );
}

function instanceStatusConnected(row: UazInstanceRow): boolean {
  const status = String(row.status ?? row.instance?.status ?? "").toLowerCase();
  const connected = row.connected ?? row.instance?.connected;
  return connected === true || status === "connected";
}

/** Outra instância UAZ já conectada no admintoken (bloqueia novo /instance/connect no plano). */
export function findBlockingConnectedInstance(
  uazList: UazInstanceRow[],
  currentInstanceId?: string
): UazInstanceRow | null {
  const current = String(currentInstanceId ?? "").trim();

  for (const row of uazList) {
    const id = instanceIdOf(row);
    if (!id || (current && id === current)) continue;
    if (instanceStatusConnected(row)) return row;
  }
  return null;
}

export function formatUazConnectedLimitMessage(blocker: UazInstanceRow | null): string {
  const label = blocker
    ? String(blocker.name ?? blocker.instance?.name ?? instanceIdOf(blocker) ?? "").trim()
    : "";
  const suffix = label ? ` ("${label}")` : "";
  return (
    "Limite de instâncias WhatsApp conectadas no plano UAZAPI atingido para este admintoken. " +
    `Já existe outra instância conectada${suffix} na mesma conta UAZ (compartilhada com Galima). ` +
    "Desconecte a instância antiga no Galima ou no painel UAZ antes de conectar este número, " +
    "ou aumente o plano UAZ para permitir mais conexões simultâneas."
  );
}
