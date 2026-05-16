import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')!
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = Deno.env.get('UAZAPI_GLOBAL_TOKEN')!

interface UazapiMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: {
      text: string
    }
  }
  messageTimestamp: number
  pushName?: string
}

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-instance',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const body: UazapiMessage = await req.json()

    // Verificar se é uma mensagem válida
    if (!body.key || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extrair número do remetente
    const remoteJid = body.key.remoteJid
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
    const isFromMe = body.key.fromMe

    // Extrair conteúdo da mensagem
    let content = ''
    if (body.message.conversation) {
      content = body.message.conversation
    } else if (body.message.extendedTextMessage?.text) {
      content = body.message.extendedTextMessage.text
    }

    // Buscar instância UAZAPI pelo header
    const instanceName = req.headers.get('x-instance') || 'default'

    // Buscar instância pela instância
    const { data: instanceRow } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', instanceName)
      .single()

    if (!instanceRow) {
      return new Response(
        JSON.stringify({ error: 'Instance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyId = instanceRow.company_id

    // Se for mensagem recebida (lead)
    if (!isFromMe && content) {
      // Buscar ou criar lead
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
            name: body.pushName || 'Cliente',
            status: 'new',
          })
          .select()
          .single()

        lead = newLead
      } else {
        // Atualizar último contato
        await supabase
          .from('leads')
          .update({ last_contact: new Date().toISOString() })
          .eq('id', lead.id)
      }

      // Salvar mensagem
      await supabase.from('messages').insert({
        company_id: companyId,
        lead_id: lead?.id,
        seller_id: instanceRow.seller_id || null,
        instance_id: instanceRow.id,
        direction: 'inbound',
        content,
        message_type: 'text',
        sent_at: new Date(body.messageTimestamp * 1000).toISOString(),
      })

      // Analisar intenção com IA
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
        try {
          intent = JSON.parse(intentContent)
        } catch {
          // Usar valores padrão
        }
      }

      // Se for saudação, responder automaticamente
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

        let greetingText = 'Olá! Obrigado pelo contato. Como posso ajudar?'
        if (greetingResponse.ok) {
          const greetingData = await greetingResponse.json()
          greetingText = greetingData.choices[0]?.message?.content || greetingText
        }

        // Buscar token da instância para enviar mensagem
        const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN

        // Enviar resposta via UAZAPI usando token da instância
        await fetch(`${UAZAPI_BASE_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': instanceToken,
          },
          body: JSON.stringify({
            number: phone,
            text: greetingText,
          }),
        })

        // Salvar resposta automática
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

      // Se detectar agendamento, criar na agenda
      if (intent.intent === 'appointment' && intent.extractedData) {
        await supabase.from('appointments').insert({
          company_id: companyId,
          lead_id: lead?.id,
          seller_id: instanceRow.seller_id || null,
          instance_id: instanceRow.id,
          detected_date: intent.extractedData.date,
          detected_time: intent.extractedData.time,
          location: intent.extractedData.location,
          status: 'pending',
          ai_confidence: intent.confidence,
        })
      }

      // Atualizar intent na mensagem
      await supabase
        .from('messages')
        .update({ intent: intent.intent })
        .eq('company_id', companyId)
        .eq('lead_id', lead?.id)
        .order('sent_at', { ascending: false })
        .limit(1)
    }

    // Se for mensagem enviada (vendedor)
    if (isFromMe && content) {
      // Buscar lead
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone', phone)
        .single()

      if (lead) {
        // Salvar mensagem para auditoria
        await supabase.from('messages').insert({
          company_id: companyId,
          lead_id: lead.id,
          seller_id: instanceRow.seller_id || null,
          instance_id: instanceRow.id,
          direction: 'outbound',
          content,
          message_type: 'text',
          sent_at: new Date(body.messageTimestamp * 1000).toISOString(),
        })
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
