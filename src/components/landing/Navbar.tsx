import Link from 'next/link'
import { Lock } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="fixed w-full z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-lg flex items-center justify-center shadow-lg">
            <Lock className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Control<span className="text-amber-400">Zap</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-12 text-sm font-semibold tracking-wide uppercase text-slate-400">
          <a href="#beneficios" className="hover:text-white transition-colors">Benefícios</a>
          <a href="#tecnologia" className="hover:text-white transition-colors">Como Funciona</a>
          <a href="#seguranca" className="hover:text-white transition-colors">Segurança</a>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/login" className="hidden sm:block text-sm font-bold text-white hover:text-amber-400 transition-colors uppercase tracking-widest">
            Login
          </Link>
          <Link href="/registro" className="bg-amber-500 text-black px-7 py-2.5 rounded-full font-bold text-xs uppercase tracking-tighter hover:bg-amber-400 transition-all hover:shadow-lg hover:shadow-amber-500/40">
            Começar Agora
          </Link>
        </div>
      </div>
    </nav>
  )
}
