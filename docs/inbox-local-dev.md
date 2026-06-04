# Inbox e webhooks em localhost

## URL e porta

- Dev: `npm run dev:turbo -- -p 3003` ou `.\scripts\start-local-dev.ps1`
- Login: http://localhost:3003/login
- Inbox ALS: http://localhost:3003/als-rent-cars/conversas

No `.env`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3003
USE_REDIS=false
NEXT_DIST_DIR=.next-local
```

## Por que mensagens externas não aparecem sozinhas

A UAZAPI envia webhooks para uma URL **pública**. `localhost` não é acessível da internet.

Opções:

1. **ngrok / Cloudflare Tunnel** — exponha a porta 3003 e use a URL HTTPS no webhook (Conexões → configurar webhook).
2. **Carregar mais** no chat ou sync em Contatos (desenvolvimento sem túnel).
3. Em `NODE_ENV=development` o app pode fazer polling automático em alguns fluxos (ver código do inbox).

## Supabase Auth (local)

No projeto [ncvwocdinqudlgivnmpz](https://supabase.com/dashboard/project/ncvwocdinqudlgivnmpz/settings/auth):

- **Site URL:** `http://localhost:3003`
- **Redirect URLs:** `http://localhost:3003/**`

## Tela branca em /login

1. Pare `next start` antigo na 3003 (`.\scripts\start-local-dev.ps1` mata e sobe dev).
2. `ping ncvwocdinqudlgivnmpz.supabase.co` — precisa resolver DNS (internet).
3. F12 → Console / Network se ainda falhar.

O middleware **não** chama Supabase em `/login`, `/cadastro`, `/onboarding`, etc. — a página deve renderizar mesmo com rede instável.

## Produção

Ver [`deploy-render.md`](deploy-render.md) e [`webhook-post-deploy.md`](webhook-post-deploy.md).
