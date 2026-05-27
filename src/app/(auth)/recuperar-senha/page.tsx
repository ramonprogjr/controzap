'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Mail, ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'

export default function RecuperarSenhaPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Email obrigatório', 'Informe seu email cadastrado')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) {
        toast.error('Erro ao enviar email', error.message)
        return
      }

      setSent(true)
      toast.success('Email enviado!', 'Verifique sua caixa de entrada e spam')
    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Não foi possível enviar o email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center group">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Control<span className="text-amber-400">Zap</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 text-sm justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Login
        </Link>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-amber-400" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Email enviado!</h1>
                <p className="text-slate-400 leading-relaxed">
                  Enviamos um link de redefinição para <strong className="text-white">{email}</strong>.
                  Verifique sua caixa de entrada e spam.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full bg-amber-500 text-black py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-400 transition-all"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Recuperar senha</h1>
              <p className="text-slate-500 mb-8">
                Informe seu email cadastrado e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 text-black py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
