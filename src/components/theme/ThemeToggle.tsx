"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/useTheme";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:hover:bg-card/[0.06] dark:hover:text-foreground dark:focus:ring-amber-400/30"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema: escuro" : "Tema: claro"}
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

