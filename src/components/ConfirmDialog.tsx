"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

export type ConfirmVariant = "primary" | "danger" | "warning";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: ConfirmVariant;
  /** Se true, mostra apenas o botão de confirmar (estilo alert) */
  alertOnly?: boolean;
  /** Estado de carregamento externo (desabilita botões) */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "primary",
  alertOnly = false,
  loading = false,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const busy = loading || confirming;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === "Escape") {
        if (alertOnly) {
          void (async () => {
            setConfirming(true);
            try {
              await onConfirm();
              onClose();
            } catch {
              /* caller trata */
            } finally {
              setConfirming(false);
            }
          })();
        } else {
          onCancel?.();
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, alertOnly, busy, onConfirm, onClose, onCancel]);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Erros de rede/ação devem ser tratados pelo caller (toast, etc.)
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    if (busy) return;
    onCancel?.();
    onClose();
  };

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
      : variant === "warning"
        ? "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500"
        : "bg-clicvend-orange text-white hover:bg-clicvend-orange-dark focus:ring-amber-500/20";

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={alertOnly ? () => void handleConfirm() : handleCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl bg-background shadow-xl border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                variant === "danger" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              <p id="confirm-dialog-desc" className="mt-1 text-sm text-muted-foreground">
                {message}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            {!alertOnly && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${confirmClass}`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
