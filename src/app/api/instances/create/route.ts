import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!

export async function POST(request: NextRequest) {
  try {
    const { instanceName, adminField01, adminField02 } = await request.json()

    if (!instanceName || !instanceName.trim()) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 })
    }

    const cookieStore = await cookies()

    // 1. Verificar usuário com ANON_KEY (mais confiável para ler cookies)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { }, // No-op em API routes
        },
      }
    )

    const { data: { user: cookieUser }, error: cookieError } = await supabaseAuth.auth.getUser()
    let user = cookieUser

    // Fallback: Bearer Token
    if (!user) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: { user: tokenUser } } = await supabaseAuth.auth.getUser(token)
        user = tokenUser
      }
    }

    if (!user) {
      console.error('[API Create] ❌ Usuário não autenticado. Erro:', cookieError?.message)
      return NextResponse.json({ error: 'Sessão expirada. Por favor, faça login novamente.' }, { status: 401 })
    }

    // 2. Cliente com SERVICE_ROLE para gravar no banco
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { },
        },
      }
    )

    console.log('[API Create] ✅ Usuário autenticado:', user.email)

    const { data: userData } = await supabaseAdmin.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada. Certifique-se de estar vinculado a uma empresa.' }, { status: 404 })
    }

    // Criar nome único
    const uniqueInstanceName = `${instanceName.trim().replace(/\s+/g, '_')}_${Date.now()}`

    // Criar no UAZAPI
    const instanceResponse = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': UAZAPI_GLOBAL_TOKEN!,
      },
      body: JSON.stringify({
        name: uniqueInstanceName,
        systemName: 'ControlZap_CRM',
        adminField01: adminField01 || '',
        adminField02: adminField02 || '',
      }),
    })

    if (!instanceResponse.ok) {
      const errorText = await instanceResponse.text()
      console.error('[API Create] ❌ Erro na UAZAPI:', errorText)
      if (instanceResponse.status === 401) {
        return NextResponse.json({
          error: 'Configuração Inválida: O Token Global da UAZAPI (Admin Token) está incorreto ou expirado.'
        }, { status: 401 })
      }
      return NextResponse.json({ error: `Falha UAZAPI: ${errorText}` }, { status: instanceResponse.status })
    }

    const instance = await instanceResponse.json()

    // Garantir que o ID da instância seja uma string (algumas versões da API podem retornar objeto)
    let instanceId = uniqueInstanceName;
    if (instance.instance) {
      instanceId = typeof instance.instance === 'object' ? (instance.instance.id || instance.instance.instance || uniqueInstanceName) : instance.instance;
    }

    const instanceToken = instance.token || instance.apikey || '';

    // 1. Configurar Webhook Global (Garantir que está ativo)
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-webhook`

      await fetch(`${UAZAPI_BASE_URL}/globalwebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admintoken': UAZAPI_GLOBAL_TOKEN!,
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['messages', 'connection', 'history', 'messages_update'],
          excludeMessages: ['wasSentByApi'],
          addUrlEvents: true,
          addUrlTypesMessages: true
        }),
      })
    } catch (webhookErr) {
      console.error('[API Create] Erro ao configurar webhook global:', webhookErr)
    }

    // 2. Salvar no banco
    const { data: instanceRow, error } = await supabaseAdmin
      .from('instances')
      .insert({
        company_id: userData.company_id,
        name: instanceName.trim(),
        phone: '',
        uazapi_instance_id: instanceId,
        uazapi_instance_key: instanceToken,
        status: 'pending',
        admin_field_01: adminField01 || null,
        admin_field_02: adminField02 || null,
      })
      .select('id, company_id, name, phone, uazapi_instance_id, uazapi_instance_key, status, created_at')
      .single()

    if (error) {
      console.error('[API Create] ❌ Erro ao salvar no banco:', error)
      throw error
    }

    return NextResponse.json({ success: true, instance: instanceRow, uazapiData: instance })
  } catch (error: any) {
    console.error('[API Create] Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
