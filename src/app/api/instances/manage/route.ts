import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, instanceId, phone, name, presence, privacy, url, headers } = body

        if (!instanceId || !action) {
            return NextResponse.json({ error: 'ID e Ação são obrigatórios' }, { status: 400 })
        }

        const cookieStore = await cookies()
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() },
                    setAll() { },
                },
            }
        )

        const { data: { user: cookieUser } } = await supabaseAuth.auth.getUser()
        let user = cookieUser

        // Fallback para Header Authorization
        if (!user) {
            const authHeader = request.headers.get('Authorization')
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7)
                const { data: { user: tokenUser } } = await supabaseAuth.auth.getUser(token)
                user = tokenUser
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 })
        }

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

        // Buscar instância no banco para garantir que pertence à empresa do usuário
        const { data: userData } = await supabaseAdmin.from('users').select('company_id').eq('id', user.id).single()
        const { data: instanceRow } = await supabaseAdmin
            .from('instances')
            .select('*')
            .eq('uazapi_instance_id', instanceId)
            .eq('company_id', userData?.company_id)
            .single()

        if (!instanceRow) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })

        const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN
        const instanceHeaders = { 'token': instanceToken, 'apikey': instanceToken, 'Content-Type': 'application/json' }
        let result: any = {}

        switch (action) {
            case 'status':
                const statusRes = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
                    headers: instanceHeaders
                })
                result = await statusRes.json()
                break

            case 'connect':
                const connRes = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
                    method: 'POST',
                    headers: instanceHeaders,
                    body: JSON.stringify({ phone: phone || undefined })
                })
                result = await connRes.json()
                break

            case 'disconnect':
                const discRes = await fetch(`${UAZAPI_BASE_URL}/instance/disconnect`, {
                    method: 'GET',
                    headers: instanceHeaders
                })
                result = await discRes.json()
                break

            case 'delete':
                await fetch(`${UAZAPI_BASE_URL}/instance`, {
                    method: 'DELETE',
                    headers: instanceHeaders
                })
                await supabaseAdmin.from('instances').delete().eq('id', instanceRow.id)
                result = { success: true }
                break

            case 'updateName':
                const nameRes = await fetch(`${UAZAPI_BASE_URL}/instance/updateInstanceName`, {
                    method: 'POST',
                    headers: instanceHeaders,
                    body: JSON.stringify({ name })
                })
                result = await nameRes.json()
                // Atualizar no nosso banco também
                await supabaseAdmin.from('instances').update({ name }).eq('uazapi_instance_id', instanceId)
                break

            case 'updateAdminFields':
                const adminFieldsRes = await fetch(`${UAZAPI_BASE_URL}/instance/updateAdminFields`, {
                    method: 'POST',
                    headers: { 'admintoken': UAZAPI_GLOBAL_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: instanceId,
                        adminField01: body.adminField01 || '',
                        adminField02: body.adminField02 || '',
                    }),
                })
                result = await adminFieldsRes.json()
                // Atualizar no nosso banco também
                await supabaseAdmin.from('instances').update({
                    admin_field_01: body.adminField01,
                    admin_field_02: body.adminField02
                }).eq('uazapi_instance_id', instanceId)
                break

            case 'presence':
                const presenceRes = await fetch(`${UAZAPI_BASE_URL}/instance/presence`, {
                    method: 'POST',
                    headers: instanceHeaders,
                    body: JSON.stringify({ presence })
                })
                result = await presenceRes.json()
                break

            case 'privacy':
                // Se for GET (sem body de privacy), busca. Se tiver body, altera.
                if (privacy) {
                    const privRes = await fetch(`${UAZAPI_BASE_URL}/instance/privacy`, {
                        method: 'POST',
                        headers: instanceHeaders,
                        body: JSON.stringify(privacy)
                    })
                    result = await privRes.json()
                } else {
                    const privRes = await fetch(`${UAZAPI_BASE_URL}/instance/privacy`, {
                        method: 'GET',
                        headers: instanceHeaders
                    })
                    result = await privRes.json()
                }
                break

            case 'setWebhook':
                const webRes = await fetch(`${UAZAPI_BASE_URL}/globalwebhook`, {
                    method: 'POST',
                    headers: { 'admintoken': UAZAPI_GLOBAL_TOKEN, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url,
                        events: ['messages', 'connection', 'history'],
                        excludeMessages: ["wasSentByApi"],
                        addUrlEvents: true,
                        addUrlTypesMessages: true
                    })
                })
                result = await webRes.json()
                break

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API Manage] Erro:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
