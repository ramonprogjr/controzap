import { createClient } from '@/lib/supabase/client'

// Helper para chamar as Edge Functions reais do Supabase
export async function callEdgeFunction(name: string, body: any) {
  const supabase = createClient()

  const { data, error } = await supabase.functions.invoke(name, {
    body: body
  })

  if (error) {
    console.error(`[Edge Function ${name}] ❌ Erro:`, error)
    throw new Error(error.message || `Erro ao chamar função ${name}`)
  }

  return data
}

// Se preferir usar as rotas locais do Next.js, use callLocalApi
export async function callLocalApi(path: string, body: any) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  const responseText = await response.text()

  if (!response.ok) {
    let error
    try {
      error = JSON.parse(responseText)
    } catch {
      error = { error: responseText }
    }
    throw new Error(error.error || error.message || `Erro na API Local: ${response.statusText}`)
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return { success: true }
  }
}

export async function createInstance(data: {
  instanceName: string
  adminField01?: string
  adminField02?: string
}) {
  // Agora usamos a função unificada 'manage-instance' para tudo
  return callEdgeFunction('manage-instance', {
    ...data,
    action: 'create'
  })
}

export async function manageInstance(action: {
  action: 'connect' | 'disconnect' | 'status' | 'delete' | 'updateName' | 'updateAdminFields' | 'presence' | 'privacy' | 'setWebhook' | 'logout'
  instanceId: string
  phone?: string
  name?: string
  presence?: 'available' | 'unavailable'
  privacy?: Record<string, any>
  url?: string
  headers?: Record<string, string>
  adminField01?: string
  adminField02?: string
}) {
  // Alterado para chamar a Edge Function Real do Supabase
  return callEdgeFunction('manage-instance', action)
}

export async function sendMessage(leadId: string, message: string) {
  // Alterado para chamar a Edge Function Real do Supabase
  return callEdgeFunction('send-message', { leadId, message })
}
