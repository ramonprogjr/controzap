import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uazapiClient, type UazapiMessage } from '@/lib/uazapi/client'
import { mistralClient } from '@/lib/ai/mistral'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verificar se é uma mensagem válida
    if (!body.key || !body.message) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const message: UazapiMessage = body
    const supabase = createAdminClient()

    // Extrair número do remetente
    const remoteJid = message.key.remoteJid
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
    const isFromMe = message.key.fromMe

    // Extrair conteúdo da mensagem
    let content = ''
    if (message.message.conversation) {
      content = message.message.conversation
    } else if (message.message.extendedTextMessage?.text) {
      content = message.message.extendedTextMessage.text
    }

    // Buscar instância UAZAPI pelo número
    const instanceName = request.headers.get('x-instance') || 'default'
    
    // Buscar instância pela UAZAPI instance id
    const { data: instanceRow } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', instanceName)
      .single()

    if (!instanceRow) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
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
            name: message.pushName || 'Cliente',
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
        sent_at: new Date(message.messageTimestamp * 1000).toISOString(),
      })

      // Analisar intenção com IA
      const intent = await mistralClient.analyzeIntent(content)

      // Se for saudação, responder automaticamente
      if (intent.intent === 'greeting' && intent.confidence > 0.7) {
        const greetingResponse = await mistralClient.generateGreetingResponse(lead?.name)
        
        // Enviar resposta via UAZAPI
        await uazapiClient.sendMessage(instanceName, phone, greetingResponse)

        // Salvar resposta automática
        await supabase.from('messages').insert({
          company_id: companyId,
          lead_id: lead?.id,
          seller_id: instanceRow.seller_id || null,
          instance_id: instanceRow.id,
          direction: 'outbound',
          content: greetingResponse,
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
          sent_at: new Date(message.messageTimestamp * 1000).toISOString(),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
