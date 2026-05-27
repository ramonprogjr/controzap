'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'
import { ZapSpinner } from '@/components/ui/ZapSpinner'
import { User, Lock, Mail, Phone, Save, Eye, EyeOff, Check, X } from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
}

const validate = (pwd: string) => ({
  min: pwd.length >= 8,
  up: /[A-Z]/.test(pwd),
  low: /[a-z]/.test(pwd),
  num: /[0-9]/.test(pwd),
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
})

export default function PerfilPage() {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [form, setForm] = useState({ name: '', phone: '' })
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: u } = await supabase
        .from('users')
        .select('id, name, email, phone, role')
        .eq('id', user.id)
        .single()
      if (u) {
        setProfile(u as Profile)
        setForm({ name: u.name || '', phone: u.phone || '' })
      }
    } catch (err: any) {
      toast.error('Erro', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    if (!form.name.trim()) {
      toast.error('Nome obrigatório', 'Informe seu nome')
      return
    }
    setSavingProfile(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: form.name.trim(), phone: form.phone.trim() || null })
        .eq('id', profile.id)
      if (error) throw error
      toast.success('Perfil atualizado', '')
      loadProfile()
    } catch (err: any) {
      toast.error('Erro ao salvar', err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const pwdChecks = validate(pwdForm.next)
  const pwdValid = Object.values(pwdChecks).every(Boolean)

  const handleChangePassword = async () => {
    if (!profile) return
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      toast.error('Campos obrigatórios', 'Preencha todos os campos de senha')
      return
    }
    if (!pwdValid) {
      toast.error('Senha fraca', 'Atenda todos os requisitos da nova senha')
      return
    }
    if (pwdForm.next !== pwdForm.confirm) {
      toast.error('Senhas não coincidem', 'A confirmação está diferente')
      return
    }

    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: pwdForm.current,
      })
      if (signInError) {
        toast.error('Senha atual incorreta', 'Verifique e tente novamente')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: pwdForm.next })
      if (updateError) throw updateError

      toast.success('Senha alterada!', 'Use a nova senha no próximo login')
      setPwdForm({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      toast.error('Erro ao alterar senha', err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <ZapSpinner size="lg" />
      </div>
    )
  }

  if (!profile) return null

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="p-8 animate-in fade-in duration-700 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-5xl font-black heading-gradient mb-3 tracking-tighter">Meu Perfil</h1>
        <p className="text-dim text-lg font-medium">Atualize seus dados pessoais e senha</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-card-theme border border-main rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-5xl font-black mx-auto mb-6 shadow-2xl shadow-amber-500/30">
              {initials || <User className="w-16 h-16" />}
            </div>
            <h2 className="text-2xl font-black text-main tracking-tight mb-1">{profile.name}</h2>
            <p className="text-dim text-sm font-bold mb-4">{profile.email}</p>
            <span className="inline-block px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl">
              {profile.role}
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card-theme border border-main rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500/15 text-amber-500 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-main tracking-tighter">Dados pessoais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Nome completo</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                  <input
                    value={profile.email}
                    disabled
                    className="w-full input-theme rounded-xl pl-11 pr-4 py-3 text-sm font-medium opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full input-theme rounded-xl pl-11 pr-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

          <div className="bg-card-theme border border-main rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500/15 text-amber-500 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-main tracking-tighter">Alterar senha</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Senha atual</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm((f) => ({ ...f, current: e.target.value }))}
                  className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={pwdForm.next}
                      onChange={(e) => setPwdForm((f) => ({ ...f, next: e.target.value }))}
                      className="w-full input-theme rounded-xl px-4 py-3 pr-11 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-main"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-dim uppercase tracking-wider mb-2">Confirmar nova senha</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwdForm.confirm}
                    onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                    className="w-full input-theme rounded-xl px-4 py-3 text-sm font-medium"
                  />
                </div>
              </div>

              {pwdForm.next && (
                <div className="bg-main/20 rounded-xl p-4 grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'min', label: 'Mín. 8 caracteres' },
                    { key: 'up', label: 'Letra maiúscula' },
                    { key: 'low', label: 'Letra minúscula' },
                    { key: 'num', label: 'Número' },
                    { key: 'special', label: 'Caractere especial' },
                  ].map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      {(pwdChecks as any)[c.key] ? (
                        <Check className="w-4 h-4 text-amber-400" />
                      ) : (
                        <X className="w-4 h-4 text-dim/50" />
                      )}
                      <span className={(pwdChecks as any)[c.key] ? 'text-main font-bold' : 'text-dim'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-4 h-4" />
                {savingPassword ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
