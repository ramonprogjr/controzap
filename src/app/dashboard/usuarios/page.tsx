'use client'

import { useState, useEffect } from 'react'
import { Search, Shield, User, Mail, Plus, X, Eye, EyeOff, Pencil, Trash2, ToggleLeft, ToggleRight, UserPlus } from 'lucide-react'
import { ZapSpinner } from '@/components/ui/ZapSpinner'
import { useToast } from '@/components/ui/ToastContainer'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'

type UserType = {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
}

type RoleOption = { id: string; name: string }

const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Supervisor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Vendedor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Leitor: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

type ModalMode = 'create' | 'edit' | null

export default function EquipePage() {
  const toast = useToast()
  const [users, setUsers] = useState<UserType[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
  })

  const defaultRoleId = (rs: RoleOption[]) => {
    return rs.find((r) => r.name.toLowerCase() === 'vendedor')?.id || rs[0]?.id || ''
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/roles', { headers, credentials: 'include' })
      const data = await res.json()
      const list: RoleOption[] = (data.roles || []).map((r: any) => ({ id: r.id, name: r.name }))
      setRoles(list)
      setForm((prev) => ({ ...prev, roleId: prev.roleId || defaultRoleId(list) }))
    } catch {
      toast.error('Erro', 'Não foi possível carregar os cargos')
    }
  }

  const getAuthHeaders = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    }
  }

  const loadUsers = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', { headers, credentials: 'include' })
      const data = await res.json()
      if (data.users) setUsers(data.users)
      else toast.error('Erro ao carregar equipe', data.error || '')
    } catch {
      toast.error('Erro', 'Não foi possível carregar a equipe')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', roleId: defaultRoleId(roles) })
    setSelectedUser(null)
    setShowPassword(false)
    setModalMode('create')
  }

  const openEdit = (user: UserType) => {
    const role = roles.find((r) => r.name.toLowerCase() === user.role?.toLowerCase())
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      roleId: role?.id || defaultRoleId(roles),
    })
    setSelectedUser(user)
    setShowPassword(false)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedUser(null)
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Campos obrigatórios', 'Preencha nome, email e senha')
      return
    }
    if (form.password.length < 8) {
      toast.error('Senha fraca', 'A senha deve ter pelo menos 8 caracteres')
      return
    }
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, roleId: form.roleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar colaborador')
      toast.success('Colaborador criado!', `${form.name} foi adicionado à equipe`)
      closeModal()
      loadUsers()
    } catch (err: any) {
      toast.error('Erro ao criar', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const body: any = { userId: selectedUser.id, roleId: form.roleId }
      if (form.password.trim()) {
        if (form.password.length < 8) {
          toast.error('Senha fraca', 'A senha deve ter pelo menos 8 caracteres')
          setSaving(false)
          return
        }
        body.password = form.password
      }
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao editar')
      toast.success('Colaborador atualizado!', '')
      closeModal()
      loadUsers()
    } catch (err: any) {
      toast.error('Erro ao editar', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: UserType) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id === user.id) {
      toast.error('Ação não permitida', 'Você não pode desativar sua própria conta')
      return
    }
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ userId: user.id, isActive: !user.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(user.is_active ? 'Colaborador desativado' : 'Colaborador ativado', user.name)
      loadUsers()
    } catch (err: any) {
      toast.error('Erro', err.message)
    }
  }

  const handleDelete = async (user: UserType) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id === user.id) {
      toast.error('Ação não permitida', 'Você não pode excluir sua própria conta')
      return
    }
    if (!confirm(`Tem certeza que deseja excluir ${user.name}? Esta ação não pode ser desfeita.`)) return
    setDeleting(user.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Colaborador excluído', user.name)
      loadUsers()
    } catch (err: any) {
      toast.error('Erro ao excluir', err.message)
    } finally {
      setDeleting(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 min-h-screen animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black heading-gradient mb-2 tracking-tighter">Nossa Equipe</h1>
          <p className="text-dim text-lg font-medium">Gerencie os colaboradores com acesso à plataforma</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Novo Colaborador
        </button>
      </div>

      {/* Search */}
      <div className="bg-card-theme border border-main rounded-3xl p-2 mb-8 flex gap-2">
        <div className="flex-1 bg-main/30 rounded-2xl flex items-center px-4 border border-transparent focus-within:border-amber-500/30 transition-all">
          <Search className="w-5 h-5 text-dim mr-3" />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent w-full py-3 text-main outline-none placeholder:text-dim/50 font-medium"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center p-20"><ZapSpinner size="lg" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center p-20 bg-card-theme border border-main rounded-3xl">
          <UserPlus className="w-16 h-16 text-dim/20 mx-auto mb-4" />
          <p className="text-dim font-bold text-lg mb-2">Nenhum colaborador encontrado</p>
          <p className="text-dim/60 text-sm">Clique em "Novo Colaborador" para adicionar um membro à equipe</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                "bg-card-theme border rounded-3xl p-6 hover:shadow-2xl transition-all group relative overflow-hidden",
                user.is_active ? "border-main hover:border-amber-500/30" : "border-red-500/20 opacity-70"
              )}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield className="w-24 h-24 text-main rotate-12" />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg mb-4 group-hover:scale-110 transition-transform duration-500",
                  user.is_active
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/20"
                    : "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/20"
                )}>
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <h3 className="text-xl font-black text-main mb-1">{user.name}</h3>

                <div className="flex items-center gap-2 mb-6">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                    ROLE_STYLES[user.role] || 'bg-main/10 text-dim border-main/20'
                  )}>
                    {user.role || 'Sem Cargo'}
                  </span>
                  <span
                    className={cn("w-2 h-2 rounded-full", user.is_active ? "bg-amber-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")}
                    title={user.is_active ? 'Ativo' : 'Inativo'}
                  />
                </div>

                <div className="w-full space-y-2 mb-6">
                  <div className="flex items-center gap-3 bg-main/10 p-3 rounded-xl">
                    <Mail className="w-4 h-4 text-dim shrink-0" />
                    <p className="text-xs font-medium text-main truncate">{user.email}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full flex gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-main/20 hover:bg-amber-500/20 hover:text-amber-400 text-dim px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all border border-transparent hover:border-amber-500/20"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border",
                      user.is_active
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                    )}
                    title={user.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {user.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deleting === user.id}
                    className="flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    title="Excluir"
                  >
                    {deleting === user.id ? <ZapSpinner size="sm" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-main tracking-tight">
                  {modalMode === 'create' ? 'Novo Colaborador' : 'Editar Colaborador'}
                </h2>
                <p className="text-dim text-sm mt-1">
                  {modalMode === 'create' ? 'Adicione um novo membro à equipe' : `Editando ${selectedUser?.name}`}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-main/20 text-dim hover:text-main transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {modalMode === 'create' && (
                <>
                  <div>
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Nome completo</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: João Silva"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 font-medium transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="colaborador@empresa.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 font-medium transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
                  {modalMode === 'create' ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={modalMode === 'create' ? 'Mínimo 8 caracteres' : 'Deixe em branco para não alterar'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Cargo / Permissão</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm(f => ({ ...f, roleId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 font-bold cursor-pointer transition-all appearance-none"
                >
                  {roles.length === 0 ? (
                    <option value="" disabled>Carregando cargos...</option>
                  ) : roles.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-800 text-white">{r.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  {(() => {
                    const current = roles.find((r) => r.id === form.roleId)?.name?.toLowerCase()
                    if (current === 'admin') return 'Acesso total à plataforma'
                    if (current === 'supervisor') return 'Visualiza conversas, leads e equipe'
                    if (current === 'vendedor') return 'Envia e recebe mensagens nas conversas'
                    if (current === 'leitor') return 'Apenas visualização de conversas e leads'
                    return 'Cargo personalizado'
                  })()}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeModal}
                className="flex-1 bg-main/20 hover:bg-main/30 text-dim px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={modalMode === 'create' ? handleCreate : handleEdit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <ZapSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Salvando...' : modalMode === 'create' ? 'Criar Colaborador' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
