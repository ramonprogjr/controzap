'use client'

import { useSidebarStore } from '@/lib/store/useSidebarStore'
import { cn } from '@/lib/utils/cn'

export function DashboardMain({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebarStore()

    return (
        <main
            className={cn(
                "flex-1 transition-all duration-300 ease-in-out min-h-screen",
                isCollapsed ? "ml-20" : "ml-72"
            )}
        >
            {children}
        </main>
    )
}
