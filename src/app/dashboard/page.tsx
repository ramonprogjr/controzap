import { createClient } from '@/lib/supabase/server'
import { Users, MessageSquare, Calendar, Target, Bot, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users').select('company_id, name').eq('id', user?.id).single()

  const companyId = userData?.company_id || ''

  // Estatísticas
  const [
    { count: leadsCount },
    { count: messagesCount },
    { count: appointmentsCount },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
  ])

  // Atividade recente — últimos 8 eventos reais
  const [
    { data: recentLeads },
    { data: recentMessages },
    { data: recentAppointments },
  ] = await Promise.all([
    supabase.from('leads').select('id, name, phone, first_contact').eq('company_id', companyId)
      .order('first_contact', { ascending: false }).limit(3),
    supabase.from('messages').select('id, content, direction, sent_at, leads(name)').eq('company_id', companyId)
      .order('sent_at', { ascending: false }).limit(3),
    supabase.from('appointments').select('id, detected_date, detected_time, status, notes, leads(name), users(name)').eq('company_id', companyId)
      .order('created_at', { ascending: false }).limit(3),
  ])

  type ActivityItem = {
    id: string
    type: 'lead' | 'message' | 'appointment'
    title: string
    subtitle: string
    time: Date
    timeStr: string
  }

  const activities: ActivityItem[] = [
    ...(recentLeads || []).map((l: any) => ({
      id: l.id, type: 'lead' as const,
      title: `Novo lead: ${l.name || l.phone}`,
      subtitle: `Telefone: ${l.phone}`,
      time: new Date(l.first_contact),
      timeStr: new Date(l.first_contact).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })),
    ...(recentMessages || []).map((m: any) => ({
      id: m.id, type: 'message' as const,
      title: m.direction === 'inbound' ? `Mensagem recebida de ${(m.leads as any)?.name || 'cliente'}` : `Mensagem enviada para ${(m.leads as any)?.name || 'cliente'}`,
      subtitle: m.content?.substring(0, 60) + (m.content?.length > 60 ? '...' : '') || '',
      time: new Date(m.sent_at),
      timeStr: new Date(m.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    })),
    ...(recentAppointments || []).map((a: any) => ({
      id: a.id, type: 'appointment' as const,
      title: `Agendamento: ${(a.leads as any)?.name || 'Cliente'}`,
      subtitle: `${a.notes || a.detected_date} — ${(a.users as any)?.name || 'Responsável'}`,
      time: new Date(a.detected_date),
      timeStr: a.detected_time?.substring(0, 5) || new Date(a.detected_date).toLocaleDateString('pt-BR'),
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5)

  const iconConfig = {
    lead:        { icon: Target,   color: 'text-green-500', bg: 'bg-green-500/10', border: 'hover:border-green-500/30' },
    message:     { icon: Bot,      color: 'text-green-400', bg: 'bg-green-400/10', border: 'hover:border-green-400/30' },
    appointment: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-600/10', border: 'hover:border-green-600/30' },
  }

  const displayName = userData?.name || user?.email

  return (
    <div className="p-8 group/page">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black heading-gradient mb-3 tracking-tighter">Dashboard</h1>
          <p className="text-dim text-xl font-medium">
            Bem-vindo de volta, <span className="text-main font-bold">{displayName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-card-theme border border-main rounded-2xl shadow-xl backdrop-blur-md">
          <Clock className="w-5 h-5 text-green-500" />
          <span className="text-sm font-black text-main uppercase tracking-[2px]">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <a href="/dashboard/leads" className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-green-500/40 transition-all duration-500 shadow-2xl relative overflow-hidden block">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <Users className="w-28 h-28 text-green-500" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Leads</h3>
            <div className="w-14 h-14 bg-green-500/15 text-green-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">{leadsCount || 0}</p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Total de leads capturados</p>
        </a>

        <a href="/dashboard/conversas" className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-green-400/40 transition-all duration-500 shadow-2xl relative overflow-hidden block">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <MessageSquare className="w-28 h-28 text-green-400" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Mensagens</h3>
            <div className="w-14 h-14 bg-green-400/15 text-green-400 rounded-2xl flex items-center justify-center shadow-inner">
              <MessageSquare className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">{messagesCount || 0}</p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Mensagens processadas</p>
        </a>

        <a href="/dashboard/agenda" className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-green-500/50 transition-all duration-500 shadow-2xl relative overflow-hidden block">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <Calendar className="w-28 h-28 text-green-500" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Agendamentos</h3>
            <div className="w-14 h-14 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Calendar className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">{appointmentsCount || 0}</p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Agendamentos pendentes</p>
        </a>
      </div>

      {/* Atividade Recente */}
      <div className="bg-card-theme border border-main rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />

        <div className="flex items-center justify-between mb-12 relative z-10">
          <div>
            <h2 className="text-4xl font-black text-main tracking-tighter">Atividade Recente</h2>
            <p className="text-dim font-bold text-lg">Últimas interações em tempo real</p>
          </div>
          <a href="/dashboard/conversas" className="px-8 py-4 bg-white/5 text-main rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-600 hover:text-white transition-all shadow-xl active:scale-95">
            Ver tudo
          </a>
        </div>

        <div className="space-y-6 relative z-10">
          {activities.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="w-14 h-14 text-dim/20 mx-auto mb-4" />
              <p className="text-dim font-bold text-lg mb-2">Nenhuma atividade ainda</p>
              <p className="text-dim/60 text-sm">As interações aparecerão aqui quando chegarem mensagens pelo WhatsApp</p>
            </div>
          ) : activities.map((item) => {
            const cfg = iconConfig[item.type]
            return (
              <div key={item.id} className={cn(
                "flex items-center gap-8 p-8 rounded-[2rem] border-2 border-transparent bg-white/5 transition-all duration-500 group/item",
                cfg.border, "hover:bg-white/[0.08] hover:translate-x-2"
              )}>
                <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-2xl group-hover/item:scale-110 transition-all duration-500", cfg.bg, cfg.color)}>
                  <cfg.icon className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-main font-black text-xl tracking-tight mb-1 truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-dim font-bold text-sm">
                    <span className="truncate">{item.subtitle}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-dim uppercase tracking-[2px] bg-white/5 px-4 py-2 rounded-xl border border-main">
                    {item.timeStr}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
