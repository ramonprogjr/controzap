'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'email_not_confirmed') {
      toast.error(
        'Email não confirmado',
        'Por favor, confirme seu email antes de acessar o dashboard. Verifique sua caixa de entrada.'
      )
    }
    if (error === 'profile_not_found') {
      toast.error('Perfil não encontrado', 'Seu usuário não está vinculado a uma empresa.')
    }
    if (error === 'inactive') {
      toast.error('Usuário inativo', 'Seu acesso está desativado.')
    }
  }, [searchParams, toast])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const redirectTo = searchParams.get('redirect_to') || '/dashboard'
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Invalid login')) {
          toast.error('Credenciais inválidas', 'Verifique seu e-mail e senha')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email não confirmado', 'Confirme seu email antes de fazer login.')
        } else if (error.message.includes('rate limit') || error.message.includes('seconds')) {
          const match = error.message.match(/(\d+)\s*seconds?/i)
          const seconds = match ? parseInt(match[1]) : 20
          toast.error('Muitas tentativas', `Aguarde ${seconds} segundos antes de tentar novamente.`)
        } else {
          toast.error('Erro ao fazer login', error.message)
        }
        setLoading(false)
        return
      }

      toast.success('Login realizado com sucesso!', 'Redirecionando...')
      window.location.href = redirectTo

    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Ocorreu um erro ao fazer login')
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error('Email necessário', 'Por favor, informe seu email primeiro')
      return
    }

    setResendingEmail(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        toast.error('Erro ao reenviar email', error.message)
      } else {
        toast.success(
          'Email reenviado!',
          'Verifique sua caixa de entrada e spam para confirmar sua conta.'
        )
      }
    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Não foi possível reenviar o email')
    } finally {
      setResendingEmail(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center group">
          <div className="w-9 h-9 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Control<span className="text-green-500">Zap</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para Home
        </Link>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Acesse sua conta</h1>
          <p className="text-slate-400 mb-8">Entre no painel administrativo</p>

          <form onSubmit={handleLogin} className="space-y-6">

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-2">
                Não recebeu o email de confirmação?
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={resendingEmail || !email}
                className="text-green-500 hover:text-green-400 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                <Mail className="w-4 h-4" />
                {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmação'}
              </button>
            </div>

            <div className="text-center border-t border-white/10 pt-4">
              <p className="text-slate-400 text-sm">
                Não tem uma conta?{' '}
                <Link href="/registro" className="text-green-500 hover:text-green-400 font-semibold">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
