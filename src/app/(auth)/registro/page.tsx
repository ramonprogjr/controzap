'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, Check, X, Mail, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastContainer'

// Função para formatar telefone brasileiro
const formatPhone = (value: string) => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')

  // Limita a 13 dígitos (55 + 2 DDD + 9 número)
  const limitedNumbers = numbers.slice(0, 13)

  // Se começar com 55 (código do Brasil), formata com +
  if (limitedNumbers.startsWith('55')) {
    if (limitedNumbers.length <= 2) return `+${limitedNumbers}`
    if (limitedNumbers.length <= 4) return `+${limitedNumbers.slice(0, 2)} ${limitedNumbers.slice(2)}`
    if (limitedNumbers.length <= 7) return `+${limitedNumbers.slice(0, 2)} ${limitedNumbers.slice(2, 4)} ${limitedNumbers.slice(4)}`
    if (limitedNumbers.length <= 11) return `+${limitedNumbers.slice(0, 2)} ${limitedNumbers.slice(2, 4)} ${limitedNumbers.slice(4, 7)}-${limitedNumbers.slice(7)}`
    // Formato completo: +55 11 99999-9999
    return `+${limitedNumbers.slice(0, 2)} ${limitedNumbers.slice(2, 4)} ${limitedNumbers.slice(4, 9)}-${limitedNumbers.slice(9)}`
  }

  // Se não começar com 55, assume que é número brasileiro sem código do país
  if (limitedNumbers.length === 0) return ''
  if (limitedNumbers.length <= 2) return limitedNumbers
  if (limitedNumbers.length <= 7) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`
  // Formato: (11) 99999-9999
  return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`
}

// Função para validar senha
const validatePassword = (password: string) => {
  const hasMinLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  return {
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
  }
}

export default function RegistroPage() {
  const router = useRouter()
  const toast = useToast()
  const [formData, setFormData] = useState({
    companyName: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    companyPhone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [fetchingCnpj, setFetchingCnpj] = useState(false)
  const [fetchingCep, setFetchingCep] = useState(false)
  const passwordValidation = validatePassword(formData.adminPassword)

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cnpj') {
      setFormData((prev) => ({ ...prev, [field]: value }))
      return
    }
    if (field === 'cep') {
      const digits = value.replace(/\D/g, '').slice(0, 8)
      setFormData((prev) => ({ ...prev, [field]: digits }))
      return
    }
    if (field === 'adminPhone') {
      // Aplicar máscara de telefone
      const formatted = formatPhone(value)
      setFormData((prev) => ({ ...prev, [field]: formatted }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleFetchCnpj = async () => {
    const cnpjDigits = formData.cnpj.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) {
      return
    }
    setFetchingCnpj(true)
    try {
      const res = await fetch(`https://api.opencnpj.org/${cnpjDigits}`)
      if (!res.ok) {
        toast.error('CNPJ não encontrado', 'Verifique o número e tente novamente.')
        return
      }
      const data = await res.json()
      setFormData((prev) => ({
        ...prev,
        razaoSocial: data.razao_social || prev.razaoSocial,
        nomeFantasia: data.nome_fantasia || prev.nomeFantasia,
        companyName: data.nome_fantasia || data.razao_social || prev.companyName,
        companyPhone: data.telefones?.[0]
          ? `(${data.telefones[0].ddd}) ${data.telefones[0].numero}`
          : prev.companyPhone,
        cep: data.cep || prev.cep,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
      }))

      if (data.cep) {
        await handleFetchCep(data.cep)
      }
    } catch (err: any) {
      toast.error('Erro ao buscar CNPJ', err.message || 'Tente novamente.')
    } finally {
      setFetchingCnpj(false)
    }
  }

  const handleFetchCep = async (cepValue?: string) => {
    const cepDigits = (cepValue || formData.cep).replace(/\D/g, '')
    if (cepDigits.length !== 8) return
    setFetchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
      const data = await res.json()
      if (data?.erro) {
        toast.error('CEP não encontrado', 'Verifique o CEP e tente novamente.')
        return
      }
      setFormData((prev) => ({
        ...prev,
        cep: data.cep?.replace(/\D/g, '') || prev.cep,
        logradouro: data.logradouro || prev.logradouro,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.localidade || prev.municipio,
        uf: data.uf || prev.uf,
      }))
    } catch (err: any) {
      toast.error('Erro ao buscar CEP', err.message || 'Tente novamente.')
    } finally {
      setFetchingCep(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar senha antes de submeter
    if (!passwordValidation.isValid) {
      toast.error(
        'Senha inválida',
        'A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial.'
      )
      return
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      toast.error('Senhas diferentes', 'Confirme a senha corretamente.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
      })

      if (authError || !authData.user) {
        if (authError?.message?.includes('already')) {
          toast.error('E-mail já cadastrado', 'Faça login com esse e-mail.')
        } else {
          toast.error('Erro ao criar conta', authError?.message || 'Tente novamente.')
        }
        setLoading(false)
        return
      }

      // Criar empresa + usuário via backend (bypass RLS)
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          companyName: formData.companyName,
          razaoSocial: formData.razaoSocial,
          nomeFantasia: formData.nomeFantasia,
          cnpj: formData.cnpj,
          companyEmail: formData.adminEmail,
          companyPhone: formData.companyPhone,
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          municipio: formData.municipio,
          uf: formData.uf,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone,
        }),
      })

      const registerData = await registerRes.json()
      if (!registerRes.ok) {
        const message =
          registerRes.status === 409
            ? 'Este e-mail já possui cadastro. Faça login.'
            : (registerData.error || 'Tente novamente.')
        toast.error('Erro ao finalizar cadastro', message)
        setLoading(false)
        return
      }

      setAccountCreated(true)
      setNeedsEmailConfirmation(true)
      toast.success('Conta criada com sucesso!', 'Confira seu e-mail para confirmar o cadastro.')
    } catch (err: any) {
      toast.error('Erro inesperado', err.message || 'Ocorreu um erro ao processar sua solicitação')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-6xl">
        <Link href="/" className="flex items-center gap-3 mb-4 justify-center group">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            Control<span className="text-amber-500">Zap</span>
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
          {needsEmailConfirmation ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-amber-500" strokeWidth={2} />
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">
                Conta criada com sucesso!
              </h1>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4 text-left">
                  <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div>
                    <h3 className="text-white font-bold mb-2 text-lg">
                      Verifique seu email
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-3">
                      Enviamos um email de confirmação para <strong className="text-white">{formData.adminEmail}</strong>
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Clique no link do email para confirmar sua conta e ter acesso completo ao ControlZap.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-slate-400 text-sm mb-2">
                  <strong className="text-white">Não recebeu o email?</strong>
                </p>
                <ul className="text-slate-400 text-xs space-y-1 text-left max-w-md mx-auto">
                  <li>• Verifique sua caixa de spam ou lixo eletrônico</li>
                  <li>• Aguarde alguns minutos (pode levar até 5 minutos)</li>
                  <li>• Verifique se o email está correto: {formData.adminEmail}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="bg-amber-600 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-500 transition-all"
                >
                  Ir para Login
                </Link>
                <button
                  onClick={() => {
                    setAccountCreated(false)
                    setNeedsEmailConfirmation(false)
                    setFormData({
                      companyName: '',
                      razaoSocial: '',
                      nomeFantasia: '',
                      cnpj: '',
                      companyPhone: '',
                      cep: '',
                      logradouro: '',
                      numero: '',
                      complemento: '',
                      bairro: '',
                      municipio: '',
                      uf: '',
                      adminName: '',
                      adminEmail: '',
                      adminPassword: '',
                      confirmPassword: '',
                      adminPhone: '',
                    })
                  }}
                  className="bg-white/5 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-white/10 transition-all border border-white/10"
                >
                  Criar Outra Conta
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-4">
                  <span>Teste grátis por 12 dias</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">Cadastro da Empresa</h1>
              <p className="text-slate-400 mb-8">Preencha os dados essenciais para criar sua conta administrativa</p>

              <form onSubmit={handleSubmit} className="space-y-10">
                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Dados da Empresa</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="cnpj" className="block text-sm font-medium text-slate-300 mb-2">CNPJ</label>
                      <input
                        id="cnpj"
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => handleInputChange('cnpj', e.target.value)}
                        onBlur={handleFetchCnpj}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="00.000.000/0001-00"
                      />
                      {fetchingCnpj && (
                        <p className="text-xs text-slate-400 mt-2">Buscando dados do CNPJ...</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="razaoSocial" className="block text-sm font-medium text-slate-300 mb-2">Razão Social</label>
                      <input
                        id="razaoSocial"
                        type="text"
                        value={formData.razaoSocial}
                        onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Razão social"
                      />
                    </div>

                    <div>
                      <label htmlFor="nomeFantasia" className="block text-sm font-medium text-slate-300 mb-2">Nome Fantasia</label>
                      <input
                        id="nomeFantasia"
                        type="text"
                        value={formData.nomeFantasia}
                        onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Nome fantasia"
                      />
                    </div>

                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">Nome exibido</label>
                      <input
                        id="companyName"
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange('companyName', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Nome fantasia ou razão social"
                      />
                    </div>

                    <div>
                      <label htmlFor="companyPhone" className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                      <input
                        id="companyPhone"
                        type="tel"
                        value={formData.companyPhone}
                        onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Dados de Acesso</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
                      <input
                        id="adminEmail"
                        type="email"
                        value={formData.adminEmail}
                        onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="seu@empresa.com.br"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminName" className="block text-sm font-medium text-slate-300 mb-2">Nome completo</label>
                      <input
                        id="adminName"
                        type="text"
                        value={formData.adminName}
                        onChange={(e) => handleInputChange('adminName', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Nome do administrador"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminPhone" className="block text-sm font-medium text-slate-300 mb-2">WhatsApp</label>
                      <input
                        id="adminPhone"
                        type="tel"
                        value={formData.adminPhone}
                        onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                      <div className="relative">
                        <input
                          id="adminPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.adminPassword}
                          onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                          required
                          minLength={8}
                          className={`w-full bg-white/5 border rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${formData.adminPassword
                              ? passwordValidation.isValid
                                ? 'border-amber-500/50 focus:ring-amber-500'
                                : 'border-red-500/50 focus:ring-red-500'
                              : 'border-white/10 focus:ring-amber-500'
                            }`}
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

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirmar senha</label>
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Digite a senha novamente"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminRole" className="block text-sm font-medium text-slate-300 mb-2">Cargo</label>
                      <input
                        id="adminRole"
                        type="text"
                        value="Administrador"
                        disabled
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white opacity-60 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {formData.adminPassword && (
                    <div className="mt-3 space-y-2">
                      <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasMinLength ? 'text-amber-400' : 'text-slate-500'}`}>
                        {passwordValidation.hasMinLength ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span>Mínimo de 8 caracteres</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUpperCase ? 'text-amber-400' : 'text-slate-500'}`}>
                        {passwordValidation.hasUpperCase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span>Pelo menos uma letra maiúscula</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasLowerCase ? 'text-amber-400' : 'text-slate-500'}`}>
                        {passwordValidation.hasLowerCase ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span>Pelo menos uma letra minúscula</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumber ? 'text-amber-400' : 'text-slate-500'}`}>
                        {passwordValidation.hasNumber ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span>Pelo menos um número</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasSpecialChar ? 'text-amber-400' : 'text-slate-500'}`}>
                        {passwordValidation.hasSpecialChar ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        <span>Pelo menos um caractere especial (!@#$%...)</span>
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-6">
                  <h2 className="text-xl font-bold text-white">Endereço</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="cep" className="block text-sm font-medium text-slate-300 mb-2">CEP</label>
                      <input
                        id="cep"
                        type="text"
                        value={formData.cep}
                        onChange={(e) => handleInputChange('cep', e.target.value)}
                        onBlur={() => handleFetchCep()}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="00000-000"
                      />
                      {fetchingCep && (
                        <p className="text-xs text-slate-400 mt-2">Buscando endereço...</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="logradouro" className="block text-sm font-medium text-slate-300 mb-2">Logradouro</label>
                      <input
                        id="logradouro"
                        type="text"
                        value={formData.logradouro}
                        onChange={(e) => handleInputChange('logradouro', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Rua, Avenida, etc"
                      />
                    </div>

                    <div>
                      <label htmlFor="numero" className="block text-sm font-medium text-slate-300 mb-2">Número</label>
                      <input
                        id="numero"
                        type="text"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Número"
                      />
                    </div>

                    <div>
                      <label htmlFor="complemento" className="block text-sm font-medium text-slate-300 mb-2">Complemento</label>
                      <input
                        id="complemento"
                        type="text"
                        value={formData.complemento}
                        onChange={(e) => handleInputChange('complemento', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Sala, bloco, etc"
                      />
                    </div>

                    <div>
                      <label htmlFor="bairro" className="block text-sm font-medium text-slate-300 mb-2">Bairro</label>
                      <input
                        id="bairro"
                        type="text"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Bairro"
                      />
                    </div>

                    <div>
                      <label htmlFor="municipio" className="block text-sm font-medium text-slate-300 mb-2">Município</label>
                      <input
                        id="municipio"
                        type="text"
                        value={formData.municipio}
                        onChange={(e) => handleInputChange('municipio', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Cidade"
                      />
                    </div>

                    <div>
                      <label htmlFor="uf" className="block text-sm font-medium text-slate-300 mb-2">UF</label>
                      <input
                        id="uf"
                        type="text"
                        value={formData.uf}
                        onChange={(e) => handleInputChange('uf', e.target.value.toUpperCase())}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </section>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processando...' : 'Criar Conta'}
                  </button>
                </div>
              </form>

              {!needsEmailConfirmation && (
                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-sm">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-amber-500 hover:text-amber-400 font-semibold">
                      Fazer login
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
