import { Shield, Lock, Eye, FileCheck } from 'lucide-react'

export function Security() {
  return (
    <section id="seguranca" className="relative max-w-7xl mx-auto px-8 py-24 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
            Segurança que você <span className="text-amber-400">confia</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Dados dos seus clientes protegidos com criptografia de ponta a ponta e infraestrutura segura.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <Shield className="w-6 h-6 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">Criptografia End-to-End</h3>
            <p className="text-slate-400 text-sm">
              Todas as mensagens e dados são criptografados durante o trânsito e em repouso.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <Lock className="w-6 h-6 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">Acesso Controlado</h3>
            <p className="text-slate-400 text-sm">
              Controle total sobre quem acessa seus dados com autenticação de dois fatores.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <Eye className="w-6 h-6 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">Auditoria Completa</h3>
            <p className="text-slate-400 text-sm">
              Histórico completo de todas as ações para rastreabilidade e compliance.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:border-amber-500/30 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <FileCheck className="w-6 h-6 text-amber-400" strokeWidth={2} />
            </div>
            <h3 className="text-white font-bold mb-2 text-lg">LGPD Compliant</h3>
            <p className="text-slate-400 text-sm">
              Totalmente em conformidade com a Lei Geral de Proteção de Dados.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Shield className="w-5 h-5 text-amber-400" strokeWidth={2} />
            <span className="text-amber-400 font-bold text-sm">
              Dados armazenados em servidores seguros com backup automático
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
