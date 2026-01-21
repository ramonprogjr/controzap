import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!

export async function POST(request: NextRequest) {
    try {
        const { leadId, message } = await request.json()

        if (!leadId || !message) {
            return NextResponse.json({ error: 'Lead ID e mensagem são obrigatórios' }, { status: 400 })
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

        if (!user) {
            const authHeader = request.headers.get('Authorization')
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7)
                const { data: { user: tokenUser } } = await supabaseAuth.auth.getUser(token)
                user = tokenUser
            }
        }

        if (!user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

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

        // Buscar lead
        const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id, company_id, seller_id, instance_id, phone')
            .eq('id', leadId)
            .single()

        if (!lead) {
            return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
        }

        // Buscar instância (preferir instance_id, fallback por seller_id)
        let instanceRow = null
        if (lead.instance_id) {
            const { data } = await supabaseAdmin
                .from('instances')
                .select('*')
                .eq('id', lead.instance_id)
                .single()
            instanceRow = data
        }

        if (!instanceRow && lead.seller_id) {
            const { data } = await supabaseAdmin
                .from('instances')
                .select('*')
                .eq('seller_id', lead.seller_id)
                .single()
            instanceRow = data
        }

        if (!instanceRow) {
            return NextResponse.json({ error: 'Instância não encontrada para este lead' }, { status: 404 })
        }

        const instanceId = instanceRow.uazapi_instance_id
        const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN

        // Enviar via UAZAPI
        const response = await fetch(`${UAZAPI_BASE_URL}/message/sendText/${instanceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': instanceToken,
                'apikey': instanceToken,
            },
            body: JSON.stringify({
                number: lead.phone,
                text: message,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Falha ao enviar: ${errorText}`)
        }

        // Salvar mensagem no banco
        await supabaseAdmin.from('messages').insert({
            company_id: lead.company_id,
            lead_id: lead.id,
            seller_id: lead.seller_id,
            instance_id: instanceRow.id,
            direction: 'outbound',
            content: message,
            message_type: 'text',
            sent_at: new Date().toISOString(),
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API Send] Erro:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
