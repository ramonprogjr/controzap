'use client'

import { useThemeStore } from '@/lib/store/useThemeStore'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function ThemeToggle({ isCollapsed }: { isCollapsed?: boolean }) {
    const { theme, toggleTheme } = useThemeStore()

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "w-full flex items-center rounded-xl transition-all duration-300 group hover:bg-[var(--hover-bg)]",
                isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
            )}
        >
            <div className="relative">
                {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-dim group-hover:text-blue-400 transition-colors" strokeWidth={2} />
                ) : (
                    <Sun className="w-5 h-5 text-dim group-hover:text-amber-500 transition-colors" strokeWidth={2} />
                )}
            </div>
            {!isCollapsed && (
                <span className="font-bold text-sm flex-1 text-left text-dim group-hover:text-main">
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </span>
            )}
        </button>
    )
}
