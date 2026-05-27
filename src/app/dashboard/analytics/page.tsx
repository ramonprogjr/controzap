import { createClient } from '@/lib/supabase/server'
import { BarChart3, TrendingUp, Users, MessageSquare, Calendar, Target } from 'lucide-react'
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users').select('company_id, name').eq('id', user?.id).single()

  const companyId = userData?.company_id || ''

  // Janela: últimos 30 dias
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  const startIso = start.toISOString()

  const [
    { count: totalLeads },
    { count: totalMessages },
    { count: totalAppointments },
    { count: convertedLeads },
    { data: leadsSeries },
    { data: messagesSeries },
    { data: appointmentsSeries },
    { data: intentsRaw },
    { data: statusRaw },
    { data: sellersData },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'converted'),
    supabase.from('leads').select('first_contact').eq('company_id', companyId).gte('first_contact', startIso),
    supabase.from('messages').select('sent_at, direction').eq('company_id', companyId).gte('sent_at', startIso),
    supabase.from('appointments').select('detected_date').eq('company_id', companyId).gte('detected_date', start.toISOString().slice(0, 10)),
    supabase.from('messages').select('intent').eq('company_id', companyId).not('intent', 'is', null),
    supabase.from('leads').select('status').eq('company_id', companyId),
    supabase
      .from('leads')
      .select('seller_id, users(name)')
      .eq('company_id', companyId)
      .not('seller_id', 'is', null),
  ])

  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const days: string[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(dayKey(d))
  }

  const countByDay = (rows: any[] | null, field: string) => {
    const map = new Map<string, number>(days.map((d) => [d, 0]))
    ;(rows || []).forEach((r) => {
      const raw = r[field]
      if (!raw) return
      const key = String(raw).slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
    })
    return days.map((d) => ({
      date: d.slice(5),
      value: map.get(d) || 0,
    }))
  }

  const leadsByDay = countByDay(leadsSeries, 'first_contact')
  const messagesByDay = countByDay(messagesSeries, 'sent_at')
  const appointmentsByDay = countByDay(appointmentsSeries, 'detected_date')

  const intentCounts: Record<string, number> = {}
  ;(intentsRaw || []).forEach((r: any) => {
    const k = r.intent || 'other'
    intentCounts[k] = (intentCounts[k] || 0) + 1
  })
  const intentChart = Object.entries(intentCounts).map(([name, value]) => ({ name, value }))

  const statusCounts: Record<string, number> = {}
  ;(statusRaw || []).forEach((r: any) => {
    const k = r.status || 'new'
    statusCounts[k] = (statusCounts[k] || 0) + 1
  })
  const statusChart = Object.entries(statusCounts).map(([name, value]) => ({
    name: ({ new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado', converted: 'Convertido' } as Record<string, string>)[name] || name,
    value,
  }))

  const sellersCounts = new Map<string, number>()
  ;(sellersData || []).forEach((r: any) => {
    const name = r.users?.name || 'Sem vendedor'
    sellersCounts.set(name, (sellersCounts.get(name) || 0) + 1)
  })
  const sellersChart = Array.from(sellersCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const conversionRate = totalLeads && totalLeads > 0
    ? Math.round(((convertedLeads || 0) / totalLeads) * 100)
    : 0

  const inbound = (messagesSeries || []).filter((m: any) => m.direction === 'inbound').length
  const outbound = (messagesSeries || []).filter((m: any) => m.direction === 'outbound').length
  const responseRate = inbound > 0 ? Math.round((outbound / inbound) * 100) : 0

  return (
    <div className="p-8 animate-in fade-in duration-700">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">Analytics</h1>
          <p className="text-dim text-lg font-medium">Indicadores dos últimos 30 dias</p>
        </div>
        <div className="px-6 py-3 bg-card-theme border border-main rounded-2xl shadow-xl">
          <span className="text-[10px] font-black text-dim uppercase tracking-[2px]">
            {start.toLocaleDateString('pt-BR')} → {today.toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard label="Leads" value={totalLeads || 0} icon={Users} />
        <KpiCard label="Mensagens" value={totalMessages || 0} icon={MessageSquare} />
        <KpiCard label="Agendamentos" value={totalAppointments || 0} icon={Calendar} />
        <KpiCard label="Taxa Conversão" value={`${conversionRate}%`} icon={Target} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <KpiCard label="Resposta (out/in)" value={`${responseRate}%`} icon={TrendingUp} />
        <KpiCard label="Mensagens recebidas" value={inbound} icon={MessageSquare} />
        <KpiCard label="Mensagens enviadas" value={outbound} icon={BarChart3} />
      </div>

      <AnalyticsCharts
        leadsByDay={leadsByDay}
        messagesByDay={messagesByDay}
        appointmentsByDay={appointmentsByDay}
        intentChart={intentChart}
        statusChart={statusChart}
        sellersChart={sellersChart}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: any
}) {
  return (
    <div className="bg-card-theme border border-main rounded-3xl p-8 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20 text-amber-500" />
      </div>
      <div className="flex items-center justify-between mb-6 relative z-10">
        <span className="text-dim text-[10px] font-black uppercase tracking-[3px]">{label}</span>
        <div className="w-10 h-10 bg-amber-500/15 text-amber-500 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
      </div>
      <p className="text-5xl font-black text-main tracking-tighter relative z-10">{value}</p>
    </div>
  )
}
