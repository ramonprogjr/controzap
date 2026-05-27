/**
 * Serviço de Roteamento de Mensagens
 * 
 * Responsável por:
 * - Receber mensagens do webhook
 * - Salvar todas as mensagens no banco
 * - Rotear mensagens para vendedores/atendentes
 * - Permitir roteamento via interface ou automático
 */

import { createClient } from '@/lib/supabase/client'
import { sendMessage as sendMessageEdge } from '@/lib/supabase/edge-functions'

export interface RoutingConfig {
  companyId: string
  leadId: string
  message: string
  routingMode: 'auto' | 'manual'
  sellerId?: string
}

export interface MessageRouteResult {
  success: boolean
  routedTo?: string // sellerId ou 'interface'
  messageId?: string
  error?: string
}

/**
 * Rotea uma mensagem para um vendedor ou para a interface
 */
export async function routeMessage(config: RoutingConfig): Promise<MessageRouteResult> {
  try {
    const supabase = createClient()
    
    // Buscar configuração da empresa
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', config.companyId)
      .single()

    // Se for roteamento automático, escolher vendedor disponível
    let targetSellerId = config.sellerId
    if (config.routingMode === 'auto' && !targetSellerId) {
      targetSellerId = await selectAvailableSeller(config.companyId)
    }

    // Se encontrou vendedor, enviar para WhatsApp dele
    if (targetSellerId) {
      return await routeToSeller(targetSellerId, config)
    }

    // Caso contrário, salvar na interface
    return await routeToInterface(config)
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Seleciona um vendedor disponível para receber a mensagem
 */
async function selectAvailableSeller(companyId: string): Promise<string | undefined> {
  const supabase = createClient()
  
  // Buscar instâncias vinculadas a vendedores ativos
  const { data: instances } = await supabase
    .from('instances')
    .select('id, seller_id')
    .eq('company_id', companyId)
    .not('seller_id', 'is', null)
    .order('created_at', { ascending: true })

  if (!instances || instances.length === 0) {
    return undefined
  }

  // Por enquanto, usar round-robin simples
  return (instances[0].seller_id as string) || undefined
}

/**
 * Roteia mensagem para um vendedor específico (envia para WhatsApp dele)
 */
async function routeToSeller(
  sellerId: string,
  config: RoutingConfig
): Promise<MessageRouteResult> {
  try {
    const supabase = createClient()
    
    // Verificar se vendedor tem instância vinculada
    const { data: instanceRow } = await supabase
      .from('instances')
      .select('id, uazapi_instance_id')
      .eq('seller_id', sellerId)
      .single()

    if (!instanceRow?.uazapi_instance_id) {
      throw new Error('Vendedor não tem instância configurada')
    }

    // Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', config.leadId)
      .single()

    if (!lead) {
      throw new Error('Lead não encontrado')
    }

    // Enviar mensagem via Edge Function
    await sendMessageEdge(config.leadId, config.message)

    return {
      success: true,
      routedTo: sellerId,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Roteia mensagem para a interface (salva no banco, sem enviar WhatsApp)
 */
async function routeToInterface(config: RoutingConfig): Promise<MessageRouteResult> {
  try {
    const supabase = createClient()
    
    // Salvar mensagem no banco (será visualizada na interface)
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        company_id: config.companyId,
        lead_id: config.leadId,
        direction: 'outbound',
        content: config.message,
        message_type: 'text',
        routed_to: 'interface',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      routedTo: 'interface',
      messageId: message.id,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Busca histórico de mensagens de um lead
 */
export async function getLeadMessages(leadId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

/**
 * Marca mensagem como lida
 */
export async function markMessageAsRead(messageId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) {
    throw error
  }
}
