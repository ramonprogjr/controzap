import { getCompanyIdFromRequest } from "@/lib/auth/get-company";
import { requirePermission } from "@/lib/auth/get-profile";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createInstance } from "@/lib/uazapi/client";
import { ensureGlobalUazWebhook } from "@/lib/uazapi/ensure-global-webhook";
import {
  findOrphanForCompany,
  getLinkedInstanceIds,
  isUazInstanceLimitError,
  listUazInstances,
  resolveInstanceToken,
} from "@/lib/uazapi/instance-sync";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type SupabaseAdmin = ReturnType<typeof createServiceRoleClient>;

async function createChannelForInstance(
  admin: SupabaseAdmin,
  params: {
    companyId: string;
    name: string;
    instanceId: string;
    token: string;
    queueId?: string;
    reused?: boolean;
  }
) {
  const { companyId, name, instanceId, token, queueId, reused } = params;
  const { data: queue } = queueId
    ? await admin.from("queues").select("id").eq("company_id", companyId).eq("id", queueId).single()
    : { data: null };

  const { data: channel, error: chError } = await admin
    .from("channels")
    .insert({
      company_id: companyId,
      name,
      uazapi_instance_id: instanceId,
      uazapi_token_encrypted: token,
      queue_id: queue?.id ?? null,
      is_active: true,
    })
    .select("id, name, uazapi_instance_id, queue_id, is_active, created_at")
    .single();

  if (chError) {
    return {
      ok: false as const,
      status: 500 as const,
      body: {
        error: chError.message,
        instanceId,
        token,
        channelError: chError.message,
        message: reused
          ? "Instância reutilizada, mas falha ao criar canal"
          : "Instance created but channel creation failed",
        reused: reused ?? false,
      },
    };
  }

  if (queue?.id) {
    await admin.from("channel_queues").insert({
      channel_id: channel.id,
      queue_id: queue.id,
      is_default: true,
    });
  }

  return {
    ok: true as const,
    status: 200 as const,
    body: {
      instanceId,
      token,
      reused: reused ?? false,
      channel: { id: channel.id, name: channel.name, uazapi_instance_id: channel.uazapi_instance_id },
    },
  };
}

/**
 * POST /api/uazapi/instance
 * Cria uma instância UAZAPI (admin) e opcionalmente um canal na empresa.
 * Reutiliza instância órfã da empresa (adminField01) quando o limite UAZ está cheio.
 * Body: { name: string, createChannel?: boolean, queue_id?: string }
 */
export async function POST(request: Request) {
  const companyId = await getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json(
      { error: "Sessão ou empresa inválida. Recarregue a página e tente de novo." },
      { status: 401 }
    );
  }
  const permErr = await requirePermission(companyId, PERMISSIONS.channels.manage);
  if (permErr) {
    return NextResponse.json(
      { error: permErr.error, code: "code" in permErr ? permErr.code : undefined },
      { status: permErr.status }
    );
  }

  let body: { name?: string; createChannel?: boolean; queue_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = await createClient();
  if (body.createChannel) {
    const { count } = await supabase
      .from("channels")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Limite de 3 números por empresa atingido." },
        { status: 403 }
      );
    }
  }

  let admin: SupabaseAdmin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Servidor sem SUPABASE_SERVICE_ROLE_KEY. Configure no Render (Environment) e faça redeploy.",
        code: "missing_service_role",
      },
      { status: 503 }
    );
  }
  const listResult = await listUazInstances();
  const linkedIds = await getLinkedInstanceIds(admin);
  const orphan = listResult.ok
    ? findOrphanForCompany(companyId, listResult.instances, linkedIds)
    : null;

  let instanceId = "";
  let token = "";
  let reused = false;

  if (orphan) {
    instanceId = String(orphan.id ?? orphan.instance?.id ?? orphan.name ?? "").trim();
    const resolvedToken = await resolveInstanceToken(orphan, listResult.instances);
    if (instanceId && resolvedToken) {
      token = resolvedToken;
      reused = true;
    }
  }

  if (!token) {
    const uazName = `${name.replace(/\s+/g, "_")}_${Date.now()}`;
    const result = await createInstance({
      name: uazName,
      adminField01: companyId,
    });

    if (!result.ok || !result.token || !result.instance) {
      const raw = (result.error ?? "Failed to create UAZAPI instance").trim();
      let error = raw;
      if (isUazInstanceLimitError(raw)) {
        error =
          "Limite de instâncias WhatsApp no provedor UAZAPI atingido para este admintoken. " +
          "Não é o limite de 3 canais da empresa: é o teto do plano/conta UAZ. " +
          "Remova instâncias antigas no painel UAZ, ou aumente o plano, ou use outro UAZAPI_ADMIN_TOKEN com vagas.";
      }
      return NextResponse.json({ error }, { status: 502 });
    }

    instanceId = result.instance.id ?? result.instance.name ?? "";
    token = result.token;
  }

  if (body.createChannel) {
    const channelResult = await createChannelForInstance(admin, {
      companyId,
      name,
      instanceId,
      token,
      queueId: body.queue_id,
      reused,
    });
    if (!channelResult.ok) {
      return NextResponse.json(channelResult.body, { status: channelResult.status });
    }

    const webhookResult = await ensureGlobalUazWebhook(request);
    return NextResponse.json(
      {
        ...channelResult.body,
        webhook: {
          ok: webhookResult.ok,
          url: webhookResult.webhookUrl,
          ...(webhookResult.error ? { error: webhookResult.error } : {}),
        },
      },
      { status: channelResult.status }
    );
  }

  return NextResponse.json({
    instanceId,
    token,
    reused,
  });
}
