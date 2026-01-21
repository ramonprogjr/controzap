'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/supabase/edge-functions'
import { useToast } from '@/components/ui/ToastContainer'
import { MessageSquare, Search, Send, User, Clock, Filter } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ZapSpinner } from '@/components/ui/ZapSpinner'

interface Conversation {
  lead_id: string
  lead_name: string
  lead_phone: string
  last_message: string
  last_message_time: string
  unread_count: number
  seller_id: string | null
  seller_name: string | null
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'by_seller'>('all')
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([])
  const [sellerFilter, setSellerFilter] = useState<string>('all')
  const toast = useToast()

  const supabase = createClient()

  useEffect(() => {
    loadConversations()
    loadSellers()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation)
    }
  }, [selectedConversation])

  const loadSellers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { data, error } = await supabase
        .from('sellers')
        .select('id, name')
        .eq('company_id', userData.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setSellers(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar vendedores', err.message)
    }
  }

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { data, error } = await supabase
        .from('messages')
        .select(`
          lead_id,
          content,
          sent_at,
          direction,
          leads(id, name, phone, seller_id)
        `)
        .eq('company_id', userData.company_id)
        .not('lead_id', 'is', null)
        .order('sent_at', { ascending: false })

      if (error) throw error

      const conversationsMap = new Map<string, Conversation>()
      const sellerMap = new Map(sellers.map((seller) => [seller.id, seller.name]))

      data?.forEach((msg: any) => {
        const leadId = msg.lead_id
        if (!leadId) return

        const lead = msg.leads
        const sellerId = lead?.seller_id || null
        const sellerName = sellerId ? sellerMap.get(sellerId) || null : null

        if (!conversationsMap.has(leadId)) {
          conversationsMap.set(leadId, {
            lead_id: leadId,
            lead_name: lead?.name || 'Cliente',
            lead_phone: lead?.phone || '',
            last_message: msg.content || '',
            last_message_time: msg.sent_at || '',
            unread_count: msg.direction === 'inbound' ? 1 : 0,
            seller_id: sellerId,
            seller_name: sellerName,
          })
        } else {
          const conv = conversationsMap.get(leadId)!
          if (new Date(msg.sent_at) > new Date(conv.last_message_time)) {
            conv.last_message = msg.content || ''
            conv.last_message_time = msg.sent_at || ''
          }
          if (msg.direction === 'inbound') {
            conv.unread_count++
          }
        }
      })

      setConversations(Array.from(conversationsMap.values()))
    } catch (err: any) {
      toast.error('Erro ao carregar conversas', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (leadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar mensagens', err.message)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    setSending(true)
    try {
      await sendMessage(selectedConversation, newMessage)
      toast.success('Mensagem enviada!', 'A mensagem foi enviada com sucesso')
      setNewMessage('')
      await loadMessages(selectedConversation)
      await loadConversations()
    } catch (err: any) {
      toast.error('Erro ao enviar mensagem', err.message)
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lead_phone.includes(searchTerm)
  )

  const visibleConversations = filteredConversations.filter((conv) => {
    if (listFilter === 'unread') return conv.unread_count > 0
    if (listFilter === 'by_seller') {
      if (sellerFilter === 'all') return true
      return conv.seller_id === sellerFilter
    }
    return true
  })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <ZapSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex m-4 overflow-hidden rounded-3xl bg-card-theme border border-main shadow-2xl">
      {/* Lista de Conversas */}
      <div className="w-96 border-r border-main flex flex-col bg-sidebar-theme/30">
        <div className="p-6 border-b border-main">
          <h2 className="text-2xl font-black text-main mb-4 tracking-tight">Conversas</h2>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim group-focus-within:text-green-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full input-theme rounded-xl pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="px-4 py-4 border-b border-main flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'unread', label: 'Não lidas' },
            { id: 'by_seller', label: 'Sellers' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setListFilter(item.id as typeof listFilter)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                listFilter === item.id
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                  : 'bg-main/30 text-dim hover:text-main'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {listFilter === 'by_seller' && (
          <div className="p-4 border-b border-main bg-main/20">
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full input-theme rounded-xl pl-10 pr-4 py-2 text-xs font-bold appearance-none cursor-pointer"
              >
                <option value="all">Todos os vendedores</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>{seller.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {visibleConversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-main/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-main">
                <MessageSquare className="w-8 h-8 text-dim" />
              </div>
              <p className="text-dim font-bold text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            visibleConversations.map((conv) => (
              <button
                key={conv.lead_id}
                onClick={() => setSelectedConversation(conv.lead_id)}
                className={cn(
                  "w-full p-5 border-b border-main transition-all text-left group relative",
                  selectedConversation === conv.lead_id
                    ? 'bg-green-500/5'
                    : 'hover:bg-[var(--hover-bg)]'
                )}
              >
                {selectedConversation === conv.lead_id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-green-500/20 group-hover:scale-105 transition-transform">
                      <User className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-black text-main truncate max-w-[150px] tracking-tight">{conv.lead_name}</h3>
                      <p className="text-[10px] font-bold text-dim uppercase tracking-widest">{conv.lead_phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold text-dim uppercase">{new Date(conv.last_message_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {conv.unread_count > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-green-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-green-500/20">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-dim truncate font-medium">{conv.last_message}</p>
                {conv.seller_name && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-blue-500/10 rounded flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-blue-500" />
                    </div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Atendente: {conv.seller_name}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 flex flex-col bg-sidebar-theme/10">
        {selectedConversation ? (
          <>
            {/* Header da Conversa */}
            <div className="p-6 border-b border-main bg-card-theme/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main tracking-tight">
                    {conversations.find((c) => c.lead_id === selectedConversation)?.lead_name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Online</span>
                    <span className="text-dim opacity-30 px-1">•</span>
                    <span className="text-xs font-bold text-dim uppercase tracking-widest">
                      {conversations.find((c) => c.lead_id === selectedConversation)?.lead_phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-3 hover:bg-[var(--hover-bg)] rounded-xl text-dim hover:text-main transition-colors border border-transparent hover:border-main">
                  <Clock className="w-5 h-5" />
                </button>
                <div className="h-8 w-[1px] bg-main mx-2" />
                <button className="p-3 hover:bg-[var(--hover-bg)] rounded-xl text-dim hover:text-main transition-colors border border-transparent hover:border-main">
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {messages.map((msg, idx) => {
                const isFirstOfDate = idx === 0 ||
                  new Date(msg.sent_at).toLocaleDateString() !== new Date(messages[idx - 1].sent_at).toLocaleDateString();

                return (
                  <div key={msg.id}>
                    {isFirstOfDate && (
                      <div className="flex justify-center my-8">
                        <span className="px-4 py-1.5 bg-[var(--input-bg)] rounded-full text-[10px] font-black text-dim uppercase tracking-widest shadow-sm">
                          {new Date(msg.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        "max-w-md rounded-3xl px-6 py-4 shadow-xl relative group/msg",
                        msg.direction === 'outbound'
                          ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-tr-none'
                          : 'bg-card-theme border border-main text-main rounded-tl-none'
                      )}>
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 opacity-60 text-[9px] font-bold uppercase",
                          msg.direction === 'outbound' ? 'justify-end text-white' : 'text-dim'
                        )}>
                          <span>{new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.direction === 'outbound' && <span className="text-[8px] animate-pulse">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input de Mensagem */}
            <div className="p-8 bg-card-theme/80 border-t border-main backdrop-blur-xl">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <div className="flex-1 relative group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua mensagem aqui..."
                    className="w-full input-theme rounded-[2rem] px-8 py-5 text-sm font-medium shadow-2xl pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {/* Aqui poderiam entrar emojis ou anexos futuramente */}
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-2xl shadow-green-500/40 disabled:opacity-50 disabled:grayscale group"
                >
                  {sending ? (
                    <ZapSpinner size="sm" />
                  ) : (
                    <Send className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="text-center relative group">
              <div className="absolute -inset-20 bg-green-500/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-32 h-32 bg-card-theme border border-main rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <MessageSquare className="w-12 h-12 text-dim" />
              </div>
              <h3 className="text-3xl font-black text-main mb-4 tracking-tight">Suas Conversas</h3>
              <p className="text-dim text-lg font-medium max-w-sm mx-auto">Selecione um cliente na lista à esquerda para visualizar o histórico de mensagens e responder em tempo real.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
