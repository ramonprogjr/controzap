import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = process.env.UAZAPI_GLOBAL_TOKEN!
const BUCKET = 'chat-media'
const MAX_BYTES = 16 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const leadId = formData.get('leadId') as string
    const file = formData.get('file') as File | null
    const mediaType = (formData.get('type') as string) || 'document'

    if (!leadId || !file) {
      return NextResponse.json({ error: 'leadId e arquivo são obrigatórios' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 16MB)' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() { } } }
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
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() { } } }
    )

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, company_id, seller_id, instance_id, phone')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    let instanceRow = null
    if (lead.instance_id) {
      const { data } = await supabaseAdmin.from('instances').select('*').eq('id', lead.instance_id).single()
      instanceRow = data
    }
    if (!instanceRow) {
      const { data } = await supabaseAdmin
        .from('instances')
        .select('*')
        .eq('company_id', lead.company_id)
        .in('status', ['connected', 'open'])
        .limit(1)
        .single()
      instanceRow = data
    }
    if (!instanceRow) {
      const { data } = await supabaseAdmin
        .from('instances')
        .select('*')
        .eq('company_id', lead.company_id)
        .limit(1)
        .single()
      instanceRow = data
    }
    if (!instanceRow) {
      return NextResponse.json({ error: 'Nenhuma instância WhatsApp encontrada' }, { status: 404 })
    }

    const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mime = file.type || 'application/octet-stream'

    const messageType =
      mediaType === 'image' ? 'image' :
      mediaType === 'audio' ? 'audio' :
      mediaType === 'video' ? 'video' : 'document'

    const endpointMap: Record<string, string> = {
      image: '/send/image',
      audio: '/send/audio',
      video: '/send/video',
      document: '/send/document',
    }
    const endpoint = endpointMap[messageType] || '/send/media'

    const uazBody: Record<string, string> = {
      number: lead.phone,
    }
    if (messageType === 'image') {
      uazBody.image = base64
      uazBody.mimetype = mime
    } else if (messageType === 'audio') {
      uazBody.audio = base64
      uazBody.mimetype = mime
    } else if (messageType === 'document') {
      uazBody.document = base64
      uazBody.fileName = file.name
      uazBody.mimetype = mime
    } else {
      uazBody.media = base64
      uazBody.mimetype = mime
    }

    let uazRes = await fetch(`${UAZAPI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: instanceToken,
        apikey: instanceToken,
      },
      body: JSON.stringify(uazBody),
    })

    if (!uazRes.ok && endpoint !== '/send/media') {
      uazRes = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: instanceToken,
          apikey: instanceToken,
        },
        body: JSON.stringify({
          number: lead.phone,
          type: messageType,
          file: base64,
          mimetype: mime,
          fileName: file.name,
        }),
      })
    }

    if (!uazRes.ok) {
      const errText = await uazRes.text()
      throw new Error(`Falha ao enviar mídia: ${errText}`)
    }

    const messageId = crypto.randomUUID()
    const ext = mime.split('/')[1]?.split(';')[0] || 'bin'
    const storagePath = `${lead.company_id}/${messageId}.${ext}`

    await supabaseAdmin.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mime,
      upsert: true,
    })

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

    const contentLabel: Record<string, string> = {
      image: file.name || '[Imagem]',
      audio: '[Áudio enviado]',
      video: '[Vídeo]',
      document: file.name || '[Documento]',
    }

    await supabaseAdmin.from('messages').insert({
      id: messageId,
      company_id: lead.company_id,
      lead_id: lead.id,
      seller_id: lead.seller_id,
      instance_id: instanceRow.id,
      direction: 'outbound',
      content: contentLabel[messageType] || file.name,
      message_type: messageType,
      media_url: publicUrlData.publicUrl,
      media_mime: mime,
      sent_at: new Date().toISOString(),
    })

    if (!lead.instance_id) {
      await supabaseAdmin.from('leads').update({ instance_id: instanceRow.id }).eq('id', lead.id)
    }

    return NextResponse.json({ success: true, messageId, media_url: publicUrlData.publicUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar mídia'
    console.error('[API Send Media]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
