'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, MapPin, Mail, Phone, Shield, User } from 'lucide-react'
import { ZapSpinner } from '@/components/ui/ZapSpinner'
import { cn } from '@/lib/utils/cn'

type UserType = {
    id: string
    name: string
    email: string
    role: string
    is_active: boolean
}

export default function EquipePage() {
    const [users, setUsers] = useState<UserType[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            if (data.users) setUsers(data.users)
        } catch (error) {
            console.error('Erro ao carregar equipe:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-8 min-h-screen animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-black heading-gradient mb-2 tracking-tighter">
                        Nossa Equipe
                    </h1>
                    <p className="text-dim text-lg font-medium">Visualize os membros do seu time</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card-theme border border-main rounded-3xl p-2 mb-8 flex gap-2">
                <div className="flex-1 bg-main/30 rounded-2xl flex items-center px-4 border border-transparent focus-within:border-green-500/30 transition-all">
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

            {/* Grid de Cards (Estilo Premium) */}
            {loading ? (
                <div className="flex justify-center p-20">
                    <ZapSpinner size="lg" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center p-20 bg-card-theme border border-main rounded-3xl">
                    <User className="w-16 h-16 text-dim/20 mx-auto mb-4" />
                    <p className="text-dim font-bold">Nenhum membro encontrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="bg-card-theme border border-main rounded-3xl p-6 hover:shadow-2xl hover:border-green-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield className="w-24 h-24 text-main rotate-12" />
                            </div>

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-green-500/20 mb-4 group-hover:scale-110 transition-transform duration-500">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>

                                <h3 className="text-xl font-black text-main mb-1">{user.name}</h3>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className={cn(
                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                        user.role === 'Admin' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                            user.role === 'Vendedor' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                "bg-main/10 text-dim border-main/20"
                                    )}>
                                        {user.role || 'Sem Cargo'}
                                    </span>
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        user.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"
                                    )} title={user.is_active ? "Ativo" : "Inativo"} />
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex items-center gap-3 bg-main/10 p-3 rounded-xl">
                                        <Mail className="w-4 h-4 text-dim shrink-0" />
                                        <p className="text-xs font-medium text-main truncate">{user.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
