import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { normalizePhone } from '@/lib/utils/phone'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!

export async function POST(request: NextRequest) {
  try {
    const { instanceId } = await request.json()
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId é obrigatório' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() { } } }
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() { } } }
    )

    const { data: userData } = await supabaseAdmin.from('users').select('company_id').eq('id', user.id).single()
    const { data: instanceRow } = await supabaseAdmin
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', instanceId)
      .eq('company_id', userData?.company_id)
      .single()

    if (!instanceRow) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    const token = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN
    const headers = {
      'Content-Type': 'application/json',
      token,
      apikey: token,
    }

    const endpoints = [
      { url: `${UAZAPI_BASE_URL}/chat/findMessages`, body: { limit: 50 } },
      { url: `${UAZAPI_BASE_URL}/message/find`, body: { limit: 50 } },
      { url: `${UAZAPI_BASE_URL}/chat/messages`, body: { limit: 50 } },
    ]

    let imported = 0
    let lastError = ''

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { method: 'POST', headers, body: JSON.stringify(ep.body) })
        if (!res.ok) {
          lastError = await res.text()
          continue
        }

        const data = await res.json()
        const items: unknown[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.messages)
            ? data.messages
            : Array.isArray(data?.data)
              ? data.data
              : []

        if (items.length === 0) continue

        for (const item of items) {
          const row = item as Record<string, unknown>
          const key = row.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined
          const message = row.message as Record<string, unknown> | undefined
          if (!key?.remoteJid) continue

          const phone = normalizePhone(key.remoteJid)
          if (!phone) continue

          const isFromMe = key.fromMe === true
          let content = ''
          let messageType = 'text'

          if (!message) continue

          if (message.conversation) content = String(message.conversation)
          else if ((message.extendedTextMessage as { text?: string })?.text) {
            content = (message.extendedTextMessage as { text: string }).text
          } else if (message.imageMessage) {
            messageType = 'image'
            content = (message.imageMessage as { caption?: string }).caption || '[Imagem]'
          } else if (message.audioMessage) {
            messageType = 'audio'
            content = '[Áudio]'
          } else if (message.videoMessage) {
            messageType = 'video'
            content = '[Vídeo]'
          } else if (message.documentMessage) {
            messageType = 'document'
            content = (message.documentMessage as { fileName?: string }).fileName || '[Documento]'
          }

          if (!content) continue

          const externalId = key.id || null
          if (externalId) {
            const { data: existing } = await supabaseAdmin
              .from('messages')
              .select('id')
              .eq('company_id', instanceRow.company_id)
              .eq('external_id', externalId)
              .maybeSingle()
            if (existing) continue
          }

          let { data: lead } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('company_id', instanceRow.company_id)
            .eq('phone', phone)
            .maybeSingle()

          if (!lead) {
            const { data: newLead } = await supabaseAdmin
              .from('leads')
              .insert({
                company_id: instanceRow.company_id,
                instance_id: instanceRow.id,
                phone,
                name: 'Cliente',
                status: 'new',
              })
              .select('id')
              .single()
            lead = newLead
          }

          if (!lead) continue

          const { error } = await supabaseAdmin.from('messages').insert({
            company_id: instanceRow.company_id,
            lead_id: lead.id,
            instance_id: instanceRow.id,
            direction: isFromMe ? 'outbound' : 'inbound',
            content,
            message_type: messageType,
            external_id: externalId,
            sent_at: new Date(
              ((row.messageTimestamp as number) || Math.floor(Date.now() / 1000)) * 1000
            ).toISOString(),
          })

          if (!error) imported++
        }

        if (imported > 0) break
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      note: imported > 0
        ? `${imported} mensagens importadas`
        : 'Histórico também chega via webhook ao conectar. Nenhuma mensagem retornada pela API UAZAPI neste momento.',
      detail: imported === 0 ? lastError : undefined,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
