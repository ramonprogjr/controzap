# ControlZap — WhatsApp CRM Multi-tenant

CRM de WhatsApp para equipes de atendimento e vendas. Um número de WhatsApp atende múltiplos colaboradores simultaneamente, com filas, kanban, CRM comercial, broadcast e copiloto de IA.

Construído com **Next.js 14**, **Supabase** e **UAZAPI**.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Conversas** | Inbox em tempo real — mensagens, áudio, imagens, documentos, reações |
| **Tickets** | Kanban com status customizáveis por fila |
| **Filas** | Distribuição de atendimentos (padrão ou comercial com round-robin) |
| **CRM** | Pipeline comercial, métricas por consultor, transferência de leads |
| **Calendário** | Agendamentos e follow-ups vinculados ao contato |
| **Contatos** | Sync do WhatsApp, grupos, comunidades, bloqueados, import CSV |
| **Respostas Rápidas** | Templates de resposta por fila (texto, imagem, arquivo) |
| **Tags & Formulários** | Etiquetas e formulários customizados por fila |
| **Broadcast** | Disparo em massa com pipeline visual, cadência e agendamento |
| **Copiloto IA** | Sugestões e correções de texto via Mistral AI por canal ou fila |
| **Cargos & Usuários** | RBAC com 13 módulos e 38 permissões granulares |
| **Conexões** | Múltiplos números WhatsApp (QR code ou pairing), sync de histórico |
| **Super Admin** | Gestão de empresas, planos, billing e módulos por tenant |

---

## Stack

- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Banco de dados / Auth:** Supabase (PostgreSQL + RLS + Realtime + Edge Functions)
- **Gateway WhatsApp:** UAZAPI (suporta múltiplos servidores e instâncias)
- **IA:** Mistral AI — Copiloto opcional por empresa
- **UI:** Tailwind CSS
- **Estado:** React Query + Zustand
- **Deploy:** Render + Supabase Edge Functions

---

## Desenvolvimento local

```powershell
npm install
cp .env.example .env   # preencher variáveis obrigatórias
npm run dev -- -p 3003
```

Acesse: **http://localhost:3003/login**

- Performance local no Windows: [`DEV-PERFORMANCE.md`](DEV-PERFORMANCE.md)
- Inbox via webhook em localhost: [`docs/inbox-local-dev.md`](docs/inbox-local-dev.md)

### Variáveis obrigatórias (`.env`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

UAZAPI_BASE_URL=https://seu-servidor.uazapi.com
UAZAPI_ADMIN_TOKEN=seu_token_admin

NEXT_PUBLIC_APP_URL=http://localhost:3003
```

---

## Produção (Render)

Serviço: `https://controlzap-1.onrender.com` — branch **`main`**, Node **20**.

### Variáveis de ambiente no Render

| Variável | Obrigatório | Notas |
|----------|-------------|-------|
| `NODE_VERSION` | sim | `20` |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública sem barra final |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | JWT anon (`eyJ...`), não `sb_publishable_*` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Apenas no servidor |
| `UAZAPI_BASE_URL` | sim | URL do servidor UAZAPI |
| `UAZAPI_ADMIN_TOKEN` | sim | Token admin UAZAPI — não commitar |
| `UAZAPI_WEBHOOK_SECRET` | recomendado | Validação de segurança do webhook |
| `USE_REDIS` | opcional | `false` se não usar cache Redis |

Marque `NEXT_PUBLIC_*` como **Available during build**. Após alterar env: **Manual Deploy**.

### Supabase Auth

Site URL e Redirect URLs: `https://controlzap-1.onrender.com` e `https://controlzap-1.onrender.com/auth/callback`.

### Validar antes do deploy

```powershell
npm run check:production-env
npm run build
```

### Após deploy

1. `GET /api/health` → 200
2. Login → `/[slug]/conversas`
3. `/[slug]/conexoes` → criar conexão → QR → webhook configurado automaticamente

Blueprint opcional: [`render.yaml`](render.yaml).

---

## Webhook UAZAPI

O sistema recebe mensagens via webhook. Configure no servidor UAZAPI:

- **URL:** `https://<ref>.supabase.co/functions/v1/uazapi-webhook`
- **Eventos:** `messages`, `connection`, `history`, `messages_update`
- **Excluir:** `wasSentByApi`

O webhook global aplica a todas as instâncias automaticamente.

Deploy da Edge Function:
```powershell
$env:SUPABASE_ACCESS_TOKEN="seu_pat"
npx supabase functions deploy uazapi-webhook --no-verify-jwt --project-ref <ref>
```

---

## Supabase

- Migrations: `supabase/migrations/`
- Edge Functions: `supabase/functions/uazapi-webhook/`, `supabase/functions/broadcast-pipelines-cron/`

---

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev -- -p 3003` | Servidor de desenvolvimento |
| `npm run check:production-env` | Valida env mínima para Render |
| `npm run test:redis` | Testa conexão Redis |
| `npm run run-broadcast-cron` | Dispara cron de campanhas manualmente |

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`docs/controlzap-overview.md`](docs/controlzap-overview.md) | Visão geral do produto |
| [`docs/deploy-render.md`](docs/deploy-render.md) | Guia completo de deploy |
| [`docs/inbox-local-dev.md`](docs/inbox-local-dev.md) | Inbox via webhook em localhost |
| [`DEV-PERFORMANCE.md`](DEV-PERFORMANCE.md) | Performance no Windows |
