-- =============================================================================
-- WE LÚMEN · MODELO AVANÇADO · MIGRAÇÃO 003 — FUNÇÕES DO SERVIDOR
-- -----------------------------------------------------------------------------
-- Toda gravação de agendamento passa por aqui. Cada função:
--   1. confere quem está conectado (auth.uid());
--   2. confere a permissão (administradora da clínica ou dona do cadastro);
--   3. recalcula a disponibilidade NO SERVIDOR (o que o navegador mostrou é só
--      uma consulta);
--   4. grava. Se dois pedidos chegarem juntos, um espera o outro (trava por
--      clínica) e, por garantia final, a restrição "sem_sobreposicao" recusa
--      qualquer sobreposição.
--
-- Os erros usam códigos curtos (ex.: SLOT_UNAVAILABLE). O site traduz cada
-- código para uma mensagem clara, sem expor dados de outras pessoas.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Registro de ações (sem dados pessoais)
-- ---------------------------------------------------------------------------
create or replace function app.log(p_clinic uuid, p_action text, p_entity text, p_entity_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (clinic_id, actor_id, action, entity, entity_id)
  values (p_clinic, auth.uid(), p_action, p_entity, p_entity_id);
$$;

create or replace function app.fail(p_code text)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_code using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------------
-- ★ CÁLCULO DOS HORÁRIOS LIVRES (fonte da verdade)
-- Considera: dias e horários de atendimento, duração do serviço, intervalo de
-- grade, pausas, bloqueios/feriados/férias, agendamentos existentes + intervalo
-- entre consultas, antecedência mínima e limite de dias à frente.
-- Tudo calculado no fuso horário da clínica.
-- ---------------------------------------------------------------------------
create or replace function app.compute_slots(
  p_clinic uuid, p_service uuid, p_from date, p_to date,
  p_ignore_appointment uuid, p_enforce_window boolean
) returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with c as (
    select cl.id as clinic_id, cl.timezone, st.slot_step_minutes, st.buffer_minutes,
           st.booking_min_notice_hours, st.booking_horizon_days, sv.duration_minutes
    from public.clinics cl
    join public.clinic_settings st on st.clinic_id = cl.id
    join public.services sv on sv.id = p_service and sv.clinic_id = cl.id and sv.is_active
    where cl.id = p_clinic
  ),
  days as (
    select d::date as day
    from generate_series(p_from::timestamp, least(p_to, p_from + 62)::timestamp, interval '1 day') d
  ),
  cand as (
    select c.*, days.day, gs.local_ts,
           (gs.local_ts at time zone c.timezone) as s,
           ((gs.local_ts + make_interval(mins => c.duration_minutes)) at time zone c.timezone) as e
    from c
    cross join days
    join public.availability_rules r
      on r.clinic_id = c.clinic_id and r.weekday = extract(dow from days.day)::int
    cross join lateral generate_series(
      days.day + r.start_time,
      days.day + r.end_time - make_interval(mins => c.duration_minutes),
      make_interval(mins => c.slot_step_minutes)
    ) as gs(local_ts)
  )
  select distinct cand.s, cand.e
  from cand
  where
    -- antecedência mínima e limite de dias (clientes); a clínica só não marca no passado
    (case when p_enforce_window
          then cand.s >= now() + make_interval(hours => cand.booking_min_notice_hours)
               and cand.s <= now() + make_interval(days => cand.booking_horizon_days)
          else cand.s >= now() - interval '30 minutes' end)
    -- pausas (ex.: almoço)
    and not exists (
      select 1 from public.availability_breaks b
      where b.clinic_id = cand.clinic_id
        and b.weekday = extract(dow from cand.day)::int
        and cand.local_ts::time < b.end_time
        and (cand.local_ts + make_interval(mins => cand.duration_minutes))::time > b.start_time
    )
    -- bloqueios, feriados e férias
    and not exists (
      select 1 from public.schedule_exceptions x
      where x.clinic_id = cand.clinic_id
        and tstzrange(x.starts_at, x.ends_at, '[)') && tstzrange(cand.s, cand.e, '[)')
    )
    -- agendamentos ativos (+ intervalo entre consultas)
    and not exists (
      select 1 from public.appointments a
      where a.clinic_id = cand.clinic_id
        and a.status in ('pending', 'confirmed')
        and (p_ignore_appointment is null or a.id <> p_ignore_appointment)
        and tstzrange(a.starts_at, a.occupied_until, '[)')
            && tstzrange(cand.s, cand.e + make_interval(mins => cand.buffer_minutes), '[)')
    )
  order by 1;
$$;

-- Um horário específico está livre? (mesma regra acima, para validar antes de gravar)
create or replace function app.slot_is_free(
  p_clinic uuid, p_service uuid, p_starts_at timestamptz,
  p_ignore_appointment uuid, p_enforce_window boolean
) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_day date;
begin
  select (p_starts_at at time zone cl.timezone)::date into v_day from public.clinics cl where cl.id = p_clinic;
  if v_day is null then return false; end if;
  return exists (
    select 1 from app.compute_slots(p_clinic, p_service, v_day, v_day, p_ignore_appointment, p_enforce_window) s
    where s.starts_at = p_starts_at
  );
end $$;

-- ---------------------------------------------------------------------------
-- CONSULTA PÚBLICA DE HORÁRIOS LIVRES
-- Devolve apenas início e fim dos horários livres. Nada sobre outras pessoas.
-- p_ignore_appointment: usado ao reagendar (o próprio horário não conta como ocupado).
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_clinic uuid, p_service uuid, p_from date, p_to date, p_ignore_appointment uuid default null
) returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_admin boolean := app.is_clinic_admin(p_clinic);
  v_ignore uuid := null;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    perform app.fail('INVALID_RANGE');
  end if;
  if not exists (select 1 from public.clinics c where c.id = p_clinic and (c.is_published or v_admin)) then
    perform app.fail('CLINIC_NOT_FOUND');
  end if;
  if p_ignore_appointment is not null then
    if v_admin or exists (
      select 1 from public.appointments a where a.id = p_ignore_appointment and a.clinic_id = p_clinic
        and app.is_own_patient(a.patient_id)
    ) then v_ignore := p_ignore_appointment; end if;
  end if;
  return query select s.starts_at, s.ends_at
               from app.compute_slots(p_clinic, p_service, p_from, p_to, v_ignore, not v_admin) s;
end $$;

-- ---------------------------------------------------------------------------
-- QUEM SOU EU NESTA CLÍNICA? (ajuda o site a escolher a tela certa;
-- a segurança de verdade continua nas regras RLS e nas funções)
-- ---------------------------------------------------------------------------
create or replace function public.my_access(p_clinic uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'role', case
              when auth.uid() is null then 'anonymous'
              when exists (select 1 from public.clinic_members m where m.clinic_id = p_clinic and m.user_id = auth.uid()) then 'admin'
              when exists (select 1 from public.patients p where p.clinic_id = p_clinic and p.user_id = auth.uid() and p.archived_at is null) then 'client'
              else 'none' end,
    'patient_id', (select p.id from public.patients p where p.clinic_id = p_clinic and p.user_id = auth.uid() and p.archived_at is null)
  );
$$;

-- ---------------------------------------------------------------------------
-- CADASTRO DO CLIENTE (depois de criar a conta no Supabase Auth)
-- Só nome, telefone e o aceite da política de privacidade. O e-mail vem da conta.
-- ---------------------------------------------------------------------------
create or replace function public.register_my_patient(
  p_clinic uuid, p_full_name text, p_phone text, p_accept_privacy boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_id uuid;
begin
  if v_uid is null then perform app.fail('AUTH_REQUIRED'); end if;
  if coalesce(p_accept_privacy, false) is not true then perform app.fail('CONSENT_REQUIRED'); end if;
  if not exists (select 1 from public.clinics c where c.id = p_clinic and c.is_published) then
    perform app.fail('CLINIC_NOT_FOUND');
  end if;
  if exists (select 1 from public.clinic_members m where m.clinic_id = p_clinic and m.user_id = v_uid) then
    perform app.fail('ADMIN_CANNOT_BE_PATIENT');
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;

  begin
    insert into public.patients (clinic_id, user_id, full_name, phone, email, consent_at, created_via)
    values (p_clinic, v_uid, p_full_name, p_phone, v_email, now(), 'self')
    on conflict (clinic_id, user_id) do update
      set full_name = excluded.full_name, phone = excluded.phone, email = excluded.email,
          consent_at = coalesce(public.patients.consent_at, now())
    returning id into v_id;
  exception when check_violation or not_null_violation then
    perform app.fail('INVALID_DATA');
  end;
  perform app.log(p_clinic, 'patient.self_register', 'patient', v_id);
  return v_id;
end $$;

create or replace function public.update_my_patient(p_clinic uuid, p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then perform app.fail('AUTH_REQUIRED'); end if;
  begin
    update public.patients set full_name = p_full_name, phone = p_phone
    where clinic_id = p_clinic and user_id = auth.uid() and archived_at is null
    returning id into v_id;
  exception when check_violation or not_null_violation then
    perform app.fail('INVALID_DATA');
  end;
  if v_id is null then perform app.fail('NOT_FOUND'); end if;
end $$;

-- Direito de acesso (LGPD): o cliente baixa os próprios dados desta clínica
create or replace function public.export_my_data(p_clinic uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'cadastro', (select to_jsonb(p) - 'user_id' from public.patients p where p.clinic_id = p_clinic and p.user_id = auth.uid()),
    'agendamentos', coalesce((
      select jsonb_agg(jsonb_build_object('servico', a.service_name, 'inicio', a.starts_at, 'fim', a.ends_at,
                                          'status', a.status, 'origem', a.source) order by a.starts_at)
      from public.appointments a join public.patients p on p.id = a.patient_id
      where a.clinic_id = p_clinic and p.user_id = auth.uid()), '[]'::jsonb)
  ) where auth.uid() is not null;
$$;

-- ---------------------------------------------------------------------------
-- ★ CRIAR AGENDAMENTO — mesma função para o cliente (on-line) e a clínica (manual)
-- ---------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_clinic uuid, p_service uuid, p_starts_at timestamptz, p_patient uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_admin   boolean;
  v_set     public.clinic_settings%rowtype;
  v_svc     public.services%rowtype;
  v_patient uuid;
  v_status  public.appointment_status;
  v_active  int;
  v_id      uuid;
  v_ends    timestamptz;
begin
  if v_uid is null then perform app.fail('AUTH_REQUIRED'); end if;
  if p_starts_at is null then perform app.fail('INVALID_DATA'); end if;

  -- Uma reserva por vez em cada clínica: pedidos simultâneos fazem fila aqui.
  perform pg_advisory_xact_lock(hashtextextended('booking:' || p_clinic::text, 0));

  v_admin := app.is_clinic_admin(p_clinic);

  select * into v_set from public.clinic_settings where clinic_id = p_clinic;
  if not found then perform app.fail('CLINIC_NOT_FOUND'); end if;

  select * into v_svc from public.services where id = p_service and clinic_id = p_clinic and is_active;
  if not found then perform app.fail('SERVICE_NOT_FOUND'); end if;

  if v_admin then
    if p_patient is null then perform app.fail('PATIENT_REQUIRED'); end if;
    if not exists (select 1 from public.patients where id = p_patient and clinic_id = p_clinic and archived_at is null) then
      perform app.fail('PATIENT_NOT_FOUND');
    end if;
    v_patient := p_patient;
    v_status := 'confirmed';
  else
    select id into v_patient from public.patients
      where clinic_id = p_clinic and user_id = v_uid and archived_at is null;
    if v_patient is null then perform app.fail('PATIENT_PROFILE_REQUIRED'); end if;
    if p_patient is not null and p_patient <> v_patient then perform app.fail('FORBIDDEN'); end if;
    select count(*) into v_active from public.appointments
      where patient_id = v_patient and status in ('pending', 'confirmed') and starts_at > now();
    if v_active >= v_set.max_active_bookings_per_client then perform app.fail('TOO_MANY_ACTIVE_BOOKINGS'); end if;
    v_status := case when v_set.online_booking_mode = 'approval' then 'pending' else 'confirmed' end;
  end if;

  -- Revalidação no servidor (regra essencial)
  if not app.slot_is_free(p_clinic, p_service, p_starts_at, null, not v_admin) then
    perform app.fail('SLOT_UNAVAILABLE');
  end if;

  v_ends := p_starts_at + make_interval(mins => v_svc.duration_minutes);
  begin
    insert into public.appointments (
      clinic_id, patient_id, service_id, starts_at, ends_at, occupied_until, status, source,
      service_name, duration_minutes, price_cents, created_by
    ) values (
      p_clinic, v_patient, p_service, p_starts_at, v_ends,
      v_ends + make_interval(mins => v_set.buffer_minutes), v_status,
      case when v_admin then 'manual'::public.appointment_source else 'online'::public.appointment_source end,
      v_svc.name, v_svc.duration_minutes, v_svc.price_cents, v_uid
    ) returning id into v_id;
  exception when exclusion_violation then
    perform app.fail('SLOT_UNAVAILABLE');
  end;

  perform app.log(p_clinic, case when v_admin then 'appointment.create_manual' else 'appointment.create_online' end, 'appointment', v_id);
  return jsonb_build_object('id', v_id, 'status', v_status, 'starts_at', p_starts_at, 'ends_at', v_ends);
end $$;

-- ---------------------------------------------------------------------------
-- CLIENTE: CANCELAR (direto ou por pedido, conforme a regra da clínica)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_my_appointment(p_appointment uuid, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_a   public.appointments%rowtype;
  v_set public.clinic_settings%rowtype;
begin
  if auth.uid() is null then perform app.fail('AUTH_REQUIRED'); end if;
  select a.* into v_a from public.appointments a where a.id = p_appointment for update;
  -- Mesmo erro para "não existe" e "não é seu": não revela agendamentos de outras pessoas.
  if not found or not app.is_own_patient(v_a.patient_id) then perform app.fail('NOT_FOUND'); end if;
  select * into v_set from public.clinic_settings where clinic_id = v_a.clinic_id;

  if v_a.status not in ('pending', 'confirmed') then perform app.fail('INVALID_STATUS'); end if;
  if v_a.starts_at <= now() then perform app.fail('ALREADY_STARTED'); end if;
  if now() > v_a.starts_at - make_interval(hours => v_set.cancel_min_hours) then
    perform app.fail('CANCEL_DEADLINE_PASSED');
  end if;

  if v_a.status = 'pending' or v_set.client_cancel_mode = 'direct' then
    update public.appointments
      set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client', cancel_reason = left(p_reason, 300)
      where id = v_a.id;
    update public.appointment_requests set status = 'withdrawn', resolved_at = now()
      where appointment_id = v_a.id and status = 'pending';
    perform app.log(v_a.clinic_id, 'appointment.cancel_client', 'appointment', v_a.id);
    return 'cancelled';
  end if;

  begin
    insert into public.appointment_requests (clinic_id, appointment_id, type, reason, created_by)
    values (v_a.clinic_id, v_a.id, 'cancel', left(p_reason, 300), auth.uid());
  exception when unique_violation then perform app.fail('REQUEST_ALREADY_OPEN');
  end;
  perform app.log(v_a.clinic_id, 'request.cancel', 'appointment', v_a.id);
  return 'requested';
end $$;

-- ---------------------------------------------------------------------------
-- CLIENTE: REAGENDAR (direto ou por pedido, conforme a regra da clínica)
-- ---------------------------------------------------------------------------
create or replace function public.reschedule_my_appointment(p_appointment uuid, p_new_starts_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_a   public.appointments%rowtype;
  v_set public.clinic_settings%rowtype;
  v_dur int;
begin
  if auth.uid() is null then perform app.fail('AUTH_REQUIRED'); end if;
  select a.* into v_a from public.appointments a where a.id = p_appointment;
  if not found or not app.is_own_patient(v_a.patient_id) then perform app.fail('NOT_FOUND'); end if;

  perform pg_advisory_xact_lock(hashtextextended('booking:' || v_a.clinic_id::text, 0));
  select a.* into v_a from public.appointments a where a.id = p_appointment for update;
  select * into v_set from public.clinic_settings where clinic_id = v_a.clinic_id;

  if v_a.status not in ('pending', 'confirmed') then perform app.fail('INVALID_STATUS'); end if;
  if v_a.starts_at <= now() then perform app.fail('ALREADY_STARTED'); end if;
  if now() > v_a.starts_at - make_interval(hours => v_set.reschedule_min_hours) then
    perform app.fail('RESCHEDULE_DEADLINE_PASSED');
  end if;
  if p_new_starts_at is null or p_new_starts_at = v_a.starts_at then perform app.fail('INVALID_DATA'); end if;
  if not app.slot_is_free(v_a.clinic_id, v_a.service_id, p_new_starts_at, v_a.id, true) then
    perform app.fail('SLOT_UNAVAILABLE');
  end if;

  if v_set.client_reschedule_mode = 'direct' then
    select duration_minutes into v_dur from public.services where id = v_a.service_id;
    begin
      update public.appointments
        set starts_at = p_new_starts_at,
            ends_at = p_new_starts_at + make_interval(mins => v_dur),
            occupied_until = p_new_starts_at + make_interval(mins => v_dur + v_set.buffer_minutes),
            duration_minutes = v_dur
        where id = v_a.id;
    exception when exclusion_violation then perform app.fail('SLOT_UNAVAILABLE');
    end;
    perform app.log(v_a.clinic_id, 'appointment.reschedule_client', 'appointment', v_a.id);
    return 'rescheduled';
  end if;

  begin
    insert into public.appointment_requests (clinic_id, appointment_id, type, proposed_starts_at, created_by)
    values (v_a.clinic_id, v_a.id, 'reschedule', p_new_starts_at, auth.uid());
  exception when unique_violation then perform app.fail('REQUEST_ALREADY_OPEN');
  end;
  perform app.log(v_a.clinic_id, 'request.reschedule', 'appointment', v_a.id);
  return 'requested';
end $$;

create or replace function public.withdraw_my_request(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  update public.appointment_requests r set status = 'withdrawn', resolved_at = now()
  where r.id = p_request and r.status = 'pending'
    and exists (select 1 from public.appointments a where a.id = r.appointment_id and app.is_own_patient(a.patient_id))
  returning true into v_ok;
  if v_ok is null then perform app.fail('NOT_FOUND'); end if;
end $$;

-- ---------------------------------------------------------------------------
-- CLÍNICA: MUDAR STATUS (confirmar, concluir, falta, cancelar)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_status(
  p_appointment uuid, p_status public.appointment_status, p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_a public.appointments%rowtype;
begin
  select a.* into v_a from public.appointments a where a.id = p_appointment for update;
  if not found or not app.is_clinic_admin(v_a.clinic_id) then perform app.fail('NOT_FOUND'); end if;

  if not (
       (v_a.status = 'pending'   and p_status in ('confirmed', 'cancelled'))
    or (v_a.status = 'confirmed' and p_status in ('completed', 'no_show', 'cancelled'))
    or (v_a.status = 'completed' and p_status = 'no_show')
    or (v_a.status = 'no_show'   and p_status = 'completed')
  ) then perform app.fail('INVALID_TRANSITION'); end if;

  if p_status in ('completed', 'no_show') and v_a.starts_at > now() then perform app.fail('NOT_STARTED_YET'); end if;

  update public.appointments set
    status = p_status,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancelled_by = case when p_status = 'cancelled' then 'admin' else cancelled_by end,
    cancel_reason = case when p_status = 'cancelled' then left(p_reason, 300) else cancel_reason end
  where id = v_a.id;

  update public.appointment_requests set status = 'withdrawn', resolved_at = now(), resolved_by = auth.uid(),
         resolution_note = 'Agendamento alterado pela clínica'
  where appointment_id = v_a.id and status = 'pending' and p_status in ('cancelled', 'completed', 'no_show');

  perform app.log(v_a.clinic_id, 'appointment.status_' || p_status::text, 'appointment', v_a.id);
end $$;

-- CLÍNICA: REMARCAR
create or replace function public.admin_reschedule(p_appointment uuid, p_new_starts_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_a public.appointments%rowtype;
  v_set public.clinic_settings%rowtype;
  v_dur int;
begin
  select a.* into v_a from public.appointments a where a.id = p_appointment;
  if not found or not app.is_clinic_admin(v_a.clinic_id) then perform app.fail('NOT_FOUND'); end if;
  perform pg_advisory_xact_lock(hashtextextended('booking:' || v_a.clinic_id::text, 0));
  select a.* into v_a from public.appointments a where a.id = p_appointment for update;
  if v_a.status not in ('pending', 'confirmed') then perform app.fail('INVALID_STATUS'); end if;
  if not app.slot_is_free(v_a.clinic_id, v_a.service_id, p_new_starts_at, v_a.id, false) then
    perform app.fail('SLOT_UNAVAILABLE');
  end if;
  select * into v_set from public.clinic_settings where clinic_id = v_a.clinic_id;
  select duration_minutes into v_dur from public.services where id = v_a.service_id;
  begin
    update public.appointments set starts_at = p_new_starts_at,
      ends_at = p_new_starts_at + make_interval(mins => v_dur),
      occupied_until = p_new_starts_at + make_interval(mins => v_dur + v_set.buffer_minutes),
      duration_minutes = v_dur
    where id = v_a.id;
  exception when exclusion_violation then perform app.fail('SLOT_UNAVAILABLE');
  end;
  update public.appointment_requests set status = 'withdrawn', resolved_at = now(), resolved_by = auth.uid(),
         resolution_note = 'Remarcado pela clínica'
  where appointment_id = v_a.id and status = 'pending';
  perform app.log(v_a.clinic_id, 'appointment.reschedule_admin', 'appointment', v_a.id);
end $$;

-- CLÍNICA: RESPONDER PEDIDO DE CANCELAMENTO OU REAGENDAMENTO
create or replace function public.admin_resolve_request(p_request uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_r public.appointment_requests%rowtype;
  v_a public.appointments%rowtype;
  v_set public.clinic_settings%rowtype;
  v_dur int;
begin
  select r.* into v_r from public.appointment_requests r where r.id = p_request for update;
  if not found or not app.is_clinic_admin(v_r.clinic_id) then perform app.fail('NOT_FOUND'); end if;
  if v_r.status <> 'pending' then perform app.fail('INVALID_STATUS'); end if;

  if not p_approve then
    update public.appointment_requests set status = 'rejected', resolved_at = now(), resolved_by = auth.uid(),
           resolution_note = left(p_note, 300) where id = v_r.id;
    perform app.log(v_r.clinic_id, 'request.reject', 'appointment_request', v_r.id);
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('booking:' || v_r.clinic_id::text, 0));
  select a.* into v_a from public.appointments a where a.id = v_r.appointment_id for update;
  if v_a.status not in ('pending', 'confirmed') then perform app.fail('INVALID_STATUS'); end if;

  if v_r.type = 'cancel' then
    update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
           cancel_reason = v_r.reason where id = v_a.id;
  else
    if not app.slot_is_free(v_a.clinic_id, v_a.service_id, v_r.proposed_starts_at, v_a.id, false) then
      perform app.fail('SLOT_UNAVAILABLE');
    end if;
    select * into v_set from public.clinic_settings where clinic_id = v_a.clinic_id;
    select duration_minutes into v_dur from public.services where id = v_a.service_id;
    begin
      update public.appointments set starts_at = v_r.proposed_starts_at,
        ends_at = v_r.proposed_starts_at + make_interval(mins => v_dur),
        occupied_until = v_r.proposed_starts_at + make_interval(mins => v_dur + v_set.buffer_minutes),
        duration_minutes = v_dur
      where id = v_a.id;
    exception when exclusion_violation then perform app.fail('SLOT_UNAVAILABLE');
    end;
  end if;

  update public.appointment_requests set status = 'approved', resolved_at = now(), resolved_by = auth.uid(),
         resolution_note = left(p_note, 300) where id = v_r.id;
  perform app.log(v_r.clinic_id, 'request.approve_' || v_r.type::text, 'appointment_request', v_r.id);
end $$;

-- ---------------------------------------------------------------------------
-- LGPD: anonimizar um paciente (pedido de exclusão). Mantém o histórico de
-- atendimentos sem identificação, cancela horários futuros e apaga anotações.
-- Antes de usar, confirme com a assessoria jurídica os prazos de guarda.
-- ---------------------------------------------------------------------------
create or replace function public.anonymize_patient(p_patient uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_clinic uuid;
begin
  select clinic_id into v_clinic from public.patients where id = p_patient;
  if v_clinic is null or not app.is_clinic_admin(v_clinic) then perform app.fail('NOT_FOUND'); end if;
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin',
         cancel_reason = 'Cadastro removido a pedido do titular'
   where patient_id = p_patient and status in ('pending', 'confirmed') and starts_at > now();
  delete from public.patient_notes where patient_id = p_patient;
  update public.patients set full_name = 'Paciente removido', phone = null, email = null,
         user_id = null, archived_at = now() where id = p_patient;
  perform app.log(v_clinic, 'patient.anonymize', 'patient', p_patient);
end $$;

-- ---------------------------------------------------------------------------
-- CONVITES PARA ADMINISTRADORAS
-- O código só é mostrado uma vez; no banco fica apenas o "hash" (impressão digital).
-- ---------------------------------------------------------------------------
create or replace function public.create_admin_invite(p_clinic uuid, p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not app.is_clinic_admin(p_clinic) then perform app.fail('FORBIDDEN'); end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.clinic_invites (clinic_id, email, role, token_hash, expires_at, created_by)
  values (p_clinic, lower(btrim(p_email)), 'admin', encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
          now() + interval '7 days', auth.uid());
  perform app.log(p_clinic, 'invite.create', 'clinic', p_clinic);
  return v_token;
end $$;

create or replace function public.accept_admin_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.clinic_invites%rowtype;
  v_email text;
begin
  if auth.uid() is null then perform app.fail('AUTH_REQUIRED'); end if;
  select * into v_inv from public.clinic_invites
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
     and accepted_at is null and expires_at > now()
   for update;
  if not found then perform app.fail('INVITE_INVALID'); end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from v_inv.email then perform app.fail('INVITE_INVALID'); end if;
  insert into public.clinic_members (clinic_id, user_id, role) values (v_inv.clinic_id, auth.uid(), v_inv.role)
  on conflict do nothing;
  update public.clinic_invites set accepted_at = now() where id = v_inv.id;
  perform app.log(v_inv.clinic_id, 'invite.accept', 'clinic', v_inv.clinic_id);
  return v_inv.clinic_id;
end $$;

-- ---------------------------------------------------------------------------
-- PERMISSÕES DE EXECUÇÃO
-- O Supabase libera funções novas para todos por padrão; aqui fechamos tudo e
-- liberamos só o necessário.
-- ---------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on function app.compute_slots(uuid, uuid, date, date, uuid, boolean) from public, anon, authenticated;
revoke all on function app.slot_is_free(uuid, uuid, timestamptz, uuid, boolean) from public, anon, authenticated;
revoke all on function app.log(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function app.fail(text) from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, uuid, date, date, uuid) to anon, authenticated;
grant execute on function public.my_access(uuid) to anon, authenticated;
grant execute on function public.register_my_patient(uuid, text, text, boolean) to authenticated;
grant execute on function public.update_my_patient(uuid, text, text) to authenticated;
grant execute on function public.export_my_data(uuid) to authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_my_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_my_appointment(uuid, timestamptz) to authenticated;
grant execute on function public.withdraw_my_request(uuid) to authenticated;
grant execute on function public.admin_set_status(uuid, public.appointment_status, text) to authenticated;
grant execute on function public.admin_reschedule(uuid, timestamptz) to authenticated;
grant execute on function public.admin_resolve_request(uuid, boolean, text) to authenticated;
grant execute on function public.anonymize_patient(uuid) to authenticated;
grant execute on function public.create_admin_invite(uuid, text) to authenticated;
grant execute on function public.accept_admin_invite(text) to authenticated;
