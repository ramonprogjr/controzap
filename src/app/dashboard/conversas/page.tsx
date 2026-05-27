'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/supabase/edge-functions'
import { useToast } from '@/components/ui/ToastContainer'
import { MessageSquare, Search, Send, User, Clock, Filter, Plus, X, Phone, Hash, Mic, Image, FileText, Video } from 'lucide-react'
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

interface Lead {
  id: string
  name: string
  phone: string
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
  const [companyId, setCompanyId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Modal nova conversa
  const [showNewConvModal, setShowNewConvModal] = useState(false)
  const [newConvTab, setNewConvTab] = useState<'search' | 'new'>('search')
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<Lead[]>([])
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [creatingLead, setCreatingLead] = useState(false)

  const toast = useToast()
  const supabase = createClient()
  const companyIdRef = useRef<string>('')
  const selectedConvRef = useRef<string | null>(null)
  const seenMessageIds = useRef<Set<string>>(new Set())
  const notifyReady = useRef(false)

  useEffect(() => {
    companyIdRef.current = companyId
  }, [companyId])

  useEffect(() => {
    selectedConvRef.current = selectedConversation
  }, [selectedConversation])

  // Pedir permissão de notificação ao carregar
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation)
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime: escuta novas mensagens via Supabase
  useEffect(() => {
    if (!companyId) return

    const channel = supabase
      .channel(`messages-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const msg = payload.new as any

          // Notificar mensagens inbound novas (não vistas antes)
          if (msg.direction === 'inbound' && notifyReady.current && !seenMessageIds.current.has(msg.id)) {
            seenMessageIds.current.add(msg.id)
            setConversations((prev) => {
              const conv = prev.find((c) => c.lead_id === msg.lead_id)
              notifyNewMessage(conv?.lead_name || 'Cliente', msg.content || '📱 Nova mensagem')
              return prev
            })
          }

          if (msg.lead_id === selectedConvRef.current) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
          loadConversations(companyIdRef.current)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId])

  // Polling: fallback a cada 4s para garantir atualização mesmo sem Realtime
  useEffect(() => {
    if (!companyId) return
    const interval = setInterval(() => {
      if (selectedConvRef.current) {
        loadMessages(selectedConvRef.current)
      }
      loadConversations(companyIdRef.current)
    }, 4000)
    return () => clearInterval(interval)
  }, [companyId])

  const playSound = () => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  const notifyNewMessage = (senderName: string, content: string) => {
    playSound()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`💬 ${senderName}`, {
        body: content.slice(0, 100),
        icon: '/favicon.ico',
        tag: 'controlzap-message',
        requireInteraction: false,
      })
    }
  }

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return
    setCompanyId(userData.company_id)
    await Promise.all([loadConversations(userData.company_id), loadSellers(userData.company_id)])
  }

  const loadSellers = async (cid: string) => {
    const { data } = await supabase.from('users').select('id, name').eq('company_id', cid).order('name')
    setSellers(data || [])
  }

  const loadConversations = async (cid: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('lead_id, content, sent_at, direction, message_type, leads(id, name, phone, seller_id)')
        .eq('company_id', cid)
        .not('lead_id', 'is', null)
        .order('sent_at', { ascending: false })

      if (error) throw error

      const convMap = new Map<string, Conversation>()
      data?.forEach((msg: any) => {
        const leadId = msg.lead_id
        if (!leadId) return
        const lead = msg.leads
        const mediaLabels: Record<string, string> = {
          audio: '🎵 Áudio',
          image: '📷 Imagem',
          video: '🎬 Vídeo',
          document: '📄 Documento',
          sticker: '😄 Figurinha',
        }
        const previewText = msg.message_type && mediaLabels[msg.message_type]
          ? mediaLabels[msg.message_type]
          : (msg.content || '')

        if (!convMap.has(leadId)) {
          convMap.set(leadId, {
            lead_id: leadId,
            lead_name: lead?.name || 'Cliente',
            lead_phone: lead?.phone || '',
            last_message: previewText,
            last_message_time: msg.sent_at || '',
            unread_count: msg.direction === 'inbound' ? 1 : 0,
            seller_id: lead?.seller_id || null,
            seller_name: null,
          })
        } else {
          const conv = convMap.get(leadId)!
          if (new Date(msg.sent_at) > new Date(conv.last_message_time)) {
            conv.last_message = previewText
            conv.last_message_time = msg.sent_at || ''
          }
          if (msg.direction === 'inbound') conv.unread_count++
        }
      })
      setConversations(Array.from(convMap.values()))
      // Marcar como pronto para notificar apenas após o carregamento inicial
      setTimeout(() => { notifyReady.current = true }, 2000)
    } catch (err: any) {
      toast.error('Erro ao carregar conversas', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!userData?.company_id) return
    const { data, error } = await supabase
      .from('messages').select('*').eq('company_id', userData.company_id)
      .eq('lead_id', leadId).order('sent_at', { ascending: true })
    if (!error) setMessages(data || [])
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return
    const text = newMessage.trim()
    setSending(true)
    setNewMessage('')

    // Exibe a mensagem imediatamente na tela (optimistic)
    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      lead_id: selectedConversation,
      direction: 'outbound',
      content: text,
      message_type: 'text',
      sent_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      await sendMessage(selectedConversation, text)
      // Recarrega para substituir o otimista pela versão real do banco
      await loadMessages(selectedConversation)
      if (companyId) loadConversations(companyId)
    } catch (err: any) {
      // Remove a mensagem otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setNewMessage(text)
      toast.error('Erro ao enviar mensagem', err.message)
    } finally {
      setSending(false)
    }
  }

  // Busca de contatos existentes
  useEffect(() => {
    if (!contactSearch.trim() || !companyId) { setContactResults([]); return }
    const timer = setTimeout(async () => {
      setSearchingContacts(true)
      const { data } = await supabase
        .from('leads').select('id, name, phone').eq('company_id', companyId)
        .or(`name.ilike.%${contactSearch}%,phone.ilike.%${contactSearch}%`)
        .limit(8)
      setContactResults(data || [])
      setSearchingContacts(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [contactSearch, companyId])

  const openExistingConversation = (lead: Lead) => {
    // Adicionar à lista de conversas se ainda não estiver
    if (!conversations.find(c => c.lead_id === lead.id)) {
      setConversations(prev => [{
        lead_id: lead.id, lead_name: lead.name, lead_phone: lead.phone,
        last_message: '', last_message_time: new Date().toISOString(),
        unread_count: 0, seller_id: null, seller_name: null,
      }, ...prev])
    }
    setSelectedConversation(lead.id)
    closeNewConvModal()
  }

  const createNewConversation = async () => {
    if (!newPhone.trim()) { toast.error('Telefone obrigatório', 'Informe o número do WhatsApp'); return }
    setCreatingLead(true)
    try {
      // Verificar se já existe lead com esse telefone
      const phone = newPhone.replace(/\D/g, '')
      const { data: existing } = await supabase
        .from('leads').select('id, name, phone').eq('phone', phone).eq('company_id', companyId).single()

      if (existing) {
        toast.success('Contato encontrado!', `Abrindo conversa com ${existing.name}`)
        openExistingConversation(existing)
        return
      }

      // Criar novo lead
      const { data: newLead, error } = await supabase.from('leads').insert({
        company_id: companyId,
        name: newName.trim() || phone,
        phone,
        status: 'new',
        first_contact: new Date().toISOString(),
      }).select('id, name, phone').single()

      if (error || !newLead) throw new Error(error?.message || 'Erro ao criar contato')

      toast.success('Conversa iniciada!', `Pronto para enviar mensagem para ${newLead.name}`)
      openExistingConversation(newLead)
    } catch (err: any) {
      toast.error('Erro', err.message)
    } finally {
      setCreatingLead(false)
    }
  }

  const closeNewConvModal = () => {
    setShowNewConvModal(false)
    setContactSearch('')
    setContactResults([])
    setNewPhone('')
    setNewName('')
    setNewConvTab('search')
  }

  const filteredConversations = conversations.filter(c =>
    c.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lead_phone.includes(searchTerm)
  )

  const visibleConversations = filteredConversations.filter(c => {
    if (listFilter === 'unread') return c.unread_count > 0
    if (listFilter === 'by_seller') return sellerFilter === 'all' || c.seller_id === sellerFilter
    return true
  })

  const selectedConv = conversations.find(c => c.lead_id === selectedConversation)

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><ZapSpinner size="lg" /></div>
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex m-4 overflow-hidden rounded-3xl bg-card-theme border border-main shadow-2xl">

      {/* Lista de Conversas */}
      <div className="w-96 border-r border-main flex flex-col bg-sidebar-theme/30">
        <div className="p-6 border-b border-main">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-main tracking-tight">Conversas</h2>
            <button
              onClick={() => setShowNewConvModal(true)}
              className="w-10 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-amber-500/20 hover:scale-110"
              title="Nova conversa"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full input-theme rounded-xl pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-main flex flex-wrap gap-2">
          {[{ id: 'all', label: 'Tudo' }, { id: 'unread', label: 'Não lidas' }, { id: 'by_seller', label: 'Vendedor' }].map((item) => (
            <button key={item.id} onClick={() => setListFilter(item.id as typeof listFilter)}
              className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                listFilter === item.id ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-main/30 text-dim hover:text-main'
              )}>
              {item.label}
            </button>
          ))}
        </div>

        {listFilter === 'by_seller' && (
          <div className="p-4 border-b border-main">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full input-theme rounded-xl pl-10 pr-4 py-2 text-xs font-bold appearance-none cursor-pointer">
                <option value="all">Todos os vendedores</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <p className="text-dim font-bold text-sm mb-3">Nenhuma conversa</p>
              <button onClick={() => setShowNewConvModal(true)}
                className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-black text-xs mx-auto transition-colors">
                <Plus className="w-4 h-4" /> Nova conversa
              </button>
            </div>
          ) : visibleConversations.map((conv) => (
            <button key={conv.lead_id} onClick={() => setSelectedConversation(conv.lead_id)}
              className={cn("w-full p-5 border-b border-main transition-all text-left group relative",
                selectedConversation === conv.lead_id ? 'bg-amber-500/5' : 'hover:bg-[var(--hover-bg)]'
              )}>
              {selectedConversation === conv.lead_id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
                    <User className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-black text-main truncate max-w-[150px] tracking-tight">{conv.lead_name}</h3>
                    <p className="text-[10px] font-bold text-dim uppercase tracking-widest">{conv.lead_phone}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {conv.last_message_time && (
                    <span className="text-[9px] font-bold text-dim uppercase">
                      {new Date(conv.last_message_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-amber-500/20">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-dim truncate font-medium">
                {conv.last_message || <span className="italic opacity-60">Sem mensagens</span>}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 flex flex-col bg-sidebar-theme/10">
        {selectedConversation ? (
          <>
            <div className="p-6 border-b border-main bg-card-theme/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-main tracking-tight">{selectedConv?.lead_name}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">WhatsApp</span>
                    <span className="text-dim opacity-30 px-1">•</span>
                    <span className="text-xs font-bold text-dim">{selectedConv?.lead_phone}</span>
                  </div>
                </div>
              </div>
              <button className="p-3 hover:bg-[var(--hover-bg)] rounded-xl text-dim hover:text-main transition-colors border border-transparent hover:border-main">
                <Clock className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-dim/20 mb-4" />
                  <p className="text-dim font-bold">Nenhuma mensagem ainda</p>
                  <p className="text-dim/60 text-sm mt-1">Envie a primeira mensagem abaixo</p>
                </div>
              ) : messages.map((msg, idx) => {
                const isFirstOfDate = idx === 0 ||
                  new Date(msg.sent_at).toLocaleDateString() !== new Date(messages[idx - 1].sent_at).toLocaleDateString()
                const isOut = msg.direction === 'outbound'
                return (
                  <div key={msg.id}>
                    {isFirstOfDate && (
                      <div className="flex justify-center my-8">
                        <span className="px-4 py-1.5 bg-[var(--input-bg)] rounded-full text-[10px] font-black text-dim uppercase tracking-widest shadow-sm">
                          {new Date(msg.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isOut ? 'justify-end' : 'justify-start')}>
                      <div className={cn("max-w-md rounded-3xl px-6 py-4 shadow-xl",
                        isOut
                          ? 'bg-gradient-to-br from-amber-600 to-amber-600 text-white rounded-tr-none'
                          : 'bg-card-theme border border-main text-main rounded-tl-none'
                      )}>
                        {/* Audio */}
                        {msg.message_type === 'audio' && msg.media_url ? (
                          <div className="space-y-2">
                            <div className={cn("flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider opacity-70", isOut ? 'text-white' : 'text-dim')}>
                              <Mic className="w-3.5 h-3.5" /> Mensagem de voz
                            </div>
                            <audio
                              controls
                              src={msg.media_url}
                              className="w-full max-w-[280px] rounded-xl"
                              style={{ height: '40px' }}
                            />
                            {msg.transcription && (
                              <p className={cn("text-xs italic mt-2 opacity-80", isOut ? 'text-white' : 'text-dim')}>
                                "{msg.transcription}"
                              </p>
                            )}
                          </div>
                        ) : msg.message_type === 'audio' ? (
                          <div className={cn("flex items-center gap-2 text-sm font-medium", isOut ? 'text-white' : 'text-dim')}>
                            <Mic className="w-4 h-4 shrink-0" />
                            <span className="italic">Mensagem de voz</span>
                          </div>
                        ) : msg.message_type === 'image' && msg.media_url ? (
                          <div className="space-y-2">
                            <img src={msg.media_url} alt="Imagem" className="rounded-2xl max-w-[260px] object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            {msg.content && msg.content !== '[Imagem]' && (
                              <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                            )}
                          </div>
                        ) : msg.message_type === 'video' ? (
                          <div className={cn("flex items-center gap-2 text-sm font-medium", isOut ? 'text-white' : 'text-dim')}>
                            <Video className="w-4 h-4 shrink-0" />
                            <span>{msg.content || 'Vídeo'}</span>
                          </div>
                        ) : msg.message_type === 'document' ? (
                          <div className={cn("flex items-center gap-2 text-sm font-medium", isOut ? 'text-white' : 'text-dim')}>
                            <FileText className="w-4 h-4 shrink-0" />
                            <span>{msg.content || 'Documento'}</span>
                          </div>
                        ) : (
                          <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        )}
                        <div className={cn("flex items-center gap-1.5 mt-2 opacity-60 text-[9px] font-bold uppercase",
                          isOut ? 'justify-end text-white' : 'text-dim')}>
                          <span>{new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOut && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-8 bg-card-theme/80 border-t border-main backdrop-blur-xl">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <div className="flex-1">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Digite sua mensagem aqui..."
                    className="w-full input-theme rounded-[2rem] px-8 py-5 text-sm font-medium shadow-2xl" />
                </div>
                <button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}
                  className="bg-amber-600 text-white w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-2xl shadow-amber-500/40 disabled:opacity-50 disabled:grayscale group">
                  {sending ? <ZapSpinner size="sm" /> : <Send className="w-7 h-7 group-hover:rotate-12 transition-transform" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="text-center">
              <div className="w-32 h-32 bg-card-theme border border-main rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl">
                <MessageSquare className="w-12 h-12 text-dim" />
              </div>
              <h3 className="text-3xl font-black text-main mb-4 tracking-tight">Suas Conversas</h3>
              <p className="text-dim text-lg font-medium max-w-sm mx-auto mb-8">Selecione um cliente na lista ou inicie uma nova conversa.</p>
              <button onClick={() => setShowNewConvModal(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 mx-auto">
                <Plus className="w-5 h-5" /> Nova Conversa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova Conversa */}
      {showNewConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Nova Conversa</h2>
                <p className="text-slate-400 text-sm mt-1">Busque um contato ou inicie com um número</p>
              </div>
              <button onClick={closeNewConvModal} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-800 p-1 rounded-2xl">
              <button onClick={() => setNewConvTab('search')}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all",
                  newConvTab === 'search' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white')}>
                <Search className="w-4 h-4" /> Buscar Contato
              </button>
              <button onClick={() => setNewConvTab('new')}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all",
                  newConvTab === 'new' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white')}>
                <Hash className="w-4 h-4" /> Novo Número
              </button>
            </div>

            {newConvTab === 'search' ? (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                    placeholder="Nome ou número do contato..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchingContacts ? (
                    <div className="flex justify-center py-8"><ZapSpinner size="sm" /></div>
                  ) : contactResults.length > 0 ? (
                    contactResults.map(lead => (
                      <button key={lead.id} onClick={() => openExistingConversation(lead)}
                        className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 rounded-2xl transition-all text-left group">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20 shrink-0">
                          <User className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white text-sm truncate">{lead.name}</p>
                          <p className="text-slate-400 text-xs font-bold">{lead.phone}</p>
                        </div>
                        <div className="ml-auto text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  ) : contactSearch.trim() ? (
                    <div className="text-center py-8 text-slate-500 text-sm font-bold">
                      Nenhum contato encontrado para "{contactSearch}"
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm font-bold">
                      Digite para buscar contatos
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                    Número do WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      placeholder="Ex: 11999999999"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Código do país + DDD + número (sem espaços ou traços)</p>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                    Nome do Cliente (opcional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                  </div>
                </div>
                <button onClick={createNewConversation} disabled={creatingLead || !newPhone.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                  {creatingLead ? <ZapSpinner size="sm" /> : <MessageSquare className="w-4 h-4" />}
                  {creatingLead ? 'Iniciando...' : 'Iniciar Conversa'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
