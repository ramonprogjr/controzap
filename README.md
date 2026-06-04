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

Serviço: `https://controlzap-1.onrender.com` — branch **`main`**, Node **20**.

### Checklist de variáveis (Dashboard → Environment)

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `NODE_VERSION` | sim | `20` |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública do app (sem localhost em produção) |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | `https://ncvwocdinqudlgivnmpz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | JWT anon (`eyJ...`), não `sb_publishable_*` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | service_role — só no servidor |
| `UAZAPI_BASE_URL` | sim | ex. `https://controlzap.uazapi.com` |
| `UAZAPI_ADMIN_TOKEN` | sim | token admin UAZ — **não commitar** |
| `UAZAPI_WEBHOOK_SECRET` | recomendado | validação do webhook (inbox em tempo real) |
| `USE_REDIS` | opcional | `false` se não usar Redis |

Marque `NEXT_PUBLIC_*` como **Available during build**. Após alterar env: **Manual Deploy**.

### Supabase Auth

Site URL e Redirect URLs: `https://controlzap-1.onrender.com` e `https://controlzap-1.onrender.com/auth/callback`.

### Validar localmente antes do deploy

```powershell
npm run check:production-env
npm run build
npm run start
```

### Após deploy

1. `GET /api/health` → 200
2. Login → `/[slug]/conversas`
3. `/[slug]/conexoes` → criar conexão → QR → webhook apontando para `NEXT_PUBLIC_APP_URL`

Blueprint opcional: [`render.yaml`](render.yaml). Docs extras em `docs/` (local; pasta no `.gitignore`).

## Supabase

- Migrations: `supabase/migrations/`
- Projeto produção: `ncvwocdinqudlgivnmpz`

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run test:redis` | Testa conexão Redis |
| `npm run run-broadcast-cron` | Dispara cron de campanhas manualmente |
| `npm run check:production-env` | Valida env mínima para Render |
