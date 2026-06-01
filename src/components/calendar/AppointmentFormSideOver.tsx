"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { SideOver } from "@/components/SideOver";
import type { AppointmentFormValues } from "./appointment-types";

type TeamUser = { user_id: string; full_name?: string; email?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  form: AppointmentFormValues;
  onChange: (form: AppointmentFormValues) => void;
  onSubmit: () => Promise<void>;
  saving: boolean;
  error: string;
  canManage: boolean;
  apiHeaders?: Record<string, string>;
  lockClientFields?: boolean;
};

export function AppointmentFormSideOver({
  open,
  onClose,
  title = "Novo agendamento",
  form,
  onChange,
  onSubmit,
  saving,
  error,
  canManage,
  apiHeaders,
  lockClientFields = false,
}: Props) {
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  useEffect(() => {
    if (!open || !canManage) return;
    fetch("/api/users", { credentials: "include", headers: apiHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeamUsers(
            data.map((u: { user_id: string; full_name?: string; email?: string }) => ({
              user_id: u.user_id,
              full_name: u.full_name,
              email: u.email,
            }))
          );
        }
      })
      .catch(() => {});
  }, [open, canManage, apiHeaders]);

  if (!canManage) return null;

  return (
    <SideOver open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-[#64748B]">Registre retirada ou entrega de veículo premium.</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cliente *</label>
          <input
            type="text"
            value={form.clientName}
            disabled={lockClientFields}
            onChange={(e) => onChange({ ...form, clientName: e.target.value })}
            placeholder="Nome do cliente"
            className="input-theme w-full disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">WhatsApp</label>
            <input
              type="text"
              value={form.clientPhone}
              disabled={lockClientFields}
              onChange={(e) => onChange({ ...form, clientPhone: e.target.value })}
              placeholder="11999999999"
              className="input-theme w-full disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Consultor</label>
            <select
              value={form.seller_id}
              onChange={(e) => onChange({ ...form, seller_id: e.target.value })}
              className="input-theme w-full"
            >
              <option value="">Eu mesmo</option>
              {teamUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name ?? u.email ?? u.user_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Data da retirada *</label>
            <input
              type="date"
              value={form.detected_date}
              onChange={(e) => onChange({ ...form, detected_date: e.target.value })}
              className="input-theme w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Horário</label>
            <input
              type="time"
              value={form.detected_time}
              onChange={(e) => onChange({ ...form, detected_time: e.target.value })}
              className="input-theme w-full"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Local de retirada</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => onChange({ ...form, location: e.target.value })}
            placeholder="Ex: Aeroporto de Congonhas, hotel, endereço"
            className="input-theme w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">Veículo / observações</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Ex: Mercedes Vito — 3 dias, motorista bilíngue"
            className="input-theme w-full"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-amber-500 hover:to-amber-400 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? "Salvando…" : "Criar"}
        </button>
      </div>
    </SideOver>
  );
}
