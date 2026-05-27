import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ZapSpinnerProps {
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ZapSpinner({ className, size = 'md' }: ZapSpinnerProps) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    }

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    }

    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            {/* Main Spinning Ring */}
            <div className={cn(
                "absolute rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin transition-all duration-1000",
                sizes[size]
            )} />

            {/* Counter-Spinning Inner Ring */}
            <div className={cn(
                "absolute rounded-full border border-amber-500/10 border-b-amber-500/60 animate-spin-reverse transition-all duration-1500",
                iconSizes[size]
            )} />

            {/* Inner Glow Circle */}
            <div className={cn(
                "absolute rounded-full bg-amber-500/5 animate-pulse",
                sizes[size]
            )} />

            {/* Center Lock Icon */}
            <div className="relative z-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-amber-500/10 blur-xl animate-pulse rounded-full" />
                <Lock className={cn("text-amber-500 animate-bounce-slow relative z-20", iconSizes[size])} strokeWidth={2.5} />
            </div>
        </div>
    )
}

export function ZapLoadingScreen() {
    return (
        <div className="fixed inset-0 z-[999] bg-[var(--background)] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
            <ZapSpinner size="xl" />
            <div className="flex flex-col items-center gap-2">
                <h3 className="text-xl font-black text-main tracking-tighter uppercase italic">Carregando ControlZap</h3>
                <div className="h-1 w-32 bg-main/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/3 animate-loading-bar" />
                </div>
            </div>
        </div>
    )
}
