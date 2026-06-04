"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Car,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Appointment,
  AppointmentFormValues,
  EMPTY_APPOINTMENT_FORM,
  STATUS_CONFIG,
} from "@/components/calendar/appointment-types";
import { AppointmentFormSideOver } from "@/components/calendar/AppointmentFormSideOver";

const STATUS_ICONS = {
  pending: AlertCircle,
  confirmed: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getCompanySlug(pathname: string | null): string {
  return pathname?.split("/").filter(Boolean)[0] ?? "";
}

export default function CalendarioPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = getCompanySlug(pathname);
  const apiHeaders = slug ? { "X-Company-Slug": slug } : undefined;
  const today = new Date();

  const { data: permissionsData } = useQuery({
    queryKey: queryKeys.permissions(slug ?? ""),
    queryFn: () =>
      fetch("/api/auth/permissions", { credentials: "include", headers: apiHeaders }).then((r) => r.json()),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
  const permissions = Array.isArray(permissionsData?.permissions) ? permissionsData.permissions : [];
  const canView = permissions.includes("calendar.view") || permissions.includes("calendar.manage");
  const canManage = permissions.includes("calendar.manage");

  useEffect(() => {
    if (slug && permissionsData !== undefined && !canView) {
      router.replace(`/${slug}/conversas`);
    }
  }, [slug, permissionsData, canView, router]);

  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [sideOverOpen, setSideOverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState<AppointmentFormValues>(EMPTY_APPOINTMENT_FORM);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
    const [y, m, d] = dateParam.split("-").map(Number);
    if (!y || !m || !d) return;
    setCurrentDate(new Date(y, m - 1, 1));
    setSelectedDay(d);
  }, [searchParams]);

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const loadAppointments = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?month=${monthKey}`, {
        credentials: "include",
        headers: apiHeaders,
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, monthKey, apiHeaders]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysWithAppointments = new Set(
    appointments.map((a) => new Date(`${a.detected_date}T12:00:00`).getDate())
  );

  const filteredAppointments = selectedDay
    ? appointments.filter((a) => new Date(`${a.detected_date}T12:00:00`).getDate() === selectedDay)
    : appointments;

  const openCreate = () => {
    const day = selectedDay ?? today.getDate();
    setForm({
      ...EMPTY_APPOINTMENT_FORM,
      detected_date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
    setError("");
    setSideOverOpen(true);
  };

  const handleCreate = async () => {
    if (!form.clientName.trim() || !form.detected_date) {
      setError("Informe o nome do cliente e a data da retirada.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiHeaders ?? {}) },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha ao criar agendamento");
      setSideOverOpen(false);
      loadAppointments();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clicvend:notifications-refresh"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(apiHeaders ?? {}) },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: status as Appointment["status"] } : a))
      );
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este agendamento?")) return;
    setDeletingId(id);
    try {
      await fetch("/api/appointments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(apiHeaders ?? {}) },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  if (slug && permissionsData !== undefined && !canView) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30">
                <CalendarDays className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">Calendário</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Retiradas e entregas de veículos — transporte executivo ALS Rent Cars
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-500 hover:to-amber-400"
            >
              <Plus className="h-4 w-4" />
              Novo agendamento
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
          {/* Calendário mensal */}
          <div className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <button type="button" onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }} className="rounded-lg p-2 transition-colors hover:bg-muted/60">
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <h2 className="text-base font-bold text-foreground">
                {MONTHS[month]} {year}
              </h2>
              <button type="button" onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }} className="rounded-lg p-2 transition-colors hover:bg-muted/60">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasAppt = daysWithAppointments.has(day);
                const isSel = selectedDay === day;
                const isTod = isToday(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(isSel ? null : day)}
                    className={`relative flex h-10 w-full flex-col items-center justify-center rounded-lg text-sm font-semibold transition ${
                      isSel
                        ? "bg-amber-600 text-white shadow-md shadow-amber-500/30"
                        : isTod
                          ? "bg-amber-50 text-amber-800 ring-2 ring-amber-400/40"
                          : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {day}
                    {hasAppt && !isSel && (
                      <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Com retirada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-amber-50 ring-2 ring-amber-400/40" />
                Hoje
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = appointments.filter((a) => a.status === key).length;
                return (
                  <div key={key} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${cfg.color}`}>
                    <span>{cfg.label}</span>
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista de agendamentos */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {selectedDay ? `${selectedDay} de ${MONTHS[month]}` : `Todo ${MONTHS[month]}`}
              </h3>
              {selectedDay && (
                <button type="button" onClick={() => setSelectedDay(null)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Ver mês inteiro
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <CalendarDays className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="font-semibold text-foreground">Nenhum agendamento</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canManage ? "Clique em Novo agendamento para registrar uma retirada." : "Sem retiradas neste período."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appt) => {
                  const cfg = STATUS_CONFIG[appt.status];
                  const StatusIcon = STATUS_ICONS[appt.status];
                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-amber-300/60 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                            <Car className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-foreground">{appt.leads?.name ?? "Cliente"}</h4>
                              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {appt.leads?.phone && (
                                <Link
                                  href={`/${slug}/contatos?phone=${encodeURIComponent(appt.leads.phone.replace(/\D/g, ""))}`}
                                  className="flex items-center gap-1 text-amber-700 hover:text-amber-600"
                                >
                                  <User className="h-3.5 w-3.5" /> {appt.leads.phone}
                                </Link>
                              )}
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(`${appt.detected_date}T12:00:00`).toLocaleDateString("pt-BR")}
                              </span>
                              {appt.detected_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {appt.detected_time.slice(0, 5)}
                                </span>
                              )}
                              {appt.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" /> {appt.location}
                                </span>
                              )}
                              {appt.users?.name && (
                                <span className="flex items-center gap-1 font-medium text-amber-700">
                                  <User className="h-3.5 w-3.5" /> {appt.users.name}
                                </span>
                              )}
                            </div>
                            {appt.notes && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                <Car className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
                                {appt.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 items-center gap-2">
                            <select
                              value={appt.status}
                              onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            >
                              <option value="pending">Pendente</option>
                              <option value="confirmed">Confirmado</option>
                              <option value="completed">Concluído</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleDelete(appt.id)}
                              disabled={deletingId === appt.id}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            >
                              {deletingId === appt.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AppointmentFormSideOver
        open={sideOverOpen}
        onClose={() => setSideOverOpen(false)}
        form={form}
        onChange={setForm}
        onSubmit={handleCreate}
        saving={saving}
        error={error}
        canManage={canManage}
        apiHeaders={apiHeaders}
      />
    </div>
  );
}
