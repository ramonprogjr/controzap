import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') || 'https://free.uazapi.com'
const UAZAPI_GLOBAL_TOKEN = Deno.env.get('UAZAPI_GLOBAL_TOKEN')!

interface InstanceAction {
  action: 'create' | 'connect' | 'disconnect' | 'status' | 'delete' | 'updateName' | 'presence' | 'privacy' | 'setWebhook' | 'logout' | 'updateAdminFields'
  instanceId?: string
  instanceName?: string
  phone?: string
  name?: string
  presence?: 'available' | 'unavailable'
  privacy?: Record<string, any>
  url?: string
  adminField01?: string
  adminField02?: string
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    const { data: userData } = await supabaseClient.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) throw new Error('Company not found')

    const body: InstanceAction = await req.json()
    const { action, instanceId, instanceName, phone, name, presence, privacy, adminField01, adminField02 } = body
    const safePhone = typeof phone === 'string' ? phone.trim() : ''

    console.log(`[Manage Instance] Action: ${action} | InstanceId: ${instanceId}`)

    const fetchInstanceTokenByAdmin = async (instanceId: string) => {
      try {
        const listRes = await fetch(`${UAZAPI_BASE_URL}/instance/all`, {
          headers: {
            'admintoken': UAZAPI_GLOBAL_TOKEN,
            'Authorization': `Bearer ${UAZAPI_GLOBAL_TOKEN}`,
          },
        })
        if (!listRes.ok) return ''
        const listData = await listRes.json()
        const instances = Array.isArray(listData) ? listData : listData?.data || []
        const match = instances.find((item: any) => item?.id === instanceId || item?.instance?.id === instanceId)
        return match?.token || match?.apikey || match?.instance?.token || match?.instance?.apikey || ''
      } catch {
        return ''
      }
    }

    // 1. Criar Instância
    if (action === 'create') {
      if (!instanceName) throw new Error('instanceName is required')
      const uniqueName = `${instanceName.trim().replace(/\s+/g, '_')}_${Date.now()}`

      const response = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_GLOBAL_TOKEN },
        body: JSON.stringify({ name: uniqueName, systemName: 'ZapFlow_CRM' }),
      })

      const instanceData = await response.json()
      if (!response.ok) throw new Error(`UAZAPI Init Fail: ${JSON.stringify(instanceData)}`)

      // Extrair ID real e Token
      const uazId = instanceData.instance?.id || instanceData.instance || uniqueName
      let uazKey =
        instanceData.token ||
        instanceData.apikey ||
        instanceData.instance?.token ||
        instanceData.instance?.apikey ||
        ''

      if (!uazKey) {
        uazKey = await fetchInstanceTokenByAdmin(uazId)
      }

      // Webhook Local (Opcional se global estiver ativo)
      try {
        await fetch(`${UAZAPI_BASE_URL}/globalwebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_GLOBAL_TOKEN },
          body: JSON.stringify({
            url: `${supabaseUrl}/functions/v1/process-webhook`,
            events: ['messages', 'connection', 'history', 'messages_update'],
            excludeMessages: ['wasSentByApi'],
            addUrlEvents: true,
            addUrlTypesMessages: true
          }),
        })
      } catch (e) { console.error('Webhook error:', e) }

      const { data: instanceRow, error: dbError } = await supabaseClient
        .from('instances')
        .insert({
          company_id: userData.company_id,
          name: instanceName.trim(),
          phone: safePhone || '',
          uazapi_instance_id: uazId,
          uazapi_instance_key: uazKey,
          status: 'pending',
          admin_field_01: adminField01 || null,
          admin_field_02: adminField02 || null,
        })
        .select('*')
        .single()

      if (dbError) throw dbError
      return new Response(JSON.stringify({ success: true, instance: instanceRow, uazapiData: instanceData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Ações que exigem instanceId
    if (!instanceId) throw new Error('instanceId is required for this action')

    const { data: instanceRow } = await supabaseClient.from('instances').select('*').eq('uazapi_instance_id', instanceId).single()
    if (!instanceRow) throw new Error(`Instance ${instanceId} not found in database`)

    let instanceToken = instanceRow.uazapi_instance_key
    if (!instanceToken) {
      instanceToken = await fetchInstanceTokenByAdmin(instanceId)
      if (instanceToken) {
        await supabaseClient.from('instances').update({ uazapi_instance_key: instanceToken }).eq('id', instanceRow.id)
      }
    }
    if (!instanceToken) {
      throw new Error('Token da instância não encontrado. Verifique o token na UAZAPI ou recrie a instância.')
    }
    const headers = {
      'apikey': instanceToken,
      'token': instanceToken,
      'Content-Type': 'application/json',
    }

    let result: any = {}

    switch (action) {
      case 'status':
        const sRes = await fetch(`${UAZAPI_BASE_URL}/instance/status`, { headers })
        result = await sRes.json()
        break
      case 'connect':
        console.log(`[Connect] Triggering connect for ${instanceId} with token ${instanceToken.substring(0, 5)}...`)
        const cRes = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phone: phone || undefined })
        })
        result = await cRes.json()
        break
      case 'disconnect':
        const dRes = await fetch(`${UAZAPI_BASE_URL}/instance/disconnect`, { headers })
        result = await dRes.json()
        break
      case 'delete':
        await fetch(`${UAZAPI_BASE_URL}/instance`, { method: 'DELETE', headers })
        await supabaseClient.from('instances').delete().eq('id', instanceRow.id)
        result = { success: true }
        break
      case 'updateName':
        const nRes = await fetch(`${UAZAPI_BASE_URL}/instance/updateInstanceName`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name })
        })
        result = await nRes.json()
        await supabaseClient.from('instances').update({ name }).eq('uazapi_instance_id', instanceId)
        break
      case 'updateAdminFields':
        const adminRes = await fetch(`${UAZAPI_BASE_URL}/instance/updateAdminFields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': UAZAPI_GLOBAL_TOKEN,
            'Authorization': `Bearer ${UAZAPI_GLOBAL_TOKEN}`,
          },
          body: JSON.stringify({
            id: instanceId,
            adminField01: adminField01 || '',
            adminField02: adminField02 || '',
          }),
        })
        result = await adminRes.json()
        await supabaseClient.from('instances').update({
          admin_field_01: adminField01 || null,
          admin_field_02: adminField02 || null,
        }).eq('uazapi_instance_id', instanceId)
        break
      case 'presence':
        result = await (await fetch(`${UAZAPI_BASE_URL}/instance/presence`, { method: 'POST', headers, body: JSON.stringify({ presence }) })).json()
        break
      case 'logout':
        result = await (await fetch(`${UAZAPI_BASE_URL}/instance/logout`, { method: 'DELETE', headers: { 'apikey': instanceToken } })).json()
        break
      default:
        throw new Error(`Action ${action} not implemented`)
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('[Fatal Error]:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
