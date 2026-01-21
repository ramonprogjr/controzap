import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = Deno.env.get('UAZAPI_GLOBAL_TOKEN')!

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar usuário
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar company_id do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { leadId, message } = await req.json()

    if (!leadId || !message) {
      return new Response(
        JSON.stringify({ error: 'leadId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, company_id, seller_id, instance_id, phone')
      .eq('id', leadId)
      .eq('company_id', userData.company_id)
      .single()

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let instanceRow = null
    if (lead.instance_id) {
      const { data } = await supabase
        .from('instances')
        .select('*')
        .eq('id', lead.instance_id)
        .single()
      instanceRow = data
    }

    if (!instanceRow && lead.seller_id) {
      const { data } = await supabase
        .from('instances')
        .select('*')
        .eq('seller_id', lead.seller_id)
        .single()
      instanceRow = data
    }

    if (!instanceRow) {
      return new Response(
        JSON.stringify({ error: 'Instance not found for this lead' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const instanceId = instanceRow.uazapi_instance_id
    const instanceToken = instanceRow.uazapi_instance_key || UAZAPI_GLOBAL_TOKEN

    // Enviar mensagem via UAZAPI usando token da instância
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
      throw new Error(`Failed to send message: ${errorText}`)
    }

    // Salvar mensagem no banco
    await supabase.from('messages').insert({
      company_id: userData.company_id,
      lead_id: leadId,
      seller_id: lead.seller_id,
      instance_id: instanceRow.id,
      direction: 'outbound',
      content: message,
      message_type: 'text',
    })

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
