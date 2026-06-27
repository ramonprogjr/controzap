# ControlZap — Visão Geral do Produto

## O que é

**ControlZap** é um CRM de WhatsApp multi-tenant para empresas que usam o WhatsApp como canal principal de vendas e atendimento.

Funciona como o WhatsApp Web, mas para equipes inteiras: um único número de WhatsApp é compartilhado entre vários colaboradores ao mesmo tempo, com controle total sobre quem atende o quê.

---

## Problema que resolve

Empresas que vendem pelo WhatsApp enfrentam problemas clássicos:

- Mensagens perdidas quando o colaborador sai da empresa (o número estava no celular dele)
- Impossibilidade de múltiplas pessoas atenderem o mesmo número
- Sem histórico centralizado de conversas
- Sem controle de quem atendeu, quando e como
- Sem métricas de atendimento ou conversão

O ControlZap resolve isso colocando o WhatsApp dentro de um CRM profissional, acessível por qualquer colaborador via browser — sem depender de um celular específico.

---

## Como funciona

```
Celular do cliente
       ↓
   WhatsApp
       ↓
   UAZAPI (gateway WhatsApp)
       ↓
   ControlZap (dashboard web)
       ↓
   Qualquer colaborador responde pelo browser
```

O número fica vinculado ao sistema, não ao celular de ninguém. Se um colaborador sai da empresa, o histórico e o número ficam — basta remover o acesso dele.

---

## Módulos

### Conversas
Inbox em tempo real. Todas as mensagens recebidas e enviadas aparecem aqui, organizadas por contato. Suporta texto, áudio, imagens, vídeos, documentos, figurinhas e reações.

### Tickets (Kanban)
Cada conversa vira um ticket. A equipe organiza os atendimentos em colunas customizáveis por fila (ex: "Novo", "Em atendimento", "Aguardando retorno", "Encerrado"). Arrastar e soltar.

### Filas
Sistema de distribuição de atendimentos. Uma fila pode ser do tipo padrão (atribuição manual) ou comercial (round-robin automático entre os consultores disponíveis). Cada fila tem horário de funcionamento, SLA e formulários próprios.

### CRM Comercial
Visão gerencial do pipeline de vendas. Mostra métricas por consultor (leads ativos, taxa de conversão, última atividade), distribuição por status e permite transferir leads entre consultores.

### Calendário
Agendamentos e follow-ups conectados diretamente ao contato e à conversa. Controle de pendências e histórico de compromissos.

### Contatos
Base de contatos sincronizada do WhatsApp. Permite importar CSV, gerenciar grupos, comunidades e contatos bloqueados. Cada contato tem histórico completo de conversas.

### Respostas Rápidas
Biblioteca de templates de resposta por fila. Atalho de teclado para acessar enquanto digita. Suporta texto, imagem, arquivo e geração automática via IA.

### Tags & Formulários
Sistema de etiquetagem e formulários customizados por fila. Use para capturar dados estruturados durante o atendimento (ex: tipo de veículo, data de retirada, número de diárias).

### Broadcast / Disparo
Envio em massa com cadência controlada. Pipeline visual (editor de fluxo) com configuração de janela de envio, delay entre mensagens e tipo de envio. Suporte a agendamento via cron.

### Copiloto IA
Assistente de texto integrado ao chat, baseado em Mistral AI. Sugere respostas, corrige gramática, gera mensagens e pode atuar como agente autônomo por canal ou fila.

### Cargos & Usuários
Controle de acesso granular com 13 módulos e 38 permissões. Crie cargos customizados (ex: "Atendente", "Supervisor", "Gerente") e atribua permissões específicas para cada um.

### Conexões
Gestão dos números de WhatsApp conectados. Cada conexão (canal) é uma instância UAZAPI. Suporta QR code ou código de pareamento. Sync de histórico e contatos do aparelho.

### Super Admin
Painel para o administrador da plataforma gerenciar empresas-clientes, planos, billing e ativar/desativar módulos por empresa.

---

## Modelo multi-tenant

Cada empresa tem seu próprio espaço isolado, acessado por um `slug` único:

```
https://controlzap-1.onrender.com/als-rent-cars/conversas
https://controlzap-1.onrender.com/outra-empresa/conversas
```

Os dados de cada empresa são completamente isolados (RLS no banco de dados). Uma empresa não enxerga dados de outra.

---

## Para quem é indicado

- Locadoras de veículos
- Imobiliárias e corretores
- Concessionárias
- E-commerce com suporte ativo
- Clínicas e prestadores de serviço
- Qualquer empresa que venda ou atenda pelo WhatsApp com mais de 2 pessoas na equipe

---

## Stack técnica

| Componente | Tecnologia |
|------------|------------|
| Frontend e backend | Next.js 14 (App Router) + TypeScript |
| Banco de dados | Supabase PostgreSQL com RLS |
| Autenticação | Supabase Auth |
| Tempo real | Supabase Realtime |
| Gateway WhatsApp | UAZAPI |
| IA | Mistral AI |
| Agendamento | pg_cron + Supabase Edge Functions |
| Deploy | Render (app) + Supabase (banco e funções) |

---

## Documentação técnica

- [README.md](../README.md) — setup, deploy e configuração
- [docs/deploy-render.md](deploy-render.md) — guia completo de deploy no Render
- [docs/inbox-local-dev.md](inbox-local-dev.md) — receber mensagens localmente (webhook)
