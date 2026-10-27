-- =============================================================================
-- WE LÚMEN · MODELO AVANÇADO · MIGRAÇÃO 002 — SEGURANÇA (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------
-- RLS = "segurança por linha". O banco confere, a cada consulta, se a pessoa
-- conectada pode ver ou mudar aquela linha. Não importa o que o site mostre ou
-- esconda: sem permissão aqui, os dados simplesmente não são entregues.
--
-- Papéis do Supabase:
--   anon          → visitante sem login (site público)
--   authenticated → qualquer pessoa logada (cliente ou podóloga)
--   service_role  → chave secreta do servidor. NUNCA vai para o navegador.
--
-- Resumo das regras:
--   • Visitante: lê dados públicos da clínica, serviços ativos e horários.
--   • Cliente: lê apenas o próprio cadastro, os próprios agendamentos e pedidos.
--   • Administradora: lê e configura apenas a(s) clínica(s) onde está em
--     clinic_members.
--   • Ninguém grava agendamentos diretamente na tabela: só pelas funções da
--     migração 003, que validam horário, permissões e regras da clínica.
--   • Ninguém consegue se promover a administradora pela API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funções auxiliares usadas pelas regras
-- ---------------------------------------------------------------------------

-- A pessoa conectada é administradora desta clínica?
create or replace function app.is_clinic_admin(p_clinic uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clinic_members m
    where m.clinic_id = p_clinic and m.user_id = auth.uid()
  );
$$;

-- Este cadastro de paciente pertence à pessoa conectada?
create or replace function app.is_own_patient(p_patient uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.patients p
    where p.id = p_patient and p.user_id = auth.uid() and auth.uid() is not null
  );
$$;

revoke all on function app.is_clinic_admin(uuid) from public;
revoke all on function app.is_own_patient(uuid) from public;
grant usage on schema app to anon, authenticated;
grant execute on function app.is_clinic_admin(uuid) to anon, authenticated;
grant execute on function app.is_own_patient(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ponto de partida: nenhuma permissão. Depois liberamos só o necessário.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.clinics                 enable row level security;
alter table public.clinic_settings         enable row level security;
alter table public.clinic_private_settings enable row level security;
alter table public.clinic_members          enable row level security;
alter table public.clinic_invites          enable row level security;
alter table public.services                enable row level security;
alter table public.patients                enable row level security;
alter table public.patient_notes           enable row level security;
alter table public.availability_rules      enable row level security;
alter table public.availability_breaks     enable row level security;
alter table public.schedule_exceptions     enable row level security;
alter table public.appointments            enable row level security;
alter table public.appointment_notes       enable row level security;
alter table public.appointment_requests    enable row level security;
alter table public.audit_log               enable row level security;

-- Observação: as funções "security definer" da migração 003 pertencem ao dono
-- das tabelas (postgres) e por isso conseguem, por exemplo, verificar conflitos
-- com agendamentos de outras pessoas sem revelar esses dados a quem chamou.
-- Os papéis da API (anon e authenticated) não são donos e sempre passam pelas regras.

-- ---------------------------------------------------------------------------
-- CLÍNICAS
-- ---------------------------------------------------------------------------
grant select on public.clinics to anon, authenticated;
grant update (name, professional_name, phone, whatsapp, email, address_line1, address_line2, timezone, is_published)
  on public.clinics to authenticated;

drop policy if exists clinics_select on public.clinics;
create policy clinics_select on public.clinics for select
  using (is_published or app.is_clinic_admin(id));

drop policy if exists clinics_update on public.clinics;
create policy clinics_update on public.clinics for update to authenticated
  using (app.is_clinic_admin(id)) with check (app.is_clinic_admin(id));

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÕES PÚBLICAS (regras de agendamento e cores)
-- ---------------------------------------------------------------------------
grant select on public.clinic_settings to anon, authenticated;
grant update (slot_step_minutes, buffer_minutes, booking_min_notice_hours, booking_horizon_days,
              max_active_bookings_per_client, online_booking_mode, cancel_min_hours, reschedule_min_hours,
              client_cancel_mode, client_reschedule_mode, policy_text, branding)
  on public.clinic_settings to authenticated;

drop policy if exists clinic_settings_select on public.clinic_settings;
create policy clinic_settings_select on public.clinic_settings for select
  using (exists (select 1 from public.clinics c where c.id = clinic_id and (c.is_published or app.is_clinic_admin(c.id))));

drop policy if exists clinic_settings_update on public.clinic_settings;
create policy clinic_settings_update on public.clinic_settings for update to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÕES INTERNAS (notificações) — só administradoras
-- ---------------------------------------------------------------------------
grant select, update on public.clinic_private_settings to authenticated;

drop policy if exists clinic_private_settings_all on public.clinic_private_settings;
create policy clinic_private_settings_all on public.clinic_private_settings for all to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- ADMINISTRADORAS — leitura apenas. Inserir/alterar só pelo script de
-- configuração inicial (painel do Supabase) ou pela função accept_invite.
-- ---------------------------------------------------------------------------
grant select on public.clinic_members to authenticated;

drop policy if exists clinic_members_select on public.clinic_members;
create policy clinic_members_select on public.clinic_members for select to authenticated
  using (user_id = auth.uid() or app.is_clinic_admin(clinic_id));
-- (sem políticas de insert/update/delete → impossível pela API)

grant select, delete on public.clinic_invites to authenticated;
drop policy if exists clinic_invites_admin on public.clinic_invites;
create policy clinic_invites_admin on public.clinic_invites for select to authenticated
  using (app.is_clinic_admin(clinic_id));
drop policy if exists clinic_invites_delete on public.clinic_invites;
create policy clinic_invites_delete on public.clinic_invites for delete to authenticated
  using (app.is_clinic_admin(clinic_id) and accepted_at is null);

-- ---------------------------------------------------------------------------
-- SERVIÇOS — público vê os ativos; administradora gerencia
-- ---------------------------------------------------------------------------
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

drop policy if exists services_select on public.services;
create policy services_select on public.services for select
  using (
    (is_active and exists (select 1 from public.clinics c where c.id = clinic_id and c.is_published))
    or app.is_clinic_admin(clinic_id)
  );
drop policy if exists services_write on public.services;
create policy services_write on public.services for insert to authenticated
  with check (app.is_clinic_admin(clinic_id));
drop policy if exists services_update on public.services;
create policy services_update on public.services for update to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));
drop policy if exists services_delete on public.services;
create policy services_delete on public.services for delete to authenticated
  using (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- HORÁRIOS E PAUSAS — públicos para leitura (mostrar "horário de atendimento")
-- ---------------------------------------------------------------------------
grant select on public.availability_rules, public.availability_breaks to anon, authenticated;
grant insert, update, delete on public.availability_rules, public.availability_breaks to authenticated;

drop policy if exists rules_select on public.availability_rules;
create policy rules_select on public.availability_rules for select using (true);
drop policy if exists rules_insert on public.availability_rules;
create policy rules_insert on public.availability_rules for insert to authenticated with check (app.is_clinic_admin(clinic_id));
drop policy if exists rules_update on public.availability_rules;
create policy rules_update on public.availability_rules for update to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));
drop policy if exists rules_delete on public.availability_rules;
create policy rules_delete on public.availability_rules for delete to authenticated using (app.is_clinic_admin(clinic_id));

drop policy if exists breaks_select on public.availability_breaks;
create policy breaks_select on public.availability_breaks for select using (true);
drop policy if exists breaks_insert on public.availability_breaks;
create policy breaks_insert on public.availability_breaks for insert to authenticated with check (app.is_clinic_admin(clinic_id));
drop policy if exists breaks_update on public.availability_breaks;
create policy breaks_update on public.availability_breaks for update to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));
drop policy if exists breaks_delete on public.availability_breaks;
create policy breaks_delete on public.availability_breaks for delete to authenticated using (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- BLOQUEIOS E FÉRIAS — só a administradora vê o motivo.
-- (O site público recebe apenas os horários livres, pela função get_available_slots.)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.schedule_exceptions to authenticated;

drop policy if exists exceptions_all on public.schedule_exceptions;
create policy exceptions_all on public.schedule_exceptions for all to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- PACIENTES
--   • Administradora: cadastra, consulta e edita os pacientes da sua clínica.
--   • Cliente: só consegue LER o próprio cadastro. Alterações do cliente
--     passam pela função update_my_patient (evita trocar clinic_id ou user_id).
-- ---------------------------------------------------------------------------
grant select on public.patients to authenticated;
grant insert (clinic_id, full_name, phone, email, created_via) on public.patients to authenticated;
grant update (full_name, phone, email) on public.patients to authenticated;

drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients for select to authenticated
  using (app.is_clinic_admin(clinic_id) or (user_id is not null and user_id = auth.uid()));
drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients for insert to authenticated
  with check (app.is_clinic_admin(clinic_id) and created_via = 'admin');
drop policy if exists patients_update on public.patients;
create policy patients_update on public.patients for update to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));
-- (sem delete: para atender pedidos de exclusão use anonymize_patient, que preserva o histórico obrigatório)

grant select, insert, delete on public.patient_notes to authenticated;
drop policy if exists patient_notes_all on public.patient_notes;
create policy patient_notes_all on public.patient_notes for all to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));

-- ---------------------------------------------------------------------------
-- AGENDAMENTOS — leitura protegida; gravação SOMENTE pelas funções
-- ---------------------------------------------------------------------------
grant select on public.appointments to authenticated;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated
  using (app.is_clinic_admin(clinic_id) or app.is_own_patient(patient_id));
-- (sem políticas de insert/update/delete → ninguém grava direto pela API)

grant select, insert, update, delete on public.appointment_notes to authenticated;
drop policy if exists appointment_notes_all on public.appointment_notes;
create policy appointment_notes_all on public.appointment_notes for all to authenticated
  using (app.is_clinic_admin(clinic_id)) with check (app.is_clinic_admin(clinic_id));

grant select on public.appointment_requests to authenticated;
drop policy if exists requests_select on public.appointment_requests;
create policy requests_select on public.appointment_requests for select to authenticated
  using (
    app.is_clinic_admin(clinic_id)
    or exists (select 1 from public.appointments a where a.id = appointment_id and app.is_own_patient(a.patient_id))
  );

-- ---------------------------------------------------------------------------
-- REGISTRO DE AÇÕES — só leitura, só administradoras
-- ---------------------------------------------------------------------------
grant select on public.audit_log to authenticated;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (app.is_clinic_admin(clinic_id));
