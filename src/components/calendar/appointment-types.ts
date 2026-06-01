export type Appointment = {
  id: string;
  detected_date: string;
  detected_time: string | null;
  location: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  lead_id?: string | null;
  leads: { name: string; phone: string } | null;
  users: { name: string } | null;
};

export type AppointmentFormValues = {
  clientName: string;
  clientPhone: string;
  lead_id: string;
  detected_date: string;
  detected_time: string;
  location: string;
  notes: string;
  seller_id: string;
};

export const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-amber-50 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmado", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed: { label: "Concluído", color: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
} as const;

export const EMPTY_APPOINTMENT_FORM: AppointmentFormValues = {
  clientName: "",
  clientPhone: "",
  lead_id: "",
  detected_date: "",
  detected_time: "",
  location: "",
  notes: "",
  seller_id: "",
};

export function defaultAppointmentDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
