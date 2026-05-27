'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { Users, Search, Filter, Phone, Calendar, User, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ZapSpinner } from '@/components/ui/ZapSpinner'

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  score: number
  first_contact: string
  last_contact: string | null
  seller_name: string | null
  message_count: number
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const toast = useToast()

  const supabase = createClient()

  useEffect(() => {
    loadLeads()
  }, [statusFilter])

  const loadLeads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      // Buscar leads
      let query = supabase
        .from('leads')
        .select(`
          *,
          users(name)
        `)
        .eq('company_id', userData.company_id)
        .order('first_contact', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Buscar contagem de mensagens para cada lead
      const leadsWithCounts = await Promise.all(
        (data || []).map(async (lead: any) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead.id)

          return {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            status: lead.status,
            score: lead.score || 0,
            first_contact: lead.first_contact,
            last_contact: lead.last_contact,
            seller_name: lead.users?.name || null,
            message_count: count || 0,
          }
        })
      )

      setLeads(leadsWithCounts)
    } catch (err: any) {
      toast.error('Erro ao carregar leads', err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'contacted':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'qualified':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'converted':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Novo'
      case 'contacted':
        return 'Contatado'
      case 'qualified':
        return 'Qualificado'
      case 'converted':
        return 'Convertido'
      default:
        return status
    }
  }

  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <ZapSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-8 animate-in fade-in duration-700">
      <div className="mb-10">
        <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">Leads</h1>
        <p className="text-dim text-lg font-medium">Gerencie todos os seus leads capturados</p>
      </div>

      {/* Filtros */}
      <div className="mb-8 flex items-center gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full input-theme rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-dim" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-theme rounded-2xl px-6 py-3.5 text-sm font-bold cursor-pointer hover:bg-[var(--hover-bg)]"
          >
            <option value="all">Todos os status</option>
            <option value="new">Novo</option>
            <option value="contacted">Contatado</option>
            <option value="qualified">Qualificado</option>
            <option value="converted">Convertido</option>
          </select>
        </div>
      </div>

      {/* Lista de Leads */}
      {filteredLeads.length === 0 ? (
        <div className="bg-card-theme border border-main rounded-3xl p-24 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-black text-main mb-4 tracking-tight">Nenhum lead encontrado</h3>
            <p className="text-dim text-lg max-w-md mx-auto leading-relaxed font-medium">Os leads serão capturados automaticamente quando chegarem mensagens de novos contatos.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-card-theme border border-main rounded-3xl p-8 hover:border-amber-500/50 transition-all duration-300 shadow-xl group/card relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/card:opacity-10 transition-opacity">
                <Users className="w-24 h-24" />
              </div>

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover/card:scale-110 transition-transform">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-main tracking-tight">{lead.name}</h3>
                    <p className="text-sm font-bold text-dim">{lead.phone}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                  getStatusColor(lead.status)
                )}>
                  {getStatusLabel(lead.status)}
                </span>
              </div>

              <div className="space-y-3 mb-8 relative z-10">
                <div className="flex items-center gap-3 text-sm font-medium text-dim">
                  <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                  </div>
                  <span>{lead.message_count} mensagens trocadas</span>
                </div>
                {lead.seller_name && (
                  <div className="flex items-center gap-3 text-sm font-medium text-dim">
                    <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-500" />
                    </div>
                    <span>Atendido por: <span className="text-main font-bold">{lead.seller_name}</span></span>
                  </div>
                )}
                {lead.last_contact && (
                  <div className="flex items-center gap-3 text-sm font-medium text-dim">
                    <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <span>Último contato: <span className="text-main font-bold">{new Date(lead.last_contact).toLocaleDateString('pt-BR')}</span></span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <button className="flex-1 bg-main/30 text-main px-4 py-3 rounded-xl font-black hover:bg-amber-500 hover:text-white transition-all text-xs uppercase tracking-widest border border-transparent hover:border-amber-500">
                  Ver Conversa
                </button>
                <button className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black hover:bg-amber-500 transition-all text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
