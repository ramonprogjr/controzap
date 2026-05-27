import Link from 'next/link'
import { Lock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-8 py-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-lg flex items-center justify-center">
          <Lock className="w-4 h-4 text-black" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight text-white uppercase">
          Control<span className="text-amber-400">Zap</span>
        </span>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-6 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
        <Link href="/login" className="hover:text-amber-400 transition-colors">Login</Link>
        <Link href="/registro" className="hover:text-amber-400 transition-colors">Criar Conta</Link>
        <span>&copy; 2026 ControlZap. Todos os direitos reservados.</span>
      </div>
    </footer>
  )
}
