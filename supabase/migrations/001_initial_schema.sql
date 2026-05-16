-- ============================================================
-- GestorZap - Schema Inicial
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
create table if not exists public.companies (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  cnpj                text,
  phone               text,
  website             text,
  segment             text,
  settings            jsonb default '{}'::jsonb,
  subscription_status text not null default 'trial' check (subscription_status in ('trial', 'active', 'cancelled')),
  trial_ends_at       timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists companies_subscription_status_idx on public.companies(subscription_status);

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  phone       text,
  role        text not null default 'vendedor' check (role in ('admin', 'supervisor', 'vendedor', 'leitor', 'custom')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists users_company_id_idx on public.users(company_id);
create index if not exists users_email_idx      on public.users(email);

-- ============================================================
-- SELLERS (vendedores independentes de auth)
-- ============================================================
create table if not exists public.sellers (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  status      text not null default 'active' check (status in ('active', 'inactive')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sellers_company_id_idx on public.sellers(company_id);

-- ============================================================
-- INSTANCES (instâncias WhatsApp via UAZAPI)
-- ============================================================
create table if not exists public.instances (
  id                   uuid primary key default uuid_generate_v4(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  seller_id            uuid references public.users(id) on delete set null,
  name                 text not null,
  phone                text,
  uazapi_instance_id   text unique,
  uazapi_instance_key  text,
  status               text not null default 'pending' check (status in ('pending', 'connecting', 'connected', 'disconnected')),
  admin_field_01       text,
  admin_field_02       text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists instances_company_id_idx        on public.instances(company_id);
create index if not exists instances_uazapi_instance_id_idx on public.instances(uazapi_instance_id);
create index if not exists instances_status_idx            on public.instances(status);

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists public.leads (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  instance_id   uuid references public.instances(id) on delete set null,
  seller_id     uuid references public.users(id) on delete set null,
  phone         text not null,
  name          text not null,
  status        text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted')),
  score         numeric not null default 0,
  first_contact timestamptz not null default now(),
  last_contact  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, phone)
);

create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists leads_phone_idx      on public.leads(phone);
create index if not exists leads_status_idx     on public.leads(status);
create index if not exists leads_seller_id_idx  on public.leads(seller_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists public.messages (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  lead_id      uuid references public.leads(id) on delete set null,
  instance_id  uuid references public.instances(id) on delete set null,
  seller_id    uuid references public.users(id) on delete set null,
  direction    text not null check (direction in ('inbound', 'outbound')),
  content      text not null,
  message_type text not null default 'text' check (message_type in ('text', 'media', 'document')),
  intent       text check (intent in ('greeting', 'appointment', 'question', 'complaint', 'other')),
  routed_to    text,
  read_at      timestamptz,
  sent_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists messages_company_id_idx on public.messages(company_id);
create index if not exists messages_lead_id_idx    on public.messages(lead_id);
create index if not exists messages_sent_at_idx    on public.messages(sent_at desc);
create index if not exists messages_intent_idx     on public.messages(intent);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table if not exists public.appointments (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  lead_id        uuid references public.leads(id) on delete set null,
  instance_id    uuid references public.instances(id) on delete set null,
  seller_id      uuid references public.users(id) on delete set null,
  detected_date  date,
  detected_time  time,
  location       text,
  status         text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  ai_confidence  numeric not null default 0 check (ai_confidence >= 0 and ai_confidence <= 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists appointments_company_id_idx   on public.appointments(company_id);
create index if not exists appointments_detected_date_idx on public.appointments(detected_date);
create index if not exists appointments_status_idx       on public.appointments(status);

-- ============================================================
-- ROLES
-- ============================================================
create table if not exists public.roles (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);

create index if not exists roles_company_id_idx on public.roles(company_id);

-- Roles do sistema (globais)
insert into public.roles (name, description, is_system) values
  ('Admin',      'Acesso total ao sistema',                    true),
  ('Supervisor', 'Supervisiona vendedores e relatórios',       true),
  ('Vendedor',   'Gerencia conversas e leads atribuídos',      true),
  ('Leitor',     'Acesso somente leitura ao dashboard',        true)
on conflict do nothing;

-- ============================================================
-- PERMISSIONS
-- ============================================================
create table if not exists public.permissions (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.permissions (key, description) values
  ('instances.read',       'Visualizar instâncias WhatsApp'),
  ('instances.manage',     'Criar e configurar instâncias'),
  ('instances.delete',     'Excluir instâncias'),
  ('vendors.manage',       'Gerenciar vendedores'),
  ('conversations.read',   'Visualizar conversas'),
  ('conversations.send',   'Enviar mensagens'),
  ('conversations.delete', 'Excluir conversas'),
  ('leads.read',           'Visualizar leads'),
  ('leads.manage',         'Gerenciar leads'),
  ('leads.delete',         'Excluir leads'),
  ('leads.export',         'Exportar leads'),
  ('billing.read',         'Visualizar informações de cobrança'),
  ('settings.manage',      'Gerenciar configurações da empresa')
on conflict do nothing;

-- ============================================================
-- ROLE_PERMISSIONS
-- ============================================================
create table if not exists public.role_permissions (
  id            uuid primary key default uuid_generate_v4(),
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (role_id, permission_id)
);

create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);

-- Admin tem todas as permissões
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Admin' and r.is_system = true
on conflict do nothing;

-- Supervisor: leitura geral + gerencia leads/vendors
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Supervisor' and r.is_system = true
  and p.key in ('instances.read','vendors.manage','conversations.read','conversations.send','leads.read','leads.manage','leads.export','billing.read')
on conflict do nothing;

-- Vendedor: conversas e leads próprios
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Vendedor' and r.is_system = true
  and p.key in ('conversations.read','conversations.send','leads.read','leads.manage')
on conflict do nothing;

-- Leitor: somente leitura
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r, public.permissions p
where r.name = 'Leitor' and r.is_system = true
  and p.key in ('conversations.read','leads.read')
on conflict do nothing;

-- ============================================================
-- USER_ROLES
-- ============================================================
create table if not exists public.user_roles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  role_id    uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_role_id_idx on public.user_roles(role_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table public.companies    enable row level security;
alter table public.users        enable row level security;
alter table public.sellers      enable row level security;
alter table public.instances    enable row level security;
alter table public.leads        enable row level security;
alter table public.messages     enable row level security;
alter table public.appointments enable row level security;
alter table public.roles        enable row level security;
alter table public.permissions  enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles   enable row level security;

-- Função helper: retorna company_id do usuário autenticado
create or replace function public.my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from public.users where id = auth.uid()
$$;

-- Políticas: usuários veem apenas dados da própria empresa
create policy "users_own_company" on public.users
  for all using (company_id = public.my_company_id());

create policy "companies_own" on public.companies
  for all using (id = public.my_company_id());

create policy "sellers_own_company" on public.sellers
  for all using (company_id = public.my_company_id());

create policy "instances_own_company" on public.instances
  for all using (company_id = public.my_company_id());

create policy "leads_own_company" on public.leads
  for all using (company_id = public.my_company_id());

create policy "messages_own_company" on public.messages
  for all using (company_id = public.my_company_id());

create policy "appointments_own_company" on public.appointments
  for all using (company_id = public.my_company_id());

create policy "roles_visible" on public.roles
  for select using (is_system = true or company_id = public.my_company_id());

create policy "roles_manage" on public.roles
  for all using (company_id = public.my_company_id() and is_system = false);

create policy "permissions_read" on public.permissions
  for select using (true);

create policy "role_permissions_read" on public.role_permissions
  for select using (true);

create policy "user_roles_own_company" on public.user_roles
  for all using (
    exists (select 1 from public.users u where u.id = user_id and u.company_id = public.my_company_id())
  );

-- Service role bypassa RLS (necessário para webhooks e Edge Functions)
create policy "service_role_bypass_users"        on public.users        for all to service_role using (true) with check (true);
create policy "service_role_bypass_companies"    on public.companies    for all to service_role using (true) with check (true);
create policy "service_role_bypass_sellers"      on public.sellers      for all to service_role using (true) with check (true);
create policy "service_role_bypass_instances"    on public.instances    for all to service_role using (true) with check (true);
create policy "service_role_bypass_leads"        on public.leads        for all to service_role using (true) with check (true);
create policy "service_role_bypass_messages"     on public.messages     for all to service_role using (true) with check (true);
create policy "service_role_bypass_appointments" on public.appointments for all to service_role using (true) with check (true);
create policy "service_role_bypass_roles"        on public.roles        for all to service_role using (true) with check (true);
create policy "service_role_bypass_user_roles"   on public.user_roles   for all to service_role using (true) with check (true);
