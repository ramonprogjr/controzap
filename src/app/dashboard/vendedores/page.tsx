'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { ZapSpinner } from '@/components/ui/ZapSpinner'
import { cn } from '@/lib/utils/cn'
import { User, Mail, Phone, Plus, Search, X, Trash2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

type Seller = {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive'
  created_at: string
}

type ModalMode = 'create' | 'edit' | null

export default function VendedoresPage() {
  const toast = useToast()
  const supabase = createClient()

  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Seller | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', status: 'active' as 'active' | 'inactive' })

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    }
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/sellers', { headers, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar vendedores')
      setSellers(data.sellers || [])
    } catch (err: any) {
      toast.error('Erro', err.message)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, toast])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setSelected(null)
    setForm({ name: '', email: '', phone: '', status: 'active' })
    setModalMode('create')
  }

  const openEdit = (s: Seller) => {
    setSelected(s)
    setForm({
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      status: s.status,
    })
    setModalMode('edit')
  }

  const close = () => {
    setModalMode(null)
    setSelected(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome obrigatório', 'Informe o nome do vendedor')
      return
    }
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const isEdit = modalMode === 'edit' && selected
      const res = await fetch('/api/sellers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(isEdit
          ? { id: selected!.id, ...form }
          : form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast.success(isEdit ? 'Vendedor atualizado' : 'Vendedor criado', form.name)
      close()
      load()
    } catch (err: any) {
      toast.error('Erro ao salvar', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (s: Seller) => {
    const next = s.status === 'active' ? 'inactive' : 'active'
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/sellers', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ id: s.id, status: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(next === 'active' ? 'Vendedor ativado' : 'Vendedor desativado', s.name)
      load()
    } catch (err: any) {
      toast.error('Erro', err.message)
    }
  }

  const handleDelete = async (s: Seller) => {
    if (!confirm(`Excluir o vendedor ${s.name}?`)) return
    setDeleting(s.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/sellers', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ id: s.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Vendedor excluído', s.name)
      load()
    } catch (err: any) {
      toast.error('Erro ao excluir', err.message)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = sellers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">Vendedores</h1>
          <p className="text-dim text-lg font-medium">Gerencie sua equipe comercial</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Novo Vendedor
        </button>
      </div>

      <div className="bg-card-theme border border-main rounded-3xl p-2 mb-8 flex gap-2">
        <div className="flex-1 bg-main/30 rounded-2xl flex items-center px-4 border border-transparent focus-within:border-amber-500/30 transition-all">
          <Search className="w-5 h-5 text-dim mr-3" />
          <input
            type="text"
            placeholder="Buscar vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent w-full py-3 text-main outline-none placeholder:text-dim/50 font-medium"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card-theme border border-main rounded-3xl p-24 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20">
            <User className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-main mb-4 tracking-tight">Nenhum vendedor cadastrado</h3>
          <p className="text-dim text-lg max-w-md mx-auto leading-relaxed font-medium mb-8">
            Cadastre os vendedores da sua equipe para distribuir leads e gerenciar comissões.
          </p>
          <button
            onClick={openCreate}
            className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
          >
            Cadastrar primeiro vendedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-card-theme border border-main rounded-3xl p-6 hover:border-amber-500/50 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-main tracking-tight">{s.name}</h3>
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border mt-1',
                      s.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    )}>
                      {s.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                {s.email && (
                  <div className="flex items-center gap-2 text-dim">
                    <Mail className="w-4 h-4 text-amber-500" />
                    <span className="font-medium truncate">{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-dim">
                    <Phone className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{s.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 bg-main/30 text-main px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => handleToggleStatus(s)}
                  className="px-3 py-2.5 bg-main/30 text-main rounded-xl hover:bg-amber-500/20 hover:text-amber-400 transition-all"
                  title={s.status === 'active' ? 'Desativar' : 'Ativar'}
                >
                  {s.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  disabled={deleting === s.id}
                  className="px-3 py-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card-theme border border-main rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={close} className="absolute top-6 right-6 p-2 text-dim hover:text-main transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-3xl font-black heading-gradient mb-1 tracking-tighter">
              {modalMode === 'create' ? 'Novo Vendedor' : 'Editar Vendedor'}
            </h2>
            <p className="text-dim text-sm font-medium mb-8">Dados comerciais do vendedor</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                  placeholder="vendedor@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-bold cursor-pointer"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={close}
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
