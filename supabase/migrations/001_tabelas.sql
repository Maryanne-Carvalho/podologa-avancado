-- =============================================================================
-- WE LÚMEN · MODELO AVANÇADO · MIGRAÇÃO 001 — TABELAS
-- -----------------------------------------------------------------------------
-- Cria as tabelas do sistema de agendamento.
--
-- Ideias principais (em linguagem simples):
--  • Toda informação pertence a uma clínica (coluna clinic_id). Assim, várias
--    clínicas podem usar o mesmo banco sem enxergar os dados umas das outras.
--  • Quem é administradora fica em clinic_members. Essa tabela NÃO pode ser
--    preenchida pelo site: só pelo script de configuração inicial ou por convite.
--  • O banco recusa sozinho dois agendamentos no mesmo horário
--    (restrição "sem_sobreposicao"), mesmo que cheguem ao mesmo tempo.
--  • Senhas NÃO ficam aqui: o Supabase Auth cuida delas (tabela auth.users).
--
-- Ordem de execução: 001_tabelas.sql → 002_seguranca_rls.sql → 003_funcoes.sql
-- =============================================================================

-- Extensão necessária para a regra "sem sobreposição de horários".
-- No Supabase ela já existe e fica no esquema "extensions".
create extension if not exists btree_gist with schema extensions;

-- Esquema interno (não é exposto pela API do Supabase).
create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Tipos (estados possíveis)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;
-- pending   = aguardando confirmação
-- confirmed = confirmado
-- completed = concluído
-- cancelled = cancelado
-- no_show   = falta

do $$ begin
  create type public.appointment_source as enum ('online', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_type as enum ('cancel', 'reschedule');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('owner', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exception_kind as enum ('block', 'holiday', 'vacation', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Função utilitária: atualiza "updated_at" automaticamente
-- ---------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- CLÍNICAS
-- ---------------------------------------------------------------------------
create table if not exists public.clinics (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  name             text not null check (length(btrim(name)) between 2 and 120),
  professional_name text check (professional_name is null or length(btrim(professional_name)) <= 120),
  phone            text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  whatsapp         text check (whatsapp is null or whatsapp ~ '^[0-9]{12,13}$'),
  email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address_line1    text check (address_line1 is null or length(address_line1) <= 160),
  address_line2    text check (address_line2 is null or length(address_line2) <= 160),
  timezone         text not null default 'America/Sao_Paulo',
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- O fuso horário precisa existir na lista do PostgreSQL
create or replace function app.validate_clinic()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuso horário inválido: %', new.timezone using errcode = '22023';
  end if;
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.email := nullif(lower(btrim(new.email)), '');
  return new;
end $$;

drop trigger if exists clinics_validate on public.clinics;
create trigger clinics_validate before insert or update on public.clinics
  for each row execute function app.validate_clinic();
drop trigger if exists clinics_touch on public.clinics;
create trigger clinics_touch before update on public.clinics
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÕES DA CLÍNICA (podem ser lidas pelo site público)
-- ---------------------------------------------------------------------------
create table if not exists public.clinic_settings (
  clinic_id                 uuid primary key references public.clinics(id) on delete cascade,
  slot_step_minutes         int  not null default 30  check (slot_step_minutes between 5 and 120),
  buffer_minutes            int  not null default 10  check (buffer_minutes between 0 and 120),
  booking_min_notice_hours  int  not null default 2   check (booking_min_notice_hours between 0 and 720),
  booking_horizon_days      int  not null default 60  check (booking_horizon_days between 1 and 365),
  max_active_bookings_per_client int not null default 3 check (max_active_bookings_per_client between 1 and 20),
  online_booking_mode       text not null default 'auto'     check (online_booking_mode in ('auto', 'approval')),
  cancel_min_hours          int  not null default 24  check (cancel_min_hours between 0 and 720),
  reschedule_min_hours      int  not null default 24  check (reschedule_min_hours between 0 and 720),
  client_cancel_mode        text not null default 'direct'   check (client_cancel_mode in ('direct', 'approval')),
  client_reschedule_mode    text not null default 'approval' check (client_reschedule_mode in ('direct', 'approval')),
  policy_text               text check (policy_text is null or length(policy_text) <= 1000),
  -- Identidade visual da clínica: {"paletteId": "rosa-areia", "overrides": {"primary": "#9f5c63"}}
  branding                  jsonb not null default '{"paletteId": "rosa-areia", "overrides": {}}'::jsonb
                            check (jsonb_typeof(branding) = 'object' and pg_column_size(branding) < 2000),
  updated_at                timestamptz not null default now()
);

drop trigger if exists clinic_settings_touch on public.clinic_settings;
create trigger clinic_settings_touch before update on public.clinic_settings
  for each row execute function app.touch_updated_at();

-- Preferências internas (somente administradoras)
create table if not exists public.clinic_private_settings (
  clinic_id              uuid primary key references public.clinics(id) on delete cascade,
  notify_email           text check (notify_email is null or notify_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notify_on_new_booking  boolean not null default true,
  notify_on_cancellation boolean not null default true,
  notify_daily_summary   boolean not null default false,
  updated_at             timestamptz not null default now()
);

drop trigger if exists clinic_private_settings_touch on public.clinic_private_settings;
create trigger clinic_private_settings_touch before update on public.clinic_private_settings
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- ADMINISTRADORAS DA CLÍNICA (função validada no banco)
-- ---------------------------------------------------------------------------
create table if not exists public.clinic_members (
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.member_role not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index if not exists clinic_members_user_idx on public.clinic_members(user_id);

-- Convites para novas administradoras (o código é guardado só como "hash")
create table if not exists public.clinic_invites (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        public.member_role not null default 'admin',
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SERVIÇOS
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics(id) on delete cascade,
  name             text not null check (length(btrim(name)) between 2 and 80),
  description      text check (description is null or length(description) <= 600),
  duration_minutes int  not null check (duration_minutes between 10 and 480),
  price_cents      int  check (price_cents is null or price_cents between 0 and 100000000),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, clinic_id)
);
create index if not exists services_clinic_idx on public.services(clinic_id, sort_order);
drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- PACIENTES (dados mínimos: nome, telefone, e-mail)
-- ---------------------------------------------------------------------------
create table if not exists public.patients (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,  -- preenchido quando o próprio cliente tem conta
  full_name   text not null check (length(full_name) between 2 and 120),
  phone       text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent_at  timestamptz,                 -- quando aceitou a política de privacidade
  created_via text not null default 'admin' check (created_via in ('self', 'admin')),
  archived_at timestamptz,                 -- anonimizado / arquivado
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (clinic_id, user_id),
  unique (id, clinic_id)
);
create index if not exists patients_clinic_name_idx on public.patients(clinic_id, lower(full_name));

-- Normaliza os dados recebidos (espaços, telefone só com dígitos, e-mail minúsculo)
create or replace function app.normalize_patient()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.full_name := btrim(regexp_replace(coalesce(new.full_name, ''), '\s+', ' ', 'g'));
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  return new;
end $$;

drop trigger if exists patients_normalize on public.patients;
create trigger patients_normalize before insert or update on public.patients
  for each row execute function app.normalize_patient();
drop trigger if exists patients_touch on public.patients;
create trigger patients_touch before update on public.patients
  for each row execute function app.touch_updated_at();

-- Anotações ADMINISTRATIVAS (sem dados de saúde). Só administradoras leem.
create table if not exists public.patient_notes (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null,
  patient_id uuid not null,
  body       text not null check (length(btrim(body)) between 1 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete cascade
);
create index if not exists patient_notes_patient_idx on public.patient_notes(patient_id);

-- ---------------------------------------------------------------------------
-- HORÁRIOS DE ATENDIMENTO, PAUSAS E EXCEÇÕES
-- weekday: 0 = domingo, 1 = segunda ... 6 = sábado (horário local da clínica)
-- ---------------------------------------------------------------------------
create table if not exists public.availability_rules (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);
create index if not exists availability_rules_idx on public.availability_rules(clinic_id, weekday);

create table if not exists public.availability_breaks (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  label      text check (label is null or length(label) <= 60),
  check (end_time > start_time)
);
create index if not exists availability_breaks_idx on public.availability_breaks(clinic_id, weekday);

-- Bloqueios: um horário, um dia inteiro, feriado ou férias
create table if not exists public.schedule_exceptions (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  kind       public.exception_kind not null default 'block',
  all_day    boolean not null default false,
  reason     text check (reason is null or length(reason) <= 120),  -- uso interno, nunca exibido ao público
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '370 days')
);
create index if not exists schedule_exceptions_idx on public.schedule_exceptions(clinic_id, starts_at);

-- ---------------------------------------------------------------------------
-- AGENDAMENTOS
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null,
  patient_id          uuid not null,
  service_id          uuid not null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  occupied_until      timestamptz not null,   -- fim + intervalo entre consultas
  status              public.appointment_status not null default 'confirmed',
  source              public.appointment_source not null,
  -- "Fotografia" do serviço no momento da reserva (preço e duração podem mudar depois).
  -- O preço guardado prepara o sistema para pagamentos on-line no futuro.
  service_name        text not null,
  duration_minutes    int not null,
  price_cents         int,
  cancelled_at        timestamptz,
  cancelled_by        text check (cancelled_by is null or cancelled_by in ('client', 'admin')),
  cancel_reason       text check (cancel_reason is null or length(cancel_reason) <= 300),
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (patient_id, clinic_id) references public.patients(id, clinic_id),
  foreign key (service_id, clinic_id) references public.services(id, clinic_id),
  foreign key (clinic_id) references public.clinics(id) on delete cascade,
  check (ends_at > starts_at),
  check (occupied_until >= ends_at),
  -- ★ REGRA ESSENCIAL: dois agendamentos ativos da mesma clínica não podem se sobrepor.
  --   O próprio banco recusa a gravação, mesmo com pedidos simultâneos.
  constraint sem_sobreposicao exclude using gist (
    clinic_id with =,
    tstzrange(starts_at, occupied_until, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index if not exists appointments_clinic_time_idx on public.appointments(clinic_id, starts_at);
create index if not exists appointments_patient_idx on public.appointments(patient_id, starts_at);
drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function app.touch_updated_at();

-- Observação administrativa do agendamento (o cliente não vê)
create table if not exists public.appointment_notes (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  clinic_id      uuid not null references public.clinics(id) on delete cascade,
  body           text not null check (length(btrim(body)) between 1 and 500),
  updated_by     uuid references auth.users(id) on delete set null,
  updated_at     timestamptz not null default now()
);

-- Pedidos de cancelamento e reagendamento feitos pelo cliente
create table if not exists public.appointment_requests (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics(id) on delete cascade,
  appointment_id     uuid not null references public.appointments(id) on delete cascade,
  type               public.request_type not null,
  status             public.request_status not null default 'pending',
  proposed_starts_at timestamptz,
  reason             text check (reason is null or length(reason) <= 300),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references auth.users(id) on delete set null,
  resolution_note    text check (resolution_note is null or length(resolution_note) <= 300),
  check (type <> 'reschedule' or proposed_starts_at is not null)
);
-- No máximo um pedido em aberto por agendamento
create unique index if not exists appointment_requests_one_open
  on public.appointment_requests(appointment_id) where (status = 'pending');

-- ---------------------------------------------------------------------------
-- REGISTRO DE AÇÕES (sem nomes, telefones ou dados de saúde)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_clinic_idx on public.audit_log(clinic_id, created_at desc);
