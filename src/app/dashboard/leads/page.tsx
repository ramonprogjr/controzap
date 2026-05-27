'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { Users, Search, Filter, Calendar, User, MessageSquare, X, Trash2 } from 'lucide-react'
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
  seller_id: string | null
  seller_name: string | null
  message_count: number
}

type SellerOption = { id: string; name: string }

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  converted: 'Convertido',
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  contacted: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  qualified: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export default function LeadsPage() {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [sellers, setSellers] = useState<SellerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sellerFilter, setSellerFilter] = useState<string>('all')

  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', status: 'new', seller_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    }
  }, [supabase])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sellerFilter !== 'all') params.set('seller_id', sellerFilter)

      const headers = await getAuthHeaders()
      const res = await fetch(`/api/leads?${params.toString()}`, { headers, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar leads')

      const list: any[] = data.leads || []

      const enriched = await Promise.all(list.map(async (lead) => {
        const { count } = await supabase
          .from('messages').select('*', { count: 'exact', head: true }).eq('lead_id', lead.id)
        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
          score: lead.score || 0,
          first_contact: lead.first_contact,
          last_contact: lead.last_contact,
          seller_id: lead.seller_id,
          seller_name: lead.users?.name || null,
          message_count: count || 0,
        } as Lead
      }))

      setLeads(enriched)
    } catch (err: any) {
      toast.error('Erro ao carregar leads', err.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sellerFilter, getAuthHeaders, supabase, toast])

  const loadSellers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: u } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!u?.company_id) return
    const { data } = await supabase
      .from('users').select('id, name').eq('company_id', u.company_id).order('name')
    setSellers(data || [])
  }, [supabase])

  useEffect(() => {
    loadSellers()
  }, [loadSellers])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const openEdit = (lead: Lead) => {
    setEditing(lead)
    setForm({
      name: lead.name,
      phone: lead.phone,
      status: lead.status,
      seller_id: lead.seller_id || '',
    })
  }

  const closeEdit = () => setEditing(null)

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: editing.id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          status: form.status,
          seller_id: form.seller_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast.success('Lead atualizado', form.name)
      closeEdit()
      loadLeads()
    } catch (err: any) {
      toast.error('Erro ao salvar', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Excluir o lead ${lead.name}? Esta ação não pode ser desfeita.`)) return
    setDeleting(lead.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ id: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir')
      toast.success('Lead excluído', lead.name)
      loadLeads()
    } catch (err: any) {
      toast.error('Erro ao excluir', err.message)
    } finally {
      setDeleting(null)
    }
  }

  const openConversation = (lead: Lead) => {
    router.push(`/dashboard/conversas?lead_id=${lead.id}`)
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

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[260px] max-w-md group">
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

        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-dim" />
          <select
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
            className="input-theme rounded-2xl px-6 py-3.5 text-sm font-bold cursor-pointer hover:bg-[var(--hover-bg)]"
          >
            <option value="all">Todos os vendedores</option>
            <option value="none">Sem vendedor</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="bg-card-theme border border-main rounded-3xl p-24 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-black text-main mb-4 tracking-tight">Nenhum lead encontrado</h3>
            <p className="text-dim text-lg max-w-md mx-auto leading-relaxed font-medium">
              Os leads serão capturados automaticamente quando chegarem mensagens de novos contatos.
            </p>
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
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border',
                  STATUS_STYLES[lead.status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                )}>
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>

              <div className="space-y-3 mb-8 relative z-10">
                <div className="flex items-center gap-3 text-sm font-medium text-dim">
                  <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                  </div>
                  <span>{lead.message_count} mensagens trocadas</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-dim">
                  <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-amber-500" />
                  </div>
                  <span>
                    {lead.seller_name
                      ? <>Atendido por: <span className="text-main font-bold">{lead.seller_name}</span></>
                      : <span className="italic">Sem vendedor atribuído</span>}
                  </span>
                </div>
                {lead.last_contact && (
                  <div className="flex items-center gap-3 text-sm font-medium text-dim">
                    <div className="w-8 h-8 bg-main/30 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <span>
                      Último contato:{' '}
                      <span className="text-main font-bold">
                        {new Date(lead.last_contact).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => openConversation(lead)}
                  className="flex-1 bg-main/30 text-main px-4 py-3 rounded-xl font-black hover:bg-amber-500 hover:text-white transition-all text-xs uppercase tracking-widest border border-transparent hover:border-amber-500"
                >
                  Ver Conversa
                </button>
                <button
                  onClick={() => openEdit(lead)}
                  className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black hover:bg-amber-500 transition-all text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(lead)}
                  disabled={deleting === lead.id}
                  className="px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/20 disabled:opacity-50"
                  title="Excluir lead"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card-theme border border-main rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={closeEdit}
              className="absolute top-6 right-6 p-2 text-dim hover:text-main transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-3xl font-black heading-gradient mb-1 tracking-tighter">Editar Lead</h2>
            <p className="text-dim text-sm font-medium mb-8">Atualize os dados e atribua um vendedor</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-bold cursor-pointer"
                >
                  <option value="new">Novo</option>
                  <option value="contacted">Contatado</option>
                  <option value="qualified">Qualificado</option>
                  <option value="converted">Convertido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Vendedor responsável</label>
                <select
                  value={form.seller_id}
                  onChange={(e) => setForm((f) => ({ ...f, seller_id: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-bold cursor-pointer"
                >
                  <option value="">Sem vendedor</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeEdit}
                className="flex-1 bg-main/20 hover:bg-main/30 text-dim px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
