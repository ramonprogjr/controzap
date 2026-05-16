import Link from 'next/link'
import { Zap, SlidersHorizontal } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="fixed w-full z-50 border-b border-white/5 nav-blur">
      <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-slate-900" strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Control<span className="text-green-500">Zap</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-12 text-sm font-semibold tracking-wide uppercase text-slate-400">
          <a href="#beneficios" className="hover:text-white transition-colors">Economia de Tempo</a>
          <a href="#tecnologia" className="hover:text-white transition-colors">Como Funciona</a>
          <a href="#preco" className="text-green-500 hover:text-green-400 transition-colors">Preço</a>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/login" className="hidden sm:block text-sm font-bold text-white hover:text-green-500 transition-colors uppercase tracking-widest">
            Login
          </Link>
          <button className="bg-white text-black px-7 py-2.5 rounded-full font-bold text-xs uppercase tracking-tighter hover:bg-green-500 hover:text-white transition-all hover:shadow-lg hover:shadow-green-500/40">
            Falar com Consultor
          </button>
        </div>
      </div>
    </nav>
  )
}
