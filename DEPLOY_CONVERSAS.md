# Deploy: Conversas profissionais

## 1. Supabase — migration

No SQL Editor ou via CLI:

```bash
cd galima
supabase db push
```

Arquivo: `supabase/migrations/20260527120000_messages_media_realtime.sql`

## 2. Supabase — Edge Function

```bash
supabase functions deploy process-webhook --no-verify-jwt
```

Variáveis no projeto Supabase (Settings → Edge Functions):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UAZAPI_BASE_URL`
- `UAZAPI_GLOBAL_TOKEN`

## 3. UAZAPI — webhook

URL global:

```
https://SEU_PROJETO.supabase.co/functions/v1/process-webhook
```

Eventos: `messages`, `connection`, `history`, `messages_update`

## 4. Vercel — app Next.js

- Root Directory: `galima`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UAZAPI_*`

## Checklist de teste

1. Instância conectada → status `connected` no banco
2. Cliente envia texto → aparece em Conversas (lado esquerdo) em até 5s
3. Cliente envia áudio/imagem → player/imagem funcionam
4. Você responde texto → outbound + WhatsApp do cliente recebe
5. Você envia imagem pelo painel (ícone) → cliente recebe
6. Abrir conversa → badge “não lidas” zera
7. Nenhuma resposta automática da IA no WhatsApp
