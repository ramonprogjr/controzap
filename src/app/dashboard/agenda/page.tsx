'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { ZapSpinner } from '@/components/ui/ZapSpinner'
import { cn } from '@/lib/utils/cn'
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Clock,
  MapPin, User, Car, CheckCircle, XCircle, AlertCircle, Trash2
} from 'lucide-react'

type Appointment = {
  id: string
  detected_date: string
  detected_time: string | null
  location: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes: string | null
  leads: { name: string; phone: string } | null
  users: { name: string } | null
}

type TeamUser = { id: string; name: string }

const STATUS_CONFIG = {
  pending:   { label: 'Pendente',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: AlertCircle },
  confirmed: { label: 'Confirmado', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',      icon: CheckCircle },
  completed: { label: 'Concluído',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: CheckCircle },
  cancelled: { label: 'Cancelado',  color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: XCircle },
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function AgendaPage() {
  const toast = useToast()
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    clientName: '', clientPhone: '', detected_date: '', detected_time: '',
    location: '', notes: '', seller_id: '',
  })

  const getAuthHeaders = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Content-Type': 'application/json',
      ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    }
  }

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/appointments?month=${monthKey}`, { headers, credentials: 'include' })
      const data = await res.json()
      if (data.appointments) setAppointments(data.appointments)
    } catch {
      toast.error('Erro', 'Não foi possível carregar os agendamentos')
    } finally {
      setLoading(false)
    }
  }, [monthKey])

  const loadTeam = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/users', { headers, credentials: 'include' })
      const data = await res.json()
      if (data.users) setTeamUsers(data.users)
    } catch {}
  }

  useEffect(() => { loadAppointments() }, [loadAppointments])
  useEffect(() => { loadTeam() }, [])

  // Calendar helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const daysWithAppointments = new Set(
    appointments.map(a => new Date(a.detected_date + 'T12:00:00').getDate())
  )

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const filteredAppointments = selectedDay
    ? appointments.filter(a => new Date(a.detected_date + 'T12:00:00').getDate() === selectedDay)
    : appointments

  const handleCreate = async () => {
    if (!form.clientName.trim() || !form.detected_date) {
      toast.error('Campos obrigatórios', 'Preencha nome do cliente e data')
      return
    }
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/appointments', {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Agendamento criado!', `${form.clientName} - ${form.detected_date}`)
      setShowModal(false)
      setForm({ clientName: '', clientPhone: '', detected_date: '', detected_time: '', location: '', notes: '', seller_id: '' })
      loadAppointments()
    } catch (err: any) {
      toast.error('Erro ao criar', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/appointments', {
        method: 'PATCH', headers, credentials: 'include',
        body: JSON.stringify({ id, status }),
      })
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a))
    } catch {
      toast.error('Erro', 'Não foi possível atualizar o status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return
    setDeletingId(id)
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/appointments', {
        method: 'DELETE', headers, credentials: 'include',
        body: JSON.stringify({ id }),
      })
      setAppointments(prev => prev.filter(a => a.id !== id))
      toast.success('Agendamento excluído', '')
    } catch {
      toast.error('Erro', 'Não foi possível excluir')
    } finally {
      setDeletingId(null)
    }
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="p-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">Agenda</h1>
          <p className="text-dim text-lg font-medium">Agendamentos de veículos e clientes</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(f => ({ ...f, detected_date: `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay || today.getDate()).padStart(2,'0')}` })) }}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
        {/* Calendar */}
        <div className="bg-card-theme border border-main rounded-3xl p-6 h-fit shadow-xl">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-main/20 rounded-xl transition-all">
              <ChevronLeft className="w-5 h-5 text-dim" />
            </button>
            <h2 className="text-lg font-black text-main">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-main/20 rounded-xl transition-all">
              <ChevronRight className="w-5 h-5 text-dim" />
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-black text-dim uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const hasAppt = daysWithAppointments.has(day)
              const isSel = selectedDay === day
              const isTod = isToday(day)
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSel ? null : day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-10 w-full rounded-xl text-sm font-bold transition-all duration-200",
                    isSel ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20" :
                    isTod ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30" :
                    "hover:bg-main/20 text-main"
                  )}
                >
                  {day}
                  {hasAppt && !isSel && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-main">
            <div className="flex items-center gap-2 text-xs text-dim font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Com agendamento
            </div>
            <div className="flex items-center gap-2 text-xs text-dim font-bold">
              <span className="w-4 h-4 rounded-lg bg-amber-500/20 ring-2 ring-amber-500/30 inline-block" />
              Hoje
            </div>
          </div>

          {/* Month summary */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = appointments.filter(a => a.status === key).length
              return (
                <div key={key} className={cn("flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-black", cfg.color)}>
                  <span>{cfg.label}</span>
                  <span className="text-base">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Appointments List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-main">
              {selectedDay
                ? `${selectedDay} de ${MONTHS[month]}`
                : `Todo o mês de ${MONTHS[month]}`}
            </h3>
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} className="text-xs text-dim hover:text-main font-bold flex items-center gap-1">
                <X className="w-3 h-3" /> Ver todos
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center p-20"><ZapSpinner size="lg" /></div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-card-theme border border-main rounded-3xl p-16 text-center">
              <Calendar className="w-14 h-14 text-dim/20 mx-auto mb-4" />
              <p className="text-dim font-bold text-lg mb-1">Nenhum agendamento</p>
              <p className="text-dim/60 text-sm">
                {selectedDay ? `Sem agendamentos em ${selectedDay}/${month+1}` : 'Nenhum agendamento neste mês'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map(appt => {
                const cfg = STATUS_CONFIG[appt.status]
                const StatusIcon = cfg.icon
                return (
                  <div key={appt.id} className="bg-card-theme border border-main rounded-2xl p-6 hover:border-amber-500/30 transition-all shadow-lg group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                          <Car className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h4 className="font-black text-main text-lg">{appt.leads?.name || 'Cliente'}</h4>
                            <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1", cfg.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-dim font-medium">
                            {appt.leads?.phone && (
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> {appt.leads.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(appt.detected_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                            {appt.detected_time && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> {appt.detected_time.substring(0,5)}
                              </span>
                            )}
                            {appt.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" /> {appt.location}
                              </span>
                            )}
                            {appt.users?.name && (
                              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                                <User className="w-3.5 h-3.5" /> {appt.users.name}
                              </span>
                            )}
                          </div>

                          {appt.notes && (
                            <div className="mt-2 flex items-center gap-1.5 text-sm text-dim/70">
                              <Car className="w-3.5 h-3.5 shrink-0" />
                              <span>{appt.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        >
                          <option value="pending">Pendente</option>
                          <option value="confirmed">Confirmar</option>
                          <option value="completed">Concluir</option>
                          <option value="cancelled">Cancelar</option>
                        </select>
                        <button
                          onClick={() => handleDelete(appt.id)}
                          disabled={deletingId === appt.id}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                        >
                          {deletingId === appt.id ? <ZapSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Agendamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Novo Agendamento</h2>
                <p className="text-slate-400 text-sm mt-1">Registre um aluguel de veículo</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome do Cliente *</label>
                  <input type="text" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                    placeholder="Ex: João Silva" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Telefone / WhatsApp</label>
                  <input type="text" value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    placeholder="11999999999" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Responsável</label>
                  <select value={form.seller_id} onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-bold cursor-pointer">
                    <option value="">Eu mesmo</option>
                    {teamUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Data da Retirada *</label>
                  <input type="date" value={form.detected_date} onChange={e => setForm(f => ({ ...f, detected_date: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Horário</label>
                  <input type="time" value={form.detected_time} onChange={e => setForm(f => ({ ...f, detected_time: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Local de Retirada</label>
                  <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: Aeroporto de Congonhas" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Veículo / Observações</label>
                  <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Ex: Toyota Corolla - 3 dias" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
                {saving ? <ZapSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Criar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
