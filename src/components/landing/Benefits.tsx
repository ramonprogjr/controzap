import { Clock, UserCheck, TrendingUp, Car } from 'lucide-react'

export function Benefits() {
  return (
    <section id="beneficios" className="relative max-w-7xl mx-auto px-8 py-24 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
            Pare de perder <span className="text-amber-400">reservas</span> por falta de controle
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Seu time ganha horas por dia. Nenhum cliente esquecido. Mais locações fechadas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:scale-105 transition-transform hover:border-amber-500/30 group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
              <Clock className="w-7 h-7 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-3 text-xl">
              15+ horas economizadas
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Por semana. Seu atendente não perde mais tempo preenchendo planilhas. Tudo é automático.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:scale-105 transition-transform hover:border-amber-500/30 group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
              <UserCheck className="w-7 h-7 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-3 text-xl">
              Zero cadastros manuais
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Cada conversa no WhatsApp vira lead e histórico automaticamente. Seu time só atende.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:scale-105 transition-transform hover:border-amber-500/30 group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
              <TrendingUp className="w-7 h-7 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-3 text-xl">
              100% das reservas capturadas
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nenhuma solicitação se perde. Toda conversa é registrada, mesmo fora do horário comercial.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:scale-105 transition-transform hover:border-amber-500/30 group">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:bg-amber-500/20 transition-colors">
              <Car className="w-7 h-7 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-3 text-xl">
              IA especializada em locação
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Responde automaticamente sobre disponibilidade, preços e reservas. 24/7 sem parar.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-6 h-6 text-amber-400" strokeWidth={2} />
            <div className="text-left">
              <p className="text-amber-400 font-bold text-lg">
                Economize 60+ horas por mês
              </p>
              <p className="text-slate-400 text-sm">
                Tempo que sua equipe ganha para focar no que importa: atender bem
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
