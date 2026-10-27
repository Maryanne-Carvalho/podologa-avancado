-- =============================================================================
-- CONFIGURAÇÃO INICIAL CONTROLADA — cria a clínica e a primeira administradora
-- -----------------------------------------------------------------------------
-- Rode UMA vez no Supabase: painel → SQL Editor → cole este arquivo → Run.
--
-- ANTES de rodar:
--   1. Em Authentication → Users → "Add user", crie a conta da podóloga com o
--      e-mail dela e uma senha forte (ou "Send invitation"). Não use senha padrão.
--   2. Troque os valores entre ⟪ ⟫ logo abaixo.
--
-- Por que assim? A função de administradora não pode ser escolhida em nenhum
-- formulário do site. Ela só nasce aqui (com acesso ao painel do Supabase) ou
-- por convite de outra administradora (função create_admin_invite).
-- =============================================================================
do $$
declare
  -- ⟪ EDITE AQUI ⟫ -----------------------------------------------------------
  v_admin_email   text := 'podologa@suaclinica.com.br';
  v_slug          text := 'minha-clinica';            -- letras minúsculas, números e hífen
  v_clinic_name   text := 'Nome da Clínica';
  v_professional  text := 'Nome da Profissional';
  v_phone         text := null;                       -- só dígitos, com DDD. Ex.: '1130000000'
  v_whatsapp      text := null;                       -- 55 + DDD + número. Ex.: '5511900000000'
  v_timezone      text := 'America/Sao_Paulo';
  -- --------------------------------------------------------------------------
  v_user   uuid;
  v_clinic uuid;
  d int;
begin
  select id into v_user from auth.users where lower(email) = lower(v_admin_email);
  if v_user is null then
    raise exception 'Crie primeiro a conta % em Authentication → Users.', v_admin_email;
  end if;

  insert into public.clinics (slug, name, professional_name, phone, whatsapp, timezone)
  values (v_slug, v_clinic_name, v_professional, v_phone, v_whatsapp, v_timezone)
  returning id into v_clinic;

  insert into public.clinic_settings (clinic_id) values (v_clinic);
  insert into public.clinic_private_settings (clinic_id, notify_email) values (v_clinic, lower(v_admin_email));
  insert into public.clinic_members (clinic_id, user_id, role) values (v_clinic, v_user, 'owner');

  -- Horário inicial sugerido (a podóloga ajusta depois no painel):
  -- segunda a sexta 9h–18h com almoço 12h–13h; sábado 9h–13h.
  for d in 1..5 loop
    insert into public.availability_rules (clinic_id, weekday, start_time, end_time) values (v_clinic, d, '09:00', '18:00');
    insert into public.availability_breaks (clinic_id, weekday, start_time, end_time, label) values (v_clinic, d, '12:00', '13:00', 'Almoço');
  end loop;
  insert into public.availability_rules (clinic_id, weekday, start_time, end_time) values (v_clinic, 6, '09:00', '13:00');

  raise notice 'Clínica criada. ID da clínica (copie para sistema/js/config.js → clinicId): %', v_clinic;
end $$;
