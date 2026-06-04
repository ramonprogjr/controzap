# ControlZap (GestorZap)

CRM WhatsApp multi-tenant (Next.js 14 + Supabase + UAZAPI).

## Desenvolvimento

```powershell
npm install
cp .env.example .env   # preencher Supabase; NEXT_PUBLIC_APP_URL=http://localhost:3003
.\scripts\start-local-dev.ps1   # ou: npm run dev:turbo -- -p 3003
```

Abrir: http://localhost:3003/login

- Performance local: [`DEV-PERFORMANCE.md`](DEV-PERFORMANCE.md)
- Inbox em localhost (webhook): [`docs/inbox-local-dev.md`](docs/inbox-local-dev.md)

## Produção (Render)

1. [`docs/deploy-render.md`](docs/deploy-render.md) — variáveis e passos
2. [`render.yaml`](render.yaml) — Blueprint opcional
3. [`docs/qa-production-checklist.md`](docs/qa-production-checklist.md) — testes após deploy
4. [`docs/supabase-production-audit.md`](docs/supabase-production-audit.md) — Supabase `ncvwocdinqudlgivnmpz`
5. [`docs/security-trial-15d.md`](docs/security-trial-15d.md) — trial 15 dias com cliente
6. [`docs/theme-tokens.md`](docs/theme-tokens.md) — cores e tokens do tema

```powershell
npm run check:production-env
npm run build
npm run start
```

Health check: `GET /api/health`

## Supabase

- Migrations: `supabase/migrations/`
- Projeto produção: `ncvwocdinqudlgivnmpz`

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run test:redis` | Testa conexão Redis |
| `npm run run-broadcast-cron` | Dispara cron de campanhas manualmente |
| `npm run check:production-env` | Valida env mínima para Render |
