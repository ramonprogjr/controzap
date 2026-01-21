import Link from 'next/link'
import { Check } from 'lucide-react'

export function Pricing() {
  return (
    <section id="preco" className="max-w-7xl mx-auto px-8 py-32">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Economize Tempo. Aumente Vendas.</h2>
        <p className="text-slate-400 mb-4">Pare de perder leads e horas com cadastros manuais. Automatize tudo por menos de R$ 250/mês.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold mb-16">
          <span>Teste grátis por 12 dias - Sem cartão de crédito</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 text-white shadow-2xl shadow-green-500/10 transform hover:scale-[1.02] transition-transform relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <div className="w-64 h-64 bg-green-500 rounded-full blur-3xl"></div>
          </div>

          <span className="text-xs font-black uppercase tracking-[0.3em] text-green-500 mb-4 block relative z-10">
            Full Access Pack
          </span>
          <div className="flex items-center justify-center gap-2 mb-10 relative z-10">
            <span className="text-2xl font-bold text-slate-400">R$</span>
            <span className="text-7xl font-black tracking-tighter text-white">447,90</span>
            <span className="text-lg font-bold opacity-40 text-slate-400">/mês</span>
          </div>

          <ul className="text-left space-y-5 mb-12 font-semibold text-slate-300 relative z-10">
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span><strong className="text-white">CRM automático</strong> - Zero cadastros manuais</span>
            </li>
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span><strong className="text-white">Economia de 15+ horas/semana</strong> do seu time</span>
            </li>
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span>IA que agenda e qualifica leads automaticamente</span>
            </li>
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span>Histórico completo de todas as conversas</span>
            </li>
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span>IA Copiloto para vendedores e atendentes</span>
            </li>
            <li className="flex items-center gap-4">
              <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
              <span>Campanhas automatizadas e anti-bloqueio</span>
            </li>
          </ul>

          <Link
            href="/registro"
            className="block w-full bg-green-600 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-500 transition-all shadow-xl text-center relative z-10"
          >
            Começar Agora - Grátis 12 Dias
          </Link>
          <p className="mt-6 text-[10px] text-slate-500 uppercase font-bold relative z-10">
            Sem contratos de fidelidade. Cancelamento imediato.
          </p>
        </div>
      </div>
    </section>
  )
}
