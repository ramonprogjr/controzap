'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageSquare, X, Check, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface Notification {
  id: string
  lead_id: string | null
  lead_name: string | null
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

interface Props {
  isCollapsed?: boolean
  companyId: string
}

export function NotificationsPanel({ isCollapsed, companyId }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const load = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) {
      setNotifications(data)
      setUnread(data.filter((n) => !n.read).length)
    }
  }

  useEffect(() => {
    if (!companyId) return
    load()

    const channel = supabase
      .channel(`notifications-${companyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `company_id=eq.${companyId}`,
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [companyId])

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('company_id', companyId)
      .eq('read', false)
    load()
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    load()
  }

  const handleClick = async (n: Notification) => {
    await markRead(n.id)
    setOpen(false)
    if (n.lead_id) {
      router.push('/dashboard/conversas')
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div ref={panelRef} className="relative w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center rounded-2xl transition-all duration-300 group hover:bg-[var(--hover-bg)]",
          isCollapsed ? "justify-center p-3.5" : "px-5 py-3.5 gap-4",
          open && "bg-[var(--hover-bg)]"
        )}
      >
        <div className="relative">
          <Bell className={cn("w-5 h-5 transition-colors", unread > 0 ? "text-amber-400" : "text-dim group-hover:text-amber-500")} strokeWidth={2.5} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center px-0.5 shadow-lg">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <>
            <span className="font-bold text-sm flex-1 text-left text-dim group-hover:text-main tracking-tight">
              Notificações
            </span>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl shadow-black/40 z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sidebar-border)]">
            <span className="font-black text-sm text-main">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-wider">
                  <CheckCheck className="w-3 h-3" /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-dim hover:text-main transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-dim/20 mx-auto mb-2" />
                <p className="text-dim text-xs font-bold">Nenhuma notificação</p>
              </div>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-[var(--sidebar-border)] last:border-0",
                  !n.read && "bg-amber-500/5"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  !n.read ? "bg-amber-500/20" : "bg-white/5"
                )}>
                  <MessageSquare className={cn("w-4 h-4", !n.read ? "text-amber-400" : "text-dim")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs font-black truncate", !n.read ? "text-main" : "text-dim")}>
                      {n.title}
                    </p>
                    <span className="text-[9px] text-dim shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-[11px] text-dim truncate mt-0.5">{n.body}</p>
                  )}
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
