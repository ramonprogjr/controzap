'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function EmailConfirmedPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          setError('Erro ao verificar confirmação de email')
          setLoading(false)
          return
        }

        if (user?.email_confirmed_at) {
          setConfirmed(true)
          // Atualizar sessão
          await supabase.auth.refreshSession()
          // Redirecionar após 2 segundos
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          setError('Email ainda não foi confirmado')
        }
        
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Erro ao verificar confirmação')
        setLoading(false)
      }
    }

    checkEmailConfirmation()
  }, [router])

  return (
    <main className="min-h-screen bg-[#020617] flex items-center justify-center px-8">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center group">
          <div className="w-9 h-9 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5 text-slate-900" strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Zap<span className="text-green-500 italic">Flow</span>
          </span>
        </Link>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
          {loading ? (
            <div>
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-6"></div>
              <h1 className="text-2xl font-bold text-white mb-2">Verificando...</h1>
              <p className="text-slate-400">Aguarde enquanto verificamos sua confirmação de email.</p>
            </div>
          ) : confirmed ? (
            <div>
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Email confirmado!</h1>
              <p className="text-slate-400 mb-6">
                Sua conta foi confirmada com sucesso. Redirecionando para o login...
              </p>
              <Link
                href="/login"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-green-500 transition-all"
              >
                Ir para Login
              </Link>
            </div>
          ) : (
            <div>
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" strokeWidth={2} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Email não confirmado</h1>
              <p className="text-slate-400 mb-6">
                {error || 'Não foi possível verificar a confirmação do seu email.'}
              </p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block bg-green-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-green-500 transition-all text-center"
                >
                  Fazer Login
                </Link>
                <Link
                  href="/"
                  className="block bg-white/5 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-white/10 transition-all border border-white/10 text-center"
                >
                  Voltar para Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
