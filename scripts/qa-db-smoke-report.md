# Relatório QA automatizado (banco + build) — 2026-06-01

Gerado durante preparação go-live Render. Testes de UI/WhatsApp requerem URL pública ([`qa-production-checklist.md`](../docs/qa-production-checklist.md)).

## Build

- `npm run build` — **OK** (Next.js 14.2.35, rota `/api/health` incluída)

## Supabase `ncvwocdinqudlgivnmpz`

| Item | Status |
|------|--------|
| Realtime `messages` | OK (aplicado) |
| Realtime `conversations` | OK (aplicado) |
| Realtime `notifications` | OK |
| RLS channels/conversations write | OK |
| ALS slug `als-rent-cars` | OK |
| Perfis ativos ALS | 1 (Ramon, owner) |
| `channel_id` null em conversas ALS | 0 |
| `assigned_to` órfão | 0 |
| Canal WhatsApp com token | OK (`TEste Ramon`) |
| Fila Padrão — Ramon atribuído | OK |

## Módulos (rotas compiladas)

Presentes no build de produção:

- Inbox: `/api/conversations/*`, `/api/webhook/uazapi`
- CRM: `/api/crm/commercial/*`
- Campanhas: `/api/broadcast-pipelines`, `/api/cron/broadcast-pipelines`
- Copiloto: `/api/ai/*`, `/api/companies/copilot-*`
- Admin: `/api/admin/*`

## Pendente (só em produção Render)

- [ ] Auth redirect URLs no Supabase com URL Render
- [ ] `NEXT_PUBLIC_APP_URL` no Render
- [ ] Webhook UAZAPI — [`webhook-post-deploy.md`](../docs/webhook-post-deploy.md)
- [ ] Checklist manual inbox/CRM/campanhas/copiloto
