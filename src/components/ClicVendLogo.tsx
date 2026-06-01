"use client";

import { Lock } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

type ControlZapLogoProps = {
  /** Tamanho do logo (altura aproximada em px). Wordmark escala junto. */
  size?: "sm" | "md" | "lg";
  /** Mostrar só o ícone, sem texto */
  iconOnly?: boolean;
  className?: string;
};

const textSizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const iconSizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

const lockSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function ControlZapLogo({ size = "md", iconOnly = false, className = "" }: ControlZapLogoProps) {
  const iconBox = iconSizes[size];
  const lockIcon = lockSizes[size];
  const textSize = textSizes[size];

  if (iconOnly) {
    return (
      <span
        className={`inline-flex ${iconBox} shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 shadow-lg shadow-amber-600/20 ${className}`}
        aria-label={BRAND_NAME}
      >
        <Lock className={`${lockIcon} text-white`} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`} aria-label={BRAND_NAME}>
      <span className={`inline-flex ${iconBox} shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-700 shadow-lg shadow-amber-600/20`}>
        <Lock className={`${lockIcon} text-white`} strokeWidth={2.5} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${textSize} font-black tracking-tighter uppercase text-[#0a0a0a]`}>
          Control<span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Zap</span>
        </span>
        <span className="mt-0.5 text-[9px] font-black uppercase tracking-[2px] text-[#64748B]">{BRAND_TAGLINE}</span>
      </span>
    </span>
  );
}

/** @deprecated Use ControlZapLogo */
export const ClicVendLogo = ControlZapLogo;
