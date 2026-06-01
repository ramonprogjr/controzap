"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  Appointment,
  AppointmentFormValues,
  EMPTY_APPOINTMENT_FORM,
  STATUS_CONFIG,
  defaultAppointmentDate,
} from "./appointment-types";
import { AppointmentFormSideOver } from "./AppointmentFormSideOver";

type Props = {
  slug: string;
  apiHeaders?: Record<string, string>;
  phone?: string | null;
  leadId?: string | null;
  clientName?: string | null;
  canView?: boolean;
  canManage?: boolean;
  compact?: boolean;
  onCreated?: () => void;
};

export function ContactAppointmentsPanel({
  slug,
  apiHeaders,
  phone,
  leadId,
  clientName,
  canView: canViewProp,
  canManage: canManageProp,
  compact = false,
  onCreated,
}: Props) {
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [canView, setCanView] = useState(canViewProp ?? false);
  const [canManage, setCanManage] = useState(canManageProp ?? false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sideOverOpen, setSideOverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<AppointmentFormValues>(EMPTY_APPOINTMENT_FORM);

  useEffect(() => {
    if (canViewProp !== undefined && canManageProp !== undefined) {
      setCanView(canViewProp);
      setCanManage(canManageProp);
      setPermissionsLoaded(true);
      return;
    }
    if (!slug) return;
    fetch("/api/auth/permissions", { credentials: "include", headers: apiHeaders })
      .then((r) => r.json())
      .then((data) => {
        const perms = Array.isArray(data?.permissions) ? data.permissions : [];
        setCanView(perms.includes("calendar.view") || perms.includes("calendar.manage"));
        setCanManage(perms.includes("calendar.manage"));
      })
      .catch(() => {
        setCanView(false);
        setCanManage(false);
      })
      .finally(() => setPermissionsLoaded(true));
  }, [slug, apiHeaders, canViewProp, canManageProp]);

  const loadAppointments = useCallback(async () => {
    if (!canView || (!phone && !leadId)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (leadId) params.set("lead_id", leadId);
      else if (phone) params.set("phone", phone);
      const res = await fetch(`/api/appointments?${params}`, {
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
  }, [canView, phone, leadId, apiHeaders]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const openCreate = () => {
    setForm({
      ...EMPTY_APPOINTMENT_FORM,
      clientName: clientName ?? "",
      clientPhone: phone ?? "",
      lead_id: leadId ?? "",
      detected_date: defaultAppointmentDate(),
    });
    setError("");
    setSideOverOpen(true);
  };

  const handleCreate = async () => {
    if (!form.detected_date) {
      setError("Informe a data da retirada.");
      return;
    }
    if (!form.lead_id && !form.clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        detected_date: form.detected_date,
        detected_time: form.detected_time,
        location: form.location,
        notes: form.notes,
        seller_id: form.seller_id,
      };
      if (form.lead_id) payload.lead_id = form.lead_id;
      else {
        payload.clientName = form.clientName;
        payload.clientPhone = form.clientPhone;
      }
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiHeaders ?? {}) },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha ao criar agendamento");
      setSideOverOpen(false);
      await loadAppointments();
      onCreated?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clicvend:notifications-refresh"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  if (!permissionsLoaded || !canView) return null;

  const upcoming = appointments
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .slice(0, compact ? 3 : 10);

  return (
    <div className={compact ? "space-y-2" : "rounded-xl border border-[#E2E8F0] bg-white p-4"}>
      <div className={`flex items-center justify-between gap-2 ${compact ? "" : "mb-3"}`}>
        <h4 className={`font-semibold text-[#0F172A] ${compact ? "text-sm" : "text-base"}`}>
          Agendamentos
        </h4>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">Nenhum agendamento próximo.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((appt) => {
            const cfg = STATUS_CONFIG[appt.status];
            return (
              <li
                key={appt.id}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#64748B]">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${cfg.color}`}>
                    {cfg.label}
                  </span>
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
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {appt.location}
                    </span>
                  )}
                </div>
                {appt.notes && <p className="mt-1 text-xs text-[#475569]">{appt.notes}</p>}
                <Link
                  href={`/${slug}/calendario?date=${appt.detected_date}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-600"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver no calendário
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {appointments.length > 0 && (
        <Link
          href={`/${slug}/calendario`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-600"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Abrir calendário completo
        </Link>
      )}

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
        lockClientFields={!!leadId || !!phone}
      />
    </div>
  );
}
