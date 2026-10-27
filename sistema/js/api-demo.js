/* ==========================================================================
   PONTE DE DEMONSTRAÇÃO (modo "demo")
   --------------------------------------------------------------------------
   Imita o servidor DENTRO do navegador, só para testar as telas:
     • os dados são fictícios e ficam no armazenamento deste navegador;
     • as regras (permissões, horários livres, prazos, reserva dupla) são as
       mesmas do banco real, para a demonstração se comportar igual;
     • MAS isto não é segurança de verdade: qualquer pessoa pode mexer no
       armazenamento do próprio navegador. A proteção real está no Supabase
       (RLS + funções do servidor), usada no modo "supabase".
   Cada operação passa por uma fila (uma de cada vez), como a trava do banco.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var T = PS.tempo, D = PS.disponibilidade;
  var CFG = PS.sistema || {};
  var KEY = (CFG.demoStorageKey || "avancado-demo:v1") + ":dados";
  var SKEY = (CFG.demoStorageKey || "avancado-demo:v1") + ":sessao";

  /* ---------------- Armazenamento (com plano B em memória) ---------------- */
  var memoria = {};
  var storageOk = (function () {
    try { localStorage.setItem(KEY + ":t", "1"); localStorage.removeItem(KEY + ":t"); return true; } catch (e) { return false; }
  })();
  function ler(k) { try { return storageOk ? localStorage.getItem(k) : (memoria[k] || null); } catch (e) { return memoria[k] || null; } }
  function gravar(k, v) { try { if (storageOk) localStorage.setItem(k, v); else memoria[k] = v; } catch (e) { memoria[k] = v; } }
  function apagar(k) { try { if (storageOk) localStorage.removeItem(k); delete memoria[k]; } catch (e) { delete memoria[k]; } }

  function erro(code) { var e = new Error(code); e.code = code; throw e; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nowIso() { return new Date().toISOString(); }

  /* ---------------- Senhas: só o "hash" é guardado, nunca o texto ---------------- */
  function hashSenha(email, senha) {
    var texto = "welumen-demo|" + String(email).toLowerCase() + "|" + senha;
    if (root.crypto && root.crypto.subtle && root.TextEncoder) {
      return root.crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)).then(function (buf) {
        return "sha256:" + Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
      });
    }
    // Navegadores sem criptografia disponível: hash simples (apenas demonstração)
    var h = 5381;
    for (var i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
    return Promise.resolve("djb2:" + h.toString(16));
  }

  /* ---------------- Banco fictício ---------------- */
  var cache = null;
  function carregar() {
    if (cache) return cache;
    var raw = ler(KEY);
    if (raw) { try { cache = JSON.parse(raw); } catch (e) { cache = null; } }
    return cache;
  }
  function salvar(db) { cache = db; gravar(KEY, JSON.stringify(db)); }

  function semear() {
    var C = PS.demoSeed.CONTAS;
    return Promise.all([hashSenha(C.podologa.email, C.podologa.senha), hashSenha(C.cliente.email, C.cliente.senha)])
      .then(function (h) { salvar(PS.demoSeed.criar({ podologa: h[0], cliente: h[1] })); });
  }

  // Outras abas: recarrega os dados quando mudarem
  root.addEventListener && root.addEventListener("storage", function (e) { if (e.key === KEY) cache = null; });

  /* Fila: uma operação de cada vez (imita a trava por clínica do banco).
     Se a operação der erro, nada é salvo (como uma transação). */
  var fila = Promise.resolve();
  function servidor(fn, escreve) {
    var p = fila.then(function () {
      return new Promise(function (r) { setTimeout(r, 60 + Math.random() * 90); });
    }).then(function () {
      cache = null;
      var db = clone(carregar());
      var res = fn(db);
      if (escreve) salvar(db);
      return clone(res === undefined ? null : res);
    });
    fila = p.catch(function () {});
    return p;
  }

  /* ---------------- Sessão ---------------- */
  function sessaoAtual(db) {
    var raw = ler(SKEY);
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      if (!s || new Date(s.expiresAt) < new Date()) { apagar(SKEY); return null; }
      var u = db.users.filter(function (x) { return x.id === s.userId; })[0];
      if (!u) return null;
      return montarSessao(db, u);
    } catch (e) { return null; }
  }
  function montarSessao(db, u) {
    var admin = db.members.some(function (m) { return m.userId === u.id; });
    var pac = db.patients.filter(function (p) { return p.userId === u.id && !p.archivedAt; })[0];
    return { userId: u.id, email: u.email, name: pac ? pac.fullName : u.name, role: admin ? "admin" : pac ? "client" : "none", patientId: pac ? pac.id : null };
  }
  function exigirLogin(db) { var s = sessaoAtual(db); if (!s) erro("AUTH_REQUIRED"); return s; }
  function exigirAdmin(db) { var s = exigirLogin(db); if (s.role !== "admin") erro("FORBIDDEN"); return s; }
  function exigirCliente(db) { var s = exigirLogin(db); if (s.role !== "client") erro("PATIENT_PROFILE_REQUIRED"); return s; }
  function log(db, s, action, id) { db.audit.push({ at: nowIso(), actor: s && s.userId, action: action, entityId: id }); if (db.audit.length > 300) db.audit.shift(); }
  function novoId(db, p) { db.seq = (db.seq || 1) + 1; return p + "-" + Date.now().toString(36) + db.seq; }

  /* ---------------- Validação e normalização ---------------- */
  function limparNome(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
  function limparTelefone(v) { return String(v || "").replace(/\D/g, ""); }
  function emailValido(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || "").trim()); }
  function validarPaciente(nome, tel, email) {
    if (nome.length < 2 || nome.length > 120) erro("INVALID_NAME");
    if (tel && !/^[0-9]{10,13}$/.test(tel)) erro("INVALID_PHONE");
    if (email && !emailValido(email)) erro("INVALID_EMAIL");
  }

  /* ---------------- Horários (mesma regra do banco) ---------------- */
  function parametros(db, svc, enforce, ignoreId) {
    return {
      tz: db.clinic.timezone, rules: db.rules, breaks: db.breaks, exceptions: db.exceptions, appointments: db.appointments,
      durationMin: svc.durationMinutes, bufferMin: db.settings.bufferMinutes, stepMin: db.settings.slotStepMinutes,
      minNoticeHours: db.settings.bookingMinNoticeHours, horizonDays: db.settings.bookingHorizonDays,
      enforceWindow: enforce, ignoreId: ignoreId || null, now: new Date()
    };
  }
  function servicoAtivo(db, id) {
    var s = db.services.filter(function (x) { return x.id === id && x.isActive; })[0];
    if (!s) erro("SERVICE_NOT_FOUND");
    return s;
  }
  function ativo(a) { return a.status === "pending" || a.status === "confirmed"; }
  function sobrepoe(db, ini, fimOcupado, ignoreId) {
    var a1 = new Date(ini).getTime(), a2 = new Date(fimOcupado).getTime();
    return db.appointments.some(function (a) {
      return ativo(a) && a.id !== ignoreId && a1 < new Date(a.occupiedUntil).getTime() && new Date(a.startsAt).getTime() < a2;
    });
  }
  function mover(db, a, svc, novoInicio) {
    var ini = new Date(novoInicio).getTime();
    var fim = ini + svc.durationMinutes * 60000;
    var ocup = new Date(fim + db.settings.bufferMinutes * 60000).toISOString();
    if (sobrepoe(db, novoInicio, ocup, a.id)) erro("SLOT_UNAVAILABLE");   // "restrição sem_sobreposicao"
    a.startsAt = new Date(ini).toISOString(); a.endsAt = new Date(fim).toISOString(); a.occupiedUntil = ocup;
    a.durationMinutes = svc.durationMinutes;
  }

  /* ---------------- Formatação das respostas ---------------- */
  function paraCliente(db, a) {
    var r = db.requests.filter(function (q) { return q.appointmentId === a.id; }).sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; })[0] || null;
    var out = {
      id: a.id, serviceId: a.serviceId, serviceName: a.serviceName, durationMinutes: a.durationMinutes, priceCents: a.priceCents,
      startsAt: a.startsAt, endsAt: a.endsAt, status: a.status, source: a.source,
      cancelledAt: a.cancelledAt, cancelledBy: a.cancelledBy, cancelReason: a.cancelReason,
      request: r ? { id: r.id, type: r.type, status: r.status, proposedStartsAt: r.proposedStartsAt || null, reason: r.reason || null, resolutionNote: r.resolutionNote || null } : null
    };
    return out;
  }
  function paraAdmin(db, a) {
    var out = paraCliente(db, a);
    var p = db.patients.filter(function (x) { return x.id === a.patientId; })[0] || {};
    out.patientId = a.patientId; out.patientName = p.fullName; out.patientPhone = p.phone || null;
    out.note = db.appointmentNotes[a.id] || "";
    return out;
  }
  function clinicaPublica(db) {
    var c = db.clinic, s = db.settings;
    return {
      id: c.id, name: c.name, professionalName: c.professionalName, phone: c.phone, whatsapp: c.whatsapp, email: c.email,
      addressLine1: c.addressLine1, addressLine2: c.addressLine2, timezone: c.timezone, isPublished: c.isPublished,
      settings: clone(s)
    };
  }

  /* ======================================================================
     API (mesmas funções da ponte do Supabase)
     ====================================================================== */
  var api = {
    modo: "demo",
    pronto: null,
    armazenamentoDisponivel: storageOk,

    /* ---------- Acesso ---------- */
    sessao: function () { return servidor(function (db) { return sessaoAtual(db); }); },

    entrar: function (email, senha, perfilEsperado) {
      email = String(email || "").trim().toLowerCase();
      return hashSenha(email, senha || "").then(function (h) {
        return servidor(function (db) {
          var u = db.users.filter(function (x) { return x.email === email; })[0];
          if (!u || u.passwordHash !== h) erro("INVALID_LOGIN");          // mesma mensagem: não revela se o e-mail existe
          var s = montarSessao(db, u);
          if (perfilEsperado === "admin" && s.role !== "admin") erro("NOT_ADMIN");
          if (perfilEsperado === "client" && s.role === "admin") erro("USE_ADMIN_LOGIN");
          gravar(SKEY, JSON.stringify({ userId: u.id, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() }));
          log(db, s, "auth.login", u.id);
          return s;
        }, true);
      });
    },

    sair: function () { apagar(SKEY); return Promise.resolve(); },

    cadastrarCliente: function (d) {
      var nome = limparNome(d.nome), tel = limparTelefone(d.telefone), email = String(d.email || "").trim().toLowerCase();
      try {
        validarPaciente(nome, tel, email);
        if (!email) erro("INVALID_EMAIL");
        if (!tel) erro("INVALID_PHONE");
        if (!d.senha || d.senha.length < 8) erro("WEAK_PASSWORD");
        if (!d.aceite) erro("CONSENT_REQUIRED");
      } catch (e) { return Promise.reject(e); }
      return hashSenha(email, d.senha).then(function (h) {
        return servidor(function (db) {
          if (db.users.some(function (u) { return u.email === email; })) erro("EMAIL_IN_USE");
          var u = { id: novoId(db, "u"), email: email, passwordHash: h, name: nome };
          db.users.push(u);
          var pid = novoId(db, "p");
          db.patients.push({ id: pid, userId: u.id, fullName: nome, phone: tel, email: email, consentAt: nowIso(), createdVia: "self", archivedAt: null, createdAt: nowIso() });
          gravar(SKEY, JSON.stringify({ userId: u.id, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() }));
          log(db, null, "patient.self_register", pid);
          return { sessao: montarSessao(db, u), precisaConfirmarEmail: false };
        }, true);
      });
    },

    pedirNovaSenha: function (email, destino) {
      email = String(email || "").trim().toLowerCase();
      return servidor(function (db) {
        db.resets = db.resets || [];
        var u = db.users.filter(function (x) { return x.email === email; })[0];
        var link = null;
        if (u) {
          var token = Math.random().toString(36).slice(2) + Date.now().toString(36);
          db.resets.push({ token: token, userId: u.id, expiresAt: new Date(Date.now() + 3600000).toISOString() });
          link = (destino || "nova-senha.html") + "#demo-token=" + token;
        }
        // Na vida real a resposta é sempre igual (não revela se o e-mail existe).
        return { enviado: true, linkDeTeste: link };
      }, true);
    },

    definirNovaSenha: function (novaSenha, contexto) {
      if (!novaSenha || novaSenha.length < 8) return Promise.reject(Object.assign(new Error("WEAK_PASSWORD"), { code: "WEAK_PASSWORD" }));
      var token = contexto && contexto.demoToken;
      return servidor(function (db) {
        var r = (db.resets || []).filter(function (x) { return x.token === token && new Date(x.expiresAt) > new Date(); })[0];
        if (!r) erro("RESET_LINK_INVALID");
        return db.users.filter(function (u) { return u.id === r.userId; })[0];
      }).then(function (u) {
        return hashSenha(u.email, novaSenha).then(function (h) {
          return servidor(function (db) {
            db.users.forEach(function (x) { if (x.id === u.id) x.passwordHash = h; });
            db.resets = (db.resets || []).filter(function (x) { return x.token !== token; });
            return true;
          }, true);
        });
      });
    },

    /* ---------- Público ---------- */
    clinica: function () { return servidor(function (db) { return clinicaPublica(db); }); },

    servicos: function (incluirInativos) {
      return servidor(function (db) {
        var s = sessaoAtual(db);
        var admin = s && s.role === "admin";
        return db.services.filter(function (x) { return x.isActive || (incluirInativos && admin); })
          .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
      });
    },

    horariosDeAtendimento: function () { return servidor(function (db) { return { rules: db.rules, breaks: db.breaks }; }); },

    horariosLivres: function (serviceId, deYmd, ateYmd, ignorarId) {
      return servidor(function (db) {
        if (T.diffDays(deYmd, ateYmd) < 0 || T.diffDays(deYmd, ateYmd) > 62) erro("INVALID_RANGE");
        var s = sessaoAtual(db);
        var admin = s && s.role === "admin";
        var svc = servicoAtivo(db, serviceId);
        var ignorar = null;
        if (ignorarId) {
          var a = db.appointments.filter(function (x) { return x.id === ignorarId; })[0];
          if (a && (admin || (s && a.patientId === s.patientId))) ignorar = ignorarId;
        }
        return D.calcular(Object.assign(parametros(db, svc, !admin, ignorar), { fromYmd: deYmd, toYmd: ateYmd }));
      });
    },

    /* ---------- Cliente ---------- */
    meuCadastro: function () {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var p = db.patients.filter(function (x) { return x.id === s.patientId; })[0];
        return { id: p.id, fullName: p.fullName, phone: p.phone, email: p.email, consentAt: p.consentAt };
      });
    },

    atualizarMeuCadastro: function (d) {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var nome = limparNome(d.nome), tel = limparTelefone(d.telefone);
        validarPaciente(nome, tel, null);
        db.patients.forEach(function (p) { if (p.id === s.patientId) { p.fullName = nome; p.phone = tel; } });
        return true;
      }, true);
    },

    meusAgendamentos: function () {
      return servidor(function (db) {
        var s = exigirCliente(db);
        return db.appointments.filter(function (a) { return a.patientId === s.patientId; })
          .sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; })
          .map(function (a) { return paraCliente(db, a); });
      });
    },

    exportarMeusDados: function () {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var p = db.patients.filter(function (x) { return x.id === s.patientId; })[0];
        return {
          cadastro: { nome: p.fullName, telefone: p.phone, email: p.email, aceite_privacidade: p.consentAt },
          agendamentos: db.appointments.filter(function (a) { return a.patientId === p.id; }).map(function (a) {
            return { servico: a.serviceName, inicio: a.startsAt, fim: a.endsAt, status: a.status, origem: a.source };
          })
        };
      });
    },

    /* ★ Agendar — mesma função para cliente (on-line) e clínica (manual) */
    agendar: function (serviceId, inicioIso, patientId) {
      return servidor(function (db) {
        var s = exigirLogin(db);
        var admin = s.role === "admin";
        var svc = servicoAtivo(db, serviceId);
        var pid, status;
        if (admin) {
          if (!patientId) erro("PATIENT_REQUIRED");
          if (!db.patients.some(function (p) { return p.id === patientId && !p.archivedAt; })) erro("PATIENT_NOT_FOUND");
          pid = patientId; status = "confirmed";
        } else {
          if (s.role !== "client") erro("PATIENT_PROFILE_REQUIRED");
          if (patientId && patientId !== s.patientId) erro("FORBIDDEN");
          pid = s.patientId;
          var ativos = db.appointments.filter(function (a) { return a.patientId === pid && ativo(a) && new Date(a.startsAt) > new Date(); }).length;
          if (ativos >= db.settings.maxActiveBookingsPerClient) erro("TOO_MANY_ACTIVE_BOOKINGS");
          status = db.settings.onlineBookingMode === "approval" ? "pending" : "confirmed";
        }
        // Revalidação "no servidor": o que a tela mostrou não basta
        if (!D.horarioLivre(parametros(db, svc, !admin, null), inicioIso)) erro("SLOT_UNAVAILABLE");
        var ini = new Date(inicioIso).getTime(), fim = ini + svc.durationMinutes * 60000;
        var ocup = new Date(fim + db.settings.bufferMinutes * 60000).toISOString();
        if (sobrepoe(db, inicioIso, ocup, null)) erro("SLOT_UNAVAILABLE");
        var a = {
          id: novoId(db, "a"), patientId: pid, serviceId: svc.id, serviceName: svc.name, durationMinutes: svc.durationMinutes,
          priceCents: svc.priceCents, startsAt: new Date(ini).toISOString(), endsAt: new Date(fim).toISOString(), occupiedUntil: ocup,
          status: status, source: admin ? "manual" : "online", cancelledAt: null, cancelledBy: null, cancelReason: null, createdAt: nowIso()
        };
        db.appointments.push(a);
        log(db, s, admin ? "appointment.create_manual" : "appointment.create_online", a.id);
        return { id: a.id, status: a.status, startsAt: a.startsAt, endsAt: a.endsAt };
      }, true);
    },

    cancelarMeu: function (id, motivo) {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var a = db.appointments.filter(function (x) { return x.id === id; })[0];
        if (!a || a.patientId !== s.patientId) erro("NOT_FOUND");
        if (!ativo(a)) erro("INVALID_STATUS");
        if (new Date(a.startsAt) <= new Date()) erro("ALREADY_STARTED");
        if (Date.now() > new Date(a.startsAt).getTime() - db.settings.cancelMinHours * 3600000) erro("CANCEL_DEADLINE_PASSED");
        if (a.status === "pending" || db.settings.clientCancelMode === "direct") {
          a.status = "cancelled"; a.cancelledAt = nowIso(); a.cancelledBy = "client"; a.cancelReason = motivo ? String(motivo).slice(0, 300) : null;
          db.requests.forEach(function (q) { if (q.appointmentId === a.id && q.status === "pending") { q.status = "withdrawn"; q.resolvedAt = nowIso(); } });
          log(db, s, "appointment.cancel_client", a.id);
          return "cancelled";
        }
        if (db.requests.some(function (q) { return q.appointmentId === a.id && q.status === "pending"; })) erro("REQUEST_ALREADY_OPEN");
        db.requests.push({ id: novoId(db, "q"), appointmentId: a.id, type: "cancel", status: "pending", reason: motivo ? String(motivo).slice(0, 300) : null, createdAt: nowIso() });
        log(db, s, "request.cancel", a.id);
        return "requested";
      }, true);
    },

    reagendarMeu: function (id, novoInicio) {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var a = db.appointments.filter(function (x) { return x.id === id; })[0];
        if (!a || a.patientId !== s.patientId) erro("NOT_FOUND");
        if (!ativo(a)) erro("INVALID_STATUS");
        if (new Date(a.startsAt) <= new Date()) erro("ALREADY_STARTED");
        if (Date.now() > new Date(a.startsAt).getTime() - db.settings.rescheduleMinHours * 3600000) erro("RESCHEDULE_DEADLINE_PASSED");
        if (!novoInicio || novoInicio === a.startsAt) erro("INVALID_DATA");
        var svc = servicoAtivo(db, a.serviceId);
        if (!D.horarioLivre(parametros(db, svc, true, a.id), novoInicio)) erro("SLOT_UNAVAILABLE");
        if (db.settings.clientRescheduleMode === "direct") {
          mover(db, a, svc, novoInicio);
          log(db, s, "appointment.reschedule_client", a.id);
          return "rescheduled";
        }
        if (db.requests.some(function (q) { return q.appointmentId === a.id && q.status === "pending"; })) erro("REQUEST_ALREADY_OPEN");
        db.requests.push({ id: novoId(db, "q"), appointmentId: a.id, type: "reschedule", status: "pending", proposedStartsAt: new Date(novoInicio).toISOString(), createdAt: nowIso() });
        log(db, s, "request.reschedule", a.id);
        return "requested";
      }, true);
    },

    desistirDoPedido: function (requestId) {
      return servidor(function (db) {
        var s = exigirCliente(db);
        var q = db.requests.filter(function (x) { return x.id === requestId && x.status === "pending"; })[0];
        var a = q && db.appointments.filter(function (x) { return x.id === q.appointmentId; })[0];
        if (!q || !a || a.patientId !== s.patientId) erro("NOT_FOUND");
        q.status = "withdrawn"; q.resolvedAt = nowIso();
        return true;
      }, true);
    },

    /* ---------- Administradora ---------- */
    agendamentos: function (deIso, ateIso) {
      return servidor(function (db) {
        exigirAdmin(db);
        var a1 = new Date(deIso).getTime(), a2 = new Date(ateIso).getTime();
        return db.appointments.filter(function (a) { var t = new Date(a.startsAt).getTime(); return t >= a1 && t < a2; })
          .sort(function (x, y) { return x.startsAt < y.startsAt ? -1 : 1; })
          .map(function (a) { return paraAdmin(db, a); });
      });
    },

    pedidosPendentes: function () {
      return servidor(function (db) {
        exigirAdmin(db);
        return db.requests.filter(function (q) { return q.status === "pending"; }).map(function (q) {
          var a = db.appointments.filter(function (x) { return x.id === q.appointmentId; })[0];
          return { id: q.id, type: q.type, reason: q.reason || null, proposedStartsAt: q.proposedStartsAt || null, createdAt: q.createdAt, appointment: a ? paraAdmin(db, a) : null };
        });
      });
    },

    responderPedido: function (id, aprovar, nota) {
      return servidor(function (db) {
        var s = exigirAdmin(db);
        var q = db.requests.filter(function (x) { return x.id === id; })[0];
        if (!q) erro("NOT_FOUND");
        if (q.status !== "pending") erro("INVALID_STATUS");
        if (!aprovar) { q.status = "rejected"; q.resolvedAt = nowIso(); q.resolutionNote = nota || null; log(db, s, "request.reject", q.id); return true; }
        var a = db.appointments.filter(function (x) { return x.id === q.appointmentId; })[0];
        if (!ativo(a)) erro("INVALID_STATUS");
        if (q.type === "cancel") {
          a.status = "cancelled"; a.cancelledAt = nowIso(); a.cancelledBy = "client"; a.cancelReason = q.reason || null;
        } else {
          var svc = servicoAtivo(db, a.serviceId);
          if (!D.horarioLivre(parametros(db, svc, false, a.id), q.proposedStartsAt)) erro("SLOT_UNAVAILABLE");
          mover(db, a, svc, q.proposedStartsAt);
        }
        q.status = "approved"; q.resolvedAt = nowIso(); q.resolutionNote = nota || null;
        log(db, s, "request.approve_" + q.type, q.id);
        return true;
      }, true);
    },

    mudarStatus: function (id, status, motivo) {
      return servidor(function (db) {
        var s = exigirAdmin(db);
        var a = db.appointments.filter(function (x) { return x.id === id; })[0];
        if (!a) erro("NOT_FOUND");
        var ok = (a.status === "pending" && (status === "confirmed" || status === "cancelled")) ||
                 (a.status === "confirmed" && (status === "completed" || status === "no_show" || status === "cancelled")) ||
                 (a.status === "completed" && status === "no_show") || (a.status === "no_show" && status === "completed");
        if (!ok) erro("INVALID_TRANSITION");
        if ((status === "completed" || status === "no_show") && new Date(a.startsAt) > new Date()) erro("NOT_STARTED_YET");
        a.status = status;
        if (status === "cancelled") { a.cancelledAt = nowIso(); a.cancelledBy = "admin"; a.cancelReason = motivo ? String(motivo).slice(0, 300) : null; }
        if (status === "cancelled" || status === "completed" || status === "no_show") {
          db.requests.forEach(function (q) { if (q.appointmentId === a.id && q.status === "pending") { q.status = "withdrawn"; q.resolvedAt = nowIso(); q.resolutionNote = "Agendamento alterado pela clínica"; } });
        }
        log(db, s, "appointment.status_" + status, a.id);
        return true;
      }, true);
    },

    remarcar: function (id, novoInicio) {
      return servidor(function (db) {
        var s = exigirAdmin(db);
        var a = db.appointments.filter(function (x) { return x.id === id; })[0];
        if (!a) erro("NOT_FOUND");
        if (!ativo(a)) erro("INVALID_STATUS");
        var svc = servicoAtivo(db, a.serviceId);
        if (!D.horarioLivre(parametros(db, svc, false, a.id), novoInicio)) erro("SLOT_UNAVAILABLE");
        mover(db, a, svc, novoInicio);
        db.requests.forEach(function (q) { if (q.appointmentId === a.id && q.status === "pending") { q.status = "withdrawn"; q.resolvedAt = nowIso(); q.resolutionNote = "Remarcado pela clínica"; } });
        log(db, s, "appointment.reschedule_admin", a.id);
        return true;
      }, true);
    },

    salvarObservacao: function (id, texto) {
      return servidor(function (db) {
        exigirAdmin(db);
        if (!db.appointments.some(function (a) { return a.id === id; })) erro("NOT_FOUND");
        texto = String(texto || "").trim();
        if (texto.length > 500) erro("TEXT_TOO_LONG");
        if (texto) db.appointmentNotes[id] = texto; else delete db.appointmentNotes[id];
        return true;
      }, true);
    },

    /* Pacientes */
    pacientes: function (busca) {
      return servidor(function (db) {
        exigirAdmin(db);
        var q = String(busca || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        var agora = new Date();
        return db.patients.filter(function (p) {
          if (!q) return true;
          var n = p.fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return n.indexOf(q) !== -1 || (p.phone || "").indexOf(q.replace(/\D/g, "") || "§") !== -1;
        }).map(function (p) {
          var meus = db.appointments.filter(function (a) { return a.patientId === p.id; });
          var prox = meus.filter(function (a) { return ativo(a) && new Date(a.startsAt) > agora; }).sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; })[0];
          var ult = meus.filter(function (a) { return a.status === "completed"; }).sort(function (a, b) { return a.startsAt < b.startsAt ? 1 : -1; })[0];
          return { id: p.id, fullName: p.fullName, phone: p.phone, email: p.email, hasAccount: !!p.userId, archived: !!p.archivedAt,
                   nextAppointment: prox ? prox.startsAt : null, lastVisit: ult ? ult.startsAt : null, total: meus.length };
        }).sort(function (a, b) { return a.fullName.localeCompare(b.fullName, "pt-BR"); });
      });
    },

    paciente: function (id) {
      return servidor(function (db) {
        exigirAdmin(db);
        var p = db.patients.filter(function (x) { return x.id === id; })[0];
        if (!p) erro("NOT_FOUND");
        return {
          id: p.id, fullName: p.fullName, phone: p.phone, email: p.email, hasAccount: !!p.userId, consentAt: p.consentAt,
          createdVia: p.createdVia, archived: !!p.archivedAt, createdAt: p.createdAt,
          appointments: db.appointments.filter(function (a) { return a.patientId === id; }).sort(function (a, b) { return a.startsAt < b.startsAt ? 1 : -1; }).map(function (a) { return paraAdmin(db, a); }),
          notes: db.patientNotes.filter(function (n) { return n.patientId === id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
        };
      });
    },

    salvarPaciente: function (d) {
      return servidor(function (db) {
        var s = exigirAdmin(db);
        var nome = limparNome(d.fullName), tel = limparTelefone(d.phone), email = String(d.email || "").trim().toLowerCase() || null;
        validarPaciente(nome, tel, email);
        if (d.id) {
          var p = db.patients.filter(function (x) { return x.id === d.id; })[0];
          if (!p) erro("NOT_FOUND");
          if (p.archivedAt) erro("INVALID_STATUS");
          p.fullName = nome; p.phone = tel || null; p.email = email;
          return p.id;
        }
        var id = novoId(db, "p");
        db.patients.push({ id: id, userId: null, fullName: nome, phone: tel || null, email: email, consentAt: null, createdVia: "admin", archivedAt: null, createdAt: nowIso() });
        log(db, s, "patient.create", id);
        return id;
      }, true);
    },

    adicionarAnotacao: function (patientId, texto) {
      return servidor(function (db) {
        exigirAdmin(db);
        texto = String(texto || "").trim();
        if (!texto || texto.length > 500) erro("TEXT_TOO_LONG");
        if (!db.patients.some(function (p) { return p.id === patientId; })) erro("NOT_FOUND");
        db.patientNotes.push({ id: novoId(db, "n"), patientId: patientId, body: texto, createdAt: nowIso() });
        return true;
      }, true);
    },

    removerAnotacao: function (noteId) {
      return servidor(function (db) {
        exigirAdmin(db);
        db.patientNotes = db.patientNotes.filter(function (n) { return n.id !== noteId; });
        return true;
      }, true);
    },

    anonimizarPaciente: function (id) {
      return servidor(function (db) {
        var s = exigirAdmin(db);
        var p = db.patients.filter(function (x) { return x.id === id; })[0];
        if (!p) erro("NOT_FOUND");
        db.appointments.forEach(function (a) {
          if (a.patientId === id && ativo(a) && new Date(a.startsAt) > new Date()) {
            a.status = "cancelled"; a.cancelledAt = nowIso(); a.cancelledBy = "admin"; a.cancelReason = "Cadastro removido a pedido do titular";
          }
        });
        db.patientNotes = db.patientNotes.filter(function (n) { return n.patientId !== id; });
        p.fullName = "Paciente removido"; p.phone = null; p.email = null; p.userId = null; p.archivedAt = nowIso();
        log(db, s, "patient.anonymize", id);
        return true;
      }, true);
    },

    /* Agenda: horários, pausas e bloqueios */
    salvarHorarios: function (regras, pausas) {
      return servidor(function (db) {
        exigirAdmin(db);
        function valida(lista) {
          return (lista || []).map(function (r, i) {
            if (!(r.weekday >= 0 && r.weekday <= 6) || !/^\d\d:\d\d$/.test(r.start) || !/^\d\d:\d\d$/.test(r.end) || r.end <= r.start) erro("INVALID_HOURS");
            return { id: "h-" + i + "-" + Date.now().toString(36), weekday: +r.weekday, start: r.start, end: r.end, label: r.label || null };
          });
        }
        db.rules = valida(regras);
        db.breaks = valida(pausas);
        return true;
      }, true);
    },

    bloqueios: function (deIso, ateIso) {
      return servidor(function (db) {
        exigirAdmin(db);
        return db.exceptions.filter(function (x) { return new Date(x.endsAt) > new Date(deIso) && new Date(x.startsAt) < new Date(ateIso); })
          .sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; });
      });
    },

    adicionarBloqueio: function (b) {
      return servidor(function (db) {
        exigirAdmin(db);
        if (!b.startsAt || !b.endsAt || new Date(b.endsAt) <= new Date(b.startsAt)) erro("INVALID_RANGE");
        if (new Date(b.endsAt) - new Date(b.startsAt) > 370 * 86400000) erro("INVALID_RANGE");
        var x = { id: novoId(db, "x"), startsAt: new Date(b.startsAt).toISOString(), endsAt: new Date(b.endsAt).toISOString(),
                  kind: b.kind || "block", allDay: !!b.allDay, reason: b.reason ? String(b.reason).slice(0, 120) : null };
        db.exceptions.push(x);
        var afetados = db.appointments.filter(function (a) {
          return ativo(a) && new Date(a.startsAt) < new Date(x.endsAt) && new Date(x.startsAt) < new Date(a.endsAt);
        }).length;
        return { id: x.id, agendamentosNoPeriodo: afetados };
      }, true);
    },

    removerBloqueio: function (id) {
      return servidor(function (db) { exigirAdmin(db); db.exceptions = db.exceptions.filter(function (x) { return x.id !== id; }); return true; }, true);
    },

    /* Configurações */
    salvarClinica: function (d) {
      return servidor(function (db) {
        exigirAdmin(db);
        var nome = limparNome(d.name);
        if (nome.length < 2 || nome.length > 120) erro("INVALID_NAME");
        var tel = limparTelefone(d.phone), wa = limparTelefone(d.whatsapp);
        if (tel && !/^[0-9]{10,13}$/.test(tel)) erro("INVALID_PHONE");
        if (wa && !/^[0-9]{12,13}$/.test(wa)) erro("INVALID_WHATSAPP");
        if (d.email && !emailValido(d.email)) erro("INVALID_EMAIL");
        Object.assign(db.clinic, { name: nome, professionalName: limparNome(d.professionalName) || null, phone: tel || null, whatsapp: wa || null,
          email: d.email ? d.email.trim().toLowerCase() : null, addressLine1: (d.addressLine1 || "").trim() || null, addressLine2: (d.addressLine2 || "").trim() || null });
        return true;
      }, true);
    },

    salvarRegras: function (d) {
      return servidor(function (db) {
        exigirAdmin(db);
        function n(v, min, max) { v = parseInt(v, 10); if (isNaN(v) || v < min || v > max) erro("INVALID_SETTINGS"); return v; }
        var s = db.settings;
        if (d.slotStepMinutes != null) s.slotStepMinutes = n(d.slotStepMinutes, 5, 120);
        if (d.bufferMinutes != null) s.bufferMinutes = n(d.bufferMinutes, 0, 120);
        if (d.bookingMinNoticeHours != null) s.bookingMinNoticeHours = n(d.bookingMinNoticeHours, 0, 720);
        if (d.bookingHorizonDays != null) s.bookingHorizonDays = n(d.bookingHorizonDays, 1, 365);
        if (d.maxActiveBookingsPerClient != null) s.maxActiveBookingsPerClient = n(d.maxActiveBookingsPerClient, 1, 20);
        if (d.cancelMinHours != null) s.cancelMinHours = n(d.cancelMinHours, 0, 720);
        if (d.rescheduleMinHours != null) s.rescheduleMinHours = n(d.rescheduleMinHours, 0, 720);
        ["onlineBookingMode", "clientCancelMode", "clientRescheduleMode"].forEach(function (k) {
          if (d[k] != null) {
            var ok = k === "onlineBookingMode" ? ["auto", "approval"] : ["direct", "approval"];
            if (ok.indexOf(d[k]) === -1) erro("INVALID_SETTINGS");
            s[k] = d[k];
          }
        });
        if (d.policyText != null) { if (String(d.policyText).length > 1000) erro("TEXT_TOO_LONG"); s.policyText = String(d.policyText).trim() || null; }
        return true;
      }, true);
    },

    salvarCores: function (branding) {
      return servidor(function (db) {
        exigirAdmin(db);
        var ok = branding && typeof branding.paletteId === "string" && /^[a-z0-9-]{3,40}$/.test(branding.paletteId);
        if (!ok) erro("INVALID_SETTINGS");
        var ov = {};
        Object.keys(branding.overrides || {}).forEach(function (k) {
          if (["primary", "accent", "secondary"].indexOf(k) !== -1 && /^#[0-9a-f]{6}$/i.test(branding.overrides[k])) ov[k] = branding.overrides[k].toLowerCase();
        });
        db.settings.branding = { paletteId: branding.paletteId, overrides: ov };
        return true;
      }, true);
    },

    notificacoes: function () { return servidor(function (db) { exigirAdmin(db); return db.privateSettings; }); },

    salvarNotificacoes: function (d) {
      return servidor(function (db) {
        exigirAdmin(db);
        if (d.notifyEmail && !emailValido(d.notifyEmail)) erro("INVALID_EMAIL");
        db.privateSettings = { notifyEmail: d.notifyEmail ? d.notifyEmail.trim().toLowerCase() : null,
          notifyOnNewBooking: !!d.notifyOnNewBooking, notifyOnCancellation: !!d.notifyOnCancellation, notifyDailySummary: !!d.notifyDailySummary };
        return true;
      }, true);
    },

    salvarServico: function (d) {
      return servidor(function (db) {
        exigirAdmin(db);
        var nome = limparNome(d.name);
        var dur = parseInt(d.durationMinutes, 10);
        var preco = d.priceCents === "" || d.priceCents == null ? null : parseInt(d.priceCents, 10);
        if (nome.length < 2 || nome.length > 80) erro("INVALID_NAME");
        if (isNaN(dur) || dur < 10 || dur > 480) erro("INVALID_DURATION");
        if (preco != null && (isNaN(preco) || preco < 0)) erro("INVALID_PRICE");
        if (d.id) {
          var s = db.services.filter(function (x) { return x.id === d.id; })[0];
          if (!s) erro("NOT_FOUND");
          Object.assign(s, { name: nome, durationMinutes: dur, priceCents: preco, isActive: d.isActive !== false, description: d.description || s.description || null });
          return s.id;
        }
        var id = novoId(db, "s");
        db.services.push({ id: id, name: nome, durationMinutes: dur, priceCents: preco, isActive: d.isActive !== false, sortOrder: db.services.length, description: d.description || null });
        return id;
      }, true);
    },

    convidarAdministradora: function () { return Promise.reject(Object.assign(new Error("DEMO_ONLY"), { code: "DEMO_ONLY" })); },
    aceitarConvite: function () { return Promise.reject(Object.assign(new Error("DEMO_ONLY"), { code: "DEMO_ONLY" })); },

    /* ---------- Ferramentas exclusivas da demonstração ---------- */
    demo: {
      contas: function () { return PS.demoSeed.CONTAS; },
      restaurar: function () { apagar(SKEY); cache = null; apagar(KEY); return semear(); },
      /* Dois clientes fictícios tentam reservar o mesmo horário no mesmo instante */
      testarReservaDupla: function () {
        return servidor(function (db) {
          var svc = db.services.filter(function (s) { return s.isActive; })[0];
          var livres = D.calcular(Object.assign(parametros(db, svc, true, null), { fromYmd: T.todayIn(db.clinic.timezone), toYmd: T.addDays(T.todayIn(db.clinic.timezone), 30) }));
          return { svc: svc, slot: livres[Math.floor(livres.length / 2)] };
        }).then(function (info) {
          if (!info.slot) throw Object.assign(new Error("NO_SLOTS"), { code: "NO_SLOTS" });
          // Simula as duas pessoas sem trocar a sessão de quem está testando
          function tentativa(nome) {
            return servidor(function (db) {
              var svc = servicoAtivo(db, info.svc.id);
              if (!D.horarioLivre(parametros(db, svc, true, null), info.slot.startsAt)) erro("SLOT_UNAVAILABLE");
              var pid = novoId(db, "p");
              db.patients.push({ id: pid, userId: null, fullName: nome, phone: null, email: null, consentAt: null, createdVia: "admin", archivedAt: null, createdAt: nowIso() });
              var ini = new Date(info.slot.startsAt).getTime(), fim = ini + svc.durationMinutes * 60000;
              var ocup = new Date(fim + db.settings.bufferMinutes * 60000).toISOString();
              if (sobrepoe(db, info.slot.startsAt, ocup, null)) erro("SLOT_UNAVAILABLE");
              db.appointments.push({ id: novoId(db, "a"), patientId: pid, serviceId: svc.id, serviceName: svc.name, durationMinutes: svc.durationMinutes,
                priceCents: svc.priceCents, startsAt: new Date(ini).toISOString(), endsAt: new Date(fim).toISOString(), occupiedUntil: ocup,
                status: "confirmed", source: "online", createdAt: nowIso() });
              return nome;
            }, true).then(function (n) { return { pessoa: n, ok: true }; }, function (e) { return { pessoa: nome, ok: false, code: e.code || e.message }; });
          }
          return Promise.all([tentativa("Teste simultâneo A (fictício)"), tentativa("Teste simultâneo B (fictício)")])
            .then(function (r) { return { horario: info.slot.startsAt, servico: info.svc.name, resultados: r }; });
        });
      }
    }
  };

  // Só prepara os dados fictícios quando o modo de demonstração está ativo
  api.pronto = (CFG.modo && CFG.modo !== "demo") ? null : (carregar() ? Promise.resolve() : semear()).then(function () { return api; });
  PS.apiDemo = api;
})(typeof window !== "undefined" ? window : globalThis);
