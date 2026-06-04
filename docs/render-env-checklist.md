# Checklist Render — após deploy

Serviço exemplo: `controlzap-1` → https://controlzap-1.onrender.com

## Environment (obrigatório)

| Variável | Valor |
|----------|--------|
| `NODE_VERSION` | `20` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://controlzap-1.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ncvwocdinqudlgivnmpz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon JWT** (`eyJ...`) em [Supabase API](https://supabase.com/dashboard/project/ncvwocdinqudlgivnmpz/settings/api) — **não** use `sb_publishable_...`; se der "Invalid API key", **apague** esta variável e redeploy |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `USE_REDIS` | `false` no primeiro teste |
| `UAZAPI_BASE_URL` | `https://controlzap.uazapi.com` |
| `UAZAPI_ADMIN_TOKEN` | Admin Token do painel UAZ (secreto) |
| `UAZAPI_WEBHOOK_SECRET` | string longa aleatória (webhook) |

Marque **Available during build** nas `NEXT_PUBLIC_*`.

## Supabase Auth

- Site URL = `NEXT_PUBLIC_APP_URL`
- Redirect URLs: `https://controlzap-1.onrender.com/**`

## Validar

1. `/api/health` → `status: "ok"` (não `degraded`)
2. `/login` → entrar → `/als-rent-cars/conversas`
3. Conexões → webhook → [`webhook-post-deploy.md`](webhook-post-deploy.md)
4. QA completo: [`qa-production-checklist.md`](qa-production-checklist.md)
