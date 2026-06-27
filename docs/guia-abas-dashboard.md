# Guia das Abas do ControlZap

Referência rápida de para que serve cada aba do painel. Acesso via menu superior após o login.

---

## Conversas

**O que é:** Inbox central de mensagens do WhatsApp. É onde o atendimento acontece.

**O que você faz aqui:**
- Ver todas as mensagens recebidas em tempo real
- Responder clientes (texto, áudio, imagem, arquivo)
- Atribuir a conversa a um colaborador ou fila
- Ver histórico completo de mensagens com o contato
- Adicionar notas internas (visíveis só para a equipe)
- Marcar como lida, arquivar ou encerrar

**Quem usa:** Atendentes, supervisores.

---

## Tickets

**O que é:** Visão kanban dos atendimentos em andamento.

**O que você faz aqui:**
- Ver todos os tickets organizados por status (ex: Novo, Em Atendimento, Encerrado)
- Arrastar tickets entre colunas para mudar o status
- Filtrar por fila, colaborador ou período
- Acompanhar o volume de trabalho da equipe
- Fazer atribuições em lote

**Quem usa:** Supervisores, gestores de atendimento.

> Os status das colunas são configurados por fila — podem ser customizados para o seu fluxo.

---

## Conexões

**O que é:** Gestão dos números de WhatsApp conectados ao sistema.

**O que você faz aqui:**
- Conectar um novo número de WhatsApp (via QR code ou código de pareamento)
- Ver o status de cada número (conectado, desconectado, reconectando)
- Sincronizar contatos e histórico de mensagens do aparelho
- Gerenciar grupos e comunidades do WhatsApp
- Configurar webhook por instância

**Quem usa:** Administradores.

> Um número conectado = uma instância. Você pode ter múltiplos números ativos ao mesmo tempo.

---

## Filas

**O que é:** Configuração das filas de atendimento — como as conversas são distribuídas entre a equipe.

**O que você faz aqui:**
- Criar filas (ex: "Suporte", "Vendas", "Reservas")
- Configurar horário de funcionamento de cada fila
- Definir o tipo: **padrão** (atribuição manual) ou **comercial** (round-robin automático)
- Vincular números de WhatsApp a filas
- Adicionar e remover colaboradores de cada fila
- Criar status customizados do kanban por fila
- Configurar formulários e respostas rápidas por fila

**Quem usa:** Administradores, supervisores.

---

## CRM

**O que é:** Visão comercial do pipeline de leads e performance da equipe de vendas.

**O que você faz aqui:**
- Ver métricas por consultor (leads ativos, taxa de conversão, última atividade)
- Acompanhar a distribuição de leads por status do pipeline
- Transferir leads de um consultor para outro
- Visualizar o kanban comercial com todos os contatos

**Quem usa:** Gestores de vendas, supervisores comerciais.

---

## Calendário

**O que é:** Agenda de compromissos vinculada aos contatos e conversas.

**O que você faz aqui:**
- Agendar retornos, reuniões e follow-ups com clientes
- Ver compromissos do dia e do mês
- Registrar o status do compromisso (pendente, confirmado, realizado, cancelado)
- Acessar o contato diretamente pelo agendamento

**Quem usa:** Atendentes, consultores de vendas.

---

## Contatos

**O que é:** Base de clientes e contatos do WhatsApp.

**O que você faz aqui:**
- Buscar e visualizar contatos sincronizados do WhatsApp
- Importar contatos em massa via CSV
- Gerenciar grupos e comunidades do WhatsApp
- Ver e desbloquear contatos bloqueados
- Adicionar ou remover contatos da agenda do aparelho
- Abrir a conversa diretamente pelo contato

**Quem usa:** Atendentes, administradores.

---

## Respostas Rápidas

**O que é:** Biblioteca de mensagens prontas para uso durante o atendimento.

**O que você faz aqui:**
- Criar templates de texto para situações recorrentes (saudação, preços, instruções)
- Adicionar imagens ou arquivos a templates
- Organizar por categorias
- Vincular templates a filas específicas

**Como usar no chat:** Digite `/` na caixa de mensagem para abrir o menu de respostas rápidas.

**Quem usa:** Administradores (criar), atendentes (usar no chat).

---

## Tags

**O que é:** Sistema de etiquetas e formulários para organizar e capturar dados dos atendimentos.

### Seção Tags
- Criar etiquetas com cores para categorizar conversas e contatos
- Ex: "Cliente VIP", "Aguardando documentação", "Indicação"

### Seção Formulários
- Criar formulários com campos customizados por fila
- Ex: para uma locadora: "Tipo de veículo", "Data de retirada", "Data de devolução"
- Os formulários aparecem no chat para preenchimento durante o atendimento

**Quem usa:** Administradores (criar), atendentes (preencher durante o atendimento).

---

## Broadcast

**O que é:** Ferramenta de disparo de mensagens em massa com cadência controlada.

**O que você faz aqui:**
- Criar pipelines de envio com editor visual (fluxo de arrastar e soltar)
- Configurar a janela de horário de envio (ex: só entre 9h e 18h)
- Definir o delay entre mensagens (ex: entre 20 e 45 segundos)
- Adicionar contatos à fila de envio
- Acompanhar status de envio (pendente, enviado, falhou)
- Agendar para envio futuro

**Quem usa:** Marketing, supervisores.

> Acessado em **Conversas → Broadcast** no menu lateral.

---

## Copiloto IA

**O que é:** Assistente de inteligência artificial integrado ao chat.

**O que você faz aqui (configuração):**
- Criar e configurar agentes de IA com instruções customizadas
- Vincular agentes a canais ou filas específicas
- Definir o modelo e o estilo de resposta

**Como usar no chat:**
- Sugestão de resposta com base na conversa
- Correção gramatical do texto antes de enviar
- Geração de mensagens a partir de um rascunho

**Quem usa:** Administradores (configurar), atendentes (usar no chat).

---

## Cargos e Usuários

**O que é:** Gestão de quem tem acesso ao sistema e o que cada um pode fazer.

### Aba Cargos
- Criar cargos customizados (ex: "Atendente", "Supervisor", "Gerente")
- Definir quais permissões cada cargo tem (38 permissões em 13 módulos)
- Atribuir usuários a cargos

### Aba Usuários
- Convidar novos colaboradores por e-mail
- Ativar ou desativar usuários
- Ver e alterar o cargo de cada usuário
- Atribuir usuários a filas

**Quem usa:** Administradores.

---

## Perfil

**O que é:** Configurações da conta do usuário e dados da empresa.

**O que você faz aqui:**
- Atualizar foto de perfil
- Ver e editar dados da empresa (razão social, CNPJ, endereço)

**Quem usa:** Todos os usuários (próprio perfil), administradores (dados da empresa).

---

## Resumo por perfil de acesso

| Aba | Atendente | Supervisor | Admin |
|-----|-----------|------------|-------|
| Conversas | ✅ | ✅ | ✅ |
| Tickets | ✅ | ✅ | ✅ |
| Calendário | ✅ | ✅ | ✅ |
| Contatos | ✅ | ✅ | ✅ |
| CRM | — | ✅ | ✅ |
| Broadcast | — | ✅ | ✅ |
| Respostas Rápidas | leitura | ✅ | ✅ |
| Tags | leitura | ✅ | ✅ |
| Filas | — | leitura | ✅ |
| Conexões | — | — | ✅ |
| Copiloto IA | uso | — | ✅ |
| Cargos e Usuários | — | — | ✅ |

> As permissões exatas dependem do cargo configurado pelo administrador.
