# ControlZap- Headless CRM para WhatsApp

Infraestrutura inteligente de automação e CRM invisível para empresas que operam vendas via WhatsApp.

## 🚀 Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** (Banco de dados + Auth)
- **Tailwind CSS**
- **UAZAPI** (Gateway WhatsApp)
- **Mistral AI** (Análise de intenções)

## 📋 Pré-requisitos

- Node.js 18+
- Conta Supabase
- Chaves UAZAPI
- Chave Mistral AI

## 🛠️ Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

UAZAPI_BASE_URL=https://free.uazapi.com
UAZAPI_GLOBAL_TOKEN=seu_token_uazapi

MISTRAL_API_KEY=sua_api_key_mistral

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Execute o script SQL no Supabase:
   - Acesse o SQL Editor no Supabase
   - Execute o conteúdo do arquivo `supabase/schema.sql`

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/          # Páginas de autenticação
│   ├── (dashboard)/     # Painel administrativo
│   ├── api/             # API routes
│   └── page.tsx         # Landing page
├── components/
│   ├── dashboard/       # Componentes do dashboard
│   └── landing/         # Componentes da landing
├── lib/
│   ├── ai/              # Integração Mistral AI
│   ├── supabase/        # Clientes Supabase
│   └── uazapi/          # Cliente UAZAPI
└── middleware.ts        # Middleware de autenticação
```

## 🔐 Configuração do Webhook UAZAPI

1. Acesse o painel da UAZAPI
2. Configure o webhook para:
   - URL: `https://seu-dominio.com/api/webhooks/uazapi`
   - Eventos: `onMessage`, `onMessageSent`
   - Header: `x-instance` com o ID da instância

## 📊 Funcionalidades

- ✅ Landing page responsiva
- ✅ Sistema de autenticação completo
- ✅ Cadastro de empresa e administrador
- ✅ Dashboard com métricas
- ✅ Webhook para receber mensagens
- ✅ Análise de intenções com IA
- ✅ Respostas automáticas para saudação
- ✅ Detecção de agendamentos

## 🚧 Próximos Passos

- [ ] Fluxo de onboarding completo
- [ ] Cadastro de vendedores
- [ ] Tela de conversas em tempo real
- [ ] Gestão de leads
- [ ] Agenda central
- [ ] Analytics avançado

## 📝 Licença

Proprietário - ZapFlow
