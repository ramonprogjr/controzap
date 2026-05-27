import { createClient } from '@/lib/supabase/client'

async function callApi(path: string, body: any) {
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

  const text = await response.text()

  if (!response.ok) {
    let err: any = {}
    try { err = JSON.parse(text) } catch { err = { error: text } }
    throw new Error(err.error || err.message || `Erro ${response.status}: ${response.statusText}`)
  }

  try { return JSON.parse(text) } catch { return { success: true } }
}

export async function createInstance(data: {
  instanceName: string
  adminField01?: string
  adminField02?: string
}) {
  return callApi('/api/instances/create', data)
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
  return callApi('/api/instances/manage', action)
}

export async function sendMessage(leadId: string, message: string) {
  return callApi('/api/instances/send-message', { leadId, message })
}

export async function sendMedia(leadId: string, file: File, type: 'image' | 'audio' | 'document' | 'video') {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const formData = new FormData()
  formData.append('leadId', leadId)
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetch('/api/instances/send-media', {
    method: 'POST',
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    credentials: 'include',
    body: formData,
  })

  const text = await response.text()
  if (!response.ok) {
    let err: { error?: string; message?: string } = {}
    try { err = JSON.parse(text) } catch { err = { error: text } }
    throw new Error(err.error || err.message || `Erro ${response.status}`)
  }

  try { return JSON.parse(text) } catch { return { success: true } }
}

export async function syncInstanceHistory(instanceId: string) {
  return callApi('/api/instances/sync-history', { instanceId })
}
