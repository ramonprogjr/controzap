# Inbox em desenvolvimento local (localhost)

## 1. Subir o app

```powershell
.\scripts\start-local-dev.ps1
```

Abra `http://localhost:3003/login`. No `.env`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

`localhost` serve para links internos; **não** permite que a UAZAPI entregue webhooks no seu PC.

## 2. Mensagens enviadas pelo painel (salvar no banco)

O app grava em `messages` com `company_id` obrigatório. Se aparecer erro SQL `null value in column "company_id"`, aplique a migration no Supabase:

- Arquivo: `supabase/migrations/20260604120000_messages_company_id.sql`
- Dashboard → SQL → colar e executar, ou `supabase db push` no projeto linkado.

**Teste:** atribua a conversa a você (+), envie um texto, recarregue (F5) — a bolha deve permanecer.

## 3. Mensagens de outro celular (webhook)

A UAZAPI precisa chamar uma URL **pública** que aponte para sua máquina.

### Túnel (ngrok)

```powershell
ngrok http 3003
```

Copie a URL `https://xxxx.ngrok-free.app` e no `.env`:

```env
NEXT_PUBLIC_APP_URL=https://SUA-URL-DO-TUNEL
UAZAPI_WEBHOOK_SECRET=...   # mesmo valor de produção, se usar
```

Reinicie o dev server após alterar `.env`.

### Cloudflare Tunnel

Configure um túnel para `localhost:3003` e use a URL pública no `NEXT_PUBLIC_APP_URL`.

### Reconfigurar webhook

1. `/[slug]/conexoes`
2. Botão **Configurar webhook** (registra `https://SUA-URL/api/webhook/uazapi?secret=...`)
3. Opcional: `GET http://localhost:3003/api/health` → `appUrl: true`

## 4. Realtime no painel (Supabase)

**Database → Replication** (ou Publications):

- Habilitar `messages`
- Habilitar `conversations`

Sem isso, mensagens podem existir no banco mas a lista/chat só atualizam após refresh ou polling (~20s em dev).

Migration de referência: `supabase/migrations/20260601010000_realtime_inbox_messages_conversations.sql`

## 5. Sem túnel (modo degradado)

- Lista: recarregar ou aguardar polling de 20s no chat aberto
- Chat: **Carregar mais** no topo ou sincronizar histórico com a instância
- Contatos: sincronizar em Conexões / Contatos

## 6. Checklist de validação

| Passo | Esperado |
|-------|----------|
| Enviar pelo painel | Sem erro SQL; mensagem persiste após F5 |
| Outro celular → número conectado | Nova mensagem em **Novos** (com túnel + webhook OK) |
| Realtime ligado | Lista/chat atualizam sem F5 |
| Túnel desligado | Parar entradas automáticas; usar Carregar mais |

## Aviso na UI

O componente `LocalDevWebhookNotice` aparece em localhost em: Conexões, lista de Conversas e chat aberto.
