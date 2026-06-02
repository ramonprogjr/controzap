# ControlZap (GestorZap)

CRM WhatsApp multi-tenant (Next.js 14 + Supabase + UAZAPI).

## Desenvolvimento

```powershell
npm install
cp .env.example .env   # preencher Supabase, Redis, etc.
npm run dev -- -p 3003
```

- Performance local: [`DEV-PERFORMANCE.md`](DEV-PERFORMANCE.md)
- Inbox em localhost (webhook): [`docs/inbox-local-dev.md`](docs/inbox-local-dev.md)

## Produção (Render)

1. [`docs/deploy-render.md`](docs/deploy-render.md) — variáveis e passos
2. [`render.yaml`](render.yaml) — Blueprint opcional
3. [`docs/qa-production-checklist.md`](docs/qa-production-checklist.md) — testes após deploy
4. [`docs/supabase-production-audit.md`](docs/supabase-production-audit.md) — Supabase `ncvwocdinqudlgivnmpz`

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
