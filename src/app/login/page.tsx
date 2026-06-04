"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ClicVendLogo } from "@/components/ClicVendLogo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import {
  CalendarCheck2,
  CheckCircle,
  Clock4,
  Eye,
  EyeOff,
  History,
  LogIn,
  MessageSquareText,
  Tags,
  UsersRound,
  Loader2,
} from "lucide-react";
import { useLogin } from "@/lib/auth/use-login";

function LoginForm() {
  const { login, error, loading, success } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const isValid = email.trim().length > 0 && password.length > 0;

  const inputClass =
    "w-full rounded-xl border border-border bg-muted/40 px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all";

  return (
    <div className="min-h-screen md:flex">
      {/* Painel de valor (sempre visível) */}
      <section className="relative z-0 bg-gradient-to-br from-[#0a0a0a] via-[#1c1008] to-[#292018] px-6 py-8 md:flex-1 md:px-10 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_50%,rgba(245,158,11,0.15),transparent)] pointer-events-none" />
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 select-none text-right text-[40px] font-black uppercase tracking-tighter text-white/[0.06] md:right-10 md:top-10 md:text-[72px]"
        >
          {BRAND_NAME}
          <div className="mt-1 text-[10px] font-extrabold tracking-[6px] text-white/[0.14] md:text-xs">
            {BRAND_TAGLINE}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-card/[0.04] p-5 backdrop-blur md:p-8">
            <p className="text-[11px] font-semibold tracking-wider text-amber-300/90">
              ORGANIZE O ATENDIMENTO NO WHATSAPP
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-white md:text-3xl">
              Fila, histórico e <span className="text-amber-300">SLA</span> para o time atender
              melhor — com <span className="text-amber-300">CRM</span> e{" "}
              <span className="text-amber-300">Agenda</span>.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Tudo o que você precisa para manter o atendimento organizado e previsível, sem perder
              contexto no meio da conversa.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:mt-7 md:gap-4">
              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <MessageSquareText className="h-4 w-4" />
                  <span className="text-sm font-semibold">Filas & atribuição</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Distribua atendimentos e saiba quem está com cada conversa.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <Clock4 className="h-4 w-4" />
                  <span className="text-sm font-semibold">SLA & prioridade</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Enxergue pendências e responda primeiro o que é urgente.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <History className="h-4 w-4" />
                  <span className="text-sm font-semibold">Histórico do contato</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Contexto completo para atender melhor, sem repetir perguntas.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <CalendarCheck2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Agenda & retornos</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Agendamentos e follow-up conectados ao contato e à conversa.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <Tags className="h-4 w-4" />
                  <span className="text-sm font-semibold">Etiquetas & CRM</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Organize por etapa/assunto e facilite relatórios e gestão.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-card/[0.03] p-3 transition hover:bg-card/[0.06] md:p-4">
                <div className="flex items-center gap-2 text-amber-200">
                  <UsersRound className="h-4 w-4" />
                  <span className="text-sm font-semibold">Visão da equipe</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70 md:text-sm">
                  Acompanhe volume, organização e qualidade por operador/fila.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/60 md:mt-7 md:text-xs">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-300/80" />
              Operação organizada, sem perder mensagens.
            </div>
          </div>
        </div>
      </section>

      {/* Faixa branca à esquerda com o form */}
      <div className="relative z-10 flex w-full flex-col justify-center bg-background p-8 md:w-[55%] md:min-w-[520px] md:max-w-[640px] md:flex-none md:shadow-[8px_0_24px_rgba(0,0,0,0.08)] dark:shadow-none">
        <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="flex justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
        >
          <ClicVendLogo size="lg" />
        </Link>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-12`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>



          {error && <p className="text-sm font-medium text-[#EF4444]">{error}</p>}
          {success && <p className="text-sm font-medium text-amber-600 text-center animate-pulse">Login realizado com sucesso! Redirecionando...</p>}

          <button
            type="submit"
            disabled={!isValid || loading || success}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:bg-muted disabled:shadow-none ${
              success ? "bg-amber-500 hover:bg-amber-600" : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
            }`}
          >
            {success ? (
              <CheckCircle className="h-4 w-4" />
            ) : loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {success ? "Sucesso!" : loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <div className="text-muted-foreground">Carregando…</div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
