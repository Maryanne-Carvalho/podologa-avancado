/* ==========================================================================
   PONTE DO SUPABASE (modo "supabase" — banco e login reais)
   --------------------------------------------------------------------------
   Mesmas funções da ponte de demonstração, mas cada chamada vai para o
   Supabase. Quem decide o que cada pessoa pode ver ou fazer é o BANCO
   (regras RLS + funções em supabase/migrations). Este arquivo só envia
   pedidos e traduz as respostas.

   ⚠ Usa apenas a chave pública "anon". A chave "service_role" nunca entra aqui.
   ⚠ Esta ponte foi escrita para o esquema testado em supabase/tests, mas a
     conexão com um projeto Supabase de verdade ainda precisa ser testada
     por você (veja docs/SUPABASE.md, passo "Teste final").
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var CFG = PS.sistema || {};
  var SB = CFG.supabase || {};
  var client = null;
  var CLINIC = SB.clinicId;

  function erro(code) { var e = new Error(code); e.code = code; return e; }

  /* Converte o erro do Supabase num código curto (ex.: SLOT_UNAVAILABLE) */
  function traduzir(e) {
    if (!e) return erro("UNKNOWN");
    var msg = String(e.message || e.error_description || e);
    var conhecido = msg.match(/^[A-Z][A-Z_]{3,}$/);
    if (conhecido) return erro(msg);
    if (/Invalid login credentials/i.test(msg)) return erro("INVALID_LOGIN");
    if (/Email not confirmed/i.test(msg)) return erro("EMAIL_NOT_CONFIRMED");
    if (/already registered|already been registered/i.test(msg)) return erro("EMAIL_IN_USE");
    if (/Password should be/i.test(msg)) return erro("WEAK_PASSWORD");
    if (/rate limit/i.test(msg)) return erro("RATE_LIMIT");
    if (/JWT|session/i.test(msg)) return erro("AUTH_REQUIRED");
    if (/row-level security|permission denied/i.test(msg)) return erro("FORBIDDEN");
    if (/violates check constraint/i.test(msg)) return erro("INVALID_DATA");
    if (/Failed to fetch|NetworkError/i.test(msg)) return erro("NETWORK");
    return erro("UNKNOWN");
  }
  function ok(res) { if (res.error) throw traduzir(res.error); return res.data; }
  function rpc(nome, args) { return client.rpc(nome, args).then(ok); }

  function base() {
    if (CFG.enderecoDoSite) return CFG.enderecoDoSite.replace(/\/$/, "") + "/";
    var p = location.pathname.replace(/(cliente|admin)\/[^/]*$/, "").replace(/[^/]*$/, "");
    return location.origin + p;
  }

  /* ---------- Conversões banco → telas ---------- */
  function svc(r) {
    return { id: r.id, name: r.name, description: r.description, durationMinutes: r.duration_minutes, priceCents: r.price_cents, isActive: r.is_active, sortOrder: r.sort_order };
  }
  function req(r) {
    return r ? { id: r.id, type: r.type, status: r.status, proposedStartsAt: r.proposed_starts_at, reason: r.reason, resolutionNote: r.resolution_note, createdAt: r.created_at } : null;
  }
  function ultimo(lista) {
    return (lista || []).slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })[0] || null;
  }
  function agendamento(r) {
    var out = {
      id: r.id, serviceId: r.service_id, serviceName: r.service_name, durationMinutes: r.duration_minutes, priceCents: r.price_cents,
      startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, source: r.source,
      cancelledAt: r.cancelled_at, cancelledBy: r.cancelled_by, cancelReason: r.cancel_reason,
      request: req(ultimo(r.appointment_requests))
    };
    if (r.patients) { out.patientId = r.patient_id; out.patientName = r.patients.full_name; out.patientPhone = r.patients.phone; }
    if (r.appointment_notes !== undefined) out.note = r.appointment_notes ? r.appointment_notes.body : "";
    return out;
  }
  function settings(s) {
    return {
      slotStepMinutes: s.slot_step_minutes, bufferMinutes: s.buffer_minutes, bookingMinNoticeHours: s.booking_min_notice_hours,
      bookingHorizonDays: s.booking_horizon_days, maxActiveBookingsPerClient: s.max_active_bookings_per_client,
      onlineBookingMode: s.online_booking_mode, cancelMinHours: s.cancel_min_hours, rescheduleMinHours: s.reschedule_min_hours,
      clientCancelMode: s.client_cancel_mode, clientRescheduleMode: s.client_reschedule_mode, policyText: s.policy_text,
      branding: s.branding || { paletteId: "rosa-areia", overrides: {} }
    };
  }
  function hm(t) { return String(t).slice(0, 5); }

  var sessaoCache = null;
  function sessao() {
    return client.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) { sessaoCache = null; return null; }
      return rpc("my_access", { p_clinic: CLINIC }).then(function (acc) {
        var meta = s.user.user_metadata || {};
        // Primeiro login de quem se cadastrou com confirmação de e-mail: cria o cadastro do paciente
        if (acc.role === "none" && meta.full_name && meta.consent === true) {
          return rpc("register_my_patient", { p_clinic: CLINIC, p_full_name: meta.full_name, p_phone: meta.phone || null, p_accept_privacy: true })
            .then(function () { return rpc("my_access", { p_clinic: CLINIC }); })
            .then(function (acc2) { return montar(s, acc2); });
        }
        return montar(s, acc);
      });
    });
  }
  function montar(s, acc) {
    sessaoCache = { userId: s.user.id, email: s.user.email, name: (s.user.user_metadata || {}).full_name || s.user.email, role: acc.role === "anonymous" ? "none" : acc.role, patientId: acc.patient_id };
    return sessaoCache;
  }

  function inicioDoDia(ymd) { return ymd; }

  var api = {
    modo: "supabase",
    pronto: null,
    armazenamentoDisponivel: true,

    sessao: sessao,

    entrar: function (email, senha, perfilEsperado) {
      return client.auth.signInWithPassword({ email: String(email || "").trim().toLowerCase(), password: senha }).then(ok).then(sessao).then(function (s) {
        if (perfilEsperado === "admin" && s.role !== "admin") { return client.auth.signOut().then(function () { throw erro("NOT_ADMIN"); }); }
        if (perfilEsperado === "client" && s.role === "admin") { return client.auth.signOut().then(function () { throw erro("USE_ADMIN_LOGIN"); }); }
        return s;
      });
    },

    sair: function () { sessaoCache = null; return client.auth.signOut(); },

    cadastrarCliente: function (d) {
      var nome = String(d.nome || "").replace(/\s+/g, " ").trim();
      var tel = String(d.telefone || "").replace(/\D/g, "");
      if (nome.length < 2) return Promise.reject(erro("INVALID_NAME"));
      if (!/^[0-9]{10,13}$/.test(tel)) return Promise.reject(erro("INVALID_PHONE"));
      if (!d.senha || d.senha.length < 8) return Promise.reject(erro("WEAK_PASSWORD"));
      if (!d.aceite) return Promise.reject(erro("CONSENT_REQUIRED"));
      return client.auth.signUp({
        email: String(d.email || "").trim().toLowerCase(), password: d.senha,
        options: { data: { full_name: nome, phone: tel, consent: true }, emailRedirectTo: base() + "cliente/entrar.html" }
      }).then(ok).then(function (data) {
        if (!data.session) return { sessao: null, precisaConfirmarEmail: true };
        return rpc("register_my_patient", { p_clinic: CLINIC, p_full_name: nome, p_phone: tel, p_accept_privacy: true })
          .then(sessao).then(function (s) { return { sessao: s, precisaConfirmarEmail: false }; });
      });
    },

    pedirNovaSenha: function (email) {
      return client.auth.resetPasswordForEmail(String(email || "").trim().toLowerCase(), { redirectTo: base() + "cliente/nova-senha.html" })
        .then(function (r) { if (r.error && !/not found/i.test(r.error.message)) throw traduzir(r.error); return { enviado: true, linkDeTeste: null }; });
    },

    definirNovaSenha: function (novaSenha) {
      if (!novaSenha || novaSenha.length < 8) return Promise.reject(erro("WEAK_PASSWORD"));
      return client.auth.updateUser({ password: novaSenha }).then(ok).then(function () { return true; });
    },

    clinica: function () {
      return Promise.all([
        client.from("clinics").select("*").eq("id", CLINIC).single().then(ok),
        client.from("clinic_settings").select("*").eq("clinic_id", CLINIC).single().then(ok)
      ]).then(function (r) {
        var c = r[0];
        return { id: c.id, name: c.name, professionalName: c.professional_name, phone: c.phone, whatsapp: c.whatsapp, email: c.email,
                 addressLine1: c.address_line1, addressLine2: c.address_line2, timezone: c.timezone, isPublished: c.is_published, settings: settings(r[1]) };
      });
    },

    servicos: function (incluirInativos) {
      var q = client.from("services").select("*").eq("clinic_id", CLINIC).order("sort_order");
      if (!incluirInativos) q = q.eq("is_active", true);
      return q.then(ok).then(function (rows) { return rows.map(svc); });
    },

    horariosDeAtendimento: function () {
      return Promise.all([
        client.from("availability_rules").select("*").eq("clinic_id", CLINIC).then(ok),
        client.from("availability_breaks").select("*").eq("clinic_id", CLINIC).then(ok)
      ]).then(function (r) {
        return {
          rules: r[0].map(function (x) { return { id: x.id, weekday: x.weekday, start: hm(x.start_time), end: hm(x.end_time) }; }),
          breaks: r[1].map(function (x) { return { id: x.id, weekday: x.weekday, start: hm(x.start_time), end: hm(x.end_time), label: x.label }; })
        };
      });
    },

    horariosLivres: function (serviceId, deYmd, ateYmd, ignorarId) {
      return rpc("get_available_slots", { p_clinic: CLINIC, p_service: serviceId, p_from: deYmd, p_to: ateYmd, p_ignore_appointment: ignorarId || null })
        .then(function (rows) {
          var tz = (api._tz || "America/Sao_Paulo");
          return rows.map(function (r) {
            var p = PS.tempo.partsIn(new Date(r.starts_at), tz);
            return { startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString(), ymd: p.ymd, hm: p.hm };
          });
        });
    },

    meuCadastro: function () {
      return client.from("patients").select("id, full_name, phone, email, consent_at").eq("clinic_id", CLINIC).maybeSingle().then(ok)
        .then(function (p) { if (!p) throw erro("PATIENT_PROFILE_REQUIRED"); return { id: p.id, fullName: p.full_name, phone: p.phone, email: p.email, consentAt: p.consent_at }; });
    },

    atualizarMeuCadastro: function (d) {
      return rpc("update_my_patient", { p_clinic: CLINIC, p_full_name: d.nome, p_phone: String(d.telefone || "").replace(/\D/g, "") }).then(function () { return true; });
    },

    meusAgendamentos: function () {
      return client.from("appointments").select("*, appointment_requests(*)").eq("clinic_id", CLINIC).order("starts_at").then(ok)
        .then(function (rows) { return rows.map(agendamento); });
    },

    exportarMeusDados: function () { return rpc("export_my_data", { p_clinic: CLINIC }); },

    agendar: function (serviceId, inicioIso, patientId) {
      return rpc("book_appointment", { p_clinic: CLINIC, p_service: serviceId, p_starts_at: inicioIso, p_patient: patientId || null })
        .then(function (r) { return { id: r.id, status: r.status, startsAt: r.starts_at, endsAt: r.ends_at }; });
    },

    cancelarMeu: function (id, motivo) { return rpc("cancel_my_appointment", { p_appointment: id, p_reason: motivo || null }); },
    reagendarMeu: function (id, novoInicio) { return rpc("reschedule_my_appointment", { p_appointment: id, p_new_starts_at: novoInicio }); },
    desistirDoPedido: function (id) { return rpc("withdraw_my_request", { p_request: id }).then(function () { return true; }); },

    agendamentos: function (deIso, ateIso) {
      return client.from("appointments")
        .select("*, patients(full_name, phone), appointment_requests(*), appointment_notes(body)")
        .eq("clinic_id", CLINIC).gte("starts_at", deIso).lt("starts_at", ateIso).order("starts_at").then(ok)
        .then(function (rows) { return rows.map(agendamento); });
    },

    pedidosPendentes: function () {
      return client.from("appointment_requests")
        .select("*, appointments(*, patients(full_name, phone), appointment_requests(*), appointment_notes(body))")
        .eq("clinic_id", CLINIC).eq("status", "pending").order("created_at").then(ok)
        .then(function (rows) {
          return rows.map(function (r) {
            return { id: r.id, type: r.type, reason: r.reason, proposedStartsAt: r.proposed_starts_at, createdAt: r.created_at, appointment: r.appointments ? agendamento(r.appointments) : null };
          });
        });
    },

    responderPedido: function (id, aprovar, nota) { return rpc("admin_resolve_request", { p_request: id, p_approve: !!aprovar, p_note: nota || null }).then(function () { return true; }); },
    mudarStatus: function (id, status, motivo) { return rpc("admin_set_status", { p_appointment: id, p_status: status, p_reason: motivo || null }).then(function () { return true; }); },
    remarcar: function (id, novoInicio) { return rpc("admin_reschedule", { p_appointment: id, p_new_starts_at: novoInicio }).then(function () { return true; }); },

    salvarObservacao: function (id, texto) {
      texto = String(texto || "").trim();
      if (!texto) return client.from("appointment_notes").delete().eq("appointment_id", id).then(ok).then(function () { return true; });
      return client.from("appointment_notes").upsert({ appointment_id: id, clinic_id: CLINIC, body: texto, updated_by: sessaoCache && sessaoCache.userId, updated_at: new Date().toISOString() })
        .then(ok).then(function () { return true; });
    },

    pacientes: function (busca) {
      var q = client.from("patients").select("id, full_name, phone, email, user_id, archived_at, appointments(starts_at, status)").eq("clinic_id", CLINIC).order("full_name").limit(500);
      var b = String(busca || "").trim();
      if (b) {
        var digitos = b.replace(/\D/g, "");
        var termo = b.replace(/[%,()]/g, " ");
        q = digitos.length >= 4 ? q.or("full_name.ilike.%" + termo + "%,phone.ilike.%" + digitos + "%") : q.ilike("full_name", "%" + termo + "%");
      }
      return q.then(ok).then(function (rows) {
        var agora = new Date();
        return rows.map(function (p) {
          var ap = p.appointments || [];
          var prox = ap.filter(function (a) { return (a.status === "pending" || a.status === "confirmed") && new Date(a.starts_at) > agora; }).sort(function (a, b) { return a.starts_at < b.starts_at ? -1 : 1; })[0];
          var ult = ap.filter(function (a) { return a.status === "completed"; }).sort(function (a, b) { return a.starts_at < b.starts_at ? 1 : -1; })[0];
          return { id: p.id, fullName: p.full_name, phone: p.phone, email: p.email, hasAccount: !!p.user_id, archived: !!p.archived_at,
                   nextAppointment: prox ? prox.starts_at : null, lastVisit: ult ? ult.starts_at : null, total: ap.length };
        });
      });
    },

    paciente: function (id) {
      return Promise.all([
        client.from("patients").select("*").eq("id", id).single().then(ok),
        client.from("appointments").select("*, patients(full_name, phone), appointment_requests(*), appointment_notes(body)").eq("patient_id", id).order("starts_at", { ascending: false }).then(ok),
        client.from("patient_notes").select("*").eq("patient_id", id).order("created_at", { ascending: false }).then(ok)
      ]).then(function (r) {
        var p = r[0];
        return { id: p.id, fullName: p.full_name, phone: p.phone, email: p.email, hasAccount: !!p.user_id, consentAt: p.consent_at,
                 createdVia: p.created_via, archived: !!p.archived_at, createdAt: p.created_at,
                 appointments: r[1].map(agendamento), notes: r[2].map(function (n) { return { id: n.id, body: n.body, createdAt: n.created_at }; }) };
      });
    },

    salvarPaciente: function (d) {
      var linha = { full_name: d.fullName, phone: d.phone || null, email: d.email || null };
      if (d.id) return client.from("patients").update(linha).eq("id", d.id).select("id").single().then(ok).then(function (r) { return r.id; });
      linha.clinic_id = CLINIC; linha.created_via = "admin";
      return client.from("patients").insert(linha).select("id").single().then(ok).then(function (r) { return r.id; });
    },

    adicionarAnotacao: function (patientId, texto) {
      return client.from("patient_notes").insert({ clinic_id: CLINIC, patient_id: patientId, body: String(texto || "").trim(), created_by: sessaoCache && sessaoCache.userId })
        .then(ok).then(function () { return true; });
    },
    removerAnotacao: function (noteId) { return client.from("patient_notes").delete().eq("id", noteId).then(ok).then(function () { return true; }); },
    anonimizarPaciente: function (id) { return rpc("anonymize_patient", { p_patient: id }).then(function () { return true; }); },

    salvarHorarios: function (regras, pausas) {
      // Substitui o quadro de horários (apaga e grava de novo). As regras RLS garantem que só a própria clínica é alterada.
      function linhas(lista) { return lista.map(function (r) { return { clinic_id: CLINIC, weekday: r.weekday, start_time: r.start, end_time: r.end, label: r.label || undefined }; }); }
      return client.from("availability_rules").delete().eq("clinic_id", CLINIC).then(ok)
        .then(function () { return regras.length ? client.from("availability_rules").insert(linhas(regras).map(function (x) { delete x.label; return x; })).then(ok) : null; })
        .then(function () { return client.from("availability_breaks").delete().eq("clinic_id", CLINIC).then(ok); })
        .then(function () { return pausas.length ? client.from("availability_breaks").insert(linhas(pausas)).then(ok) : null; })
        .then(function () { return true; });
    },

    bloqueios: function (deIso, ateIso) {
      return client.from("schedule_exceptions").select("*").eq("clinic_id", CLINIC).gt("ends_at", deIso).lt("starts_at", ateIso).order("starts_at").then(ok)
        .then(function (rows) { return rows.map(function (x) { return { id: x.id, startsAt: x.starts_at, endsAt: x.ends_at, kind: x.kind, allDay: x.all_day, reason: x.reason }; }); });
    },
    adicionarBloqueio: function (b) {
      return client.from("schedule_exceptions").insert({ clinic_id: CLINIC, starts_at: b.startsAt, ends_at: b.endsAt, kind: b.kind || "block", all_day: !!b.allDay, reason: b.reason || null, created_by: sessaoCache && sessaoCache.userId })
        .select("id").single().then(ok).then(function (r) {
          return client.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", CLINIC).in("status", ["pending", "confirmed"])
            .lt("starts_at", b.endsAt).gt("ends_at", b.startsAt).then(function (c) { return { id: r.id, agendamentosNoPeriodo: c.count || 0 }; });
        });
    },
    removerBloqueio: function (id) { return client.from("schedule_exceptions").delete().eq("id", id).then(ok).then(function () { return true; }); },

    salvarClinica: function (d) {
      return client.from("clinics").update({
        name: d.name, professional_name: d.professionalName || null, phone: String(d.phone || "").replace(/\D/g, "") || null,
        whatsapp: String(d.whatsapp || "").replace(/\D/g, "") || null, email: d.email || null, address_line1: d.addressLine1 || null, address_line2: d.addressLine2 || null
      }).eq("id", CLINIC).then(ok).then(function () { return true; });
    },
    salvarRegras: function (d) {
      var m = { slotStepMinutes: "slot_step_minutes", bufferMinutes: "buffer_minutes", bookingMinNoticeHours: "booking_min_notice_hours",
        bookingHorizonDays: "booking_horizon_days", maxActiveBookingsPerClient: "max_active_bookings_per_client", onlineBookingMode: "online_booking_mode",
        cancelMinHours: "cancel_min_hours", rescheduleMinHours: "reschedule_min_hours", clientCancelMode: "client_cancel_mode",
        clientRescheduleMode: "client_reschedule_mode", policyText: "policy_text" };
      var linha = {};
      Object.keys(m).forEach(function (k) { if (d[k] !== undefined) linha[m[k]] = d[k]; });
      return client.from("clinic_settings").update(linha).eq("clinic_id", CLINIC).then(ok).then(function () { return true; });
    },
    salvarCores: function (branding) { return client.from("clinic_settings").update({ branding: branding }).eq("clinic_id", CLINIC).then(ok).then(function () { return true; }); },
    notificacoes: function () {
      return client.from("clinic_private_settings").select("*").eq("clinic_id", CLINIC).single().then(ok).then(function (p) {
        return { notifyEmail: p.notify_email, notifyOnNewBooking: p.notify_on_new_booking, notifyOnCancellation: p.notify_on_cancellation, notifyDailySummary: p.notify_daily_summary };
      });
    },
    salvarNotificacoes: function (d) {
      return client.from("clinic_private_settings").update({ notify_email: d.notifyEmail || null, notify_on_new_booking: !!d.notifyOnNewBooking,
        notify_on_cancellation: !!d.notifyOnCancellation, notify_daily_summary: !!d.notifyDailySummary }).eq("clinic_id", CLINIC).then(ok).then(function () { return true; });
    },
    salvarServico: function (d) {
      var linha = { name: d.name, duration_minutes: parseInt(d.durationMinutes, 10), price_cents: d.priceCents === "" || d.priceCents == null ? null : parseInt(d.priceCents, 10),
                    is_active: d.isActive !== false, description: d.description || null };
      if (d.id) return client.from("services").update(linha).eq("id", d.id).select("id").single().then(ok).then(function (r) { return r.id; });
      linha.clinic_id = CLINIC;
      return client.from("services").insert(linha).select("id").single().then(ok).then(function (r) { return r.id; });
    },
    convidarAdministradora: function (email) { return rpc("create_admin_invite", { p_clinic: CLINIC, p_email: email }); },

    /* Pessoa convidada: entra (ou cria a conta, sem cadastro de paciente) e usa o código */
    aceitarConvite: function (email, senha, codigo) {
      email = String(email || "").trim().toLowerCase();
      if (!senha || senha.length < 8) return Promise.reject(erro("WEAK_PASSWORD"));
      return client.auth.signInWithPassword({ email: email, password: senha }).then(function (r) {
        if (!r.error) return r.data;
        if (!/Invalid login credentials/i.test(r.error.message)) throw traduzir(r.error);
        return client.auth.signUp({ email: email, password: senha, options: { emailRedirectTo: base() + "admin/aceitar-convite.html" } }).then(ok);
      }).then(function (data) {
        if (!data.session) return { precisaConfirmarEmail: true };
        return rpc("accept_admin_invite", { p_token: String(codigo || "").trim() }).then(function () { return { precisaConfirmarEmail: false }; });
      });
    },

    demo: null
  };

  /* Carrega a biblioteca oficial do Supabase e prepara a conexão */
  function carregarBiblioteca() {
    return new Promise(function (resolve, reject) {
      if (root.supabase && root.supabase.createClient) return resolve();
      var s = document.createElement("script");
      s.src = CFG.supabaseJs;
      s.crossOrigin = "anonymous";
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(erro("SUPABASE_LIB_LOAD_FAILED")); };
      document.head.appendChild(s);
    });
  }

  api.pronto = CFG.modo !== "supabase" ? null : (function () {
    if (!SB.url || !SB.anonKey || !SB.clinicId) return Promise.reject(erro("SUPABASE_NOT_CONFIGURED"));
    if (/service_role|^sb_secret_/i.test(SB.anonKey) || (function () {
      try { return JSON.parse(atob(SB.anonKey.split(".")[1])).role === "service_role"; } catch (e) { return false; }
    })()) return Promise.reject(erro("SERVICE_ROLE_IN_BROWSER"));   // trava de segurança
    if (location.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return Promise.reject(erro("HTTPS_REQUIRED"));
    return carregarBiblioteca().then(function () {
      client = root.supabase.createClient(SB.url, SB.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      return client.from("clinics").select("timezone").eq("id", CLINIC).single().then(ok).then(function (c) { api._tz = c.timezone; return api; });
    });
  })();

  PS.apiSupabase = api;
})(typeof window !== "undefined" ? window : globalThis);
