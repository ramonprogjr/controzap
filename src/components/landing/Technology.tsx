import { Database, Sparkles } from 'lucide-react'

export function Technology() {
  return (
    <section id="tecnologia" className="relative max-w-7xl mx-auto px-8 py-24 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight leading-tight">
              Cliente reserva pelo WhatsApp. <br />
              <span className="text-amber-400">Sistema organiza tudo.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              Seu atendente não perde mais tempo com planilhas. Cada mensagem do WhatsApp vira reserva, histórico e agendamento automaticamente. <span className="text-white font-semibold">Zero trabalho manual.</span>
            </p>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-amber-400" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1 italic uppercase tracking-wider text-sm">
                    CRM Automático para Locadoras
                  </h4>
                  <p className="text-slate-500 text-sm">
                    Clientes, reservas e histórico de locações cadastrados automaticamente. Sua equipe só precisa atender.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-400" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1 italic uppercase tracking-wider text-sm">
                    IA que Atende 24 Horas
                  </h4>
                  <p className="text-slate-500 text-sm">
                    IA responde sobre disponibilidade de veículos, preços e confirma reservas automaticamente. Mesmo fora do horário.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] relative">
            <div className="absolute inset-0 bg-amber-500/5 blur-3xl rounded-full"></div>
            <div className="relative space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="text-xs font-mono text-amber-400">
                  ✓ Reserva registrada automaticamente no sistema
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <span className="text-xs font-mono text-slate-400">
                  ✓ Histórico completo do cliente salvo em tempo real
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-amber-300 rounded-full"></div>
                <span className="text-xs font-mono text-amber-300">
                  ✓ Data de retirada adicionada à agenda automaticamente
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                <span className="text-xs font-mono text-slate-300">
                  ✓ Cliente notificado via WhatsApp com confirmação
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
