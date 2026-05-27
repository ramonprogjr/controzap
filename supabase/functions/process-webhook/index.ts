import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = Deno.env.get('UAZAPI_GLOBAL_TOKEN') || ''
const BUCKET = 'chat-media'

function normalizePhone(input: string): string {
  const digits = String(input || '').replace(/\D/g, '').replace(/@.*$/, '')
  if (!digits) return ''
  if (digits.length >= 12 && digits.startsWith('55')) return digits
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`
  return digits
}

interface NormMsg {
  phone: string
  isFromMe: boolean
  content: string
  messageType: string
  mediaUrl: string | null
  mediaMime: string | null
  mediaBase64: string | null
  timestamp: number
  instanceParam: string | null
  pushName: string | null
  externalId: string | null
}

async function resolveInstance(
  supabase: SupabaseClient,
  instanceParam: string | null,
  headerToken: string | null
) {
  if (instanceParam) {
    const { data } = await supabase
      .from('instances')
      .select('*')
      .or(`uazapi_instance_id.eq.${instanceParam},name.eq.${instanceParam}`)
      .maybeSingle()
    if (data) return data
  }

  if (headerToken) {
    const { data } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_key', headerToken)
      .maybeSingle()
    if (data) return data
  }

  return null
}

function extFromMime(mime: string | null, messageType: string): string {
  if (!mime) {
    const map: Record<string, string> = {
      audio: 'ogg',
      image: 'jpg',
      video: 'mp4',
      document: 'pdf',
      sticker: 'webp',
    }
    return map[messageType] || 'bin'
  }
  const part = mime.split('/')[1]?.split(';')[0]
  return part || 'bin'
}

async function uploadMedia(
  supabase: SupabaseClient,
  companyId: string,
  messageId: string,
  bytes: Uint8Array,
  mime: string,
  messageType: string
): Promise<string | null> {
  const ext = extFromMime(mime, messageType)
  const path = `${companyId}/${messageId}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
  })

  if (error) {
    console.error('[webhook] storage upload error:', error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function persistMedia(
  supabase: SupabaseClient,
  instanceRow: { uazapi_instance_key?: string },
  companyId: string,
  messageId: string,
  messageType: string,
  mediaUrl: string | null,
  mediaMime: string | null,
  mediaBase64: string | null
): Promise<{ media_url: string | null; media_mime: string | null }> {
  if (messageType === 'text') {
    return { media_url: null, media_mime: null }
  }

  let bytes: Uint8Array | null = null
  let mime = mediaMime || 'application/octet-stream'

  if (mediaBase64) {
    const raw = mediaBase64.includes('base64,')
      ? mediaBase64.split('base64,')[1]
      : mediaBase64
    try {
      const binary = atob(raw)
      bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    } catch (e) {
      console.error('[webhook] base64 decode failed:', e)
    }
  }

  if (!bytes && mediaUrl) {
    try {
      const token = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN
      const res = await fetch(mediaUrl, {
        headers: token ? { token, apikey: token } : {},
      })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        bytes = new Uint8Array(buf)
        mime = res.headers.get('content-type') || mime
      }
    } catch (e) {
      console.error('[webhook] media fetch failed:', e)
    }
  }

  if (!bytes) {
    return { media_url: mediaUrl, media_mime: mime }
  }

  const publicUrl = await uploadMedia(supabase, companyId, messageId, bytes, mime, messageType)
  return { media_url: publicUrl || mediaUrl, media_mime: mime }
}

async function findLeadByPhone(
  supabase: SupabaseClient,
  companyId: string,
  phone: string
) {
  const normalized = normalizePhone(phone)
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)

  return leads?.find((l) => normalizePhone(l.phone) === normalized) || null
}

async function upsertLead(
  supabase: SupabaseClient,
  companyId: string,
  instanceRow: { id: string; seller_id?: string | null },
  phone: string,
  pushName: string | null
) {
  let lead = await findLeadByPhone(supabase, companyId, phone)

  if (!lead) {
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        company_id: companyId,
        seller_id: instanceRow.seller_id || null,
        instance_id: instanceRow.id,
        phone: normalizePhone(phone),
        name: pushName || 'Cliente',
        status: 'new',
        first_contact: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[webhook] lead insert error:', error.message)
      return null
    }
    return newLead
  }

  await supabase
    .from('leads')
    .update({ last_contact: new Date().toISOString() })
    .eq('id', lead.id)

  return lead
}

async function saveMessage(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  instanceRow: { id: string; company_id: string; seller_id?: string | null; uazapi_instance_key?: string }
) {
  const externalId = payload.external_id as string | null
  if (externalId) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('company_id', instanceRow.company_id)
      .eq('external_id', externalId)
      .maybeSingle()
    if (existing) return { skipped: true }
  }

  const messageId = crypto.randomUUID()
  const messageType = (payload.message_type as string) || 'text'

  const { media_url, media_mime } = await persistMedia(
    supabase,
    instanceRow,
    instanceRow.company_id,
    messageId,
    messageType,
    (payload.media_url as string) || null,
    (payload.media_mime as string) || null,
    (payload.media_base64 as string) || null
  )

  const row = {
    id: messageId,
    company_id: instanceRow.company_id,
    lead_id: payload.lead_id,
    seller_id: instanceRow.seller_id || null,
    instance_id: instanceRow.id,
    direction: payload.direction,
    content: payload.content,
    message_type: messageType,
    media_url,
    media_mime,
    external_id: externalId,
    sent_at: payload.sent_at,
  }

  const { error } = await supabase.from('messages').insert(row)
  if (error) {
    console.error('[webhook] message insert error:', error.message, JSON.stringify(row).slice(0, 200))
    return { error }
  }

  return { ok: true, messageId }
}

async function handleConnection(
  supabase: SupabaseClient,
  raw: Record<string, unknown>,
  instanceRow: { id: string; company_id: string }
) {
  const data = (raw.data || {}) as Record<string, unknown>
  const connected =
    data.state === 'open' ||
    data.status === 'connected' ||
    data.connected === true ||
    raw.event === 'connection' && data.state !== 'close'

  const phone =
    (data.phone as string) ||
    (data.jid as string)?.replace(/@.*/, '') ||
    (data.owner as string)?.replace(/@.*/, '') ||
    null

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    status: connected ? 'connected' : 'disconnected',
  }
  if (phone) updates.phone = normalizePhone(phone)

  await supabase.from('instances').update(updates).eq('id', instanceRow.id)
}

function parseBaileyMessage(body: Record<string, unknown>, urlInstance: string | null): NormMsg | null {
  const key = body.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined
  const message = body.message as Record<string, unknown> | undefined
  if (!key?.remoteJid || !message) return null

  const remoteJid = key.remoteJid
  if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast') || remoteJid === 'status@broadcast') {
    return null
  }

  const phone = normalizePhone(remoteJid)
  const isFromMe = key.fromMe === true
  let content = ''
  let messageType = 'text'
  let mediaUrl: string | null = (body.mediaUrl as string) || null
  let mediaMime: string | null = null
  let mediaBase64: string | null = (body.base64 as string) || null

  if (message.conversation) {
    content = String(message.conversation)
  } else if ((message.extendedTextMessage as { text?: string })?.text) {
    content = (message.extendedTextMessage as { text: string }).text
  } else if (message.audioMessage) {
    const a = message.audioMessage as Record<string, unknown>
    messageType = 'audio'
    mediaUrl = (a.url as string) || mediaUrl
    mediaMime = (a.mimetype as string) || 'audio/ogg'
    mediaBase64 = (a.base64 as string) || mediaBase64
    content = '[Áudio]'
  } else if (message.imageMessage) {
    const i = message.imageMessage as Record<string, unknown>
    messageType = 'image'
    mediaUrl = (i.url as string) || mediaUrl
    mediaMime = (i.mimetype as string) || 'image/jpeg'
    mediaBase64 = (i.base64 as string) || mediaBase64
    content = (i.caption as string) || '[Imagem]'
  } else if (message.videoMessage) {
    const v = message.videoMessage as Record<string, unknown>
    messageType = 'video'
    mediaUrl = (v.url as string) || mediaUrl
    mediaMime = (v.mimetype as string) || 'video/mp4'
    content = (v.caption as string) || '[Vídeo]'
  } else if (message.documentMessage) {
    const d = message.documentMessage as Record<string, unknown>
    messageType = 'document'
    mediaUrl = (d.url as string) || mediaUrl
    mediaMime = (d.mimetype as string) || 'application/pdf'
    content = (d.fileName as string) || '[Documento]'
  } else if (message.stickerMessage) {
    const s = message.stickerMessage as Record<string, unknown>
    messageType = 'sticker'
    mediaUrl = (s.url as string) || mediaUrl
    mediaMime = 'image/webp'
    content = '[Figurinha]'
  }

  if (!content) return null

  return {
    phone,
    isFromMe,
    content,
    messageType,
    mediaUrl,
    mediaMime,
    mediaBase64,
    timestamp: (body.messageTimestamp as number) || Math.floor(Date.now() / 1000),
    instanceParam: urlInstance || (body.instance as string) || null,
    pushName: (body.pushName as string) || null,
    externalId: key.id || null,
  }
}

function normalizePayload(raw: Record<string, unknown>, urlInstance: string | null): NormMsg[] {
  const out: NormMsg[] = []

  if (raw.event && raw.data && (raw.data as Record<string, unknown>).from !== undefined) {
    const d = raw.data as Record<string, unknown>
    const phone = normalizePhone(String(d.from))
    if (!phone || phone.includes('g.us')) return out

    const isFromMe =
      raw.event === 'send.message' ||
      raw.event === 'message_sent' ||
      d.fromMe === true

    const msgType = String(d.type || 'text')
    const typeMap: Record<string, string> = {
      audio: 'audio',
      image: 'image',
      video: 'video',
      document: 'document',
      sticker: 'sticker',
      ptt: 'audio',
    }
    const mType = typeMap[msgType] || 'text'
    const labelMap: Record<string, string> = {
      audio: '[Áudio]',
      image: '[Imagem]',
      video: '[Vídeo]',
      document: '[Documento]',
      sticker: '[Figurinha]',
      ptt: '[Áudio]',
    }
    const content = String(d.body || d.text || d.caption || labelMap[msgType] || '')
    if (!content) return out

    out.push({
      phone,
      isFromMe,
      content,
      messageType: mType,
      mediaUrl: (d.mediaUrl as string) || (d.url as string) || null,
      mediaMime: (d.mimetype as string) || null,
      mediaBase64: (d.base64 as string) || null,
      timestamp: (d.timestamp as number) || Math.floor(Date.now() / 1000),
      instanceParam: (raw.instance as string) || urlInstance,
      pushName: (d.pushName as string) || (d.senderName as string) || null,
      externalId: (d.id as string) || (d.messageId as string) || null,
    })
  }

  const baileyItems: Record<string, unknown>[] = []
  if (raw.data && Array.isArray(raw.data)) {
    baileyItems.push(...(raw.data as Record<string, unknown>[]))
  } else if (raw.data && (raw.data as Record<string, unknown>).key) {
    baileyItems.push(raw.data as Record<string, unknown>)
  } else if (raw.key) {
    baileyItems.push(raw)
  } else if (Array.isArray(raw.messages)) {
    baileyItems.push(...(raw.messages as Record<string, unknown>[]))
  }

  for (const body of baileyItems) {
    const parsed = parseBaileyMessage(body, urlInstance)
    if (parsed) out.push(parsed)
  }

  return out
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-instance, token',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    const urlChallenge = new URL(req.url)
    const challenge =
      urlChallenge.searchParams.get('hub.challenge') ||
      urlChallenge.searchParams.get('challenge') ||
      'ok'
    return new Response(challenge, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let raw: Record<string, unknown> = {}

    if (contentType.includes('application/json')) {
      raw = await req.json()
    } else {
      const text = await req.text()
      try {
        raw = JSON.parse(text)
      } catch {
        raw = { raw_text: text }
      }
    }

    console.log('[webhook] event:', raw.event || raw.type, 'keys:', Object.keys(raw).join(','))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const urlObj = new URL(req.url)
    const urlInstance =
      urlObj.searchParams.get('instance') ||
      req.headers.get('x-instance') ||
      null
    const headerToken =
      req.headers.get('token') ||
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      null

    const instanceParam =
      (raw.instance as string) || urlInstance

    let instanceRow = await resolveInstance(supabase, instanceParam, headerToken)

    const eventName = String(raw.event || raw.type || '')

    if (
      eventName.includes('connection') &&
      instanceRow
    ) {
      await handleConnection(supabase, raw, instanceRow)
      if (!eventName.includes('message') && normalizePayload(raw, urlInstance).length === 0) {
        return new Response(JSON.stringify({ success: true, handled: 'connection' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const messages = normalizePayload(raw, urlInstance)

    if (messages.length === 0 && !instanceRow) {
      console.error('[webhook] no messages and no instance resolved')
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const msg of messages) {
      if (!instanceRow) {
        instanceRow = await resolveInstance(
          supabase,
          msg.instanceParam || instanceParam,
          headerToken
        )
      }

      if (!instanceRow) {
        console.error('[webhook] instance not found for message from', msg.phone)
        continue
      }

      const companyId = instanceRow.company_id
      const phone = normalizePhone(msg.phone)
      if (!phone) continue

      if (!msg.isFromMe) {
        const lead = await upsertLead(supabase, companyId, instanceRow, phone, msg.pushName)
        if (!lead) continue

        await supabase.from('notifications').insert({
          company_id: companyId,
          lead_id: lead.id,
          lead_name: msg.pushName || lead.name || 'Cliente',
          type: 'message',
          title: msg.pushName || lead.name || 'Nova mensagem',
          body: msg.content.slice(0, 200),
          read: false,
        })

        await saveMessage(supabase, {
          lead_id: lead.id,
          direction: 'inbound',
          content: msg.content,
          message_type: msg.messageType,
          media_url: msg.mediaUrl,
          media_mime: msg.mediaMime,
          media_base64: msg.mediaBase64,
          external_id: msg.externalId,
          sent_at: new Date(msg.timestamp * 1000).toISOString(),
        }, instanceRow)
      } else {
        const lead = await findLeadByPhone(supabase, companyId, phone)
        if (!lead) continue

        await saveMessage(supabase, {
          lead_id: lead.id,
          direction: 'outbound',
          content: msg.content,
          message_type: msg.messageType,
          media_url: msg.mediaUrl,
          media_mime: msg.mediaMime,
          media_base64: msg.mediaBase64,
          external_id: msg.externalId,
          sent_at: new Date(msg.timestamp * 1000).toISOString(),
        }, instanceRow)
      }
    }

    return new Response(JSON.stringify({ success: true, processed: messages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[webhook] fatal:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
