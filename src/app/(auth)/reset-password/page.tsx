'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'

const validate = (pwd: string) => ({
  min: pwd.length >= 8,
  up: /[A-Z]/.test(pwd),
  low: /[a-z]/.test(pwd),
  num: /[0-9]/.test(pwd),
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
})

export default function ResetPasswordPage() {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // O link do email manda parâmetros no hash. O Supabase JS detecta sozinho;
    // basta checar se a sessão de recuperação foi estabelecida.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      } else {
        setError('Link inválido ou expirado. Solicite um novo link de redefinição.')
      }
    }
    const timer = setTimeout(checkSession, 800)
    return () => clearTimeout(timer)
  }, [supabase])

  const checks = validate(password)
  const allValid = Object.values(checks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allValid) {
      toast.error('Senha fraca', 'Atenda todos os requisitos antes de salvar')
      return
    }
    if (password !== confirm) {
      toast.error('Senhas não coincidem', 'Verifique os campos')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Senha alterada!', 'Faça login com a nova senha')
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 800)
    } catch (err: any) {
      toast.error('Erro ao alterar senha', err.message)
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

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {error ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-400" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
                <p className="text-slate-400 leading-relaxed">{error}</p>
              </div>
              <Link
                href="/recuperar-senha"
                className="block w-full bg-amber-500 text-black py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-400 transition-all"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : !ready ? (
            <div className="text-center py-16 text-slate-400 font-bold">Validando link...</div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Nova senha</h1>
              <p className="text-slate-500 mb-8">Defina sua nova senha de acesso.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Confirmar senha</label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="••••••••"
                  />
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-2">
                  {[
                    { key: 'min', label: 'Mínimo 8 caracteres' },
                    { key: 'up', label: '1 letra maiúscula' },
                    { key: 'low', label: '1 letra minúscula' },
                    { key: 'num', label: '1 número' },
                    { key: 'special', label: '1 caractere especial' },
                  ].map((c) => (
                    <div key={c.key} className="flex items-center gap-2 text-xs">
                      {(checks as any)[c.key] ? (
                        <Check className="w-4 h-4 text-amber-400" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600" />
                      )}
                      <span className={(checks as any)[c.key] ? 'text-slate-300' : 'text-slate-600'}>{c.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !allValid}
                  className="w-full bg-amber-500 text-black py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Alterar senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
