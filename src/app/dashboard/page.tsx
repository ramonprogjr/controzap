import { createClient } from '@/lib/supabase/server'
import { Users, MessageSquare, Calendar, Target, Bot, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Buscar dados da empresa do usuário
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user?.id)
    .single()

  let companyData = null
  let daysRemaining = 0
  let isTrialActive = false

  if (userData?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('subscription_status, trial_ends_at, is_active')
      .eq('id', userData.company_id)
      .single()

    companyData = company

    // Verificar trial apenas se as colunas existirem
    if (company?.trial_ends_at) {
      const trialEnds = new Date(company.trial_ends_at)
      const now = new Date()
      const diffTime = trialEnds.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const isActive = company.is_active !== undefined ? company.is_active : true
      isTrialActive = company.subscription_status === 'trial' && daysRemaining > 0 && isActive
    } else if (company?.subscription_status === 'trial') {
      // Se não tiver trial_ends_at mas estiver em trial, considerar ativo
      isTrialActive = true
      daysRemaining = 12 // Valor padrão
    }
  }

  // Buscar estatísticas (filtradas por company_id)
  const companyId = userData?.company_id

  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId || '')

  const { count: messagesCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId || '')

  const { count: appointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId || '')
    .eq('status', 'pending')

  return (
    <div className="p-8 group/page">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-black heading-gradient mb-3 tracking-tighter">
            Dashboard
          </h1>
          <p className="text-dim text-xl font-medium">Bem-vindo de volta, <span className="text-main font-bold">{user?.email}</span></p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-card-theme border border-main rounded-2xl shadow-xl backdrop-blur-md">
          <Clock className="w-5 h-5 text-green-500" />
          <span className="text-sm font-black text-main uppercase tracking-[2px]">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <div className="mb-12 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between backdrop-blur-xl shadow-2xl relative overflow-hidden group/banner gap-8">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent animate-pulse" />
          <div className="flex items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-500/40 rotate-6 group-hover/banner:rotate-0 transition-all duration-700">
              <Target className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-main font-black text-3xl tracking-tighter mb-1">Período de Teste Ativo</p>
              <p className="text-dim font-bold text-lg">
                {daysRemaining > 0
                  ? `Você tem ${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'} para explorar`
                  : 'Seu período de testes expirou'}
              </p>
            </div>
          </div>
          <button className="bg-main text-theme-bg px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl shadow-white/10 relative z-10 active:scale-95">
            Assinar Agora
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-blue-500/50 transition-all duration-500 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <Users className="w-28 h-28 text-blue-500" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Leads</h3>
            <div className="w-14 h-14 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">
            {leadsCount || 0}
          </p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Total de leads capturados</p>
        </div>

        <div className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-purple-500/50 transition-all duration-500 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <MessageSquare className="w-28 h-28 text-purple-500" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Mensagens</h3>
            <div className="w-14 h-14 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center shadow-inner">
              <MessageSquare className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">
            {messagesCount || 0}
          </p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Mensagens processadas</p>
        </div>

        <div className="group/card bg-card-theme border border-main rounded-[3rem] p-10 hover:border-orange-500/50 transition-all duration-500 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/card:opacity-10 transition-opacity">
            <Calendar className="w-28 h-28 text-orange-500" />
          </div>
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-dim text-xs font-black uppercase tracking-[3px]">Agendamentos</h3>
            <div className="w-14 h-14 bg-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Calendar className="w-7 h-7" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-7xl font-black text-main mb-3 tracking-tighter">
            {appointmentsCount || 0}
          </p>
          <p className="text-sm font-bold text-dim uppercase tracking-wider">Agendamentos pendentes</p>
        </div>
      </div>

      <div className="bg-card-theme border border-main rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />

        <div className="flex items-center justify-between mb-12 relative z-10">
          <div>
            <h2 className="text-4xl font-black text-main tracking-tighter">Atividade Recente</h2>
            <p className="text-dim font-bold text-lg">Acompanhe as últimas interações em tempo real</p>
          </div>
          <button className="px-8 py-4 bg-white/5 text-main rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-600 hover:text-white transition-all shadow-xl active:scale-95">
            Ver tudo
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {[
            {
              icon: Target,
              color: 'text-green-500',
              bg: 'bg-green-500/10',
              border: 'hover:border-green-500/30',
              title: 'Novo lead capturado',
              time: 'Há 5 minutos',
              source: 'Origem: WhatsApp',
              stamp: '18:21'
            },
            {
              icon: Bot,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
              border: 'hover:border-blue-500/30',
              title: 'Mensagem processada pela IA',
              time: 'Há 12 minutos',
              source: 'Vendedor: Junior',
              stamp: '18:14'
            },
            {
              icon: Calendar,
              color: 'text-purple-500',
              bg: 'bg-purple-500/10',
              border: 'hover:border-purple-500/30',
              title: 'Agendamento criado',
              time: 'Há 1 hora',
              source: 'Status: Pendente',
              stamp: '17:26'
            }
          ].map((item, i) => (
            <div key={i} className={cn(
              "flex items-center gap-8 p-8 rounded-[2rem] border-2 border-transparent bg-white/5 transition-all duration-500 group/item",
              item.border,
              "hover:bg-white/[0.08] hover:translate-x-2"
            )}>
              <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-2xl group-hover/item:scale-110 transition-all duration-500", item.bg, item.color)}>
                <item.icon className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="text-main font-black text-xl tracking-tight mb-1">{item.title}</p>
                <div className="flex items-center gap-2 text-dim font-bold text-sm">
                  <span>{item.time}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span>{item.source}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-dim uppercase tracking-[2px] bg-white/5 px-4 py-2 rounded-xl border border-main group-hover/item:border-main">{item.stamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
