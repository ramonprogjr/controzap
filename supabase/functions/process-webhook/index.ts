import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')!
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://controlzap.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = Deno.env.get('UAZAPI_GLOBAL_TOKEN')!

interface UazapiMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: { text: string }
    audioMessage?: {
      url?: string
      mimetype?: string
      seconds?: number
      ptt?: boolean
      base64?: string
    }
    imageMessage?: {
      url?: string
      caption?: string
      mimetype?: string
      base64?: string
    }
    videoMessage?: {
      url?: string
      caption?: string
      mimetype?: string
    }
    documentMessage?: {
      url?: string
      fileName?: string
      mimetype?: string
    }
    stickerMessage?: { url?: string }
  }
  messageTimestamp: number
  pushName?: string
  mediaUrl?: string
  base64?: string
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-instance',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Suporte a GET (challenge/ping do UAZAPI)
  if (req.method === 'GET') {
    const urlChallenge = new URL(req.url)
    const challenge = urlChallenge.searchParams.get('hub.challenge') || urlChallenge.searchParams.get('challenge') || 'ok'
    return new Response(challenge, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
  }

  // Log all incoming requests for debugging
  console.log('Webhook hit:', req.method, req.url)
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())).slice(0, 400))

  try {
    const contentType = req.headers.get('content-type') || ''
    let raw: any = {}

    if (contentType.includes('application/json')) {
      raw = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      formData.forEach((value, key) => { raw[key] = value })
    } else {
      const text = await req.text()
      try { raw = JSON.parse(text) } catch { raw = { raw_text: text } }
    }

    console.log('Webhook received:', JSON.stringify(raw).slice(0, 800))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Salvar payload bruto para debug (primeiros 600 chars)
    try {
      await supabase.from('notifications').insert({
        company_id: '30b172e4-b1a6-4795-8df1-646fd3b007d7',
        lead_id: null,
        lead_name: 'WEBHOOK_LOG',
        type: 'debug',
        title: `[LOG] event:${raw.event || raw.type || 'unknown'}`,
        body: JSON.stringify(raw).slice(0, 600),
        read: false,
      })
    } catch { /* ignore debug log errors */ }

    // ─── Normalise para estrutura interna ─────────────────────────────────────
    interface NormMsg {
      phone: string
      isFromMe: boolean
      content: string
      messageType: string
      mediaUrl: string | null
      timestamp: number
      instanceParam: string | null
      pushName: string | null
    }

    const normalised: NormMsg[] = []
    const urlObj = new URL(req.url)
    const urlInstance = urlObj.searchParams.get('instance') || req.headers.get('x-instance') || null

    // Formato UAZAPI nativo: { event, instance, data: { from, body, type, timestamp } }
    if (raw.event && raw.data && raw.data.from !== undefined) {
      const d = raw.data
      const phone = String(d.from).replace('@s.whatsapp.net', '').replace('@c.us', '')
      const isFromMe = raw.event === 'send.message' || raw.event === 'message_sent' || d.fromMe === true
      const msgType = (d.type || 'text') as string
      const typeMap: Record<string, string> = { audio: 'audio', image: 'image', video: 'video', document: 'document', sticker: 'sticker', ptt: 'audio' }
      const mType = typeMap[msgType] || 'text'
      const labelMap: Record<string, string> = { audio: '[Áudio]', image: '[Imagem]', video: '[Vídeo]', document: '[Documento]', sticker: '[Figurinha]', ptt: '[Áudio]' }
      const content = d.body || d.text || d.caption || labelMap[msgType] || ''
      if (content && !phone.endsWith('@g.us')) {
        normalised.push({
          phone,
          isFromMe,
          content,
          messageType: mType,
          mediaUrl: d.mediaUrl || d.url || null,
          timestamp: d.timestamp || Math.floor(Date.now() / 1000),
          instanceParam: raw.instance || urlInstance,
          pushName: d.pushName || d.senderName || null,
        })
      }
    }

    // Formato Bailey / array: data pode ser objeto ou array com key.remoteJid
    const baileyItems: any[] = []
    if (raw.data && Array.isArray(raw.data)) {
      baileyItems.push(...raw.data)
    } else if (raw.data?.key) {
      baileyItems.push(raw.data)
    } else if (raw.key) {
      baileyItems.push(raw)
    } else if (Array.isArray(raw.messages)) {
      baileyItems.push(...raw.messages)
    }

    for (const body of baileyItems) {
      if (!body.key?.remoteJid || !body.message) continue
      const remoteJid = body.key.remoteJid as string
      if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast') || remoteJid === 'status@broadcast') continue

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
      const isFromMe = body.key.fromMe === true
      let content = ''
      let messageType = 'text'
      let mediaUrl: string | null = null

      if (body.message.conversation) {
        content = body.message.conversation
      } else if (body.message.extendedTextMessage?.text) {
        content = body.message.extendedTextMessage.text
      } else if (body.message.audioMessage) {
        messageType = 'audio'; mediaUrl = body.message.audioMessage.url || body.mediaUrl || null; content = '[Áudio]'
      } else if (body.message.imageMessage) {
        messageType = 'image'; mediaUrl = body.message.imageMessage.url || body.mediaUrl || null; content = body.message.imageMessage.caption || '[Imagem]'
      } else if (body.message.videoMessage) {
        messageType = 'video'; mediaUrl = body.message.videoMessage.url || body.mediaUrl || null; content = body.message.videoMessage.caption || '[Vídeo]'
      } else if (body.message.documentMessage) {
        messageType = 'document'; mediaUrl = body.message.documentMessage.url || body.mediaUrl || null; content = body.message.documentMessage.fileName || '[Documento]'
      } else if (body.message.stickerMessage) {
        messageType = 'sticker'; mediaUrl = body.message.stickerMessage.url || body.mediaUrl || null; content = '[Figurinha]'
      }
      if (!content) continue
      normalised.push({
        phone, isFromMe, content, messageType, mediaUrl,
        timestamp: body.messageTimestamp || Math.floor(Date.now() / 1000),
        instanceParam: urlInstance || (body as any).instance || null,
        pushName: body.pushName || null,
      })
    }

    // ─── Processar mensagens normalizadas ──────────────────────────────────────
    for (const msg of normalised) {
      const { phone, isFromMe, content, messageType, mediaUrl, timestamp, instanceParam, pushName } = msg

      let instanceRow: any = null

      if (instanceParam) {
        const { data } = await supabase
          .from('instances')
          .select('*')
          .or(`uazapi_instance_id.eq.${instanceParam},name.eq.${instanceParam}`)
          .single()
        instanceRow = data
      }

      if (!instanceRow) {
        const { data } = await supabase
          .from('instances')
          .select('*')
          .limit(1)
          .single()
        instanceRow = data
      }

      if (!instanceRow) {
        console.log('Instance not found')
        continue
      }

      const companyId = instanceRow.company_id

      if (!isFromMe) {
        let { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', companyId)
          .eq('phone', phone)
          .single()

        if (!lead) {
          const { data: newLead } = await supabase
            .from('leads')
            .insert({
              company_id: companyId,
              seller_id: instanceRow.seller_id || null,
              instance_id: instanceRow.id,
              phone,
              name: pushName || 'Cliente',
              status: 'new',
              first_contact: new Date().toISOString(),
            })
            .select()
            .single()
          lead = newLead
        } else {
          await supabase
            .from('leads')
            .update({ last_contact: new Date().toISOString() })
            .eq('id', lead.id)
        }

        await supabase.from('notifications').insert({
          company_id: companyId,
          lead_id: lead?.id,
          lead_name: pushName || lead?.name || 'Cliente',
          type: 'message',
          title: pushName || lead?.name || 'Nova mensagem',
          body: content.slice(0, 200),
          read: false,
        })

        await supabase.from('messages').insert({
          company_id: companyId,
          lead_id: lead?.id,
          seller_id: instanceRow.seller_id || null,
          instance_id: instanceRow.id,
          direction: 'inbound',
          content,
          message_type: messageType,
          media_url: mediaUrl,
          sent_at: new Date(timestamp * 1000).toISOString(),
        })

        if (messageType === 'text' && content !== '[Áudio]') {
          const intentResponse = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'mistral-small',
              messages: [
                {
                  role: 'user',
                  content: `Você é um assistente da ALS Rent Cars, locadora de veículos executivos em São Paulo. Analise a mensagem de WhatsApp abaixo e identifique a intenção do cliente. Responda APENAS com JSON válido no formato:
{
  "intent": "greeting" | "appointment" | "question" | "complaint" | "other",
  "confidence": 0.0-1.0,
  "extractedData": {
    "date": "YYYY-MM-DD" se mencionar data de retirada,
    "time": "HH:MM" se mencionar horário,
    "location": "texto" se mencionar local de retirada ou destino,
    "vehicle": "texto" se mencionar tipo ou modelo de veículo desejado,
    "days": número se mencionar quantidade de dias
  }
}

Considere "appointment" para: pedido de reserva, orçamento com data definida, confirmação de locação.
Considere "question" para: dúvidas sobre preços, disponibilidade, modelos, documentos necessários.

Mensagem: "${content}"`,
                },
              ],
              temperature: 0.3,
            }),
          })

          let intent: any = { intent: 'other', confidence: 0.5 }
          if (intentResponse.ok) {
            const intentData = await intentResponse.json()
            const intentContent = intentData.choices[0]?.message?.content || '{}'
            try { intent = JSON.parse(intentContent) } catch { /* usa padrão */ }
          }

          await supabase
            .from('messages')
            .update({ intent: intent.intent })
            .eq('company_id', companyId)
            .eq('lead_id', lead?.id)
            .eq('direction', 'inbound')
            .order('sent_at', { ascending: false })
            .limit(1)

          if (intent.intent === 'greeting' && intent.confidence > 0.7) {
            const greetingResponse = await fetch(MISTRAL_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'mistral-small',
                messages: [
                  {
                    role: 'user',
                    content: `Você representa a ALS Rent Cars, locadora de veículos executivos em São Paulo. Gere uma mensagem de boas-vindas profissional e acolhedora para WhatsApp. Seja breve (máximo 2 frases) e mencione que estão prontos para ajudar com locação de veículos executivos. ${lead?.name ? `O nome do cliente é ${lead.name}.` : ''}`,
                  },
                ],
                temperature: 0.6,
              }),
            })

            let greetingText = 'Olá! Obrigado pelo contato com a ALS Rent Cars. Como posso ajudar?'
            if (greetingResponse.ok) {
              const greetingData = await greetingResponse.json()
              greetingText = greetingData.choices[0]?.message?.content || greetingText
            }

            const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN

            await fetch(`${UAZAPI_BASE_URL}/send/text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'token': instanceToken,
              },
              body: JSON.stringify({ number: phone, text: greetingText }),
            })

            await supabase.from('messages').insert({
              company_id: companyId,
              lead_id: lead?.id,
              seller_id: instanceRow.seller_id || null,
              instance_id: instanceRow.id,
              direction: 'outbound',
              content: greetingText,
              message_type: 'text',
              intent: 'greeting',
              sent_at: new Date().toISOString(),
            })
          }

          if (intent.intent === 'appointment' && intent.extractedData) {
            await supabase.from('appointments').insert({
              company_id: companyId,
              lead_id: lead?.id,
              seller_id: instanceRow.seller_id || null,
              instance_id: instanceRow.id,
              detected_date: intent.extractedData.date,
              detected_time: intent.extractedData.time,
              location: intent.extractedData.location,
              notes: intent.extractedData.vehicle ? `Veículo: ${intent.extractedData.vehicle}` : null,
              status: 'pending',
              ai_confidence: intent.confidence,
            })
          }
        }
      }

      if (isFromMe) {
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', companyId)
          .eq('phone', phone)
          .single()

        if (lead) {
          await supabase.from('messages').insert({
            company_id: companyId,
            lead_id: lead.id,
            seller_id: instanceRow.seller_id || null,
            instance_id: instanceRow.id,
            direction: 'outbound',
            content,
            message_type: messageType,
            media_url: mediaUrl,
            sent_at: new Date(timestamp * 1000).toISOString(),
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
