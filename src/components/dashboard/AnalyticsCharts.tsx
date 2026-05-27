'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type Series = { date: string; value: number }[]
type NameValue = { name: string; value: number }[]

const AMBER = ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#92400e']

const tooltipStyle = {
  background: 'rgba(15,15,15,0.95)',
  border: '1px solid rgba(245,158,11,0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontWeight: 700,
}

export function AnalyticsCharts({
  leadsByDay,
  messagesByDay,
  appointmentsByDay,
  intentChart,
  statusChart,
  sellersChart,
}: {
  leadsByDay: Series
  messagesByDay: Series
  appointmentsByDay: Series
  intentChart: NameValue
  statusChart: NameValue
  sellersChart: NameValue
}) {
  return (
    <div className="space-y-8">
      <div className="bg-card-theme border border-main rounded-[2rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-main tracking-tighter mb-1">Volume diário</h2>
        <p className="text-dim text-sm font-bold mb-8">Leads, mensagens e agendamentos nos últimos 30 dias</p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={leadsByDay.map((l, i) => ({
            date: l.date,
            leads: l.value,
            mensagens: messagesByDay[i]?.value || 0,
            agenda: appointmentsByDay[i]?.value || 0,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight={700} />
            <YAxis stroke="#94a3b8" fontSize={11} fontWeight={700} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontWeight: 700, fontSize: 12 }} />
            <Line type="monotone" dataKey="leads" stroke="#f59e0b" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="mensagens" stroke="#fbbf24" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="agenda" stroke="#d97706" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card-theme border border-main rounded-[2rem] p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-main tracking-tighter mb-1">Status dos leads</h2>
          <p className="text-dim text-sm font-bold mb-6">Distribuição do funil</p>
          {statusChart.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusChart.map((_, i) => <Cell key={i} fill={AMBER[i % AMBER.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontWeight: 700, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card-theme border border-main rounded-[2rem] p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-main tracking-tighter mb-1">Intenções (IA)</h2>
          <p className="text-dim text-sm font-bold mb-6">O que os clientes mais buscam</p>
          {intentChart.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={intentChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={700} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={700} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card-theme border border-main rounded-[2rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-black text-main tracking-tighter mb-1">Top vendedores</h2>
        <p className="text-dim text-sm font-bold mb-6">Leads atribuídos por responsável</p>
        {sellersChart.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sellersChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={700} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight={700} width={140} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="h-[280px] flex items-center justify-center">
      <p className="text-dim font-bold text-sm">Sem dados suficientes ainda</p>
    </div>
  )
}
