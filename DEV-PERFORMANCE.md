# Performance local (finy)

A lentidão ao trocar de abas no **`npm run dev`** é esperada. Em **produção** (`next start` ou Render) o app já está compilado e responde bem mais rápido.

## Modos de execução

| Comando | Uso | Velocidade das abas |
|---------|-----|---------------------|
| `npm.cmd run dev -- -p 3003` | Desenvolvimento (webpack, compila sob demanda) | Mais lento na 1ª visita a cada módulo |
| `npm.cmd run dev:turbo -- -p 3003` | Dev com Turbopack | Geralmente mais rápido que `dev` |
| `npm.cmd run build` + `npm.cmd run start:prod` | Simula produção local | Mais rápido (sem compilação por clique) |

## Benchmark (31/05/2026 — máquina local, Supabase remoto)

Tempos aproximados de resposta HTTP (HTML da rota):

**Produção local (`next start -p 3003`):**

- `/als-rent-cars/conversas` — ~117 ms
- `/als-rent-cars/conexoes` — ~100 ms
- `/als-rent-cars/filas` — ~72 ms
- `/als-rent-cars/contatos` — ~132 ms

**Turbopack (`dev:turbo -p 3004`, após compilar):**

- Mesmas rotas — ~164–209 ms (2ª passa)

**Dev clássico:** 1ª visita a cada aba pode levar **vários segundos** (compilação + APIs Supabase).

Conclusão: a demora **não é bug do app**; é principalmente **modo dev + OneDrive + Supabase remoto** (`USE_REDIS=false` no `.env` local).

## Por que o dev é lento aqui

1. [`next.config.mjs`](next.config.mjs) desliga `webpack` cache em dev (`config.cache = false`) por causa de EBUSY no OneDrive.
2. Projeto em pasta sincronizada: `OneDrive\Área de Trabalho\GestorZap\finy`.
3. `NEXT_DIST_DIR=.next-local` no [`.env`](.env).
4. Redis desligado localmente — cache de conversas/contagens só em produção.

## Recomendações

### Testar como produção (recomendado para validar UX)

```powershell
cd "c:\Users\ramon\OneDrive\Área de Trabalho\GestorZap\finy"
npm.cmd run build
npm.cmd run start:prod
```

Abrir: http://localhost:3003/als-rent-cars/conversas

### Dev mais rápido no dia a dia

```powershell
npm.cmd run dev:turbo -- -p 3003
```

### Mover fora do OneDrive (se EBUSY ou lentidão persistir)

1. Feche o Cursor e pare servidores Node (`Get-NetTCPConnection -LocalPort 3003`).
2. Copie a pasta inteira para um caminho **local**, por exemplo:
   - `C:\dev\GestorZap\finy`
3. Abra essa pasta no Cursor.
4. Rode `npm.cmd install` (se necessário) e `npm.cmd run dev:turbo -- -p 3003`.
5. No OneDrive, pause sincronização na pasta antiga ou exclua `.next-local` do backup.

Isso reduz lock de arquivo (EBUSY) e I/O lento do sync.

### Redis (opcional)

Só acelera **conversas/contagens**. Não muda muito Conexões/Filas na primeira carga. Ver [`.env.example`](.env.example).
