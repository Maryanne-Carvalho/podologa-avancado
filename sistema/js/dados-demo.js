/* ==========================================================================
   DADOS FICTÍCIOS DA DEMONSTRAÇÃO
   Nada aqui é real: clínica, profissional, pacientes, telefones e agendamentos
   foram inventados para testar o sistema. Estes dados só existem no modo
   "demo" e ficam guardados apenas no navegador de quem está testando.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var T = PS.tempo, D = PS.disponibilidade;

  var TZ = "America/Sao_Paulo";

  /* Contas de teste exibidas na tela de login da demonstração */
  var CONTAS = {
    podologa: { email: "podologa.demo@exemplo.com", senha: "demonstracao" },
    cliente:  { email: "cliente.demo@exemplo.com",  senha: "demonstracao" }
  };

  var SERVICOS = [
    { id: "avaliacao", name: "Avaliação podológica", durationMinutes: 60, priceCents: 18000, description: "Primeira consulta: conversa, avaliação dos pés e plano de cuidados." },
    { id: "unhas", name: "Cuidados com as unhas", durationMinutes: 50, priceCents: 15000, description: "Corte técnico, unhas encravadas ou espessas." },
    { id: "calos", name: "Calos e calosidades", durationMinutes: 40, priceCents: 13000, description: "Remoção cuidadosa de calos e áreas endurecidas." },
    { id: "prevencao", name: "Orientação preventiva", durationMinutes: 30, priceCents: 9000, description: "Orientações de cuidado, calçados e sinais de alerta." },
    { id: "sensiveis", name: "Pés sensíveis", durationMinutes: 60, priceCents: 19000, description: "Atendimento atento para diabetes, idosos e gestantes." },
    { id: "acompanhamento", name: "Acompanhamento podológico", durationMinutes: 40, priceCents: 12000, description: "Retorno para manutenção dos cuidados." }
  ];

  var PACIENTES = [
    ["Carla Mendes", "11987650001"], ["Ana Beatriz Rocha", "11987650002"], ["Bruno Teixeira", "11987650003"],
    ["Dalva Nogueira", "11987650004"], ["Eduardo Paiva", "11987650005"], ["Fernanda Lopes", "11987650006"],
    ["Gilberto Sá", "11987650007"], ["Helena Duarte", "11987650008"], ["Íris Cardoso", "11987650009"],
    ["João Pedro Lima", "11987650010"], ["Kátia Moreira", "11987650011"], ["Luiz Fernando Alves", "11987650012"]
  ];

  /* Gerador pseudoaleatório com semente: os dados ficam iguais a cada restauração */
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function uid(prefix, n) { return prefix + "-" + String(n).padStart(4, "0"); }

  function criar(hashSenha) {
    var now = new Date();
    var hoje = T.todayIn(TZ);
    var rand = rng(20261026);

    var db = {
      version: 1,
      createdAt: now.toISOString(),
      clinic: {
        id: "clinica-demo", slug: "podologia-studio-demo",
        name: "Podologia Studio", professionalName: "Dra. Marina Oliveira",
        phone: "1130000000", whatsapp: "5511900000000", email: "contato@podologiastudio.exemplo",
        addressLine1: "Rua das Acácias, 120 — sala 4", addressLine2: "Vila Mariana, São Paulo – SP",
        timezone: TZ, isPublished: true
      },
      settings: {
        slotStepMinutes: 30, bufferMinutes: 10, bookingMinNoticeHours: 2, bookingHorizonDays: 60,
        maxActiveBookingsPerClient: 3, onlineBookingMode: "auto",
        cancelMinHours: 24, rescheduleMinHours: 24, clientCancelMode: "direct", clientRescheduleMode: "approval",
        policyText: "Cancelamentos e reagendamentos pelo site podem ser feitos até 24 horas antes do horário. Depois disso, fale com a clínica pelo WhatsApp. (Regra de exemplo.)",
        branding: { paletteId: "rosa-areia", overrides: {} }
      },
      privateSettings: { notifyEmail: "contato@podologiastudio.exemplo", notifyOnNewBooking: true, notifyOnCancellation: true, notifyDailySummary: false },
      services: SERVICOS.map(function (s, i) { return Object.assign({ isActive: true, sortOrder: i }, s); }),
      rules: [], breaks: [], exceptions: [],
      users: [
        { id: "u-podologa", email: CONTAS.podologa.email, passwordHash: hashSenha.podologa, name: "Dra. Marina Oliveira" },
        { id: "u-cliente", email: CONTAS.cliente.email, passwordHash: hashSenha.cliente, name: "Carla Mendes" }
      ],
      members: [{ userId: "u-podologa", role: "owner" }],
      patients: [], patientNotes: [], appointments: [], appointmentNotes: {}, requests: [], audit: [],
      seq: 1
    };

    // Segunda a sexta, 9h às 18h, almoço 12h–13h; sábado 9h às 13h
    for (var d = 1; d <= 5; d++) {
      db.rules.push({ id: uid("r", d), weekday: d, start: "09:00", end: "18:00" });
      db.breaks.push({ id: uid("b", d), weekday: d, start: "12:00", end: "13:00", label: "Almoço" });
    }
    db.rules.push({ id: uid("r", 6), weekday: 6, start: "09:00", end: "13:00" });

    // Pacientes fictícios (a primeira tem conta de cliente para testar o portal)
    PACIENTES.forEach(function (p, i) {
      db.patients.push({
        id: uid("p", i + 1), userId: i === 0 ? "u-cliente" : null, fullName: p[0], phone: p[1],
        email: i === 0 ? CONTAS.cliente.email : p[0].toLowerCase().split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "") + "@exemplo.com",
        consentAt: i === 0 ? now.toISOString() : null, createdVia: i === 0 ? "self" : "admin",
        archivedAt: null, createdAt: now.toISOString()
      });
    });
    db.patientNotes.push({ id: "n-0001", patientId: "p-0002", body: "Prefere horários pela manhã. (anotação administrativa de exemplo)", createdAt: now.toISOString() });

    // Bloqueios de exemplo: um feriado e um horário específico
    var feriado = proximoDiaUtil(T.addDays(hoje, 11));
    db.exceptions.push({ id: "x-0001", kind: "holiday", allDay: true, reason: "Feriado (exemplo)",
      startsAt: T.zonedToDate(feriado, "00:00", TZ).toISOString(), endsAt: T.zonedToDate(T.addDays(feriado, 1), "00:00", TZ).toISOString() });
    var bloqueio = proximoDiaUtil(T.addDays(hoje, 2));
    db.exceptions.push({ id: "x-0002", kind: "block", allDay: false, reason: "Curso de atualização (exemplo)",
      startsAt: T.zonedToDate(bloqueio, "15:00", TZ).toISOString(), endsAt: T.zonedToDate(bloqueio, "17:00", TZ).toISOString() });

    // Agendamentos: 75 dias para trás e 21 dias para frente, sem conflitos
    var n = 0;
    for (var i = -75; i <= 21; i++) {
      var ymd = T.addDays(hoje, i);
      var wd = T.weekdayOf(ymd);
      if (wd === 0) continue;
      var quantos = wd === 6 ? 2 : 2 + Math.floor(rand() * 4);
      if (i > 0 && i <= 21) quantos = Math.max(1, quantos - 1);
      for (var k = 0; k < quantos; k++) {
        var svc = SERVICOS[Math.floor(rand() * SERVICOS.length)];
        var livres = D.calcular({
          fromYmd: ymd, toYmd: ymd, tz: TZ, rules: db.rules, breaks: db.breaks, exceptions: db.exceptions,
          appointments: ocupados(db), durationMin: svc.durationMinutes, bufferMin: db.settings.bufferMinutes,
          stepMin: db.settings.slotStepMinutes, enforceWindow: false, now: new Date(0)
        });
        if (!livres.length) continue;
        var slot = livres[Math.floor(rand() * livres.length)];
        var start = new Date(slot.startsAt);
        var futuro = start.getTime() > now.getTime() + 2 * 3600000;
        var passado = start.getTime() < now.getTime();
        if (!futuro && !passado) continue;
        var paciente = db.patients[1 + Math.floor(rand() * (db.patients.length - 1))];
        var r = rand();
        var status = passado ? (r < 0.8 ? "completed" : r < 0.88 ? "no_show" : "cancelled")
                             : (r < 0.82 ? "confirmed" : "pending");
        n++;
        db.appointments.push(novoAgendamento(db, uid("a", n), paciente.id, svc, start, status, rand() < 0.55 ? "online" : "manual"));
      }
    }

    // Agendamentos da cliente de teste (Carla): 2 passados e 1 futuro
    var carla = db.patients[0];
    [[-40, "avaliacao", "completed"], [-12, "acompanhamento", "completed"], [6, "unhas", "confirmed"]].forEach(function (cfg) {
      var dia = proximoDiaUtil(T.addDays(hoje, cfg[0]));
      var svc = SERVICOS.filter(function (s) { return s.id === cfg[1]; })[0];
      var livres = D.calcular({
        fromYmd: dia, toYmd: dia, tz: TZ, rules: db.rules, breaks: db.breaks, exceptions: db.exceptions,
        appointments: ocupados(db), durationMin: svc.durationMinutes, bufferMin: db.settings.bufferMinutes,
        stepMin: db.settings.slotStepMinutes, enforceWindow: false, now: new Date(0)
      });
      if (!livres.length) return;
      n++;
      db.appointments.push(novoAgendamento(db, uid("a", n), carla.id, svc, new Date(livres[0].startsAt), cfg[2], "online"));
    });

    // Dois pedidos aguardando resposta da podóloga
    var futuros = db.appointments.filter(function (a) { return a.status === "confirmed" && a.patientId !== carla.id && new Date(a.startsAt) > now; });
    if (futuros[2]) db.requests.push({ id: "q-0001", appointmentId: futuros[2].id, type: "cancel", status: "pending", reason: "Viagem de trabalho (exemplo)", createdAt: now.toISOString() });
    if (futuros[5]) {
      var alvo = futuros[5];
      var svcAlvo = SERVICOS.filter(function (s) { return s.id === alvo.serviceId; })[0];
      var dia2 = T.addDays(T.partsIn(new Date(alvo.startsAt), TZ).ymd, 1);
      var opc = D.calcular({ fromYmd: dia2, toYmd: T.addDays(dia2, 6), tz: TZ, rules: db.rules, breaks: db.breaks, exceptions: db.exceptions,
        appointments: db.appointments, durationMin: svcAlvo.durationMinutes, bufferMin: 10, stepMin: 30, enforceWindow: true, minNoticeHours: 2, horizonDays: 60, now: now });
      if (opc[1]) db.requests.push({ id: "q-0002", appointmentId: alvo.id, type: "reschedule", status: "pending", proposedStartsAt: opc[1].startsAt, reason: null, createdAt: now.toISOString() });
    }
    db.seq = n + 10;
    return db;
  }

  /* Para gerar os dados, todo atendimento não cancelado ocupa o horário (inclusive os já concluídos) */
  function ocupados(db) {
    return db.appointments.filter(function (a) { return a.status !== "cancelled"; })
      .map(function (a) { return { id: a.id, startsAt: a.startsAt, occupiedUntil: a.occupiedUntil, status: "confirmed" }; });
  }

  function proximoDiaUtil(ymd) {
    while (T.weekdayOf(ymd) === 0 || T.weekdayOf(ymd) === 6) ymd = T.addDays(ymd, 1);
    return ymd;
  }

  function novoAgendamento(db, id, patientId, svc, start, status, source) {
    var end = new Date(start.getTime() + svc.durationMinutes * 60000);
    return {
      id: id, patientId: patientId, serviceId: svc.id, serviceName: svc.name,
      durationMinutes: svc.durationMinutes, priceCents: svc.priceCents,
      startsAt: start.toISOString(), endsAt: end.toISOString(),
      occupiedUntil: new Date(end.getTime() + db.settings.bufferMinutes * 60000).toISOString(),
      status: status, source: source,
      cancelledAt: status === "cancelled" ? start.toISOString() : null,
      cancelledBy: status === "cancelled" ? "client" : null, cancelReason: null,
      createdAt: new Date(start.getTime() - 5 * 86400000).toISOString()
    };
  }

  PS.demoSeed = { criar: criar, CONTAS: CONTAS, TZ: TZ };
})(typeof window !== "undefined" ? window : globalThis);
