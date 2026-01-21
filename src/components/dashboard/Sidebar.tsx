'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { useSidebarStore } from '@/lib/store/useSidebarStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  UserCog,
  BarChart3,
  Settings,
  Zap,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  Moon,
  Sun
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const menuItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    badge: null,
    requiredAny: []
  },
  {
    href: '/dashboard/conversas',
    label: 'Conversas',
    icon: MessageSquare,
    badge: null,
    requiredAny: ['conversations.read']
  },
  {
    href: '/dashboard/leads',
    label: 'Leads',
    icon: Users,
    badge: null,
    requiredAny: ['leads.read']
  },
  {
    href: '/dashboard/agenda',
    label: 'Agenda',
    icon: Calendar,
    badge: null,
    requiredAny: ['leads.read']
  },
]

// Ícone do WhatsApp customizado
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

const secondaryItems = [
  {
    href: '/dashboard/instancias',
    label: 'Instâncias WhatsApp',
    icon: WhatsAppIcon,
    isCustomIcon: true,
    requiredAny: ['instances.read']
  },
  {
    href: '/dashboard/usuarios',
    label: 'Equipe',
    icon: UserCog,
    requiredAny: ['settings.manage']
  },


  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    requiredAny: ['leads.export']
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const toast = useToast()
  const [loggingOut, setLoggingOut] = useState(false)
  const { isCollapsed, toggle } = useSidebarStore()
  const { setPermissions, setRole } = useAuthStore()
  const [permissions, setPermissionsState] = useState<string[]>([])
  const [role, setRoleState] = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (!res.ok) {
          setAuthLoaded(true)
          return
        }
        const nextPermissions = Array.isArray(data.permissions) ? data.permissions : []
        const nextRole = typeof data?.user?.role === 'string' ? data.user.role : null
        setPermissionsState(nextPermissions)
        setRoleState(nextRole)
        setPermissions(nextPermissions)
        setRole(nextRole)
      } catch {
        // Ignorar erro de auth para não quebrar a UI
      } finally {
        setAuthLoaded(true)
      }
    }

    loadAuth()
  }, [setPermissions, setRole])

  const normalizedRole = role?.toLowerCase() || null
  const isAdmin = normalizedRole === 'admin'

  const fallbackPermissions = (() => {
    if (!normalizedRole) return []
    if (normalizedRole === 'admin') {
      return [
        'instances.read',
        'instances.manage',
        'instances.delete',
        'vendors.manage',
        'conversations.read',
        'conversations.send',
        'conversations.delete',
        'leads.read',
        'leads.manage',
        'leads.delete',
        'leads.export',
        'billing.read',
        'settings.manage',
      ]
    }
    if (normalizedRole === 'supervisor') {
      return ['instances.read', 'conversations.read', 'conversations.send', 'leads.read', 'leads.manage']
    }
    if (normalizedRole === 'vendedor') {
      return ['conversations.read', 'conversations.send']
    }
    if (normalizedRole === 'leitor') {
      return ['conversations.read', 'leads.read']
    }
    return []
  })()

  const effectivePermissions = permissions.length > 0 ? permissions : fallbackPermissions
  const permissionSet = new Set(effectivePermissions)
  const canAccess = (requiredAny?: string[]) => {
    if (!requiredAny || requiredAny.length === 0) return true
    if (isAdmin) return true
    if (!authLoaded) return true
    return requiredAny.some((key) => permissionSet.has(key))
  }

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast.error('Erro ao fazer logout', error.message)
        setLoggingOut(false)
        return
      }

      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })

      toast.success('Logout realizado', 'Redirecionando...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Não foi possível fazer logout')
      setLoggingOut(false)
    }
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-[var(--sidebar)] backdrop-blur-xl border-r border-main flex flex-col shadow-2xl transition-all duration-500 ease-in-out z-50",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggle}
        className="absolute -right-4 top-24 bg-theme-bg text-main rounded-full p-2 shadow-2xl border border-main hover:scale-110 transition-all duration-300 z-[60] flex items-center justify-center"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-green-500" strokeWidth={4} />
        ) : (
          <ChevronLeft className="w-4 h-4 text-green-500" strokeWidth={4} />
        )}
      </button>

      {/* Header */}
      <div className={cn(
        "p-6 flex items-center justify-center transition-all duration-500",
        isCollapsed ? "px-0" : "px-8"
      )}>
        <Link href="/dashboard" className="flex items-center gap-4 group">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-tr from-green-600 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-600/20 group-hover:rotate-12 transition-all duration-500">
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} fill="white" />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="text-2xl font-black tracking-tighter text-main block leading-none uppercase">
                Zap<span className="heading-gradient">Flow</span>
              </span>
              <span className="text-[10px] text-dim font-black uppercase tracking-[2px]">CRM Inteligente</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        <div className="mb-10">
          {!isCollapsed && (
            <h3 className="px-5 text-[10px] font-black text-dim uppercase tracking-[3px] mb-6 opacity-40 uppercase">
              Principal
            </h3>
          )}
          <nav className={cn("space-y-2", isCollapsed ? "px-0" : "px-4")}>
            {menuItems.filter((item) => canAccess(item.requiredAny)).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center rounded-2xl transition-all duration-500 relative overflow-hidden',
                    isCollapsed ? "justify-center h-12 w-12 mx-auto" : "px-5 py-3.5",
                    isActive
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-600/20'
                      : 'text-dim hover:text-main hover:bg-white/5'
                  )}
                >
                  <div className={cn(
                    "flex flex-shrink-0 items-center justify-center transition-transform duration-300",
                    isCollapsed ? "w-5 h-5" : "gap-4"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-500",
                      isActive ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-dim group-hover:text-main"
                    )} strokeWidth={isActive ? 3 : 2} />
                    {!isCollapsed && (
                      <span className="font-black text-sm tracking-tight animate-in fade-in duration-500">
                        {item.label}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mb-6">
          {!isCollapsed && (
            <h3 className="px-5 text-[10px] font-black text-dim uppercase tracking-[3px] mb-6 opacity-40 uppercase">
              Ferramentas
            </h3>
          )}
          <nav className={cn("space-y-2", isCollapsed ? "px-0" : "px-4")}>
            {secondaryItems.filter((item) => canAccess(item.requiredAny)).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center rounded-2xl transition-all duration-500 relative overflow-hidden',
                    isCollapsed ? "justify-center h-12 w-12 mx-auto" : "px-5 py-3.5",
                    isActive
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-600/20'
                      : 'text-dim hover:text-main hover:bg-white/5'
                  )}
                >
                  <div className={cn(
                    "flex flex-shrink-0 items-center justify-center transition-transform duration-300",
                    isCollapsed ? "w-5 h-5" : "gap-4"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-500",
                      isActive ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-dim group-hover:text-main"
                    )} strokeWidth={isActive ? 3 : 2} />
                    {!isCollapsed && (
                      <span className="font-black text-sm tracking-tight animate-in fade-in duration-500">
                        {item.label}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings - Bottom of nav */}
        <div className={cn("pt-4 mt-auto border-t border-main", isCollapsed ? "px-0" : "px-4")}>
          <Link
            href="/dashboard/configuracoes"
            className={cn(
              'group flex items-center rounded-2xl transition-all duration-500 relative overflow-hidden',
              isCollapsed ? "justify-center h-12 w-12 mx-auto" : "px-5 py-3.5",
              pathname === '/dashboard/configuracoes'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl shadow-green-600/20'
                : 'text-dim hover:text-main hover:bg-white/5'
            )}
          >
            <div className={cn(
              "flex flex-shrink-0 items-center justify-center transition-transform duration-300",
              isCollapsed ? "w-5 h-5" : "gap-4"
            )}>
              <Settings className={cn(
                "w-5 h-5 transition-all duration-500",
                pathname === '/dashboard/configuracoes' ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-dim group-hover:text-main"
              )} strokeWidth={pathname === '/dashboard/configuracoes' ? 3 : 2} />
              {!isCollapsed && (
                <span className="font-black text-sm tracking-tight animate-in fade-in duration-500">Configurações</span>
              )}
            </div>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-[var(--sidebar-border)] space-y-2 bg-[var(--sidebar)]",
        isCollapsed ? "px-2" : "p-4"
      )}>
        {/* Theme Toggle */}
        <ThemeToggle isCollapsed={isCollapsed} />



        {/* Notifications */}
        <button className={cn(
          "w-full flex items-center rounded-2xl transition-all duration-500 group hover:bg-[var(--hover-bg)]",
          isCollapsed ? "justify-center p-3.5" : "px-5 py-3.5 gap-4"
        )}>
          <div className="relative">
            <Bell className="w-5 h-5 text-dim group-hover:text-green-500 transition-colors" strokeWidth={2.5} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full ring-4 ring-theme-bg group-hover:animate-ping" />
          </div>
          {!isCollapsed && (
            <>
              <span className="font-bold text-sm flex-1 text-left text-dim group-hover:text-main tracking-tight">Notificações</span>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-black shadow-inner">3</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full flex items-center rounded-2xl text-dim transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed group hover:bg-red-500/10 hover:text-red-400 font-bold",
            isCollapsed ? "justify-center p-3.5" : "px-5 py-3.5 gap-4"
          )}
        >
          <LogOut className="w-5 h-5 text-dim group-hover:text-red-400 transition-colors" strokeWidth={2.5} />
          {!isCollapsed && (
            <span className="font-black text-sm tracking-tight">{loggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
