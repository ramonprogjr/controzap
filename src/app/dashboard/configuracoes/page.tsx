'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, Shield, Bell, User, Zap, Globe, Heart, Users, Plus, Trash2, Edit2, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { cn } from '@/lib/utils/cn'
import { ZapSpinner } from '@/components/ui/ZapSpinner'

type Role = {
    id: string
    name: string
    description: string | null
    is_system: boolean
    permissions: string[]
}

type Permission = {
    id: string
    key: string
    description: string | null
    created_at: string
}

type AppUser = {
    id: string
    name: string
    email: string
    role: string | null
    is_active: boolean
    created_at: string
}

export default function ConfiguracoesPage() {
    const toast = useToast()
    const supabase = createClient()
    const [section, setSection] = useState<'perfil' | 'roles' | 'usuarios' | 'permissoes' | 'notificacoes' | 'integracoes' | 'billing'>('perfil')
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [users, setUsers] = useState<AppUser[]>([])
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleDescription, setNewRoleDescription] = useState('')
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [creatingRole, setCreatingRole] = useState(false)
    const [loadingPermissions, setLoadingPermissions] = useState(false)
    const [creatingUser, setCreatingUser] = useState(false)
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', confirmPassword: '', roleId: '' })
    const [editingUser, setEditingUser] = useState<AppUser | null>(null)
    const [userSideoverOpen, setUserSideoverOpen] = useState(false)
    const [roleSideoverOpen, setRoleSideoverOpen] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [initializing, setInitializing] = useState(false)
    // Permissões agora são read-only (não editáveis)
    const isAdmin = userRole?.toLowerCase() === 'admin'

    // Settings States
    const [notificationSettings, setNotificationSettings] = useState({
        whatsappAlerts: true,
        emailAlerts: false,
        leadAssignment: true,
        systemSounds: true
    })
    const [integrationSettings, setIntegrationSettings] = useState({
        webhookUrl: 'https://api.controlzap.com.br/v1/webhook/123456',
        apiKey: 'sk_live_51P8Xp...'
    })

    const permissionsByKey = useMemo(() => {
        return new Map(permissions.map((perm) => [perm.key, perm]))
    }, [permissions])

    const permissionGroups = useMemo(() => ([
        { title: 'Instâncias do WhatsApp', prefix: 'instances' },
        { title: 'Gestão de Conversas', prefix: 'conversations' },
        { title: 'Gestão de Leads', prefix: 'leads' },
        { title: 'Vendedores e Equipe', prefix: 'vendors' },
        { title: 'Financeiro e Assinatura', prefix: 'billing' },
        { title: 'Configurações do Sistema', prefix: 'settings' },
    ]), [])

    const groupedPermissions = useMemo(() => {
        // Mapa para evitar duplicatas nos grupos
        const assignedIds = new Set<string>()

        const groups = permissionGroups.map(group => {
            const items = permissions.filter(p => {
                if (p.key.startsWith(group.prefix + '.')) {
                    assignedIds.add(p.id)
                    return true
                }
                return false
            })
            return {
                title: group.title,
                items: items.sort((a, b) => a.key.localeCompare(b.key))
            }
        })

        // Itens que não se encaixaram em nenhum grupo (Outros)
        const others = permissions.filter(p => !assignedIds.has(p.id))

        if (others.length > 0) {
            groups.push({
                title: 'Outras Permissões',
                items: others
            })
        }

        return groups.filter(g => g.items.length > 0)
    }, [permissions, permissionGroups])

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
            setUserRole(data?.role || null)
        }
        fetchUserRole()
    }, [])

    useEffect(() => {
        if (section === 'permissoes') {
            loadPermissions()
        }
        if (section === 'roles') {
            loadPermissions()
            loadRoles()
        }
        if (section === 'usuarios') {
            loadRoles()
            loadUsers()
        }
    }, [section])

    const loadPermissions = async () => {
        setLoadingPermissions(true)
        try {
            console.log('[Configuracoes] Carregando permissões...')
            let res = await fetch('/api/admin/permissions')

            // Fallback: se falhar (ex: 401/500), tenta endpoint simplificado puramente para leitura visual
            if (!res.ok) {
                console.warn('[Configuracoes] Falha no endpoint principal, tentando fallback...')
                // Nota: Em produção idealmente corrigimos o auth, mas isso garante que a UI não quebre
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Tenta recarregar auth
                    await supabase.auth.refreshSession()
                    res = await fetch('/api/admin/permissions')
                }
            }

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar permissões')
            setPermissions(data.permissions || [])
        } catch (err: any) {
            console.error('[Configuracoes] Erro ao carregar permissões:', err)
            // Não mostra toast de erro se for apenas visualização, para não poluir a tela
        } finally {
            setLoadingPermissions(false)
        }
    }

    const loadRoles = async () => {
        try {
            const res = await fetch('/api/admin/roles')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar cargos')
            setRoles(data.roles || [])
        } catch (err: any) {
            console.error('[Configuracoes] Erro ao carregar cargos:', err)
        }
    }

    const loadUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar usuários')
            setUsers(data.users || [])
        } catch (err: any) {
            toast.error('Erro ao carregar usuários', err.message)
        }
    }

    const handleInitialize = async () => {
        setInitializing(true)
        try {
            const res = await fetch('/api/admin/initialize', {
                method: 'POST',
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao inicializar')
            toast.success('Sistema inicializado!', `${data.permissions} permissões criadas`)
            await loadPermissions()
            await loadRoles()
        } catch (err: any) {
            toast.error('Erro ao inicializar', err.message)
        } finally {
            setInitializing(false)
        }
    }



    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast.error('Nome obrigatório', 'Informe o nome do cargo')
            return
        }
        if (selectedPermissions.length === 0) {
            toast.error('Permissões obrigatórias', 'Selecione ao menos uma permissão')
            return
        }
        setCreatingRole(true)
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newRoleName.trim(),
                    description: newRoleDescription || null,
                    permissions: selectedPermissions,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao criar cargo')
            toast.success('Cargo criado', 'As permissões foram salvas')
            setNewRoleName('')
            setNewRoleDescription('')
            setSelectedPermissions([])
            loadRoles()
            setRoleSideoverOpen(false)
        } catch (err: any) {
            toast.error('Erro ao criar cargo', err.message)
        } finally {
            setCreatingRole(false)
        }
    }

    const handleUpdateRole = async () => {
        if (!selectedRole) return
        setCreatingRole(true)
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roleId: selectedRole.id,
                    name: selectedRole.name,
                    description: selectedRole.description,
                    permissions: selectedPermissions,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao atualizar cargo')
            toast.success('Cargo atualizado', 'Permissões atualizadas')
            setSelectedRole(null)
            setSelectedPermissions([])
            loadRoles()
            setRoleSideoverOpen(false)
        } catch (err: any) {
            toast.error('Erro ao atualizar cargo', err.message)
        } finally {
            setCreatingRole(false)
        }
    }

    const handleDeleteRole = async (role: Role) => {
        if (role.is_system) {
            toast.error('Operação não permitida', 'Cargos do sistema não podem ser excluídos')
            return
        }
        if (!confirm(`Deseja excluir o cargo "${role.name}"?`)) return
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId: role.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao excluir cargo')
            toast.success('Cargo excluído', 'O cargo foi removido')
            loadRoles()
        } catch (err: any) {
            toast.error('Erro ao excluir cargo', err.message)
        }
    }

    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password || !newUser.roleId) {
            toast.error('Campos obrigatórios', 'Informe nome, email, senha e cargo')
            return
        }
        if (newUser.password.length < 8) {
            toast.error('Senha fraca', 'A senha deve ter pelo menos 8 caracteres')
            return
        }
        if (newUser.password !== newUser.confirmPassword) {
            toast.error('Senha não confere', 'As senhas precisam ser iguais')
            return
        }
        setCreatingUser(true)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário')
            toast.success('Usuário criado', 'Acesso liberado')
            setNewUser({ name: '', email: '', password: '', confirmPassword: '', roleId: '' })
            setUserSideoverOpen(false)
            loadUsers()
        } catch (err: any) {
            toast.error('Erro ao criar usuário', err.message)
        } finally {
            setCreatingUser(false)
        }
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return
        setCreatingUser(true)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: editingUser.id,
                    roleId: newUser.roleId || undefined,
                    password: newUser.password || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário')
            toast.success('Usuário atualizado', 'Dados atualizados com sucesso')
            setUserSideoverOpen(false)
            setEditingUser(null)
            setNewUser({ name: '', email: '', password: '', confirmPassword: '', roleId: '' })
            loadUsers()
        } catch (err: any) {
            toast.error('Erro ao atualizar usuário', err.message)
        } finally {
            setCreatingUser(false)
        }
    }

    const handleToggleUser = async (user: AppUser) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, isActive: !user.is_active }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário')
            loadUsers()
        } catch (err: any) {
            toast.error('Erro ao atualizar usuário', err.message)
        }
    }

    const handleDeleteUser = async (user: AppUser) => {
        if (!confirm(`Excluir usuário ${user.name}?`)) return
        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao excluir usuário')
            toast.success('Usuário excluído', 'Acesso removido')
            loadUsers()
        } catch (err: any) {
            toast.error('Erro ao excluir usuário', err.message)
        }
    }

    return (
        <div className="p-8 min-h-screen animate-in fade-in duration-700">
            <div className="mb-10 text-center md:text-left">
                <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">
                    Configurações
                </h1>
                <p className="text-dim text-lg font-medium">Personalize sua experiência no ControlZap CRM</p>
            </div>


            <div className="space-y-6">
                <div className="flex flex-wrap gap-2 bg-card-theme/50 backdrop-blur-xl border border-main rounded-2xl p-2">
                    {[
                        { id: 'perfil', label: 'Meu Perfil' },
                        ...(isAdmin ? [
                            { id: 'permissoes', label: 'Permissões' },
                            { id: 'roles', label: 'Cargos e Acessos' },
                            { id: 'usuarios', label: 'Usuários' },
                        ] : []),
                        { id: 'notificacoes', label: 'Notificações' },
                        { id: 'integracoes', label: 'Integrações' },
                        { id: 'billing', label: 'Assinatura' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSection(item.id as typeof section)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${section === item.id
                                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 scale-105'
                                : 'text-dim hover:text-main hover:bg-white/5'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {section === 'perfil' && (
                    <div className="bg-card-theme border border-main rounded-3xl p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                        <h3 className="text-3xl font-black text-main mb-10 flex items-center gap-4 tracking-tight">
                            <div className="p-3 bg-green-500/10 rounded-2xl">
                                <User className="text-green-500 w-8 h-8" />
                            </div>
                            Informações do Perfil
                        </h3>

                        <div className="space-y-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        className="w-full input-theme rounded-2xl px-6 py-4 text-sm font-bold shadow-inner"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">E-mail</label>
                                    <input
                                        type="email"
                                        disabled
                                        className="w-full input-theme opacity-50 cursor-not-allowed rounded-2xl px-6 py-4 text-sm font-bold"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Idioma</label>
                                <div className="relative">
                                    <select className="w-full input-theme rounded-2xl px-6 py-4 text-sm font-bold appearance-none outline-none cursor-pointer">
                                        <option>Português (Brasil)</option>
                                        <option>English (US)</option>
                                        <option>Español</option>
                                    </select>
                                    <Globe className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-dim pointer-events-none" />
                                </div>
                            </div>

                            <div className="pt-10 border-t border-main flex justify-end">
                                <button className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-green-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:from-green-500 hover:to-green-500 transition-all shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95">
                                    <Save className="w-5 h-5" />
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {section === 'permissoes' && (
                    <div className="bg-card-theme border border-main rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row items-center justify-between px-10 py-8 border-b border-main gap-4">
                            <div>
                                <h3 className="text-3xl font-black text-main tracking-tight flex items-center gap-3">
                                    Permissões do Sistema
                                    <button
                                        onClick={loadPermissions}
                                        disabled={loadingPermissions}
                                        className="p-2 hover:bg-main/10 rounded-full transition-colors"
                                        title="Atualizar lista"
                                    >
                                        <Zap className={cn("w-5 h-5 text-green-500", loadingPermissions && "animate-spin text-dim")} />
                                    </button>
                                </h3>
                                <p className="text-dim font-medium">Visualize as permissões disponíveis para atribuição aos cargos.</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-main">
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Key</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Descrição</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Criada em</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-main">
                                    {loadingPermissions ? (
                                        <tr>
                                            <td colSpan={3} className="px-10 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                                                    <p className="text-dim font-bold text-sm">Carregando permissões...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : permissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-10 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Shield className="w-16 h-16 text-dim/20" />
                                                    <p className="text-dim font-bold">Nenhuma permissão encontrada</p>
                                                    <button
                                                        onClick={handleInitialize}
                                                        className="mt-4 bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-green-500 transition-all shadow-lg shadow-green-500/20"
                                                    >
                                                        Inicializar Sistema
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        permissions.map((permission) => (
                                            <tr key={permission.id} className="hover:bg-[var(--hover-bg)] transition-colors group/row">
                                                <td className="px-10 py-6">
                                                    <code className="text-main font-black text-sm font-mono bg-main/10 px-3 py-1 rounded-lg">
                                                        {permission.key}
                                                    </code>
                                                </td>
                                                <td className="px-10 py-6 text-dim font-medium">
                                                    {permission.description || 'Sem descrição'}
                                                </td>
                                                <td className="px-10 py-6 text-dim font-medium text-sm">
                                                    {new Date(permission.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {section === 'roles' && (
                    <div className="bg-card-theme border border-main rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row items-center justify-between px-10 py-8 border-b border-main gap-4">
                            <div>
                                <h3 className="text-3xl font-black text-main tracking-tight">Cargos e Acessos</h3>
                                <p className="text-dim font-medium">Defina quais partes do sistema cada cargo acessa.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedRole(null)
                                    setNewRoleName('')
                                    setNewRoleDescription('')
                                    setSelectedPermissions([])
                                    setRoleSideoverOpen(true)
                                }}
                                className="flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-500 transition-all shadow-lg shadow-green-500/20 active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> Novo cargo
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-main">
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Cargo</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Descrição</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Permissões</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-main">
                                    {roles.map((role) => (
                                        <tr key={role.id} className="hover:bg-[var(--hover-bg)] transition-colors group/row">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-main font-black text-xl tracking-tight">{role.name}</span>
                                                    {role.is_system && (
                                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-black uppercase rounded-lg tracking-wider">Sistema</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-dim font-medium">
                                                {role.description || 'Sem descrição'}
                                            </td>
                                            <td className="px-10 py-6 text-dim font-medium">
                                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-black">
                                                    {(role.permissions || []).length} permissões
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="inline-flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRole(role)
                                                            setSelectedPermissions(role.permissions || [])
                                                            setRoleSideoverOpen(true)
                                                        }}
                                                        className="p-3 rounded-xl bg-white/5 text-dim hover:text-main hover:bg-white/10 transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {!role.is_system && (
                                                        <button
                                                            onClick={() => handleDeleteRole(role)}
                                                            className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {section === 'usuarios' && (
                    <div className="bg-card-theme border border-main rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row items-center justify-between px-10 py-8 border-b border-main gap-4">
                            <div>
                                <h3 className="text-3xl font-black text-main tracking-tight">Usuários</h3>
                                <p className="text-dim font-medium">Crie usuários e defina cargos.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingUser(null)
                                    setNewUser({ name: '', email: '', password: '', confirmPassword: '', roleId: '' })
                                    setUserSideoverOpen(true)
                                }}
                                className="flex items-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> Novo usuário
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-main">
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Usuário</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Cargo</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Status</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px]">Criado em</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-dim uppercase tracking-[3px] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-main">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-[var(--hover-bg)] transition-colors group/row">
                                            <td className="px-10 py-6">
                                                <p className="text-main font-black text-xl tracking-tight">{user.name}</p>
                                                <p className="text-xs text-dim font-medium">{user.email}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-main font-bold px-3 py-1 bg-white/5 rounded-full text-xs">
                                                    {user.role || '—'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <button
                                                    onClick={() => handleToggleUser(user)}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${user.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                                                >
                                                    {user.is_active ? 'Ativo' : 'Inativo'}
                                                </button>
                                            </td>
                                            <td className="px-10 py-6 text-dim font-medium text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="inline-flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(user)
                                                            setNewUser({ name: user.name, email: user.email, password: '', confirmPassword: '', roleId: '' })
                                                            setUserSideoverOpen(true)
                                                        }}
                                                        className="p-3 rounded-xl bg-white/5 text-dim hover:text-main hover:bg-white/10 transition-all font-bold"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {section === 'notificacoes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-card-theme border border-main rounded-3xl p-10 shadow-2xl space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/20 group-hover:bg-green-500 transition-colors" />
                            <h3 className="text-2xl font-black text-main flex items-center gap-4">
                                <Bell className="w-6 h-6 text-green-500" /> Canais de Alerta
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { id: 'whatsappAlerts', label: 'Alertas via WhatsApp', desc: 'Receba notificações de novos leads no seu celular.' },
                                    { id: 'emailAlerts', label: 'Alertas via E-mail', desc: 'Relatórios diários e alertas críticos na sua caixa de entrada.' },
                                    { id: 'leadAssignment', label: 'Atribuição de Lead', desc: 'Notificar vendedores quando um novo lead for atribuído.' }
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-6 bg-main/20 rounded-2xl border border-main hover:border-green-500/30 transition-all cursor-pointer"
                                        onClick={() => setNotificationSettings(s => ({ ...s, [item.id]: !s[item.id as keyof typeof s] }))}>
                                        <div className="space-y-1">
                                            <p className="font-black text-main text-sm">{item.label}</p>
                                            <p className="text-[10px] text-dim font-bold uppercase tracking-wider">{item.desc}</p>
                                        </div>
                                        <div className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300",
                                            notificationSettings[item.id as keyof typeof notificationSettings] ? "bg-green-500" : "bg-main/50"
                                        )}>
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full transition-all duration-300",
                                                notificationSettings[item.id as keyof typeof notificationSettings] ? "translate-x-6" : "translate-x-0"
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-card-theme border border-main rounded-3xl p-10 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group">
                            <div className="p-8 bg-green-500/10 rounded-full border border-green-500/20 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                                <Zap className="w-16 h-16 text-green-500 fill-green-500/20" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-main tracking-tighter">Modo Turbo</h3>
                                <p className="text-dim font-medium max-w-xs mx-auto">Ative notificações instantâneas e nunca perca um lead qualificado.</p>
                            </div>
                            <button className="px-10 py-5 bg-gradient-to-r from-green-600 to-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-green-600/20 hover:scale-105 active:scale-95 transition-all">
                                Configurar Web Push
                            </button>
                        </div>
                    </div>
                )}

                {section === 'integracoes' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-card-theme border border-main rounded-3xl p-10 shadow-2xl space-y-10 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h3 className="text-3xl font-black text-main tracking-tighter mb-2">Webhooks & API</h3>
                                    <p className="text-dim font-medium">Conecte o ControlZap ao seu CRM, Zapier ou Make.</p>
                                </div>
                                <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                                    <Globe className="w-8 h-8 text-green-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-dim uppercase tracking-[3px] ml-1">Webhook URL</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            readOnly
                                            value={integrationSettings.webhookUrl}
                                            className="flex-1 input-theme rounded-2xl px-6 py-4 text-sm font-mono font-bold"
                                        />
                                        <button className="bg-main/30 border border-main px-6 rounded-2xl text-main font-black uppercase text-[10px] tracking-widest hover:bg-main/50 transition-all">
                                            Copiar
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-dim/60 font-bold uppercase tracking-widest leading-relaxed">
                                        Enviamos um POST JSON para esta URL sempre que um novo lead for capturado ou uma conversa for atualizada.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black text-dim uppercase tracking-[3px] ml-1">Chave de API (Secret)</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="password"
                                            readOnly
                                            value={integrationSettings.apiKey}
                                            className="flex-1 input-theme rounded-2xl px-6 py-4 text-sm font-mono font-bold"
                                        />
                                        <button className="bg-main/30 border border-main px-6 rounded-2xl text-main font-black uppercase text-[10px] tracking-widest hover:bg-main/50 transition-all">
                                            Revelar
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-dim/60 font-bold uppercase tracking-widest leading-relaxed">
                                        Use esta chave para autenticar suas requisições externas para o ControlZap. Mantenha-a em sigilo.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-main">
                                <button className="flex items-center gap-3 text-green-500 font-black uppercase tracking-widest text-[10px] hover:translate-x-2 transition-transform">
                                    <Plus className="w-4 h-4" /> Gerar nova URL de Webhook
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { name: 'Zapier', desc: 'Automação sem código', iconColor: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
                                { name: 'Make.com', desc: 'Workflows avançados', iconColor: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
                                { name: 'Typebot', desc: 'Bots conversacionais', iconColor: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' }
                            ].map((app) => (
                                <div key={app.name} className="bg-card-theme border border-main rounded-3xl p-8 shadow-xl hover:-translate-y-2 transition-all group cursor-pointer">
                                    <div className={cn("w-12 h-12 rounded-2xl mb-6 flex items-center justify-center border", app.bgColor, app.borderColor)}>
                                        <Plus className={cn("w-6 h-6", app.iconColor)} />
                                    </div>
                                    <h4 className="text-xl font-black text-main mb-1">{app.name}</h4>
                                    <p className="text-xs text-dim font-bold uppercase tracking-wider">{app.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {section === 'billing' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-card-theme border border-main rounded-3xl p-10 shadow-2xl space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5">
                                    <Zap className="w-64 h-64 text-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg tracking-widest">Plano Pro</span>
                                        <span className="text-dim font-bold text-sm">Assinado desde Junho, 2025</span>
                                    </div>
                                    <h3 className="text-5xl font-black text-main tracking-tighter">ControlZap Turbo Enterprise</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-main">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <p className="text-xs font-black text-dim uppercase tracking-widest">Leads Capturados</p>
                                            <p className="text-sm font-black text-main">4.210 / 10.000</p>
                                        </div>
                                        <div className="h-2 w-full bg-main/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[42%] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <p className="text-xs font-black text-dim uppercase tracking-widest">Instâncias Ativas</p>
                                            <p className="text-sm font-black text-main">8 / 15</p>
                                        </div>
                                        <div className="h-2 w-full bg-main/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[53%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-10 shadow-2xl text-white flex flex-col justify-between">
                                <div>
                                    <h4 className="text-2xl font-black tracking-tight mb-4 text-white/80 uppercase">Próximo Vencimento</h4>
                                    <p className="text-6xl font-black tracking-tighter mb-4">R$ 297</p>
                                    <p className="font-bold opacity-80 mb-10">Vence em 22 de Fevereiro de 2026</p>
                                </div>
                                <button className="w-full bg-white text-green-700 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all shadow-2xl active:scale-95">
                                    Gerenciar Pagamento
                                </button>
                            </div>
                        </div>

                        <div className="bg-main/30 border border-main rounded-3xl p-10 text-center space-y-4">
                            <Heart className="w-12 h-12 text-red-500/50 mx-auto" />
                            <h4 className="text-2xl font-black text-main tracking-tight">Precisa de um plano customizado?</h4>
                            <p className="text-dim font-medium max-w-md mx-auto">Temos soluções Enterprise para times de alta performance. Fale diretamente com o nosso time técnico.</p>
                            <button className="text-green-500 font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all pt-4">
                                Abrir Ticket de Vendas →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sideovers: Roles & Users */}
            {roleSideoverOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setRoleSideoverOpen(false)}
                    />
                    <div className="relative w-full max-w-3xl bg-sidebar-theme border-l border-main shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Premium Header */}
                        <div className="relative h-48 flex-shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-transparent to-transparent transition-all duration-700" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />

                            <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center shadow-2xl border border-green-500/20 rotate-6 transition-transform hover:rotate-0 duration-500">
                                        <Shield className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-main mb-1 tracking-tighter">
                                            {selectedRole ? 'Editar Cargo' : 'Novo Cargo'}
                                        </h2>
                                        <p className="text-dim font-medium tracking-tight">Gerencie os níveis de acesso e permissões</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRoleSideoverOpen(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-dim hover:text-main transition-all shadow-inner"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 -mt-8 relative z-10 space-y-10 scrollbar-hide">
                            <div className="bg-main/30 border border-main rounded-3xl p-10 shadow-2xl space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Nome do Cargo</label>
                                        <input
                                            type="text"
                                            value={selectedRole ? selectedRole.name : newRoleName}
                                            onChange={(e) => selectedRole
                                                ? setSelectedRole({ ...selectedRole, name: e.target.value })
                                                : setNewRoleName(e.target.value)}
                                            placeholder="Ex: Supervisor de Vendas"
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-lg font-black"
                                            disabled={selectedRole?.is_system}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Descrição</label>
                                        <input
                                            type="text"
                                            value={selectedRole ? selectedRole.description || '' : newRoleDescription}
                                            onChange={(e) => selectedRole
                                                ? setSelectedRole({ ...selectedRole, description: e.target.value })
                                                : setNewRoleDescription(e.target.value)}
                                            placeholder="Breve resumo das funções"
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium"
                                            disabled={selectedRole?.is_system}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <h3 className="text-xs font-black text-dim uppercase tracking-[4px] ml-4 flex items-center gap-3">
                                    <Zap className="w-4 h-4 text-green-500" /> Matriz de Permissões
                                </h3>

                                {loadingPermissions ? (
                                    <div className="flex flex-col items-center justify-center p-20 bg-main/20 rounded-3xl border border-main border-dashed">
                                        <ZapSpinner size="lg" />
                                        <p className="mt-4 text-dim font-black uppercase tracking-widest text-[10px]">Carregando Matriz...</p>
                                    </div>
                                ) : groupedPermissions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-20 bg-main/10 rounded-3xl border border-main border-dashed group/empty">
                                        <div className="w-20 h-20 bg-main/20 rounded-full flex items-center justify-center mb-6 group-hover/empty:scale-110 transition-transform duration-500">
                                            <Shield className="w-10 h-10 text-dim/40" />
                                        </div>
                                        <p className="text-dim font-black uppercase tracking-[4px] text-xs text-center max-w-xs leading-relaxed">
                                            Sua matriz de permissões está vazia no banco de dados.
                                        </p>
                                        <p className="text-[10px] text-dim/40 font-bold mt-2 uppercase tracking-widest text-center">
                                            Execute a inicialização para criar permissões e cargos padrão.
                                        </p>
                                        <div className="flex gap-4 mt-8">
                                            <button
                                                onClick={handleInitialize}
                                                disabled={initializing}
                                                className="px-8 py-3 bg-green-600 hover:bg-green-500 border border-green-500/30 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                                            >
                                                {initializing ? 'Inicializando...' : 'Inicializar Sistema'}
                                            </button>
                                            <button
                                                onClick={loadPermissions}
                                                disabled={initializing}
                                                className="px-8 py-3 bg-main/20 hover:bg-main/30 border border-main rounded-xl text-green-500 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                Verificar Novamente
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    groupedPermissions.map((group) => (
                                        <div key={group.title} className="bg-card-theme/30 border border-main rounded-3xl p-10 space-y-8 hover:bg-card-theme/50 transition-all group/card">
                                            <h4 className="text-2xl font-black text-main flex items-center gap-4 tracking-tight">
                                                <div className="w-2 h-8 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                                                {group.title}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {group.items.map((perm) => {
                                                    const isActive = selectedPermissions.includes(perm.key)
                                                    return (
                                                        <label
                                                            key={perm.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-6 rounded-2xl border-2 transition-all cursor-pointer group/item",
                                                                isActive
                                                                    ? "bg-green-500/10 border-green-500/30 text-main"
                                                                    : "bg-main/30 border-main/50 text-dim hover:border-green-500/30"
                                                            )}
                                                        >
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-black text-sm tracking-tight">{perm.description || perm.key}</span>
                                                                <span className="text-[10px] opacity-40 font-mono font-bold">{perm.key}</span>
                                                            </div>
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                                isActive ? "bg-green-500 border-green-500 shadow-lg shadow-green-500/20" : "bg-transparent border-main"
                                                            )}>
                                                                {isActive && <Save className="w-3 h-3 text-white" />}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isActive}
                                                                    onChange={(e) => {
                                                                        if (selectedRole?.is_system) return
                                                                        const next = e.target.checked
                                                                            ? [...selectedPermissions, perm.key]
                                                                            : selectedPermissions.filter((p) => p !== perm.key)
                                                                        setSelectedPermissions(next)
                                                                    }}
                                                                    className="sr-only"
                                                                />
                                                            </div>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-10 border-t border-main bg-white/5 flex items-center justify-between">
                            <div className="flex gap-4">
                                <button
                                    onClick={selectedRole ? handleUpdateRole : handleCreateRole}
                                    disabled={creatingRole || loadingPermissions || selectedRole?.is_system}
                                    className="bg-green-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-green-500 disabled:opacity-50 shadow-2xl shadow-green-600/20 transition-all active:scale-95 flex items-center gap-3"
                                >
                                    {creatingRole ? <ZapSpinner size="sm" /> : (selectedRole ? 'Salvar Alterações' : 'Criar Cargo')}
                                </button>
                                {selectedRole && !selectedRole.is_system && (
                                    <button
                                        onClick={() => handleDeleteRole(selectedRole)}
                                        className="text-red-400 hover:text-red-300 flex items-center gap-3 font-black uppercase tracking-widest text-[10px] px-8 py-5 hover:bg-red-500/10 rounded-[2rem] transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        Excluir Cargo
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setRoleSideoverOpen(false)}
                                className="text-dim font-black uppercase tracking-widest text-xs hover:text-main transition-colors px-6"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {userSideoverOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setUserSideoverOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-sidebar-theme border-l border-main shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Premium Header */}
                        <div className="relative h-48 flex-shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-transparent to-transparent transition-all duration-700" />
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />

                            <div className="absolute top-10 left-10 right-10 flex justify-between items-start z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center shadow-2xl border border-green-500/20 rotate-6 transition-transform hover:rotate-0 duration-500">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-main mb-1 tracking-tighter">
                                            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                        </h2>
                                        <p className="text-dim font-medium tracking-tight">Configure as credenciais e acesso do time</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setUserSideoverOpen(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-dim hover:text-main transition-all shadow-inner"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 -mt-8 relative z-10 space-y-8 scrollbar-hide">
                            <div className="bg-main/30 border border-main rounded-3xl p-10 shadow-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            placeholder="Nome do colaborador"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">E-mail</label>
                                        <input
                                            type="email"
                                            placeholder="email@exemplo.com"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-bold"
                                            disabled={!!editingUser}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Senha de Acesso</label>
                                        <input
                                            type="password"
                                            placeholder={editingUser ? 'Nova senha (opcional)' : 'Mínimo 8 caracteres'}
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            placeholder="Repita a senha"
                                            value={newUser.confirmPassword}
                                            onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                            className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-xs font-black text-dim uppercase tracking-[2px] ml-1">Cargo Atribuído</label>
                                        <div className="relative">
                                            <select
                                                value={newUser.roleId}
                                                onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                                                className="w-full input-theme rounded-2xl px-6 py-4 text-main outline-none focus:ring-2 focus:ring-green-500/50 transition-all appearance-none cursor-pointer font-black"
                                            >
                                                <option value="" className="bg-card-theme">Selecionar cargo...</option>
                                                {roles.map((role) => (
                                                    <option key={role.id} value={role.id} className="bg-card-theme">
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <Shield className="w-5 h-5 text-dim" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 border-t border-main bg-white/5 flex items-center justify-between">
                            <button
                                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                                disabled={creatingUser}
                                className="bg-green-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-500 disabled:opacity-50 shadow-2xl shadow-green-600/20 transition-all active:scale-95"
                            >
                                {editingUser ? 'Atualizar Perfil' : 'Cadastrar Usuário'}
                            </button>
                            <button
                                onClick={() => setUserSideoverOpen(false)}
                                className="text-dim font-black uppercase tracking-widest text-xs hover:text-main transition-colors px-6"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
