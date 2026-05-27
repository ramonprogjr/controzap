import Link from 'next/link'
import { Car } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative pt-48 pb-32 px-8 overflow-hidden">
      {/* Fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-12">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
          CRM Inteligente para Locadoras de Veículos
        </div>

        <h1 className="text-5xl md:text-8xl font-extrabold text-white tracking-tighter mb-10 leading-[1.1]">
          Sua locadora no <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
            próximo nível.
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-2xl max-w-3xl mx-auto mb-8 font-light leading-relaxed">
          Gerencie reservas, clientes e frotas direto pelo WhatsApp. Cada mensagem vira lead, histórico e agendamento automaticamente. Seu time ganha <span className="text-amber-400 font-semibold">15+ horas por semana</span>.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold mb-16">
          <Car className="w-4 h-4" />
          <span>Ideal para locadoras executivas e de alto padrão</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/registro"
            className="bg-amber-500 text-black px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-400 transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/40"
          >
            Começar Agora — Grátis 12 Dias
          </Link>
          <div className="flex items-center justify-center gap-4 text-slate-500 text-sm font-medium">
            Configure em 5 minutos • Sem cartão
          </div>
        </div>
      </div>
    </section>
  )
}
