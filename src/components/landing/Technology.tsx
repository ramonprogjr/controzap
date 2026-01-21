import { Database, Sparkles } from 'lucide-react'

export function Technology() {
  return (
    <section id="tecnologia" className="relative max-w-7xl mx-auto px-8 py-24 border-t border-white/5 overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>
      <div className="relative z-10">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight leading-tight">
              Vendedor vende. <br />
              <span className="text-green-500">Sistema cadastra.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              Seu time não perde mais tempo preenchendo CRM. Cada mensagem do WhatsApp vira lead, histórico e agendamento automaticamente. <span className="text-white font-semibold">Zero trabalho manual.</span>
            </p>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-green-500" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1 italic uppercase tracking-wider text-sm">
                    CRM Automático
                  </h4>
                  <p className="text-slate-500 text-sm">
                    Leads, histórico e agendamentos cadastrados automaticamente. Seu vendedor só precisa vender.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-green-500" strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1 italic uppercase tracking-wider text-sm">
                    IA que Economiza Tempo
                  </h4>
                  <p className="text-slate-500 text-sm">
                    IA qualifica leads, agenda reuniões e responde automaticamente. Seu time ganha horas por dia.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] relative">
            <div className="absolute inset-0 bg-green-500/5 blur-3xl rounded-full"></div>
            <div className="relative space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-mono text-green-400">
                  ✓ Lead cadastrado automaticamente no CRM
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-mono text-blue-400">
                  ✓ Histórico completo salvo em tempo real
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-xs font-mono text-purple-400">
                  ✓ Agendamento detectado e adicionado à agenda
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
