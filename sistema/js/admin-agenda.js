/* ==========================================================================
   PAINEL · AGENDA
   Abas: Agenda (dia, semana, mês) · Horários de atendimento · Bloqueios e folgas
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var params = new URLSearchParams(location.search);
  var st = { aba: params.get("aba") || "agenda", vista: "dia", dia: null, servicoLivre: null, dados: [], bloqueios: [], horarios: null, servicos: [] };
  var tz, clinica;

  PS.admin.iniciar().then(function (ctx) {
    clinica = ctx.clinica; tz = clinica.timezone;
    st.dia = params.get("dia") || T.todayIn(tz);
    return Promise.all([PS.api.servicos(false), PS.api.horariosDeAtendimento()]);
  }).then(function (r) {
    st.servicos = r[0]; st.horarios = r[1];
    st.servicoLivre = (st.servicos.slice().sort(function (a, b) { return a.durationMinutes - b.durationMinutes; })[0] || {}).id || null;
    abas();
  }).catch(function (e) { S.$("[data-aba-conteudo]").innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  /* ---------------- Abas ---------------- */
  function abas() {
    S.$all("[data-aba]").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-aba") === st.aba ? "true" : "false");
      b.onclick = function () { st.aba = b.getAttribute("data-aba"); history.replaceState(null, "", "?aba=" + st.aba); abas(); };
    });
    if (st.aba === "horarios") return telaHorarios();
    if (st.aba === "bloqueios") return telaBloqueios();
    telaAgenda();
  }

  /* ======================= AGENDA ======================= */
  function addMes(ymd, n) { var a = ymd.split("-").map(Number); var d = new Date(Date.UTC(a[0], a[1] - 1 + n, 1)); return d.toISOString().slice(0, 10); }
  function inicioSemana(ymd) { return T.addDays(ymd, -T.weekdayOf(ymd)); }

  function periodo() {
    if (st.vista === "dia") return [st.dia, st.dia];
    if (st.vista === "semana") { var i = inicioSemana(st.dia); return [i, T.addDays(i, 6)]; }
    var m = st.dia.slice(0, 8) + "01", a = m.split("-").map(Number);
    var fim = new Date(Date.UTC(a[0], a[1], 0)).toISOString().slice(0, 10);
    return [inicioSemana(m), T.addDays(inicioSemana(fim), 6)];
  }

  function telaAgenda() {
    var alvo = S.$("[data-aba-conteudo]");
    alvo.innerHTML =
      '<div class="ag-toolbar">' +
        '<p class="ag-toolbar__title" data-titulo aria-live="polite"></p>' +
        '<div class="actions-row"><button type="button" class="btn btn--outline btn--sm" data-nav="hoje">Hoje</button>' +
        '<button type="button" class="cal__nav" data-nav="-1" aria-label="Anterior"><svg class="icon" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>' +
        '<button type="button" class="cal__nav" data-nav="1" aria-label="Próximo"><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button></div>' +
        '<div class="seg" role="group" aria-label="Visualização">' + ["dia", "semana", "mes"].map(function (v) {
          return '<button type="button" data-vista="' + v + '" aria-pressed="' + (st.vista === v) + '">' + { dia: "Dia", semana: "Semana", mes: "Mês" }[v] + "</button>";
        }).join("") + "</div>" +
      "</div>" +
      '<div data-vista-conteudo aria-live="polite"></div>' +
      '<div class="legend" aria-label="Legenda">' + S.chipStatus("confirmed") + S.chipStatus("pending") + S.chipStatus("completed") + S.chipStatus("cancelled") + S.chipStatus("no_show") +
        '<span class="st st--free">Livre</span><span class="st st--block">Bloqueado</span></div>';
    S.$all("[data-vista]", alvo).forEach(function (b) { b.onclick = function () { st.vista = b.getAttribute("data-vista"); telaAgenda(); }; });
    S.$all("[data-nav]", alvo).forEach(function (b) {
      b.onclick = function () {
        var n = b.getAttribute("data-nav");
        if (n === "hoje") st.dia = T.todayIn(tz);
        else st.dia = st.vista === "dia" ? T.addDays(st.dia, +n) : st.vista === "semana" ? T.addDays(st.dia, 7 * n) : addMes(st.dia, +n);
        carregarVista();
      };
    });
    carregarVista();
  }

  function carregarVista() {
    var p = periodo(), faixa = PS.admin.intervalo(p[0], p[1], tz);
    var titulo = S.$("[data-titulo]");
    titulo.textContent = st.vista === "dia" ? T.format.ymdLong(st.dia) : st.vista === "semana" ? "Semana de " + T.format.ymdShort(p[0]) + " a " + T.format.ymdShort(p[1]) : T.format.monthOf(st.dia);
    var box = S.$("[data-vista-conteudo]");
    box.innerHTML = '<p class="loading"><span class="spinner" aria-hidden="true"></span>Carregando…</p>';
    var tarefas = [PS.api.agendamentos(faixa[0], faixa[1]), PS.api.bloqueios(faixa[0], faixa[1])];
    if (st.vista === "dia" && st.servicoLivre) tarefas.push(PS.api.horariosLivres(st.servicoLivre, st.dia, st.dia).catch(function () { return []; }));
    Promise.all(tarefas).then(function (r) {
      st.dados = r[0]; st.bloqueios = r[1];
      if (st.vista === "dia") vistaDia(box, r[2] || []);
      else if (st.vista === "semana") vistaSemana(box, p[0]);
      else vistaMes(box, p[0], p[1]);
    }).catch(function (e) { box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }

  function bloqueioNoDia(ymd) {
    var f = PS.admin.intervaloDoDia(ymd, tz);
    return st.bloqueios.filter(function (x) { return x.startsAt < f[1] && x.endsAt > f[0]; });
  }

  function vistaDia(box, livres) {
    var wd = T.weekdayOf(st.dia);
    var regras = st.horarios.rules.filter(function (r) { return +r.weekday === wd; });
    var itens = st.dados.map(function (a) { return { t: a.startsAt, html: PS.admin.itemAgenda(a, tz, false) }; });
    bloqueioNoDia(st.dia).forEach(function (x) {
      itens.push({ t: x.startsAt < PS.admin.intervaloDoDia(st.dia, tz)[0] ? PS.admin.intervaloDoDia(st.dia, tz)[0] : x.startsAt,
        html: '<div class="ag-item ag-item--block"><span class="ag-item__time">' + (x.allDay ? "Dia todo" : S.esc(T.format.time(x.startsAt, tz)) + "<small>até " + S.esc(T.format.time(x.endsAt, tz)) + "</small>") + '</span>' +
          '<span class="ag-item__who"><strong>' + S.esc(rotuloBloqueio(x.kind)) + "</strong><span>" + S.esc(x.reason || "Sem atendimento") + '</span></span><span class="st st--block">Bloqueado</span></div>' });
    });
    var svc = st.servicos.filter(function (s) { return s.id === st.servicoLivre; })[0];
    livres.forEach(function (s) {
      itens.push({ t: s.startsAt, html: '<div class="ag-item ag-item--free"><span class="ag-item__time">' + s.hm + '<small>livre</small></span><span class="ag-item__who"><span>Horário livre' + (svc ? " para " + S.esc(svc.name.toLowerCase()) : "") + "</span></span>" +
        '<a class="btn btn--outline btn--xs" href="novo-agendamento.html?servico=' + encodeURIComponent(st.servicoLivre) + "&inicio=" + encodeURIComponent(s.startsAt) + '">Agendar</a></div>' });
    });
    itens.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });

    box.innerHTML =
      '<div class="panel">' +
        '<div class="panel__head"><p class="muted small">' + (regras.length ? "Atendimento: " + regras.map(function (r) { return r.start + "–" + r.end; }).join(", ") : "Sem atendimento neste dia da semana.") + "</p>" +
        '<label class="small">Mostrar horários livres para <select class="select" style="width:auto;min-height:38px" data-servico-livre>' +
          st.servicos.map(function (s) { return '<option value="' + S.esc(s.id) + '"' + (s.id === st.servicoLivre ? " selected" : "") + ">" + S.esc(s.name) + " (" + s.durationMinutes + " min)</option>"; }).join("") +
        "</select></label></div>" +
        (itens.length ? '<div class="ag-list">' + itens.map(function (i) { return i.html; }).join("") + "</div>" : '<div class="empty">Nenhum compromisso e nenhum horário livre neste dia.</div>') +
      "</div>";
    S.$("[data-servico-livre]", box).onchange = function () { st.servicoLivre = this.value; carregarVista(); };
  }

  function vistaSemana(box, inicio) {
    var hoje = T.todayIn(tz), html = '<div class="ag-week">';
    for (var i = 0; i < 7; i++) {
      var ymd = T.addDays(inicio, i), f = PS.admin.intervaloDoDia(ymd, tz);
      var doDia = st.dados.filter(function (a) { return a.startsAt >= f[0] && a.startsAt < f[1]; });
      var bl = bloqueioNoDia(ymd);
      html += '<section class="ag-week__day' + (ymd === hoje ? " is-today" : "") + '" aria-label="' + S.esc(T.format.ymdLong(ymd)) + '">' +
        '<div class="ag-week__head"><span>' + T.WEEKDAYS_SHORT[T.weekdayOf(ymd)] + " " + (+ymd.slice(8)) + '</span><button type="button" data-ir-dia="' + ymd + '">Ver dia</button></div>' +
        bl.map(function (x) { return '<span class="st st--block">' + S.esc(x.allDay ? rotuloBloqueio(x.kind) : T.format.time(x.startsAt, tz) + "–" + T.format.time(x.endsAt, tz) + " bloqueado") + "</span>"; }).join("") +
        doDia.map(function (a) {
          return '<button type="button" class="ag-chip st ' + (S.STATUS[a.status] || {}).cls + '" data-ag="' + S.esc(a.id) + '" aria-label="' + S.esc(T.format.time(a.startsAt, tz) + ", " + a.patientName + ", " + S.STATUS[a.status].label) + '">' +
            "<b>" + S.esc(T.format.time(a.startsAt, tz)) + "</b><span>" + S.esc(a.patientName) + "</span></button>";
        }).join("") +
        (!doDia.length && !bl.length ? '<span class="small muted">Sem agendamentos</span>' : "") +
      "</section>";
    }
    box.innerHTML = html + "</div>";
  }

  function vistaMes(box, ini, fim) {
    var hoje = T.todayIn(tz), mes = st.dia.slice(0, 7);
    var html = '<div class="ag-month" role="grid" aria-label="' + S.esc(T.format.monthOf(st.dia)) + '">' + T.WEEKDAYS_SHORT.map(function (w) { return '<span class="ag-month__wd" role="columnheader">' + w + "</span>"; }).join("");
    for (var d = ini; d <= fim; d = T.addDays(d, 1)) {
      var f = PS.admin.intervaloDoDia(d, tz);
      var doDia = st.dados.filter(function (a) { return a.startsAt >= f[0] && a.startsAt < f[1] && a.status !== "cancelled"; });
      var pend = doDia.filter(function (a) { return a.status === "pending"; }).length;
      var bloqueado = bloqueioNoDia(d).some(function (x) { return x.allDay || (new Date(x.endsAt) - new Date(x.startsAt)) >= 86400000; });
      html += '<button type="button" role="gridcell" class="ag-month__day' + (d.slice(0, 7) !== mes ? " is-out" : "") + (d === hoje ? " is-today" : "") + (bloqueado ? " is-blocked" : "") + '" data-ir-dia="' + d + '" aria-label="' +
        S.esc(T.format.ymdLong(d) + ": " + doDia.length + " agendamento(s)" + (bloqueado ? ", bloqueado" : "")) + '">' +
        '<span class="ag-month__n">' + (+d.slice(8)) + "</span>" +
        (doDia.length ? '<span class="ag-month__c">' + doDia.length + (doDia.length === 1 ? " agend." : " agend.") + "</span>" : "") +
        (pend ? '<span class="ag-month__p">' + pend + " aguardando</span>" : "") +
        (bloqueado ? '<span class="small muted">bloqueado</span>' : "") + "</button>";
    }
    box.innerHTML = html + "</div>";
  }

  S.$("[data-aba-conteudo]").addEventListener("click", function (e) {
    var ag = e.target.closest("[data-ag]");
    if (ag) {
      var a = st.dados.filter(function (x) { return x.id === ag.getAttribute("data-ag"); })[0];
      if (a) PS.admin.abrirAgendamento(a, carregarVista);
      return;
    }
    var dia = e.target.closest("[data-ir-dia]");
    if (dia) { st.dia = dia.getAttribute("data-ir-dia"); st.vista = "dia"; telaAgenda(); }
  });

  function rotuloBloqueio(k) { return { block: "Horário bloqueado", holiday: "Feriado", vacation: "Férias", other: "Indisponível" }[k] || "Bloqueado"; }

  /* ======================= HORÁRIOS DE ATENDIMENTO ======================= */
  function telaHorarios() {
    var alvo = S.$("[data-aba-conteudo]");
    var sets = clinica.settings;
    var linhas = "";
    for (var wd = 0; wd < 7; wd++) {
      var r = st.horarios.rules.filter(function (x) { return +x.weekday === wd; })[0];
      var p = st.horarios.breaks.filter(function (x) { return +x.weekday === wd; })[0];
      var extras = st.horarios.rules.filter(function (x) { return +x.weekday === wd; }).length > 1;
      linhas += '<div class="week-hours__row' + (r ? "" : " is-off") + '" data-wd="' + wd + '">' +
        '<label class="check"><input type="checkbox" data-atende' + (r ? " checked" : "") + "><span><strong>" + T.WEEKDAYS[wd] + "</strong></span></label>" +
        '<div class="week-hours__times">' +
          '<label class="small">das <input class="input" type="time" step="300" data-ini value="' + (r ? r.start : "09:00") + '"></label>' +
          '<label class="small">às <input class="input" type="time" step="300" data-fim value="' + (r ? r.end : "18:00") + '"></label>' +
          '<label class="small">pausa <input class="input" type="time" step="300" data-pini value="' + (p ? p.start : "") + '" aria-label="Início da pausa"></label>' +
          '<label class="small">até <input class="input" type="time" step="300" data-pfim value="' + (p ? p.end : "") + '" aria-label="Fim da pausa"></label>' +
          (extras ? '<span class="small muted">(este dia tem mais de um turno cadastrado; ao salvar, fica só este)</span>' : "") +
        "</div></div>";
    }
    alvo.innerHTML =
      '<form class="stack" data-form-horarios novalidate>' +
        '<section class="panel"><div class="panel__head"><h2>Dias e horários de atendimento</h2></div>' +
          '<p class="muted small" style="margin-bottom:.5rem">Marque os dias em que você atende. A pausa (ex.: almoço) é opcional. Horários no fuso da clínica: ' + S.esc(tz) + ".</p>" +
          '<div class="week-hours">' + linhas + "</div></section>" +
        '<section class="panel"><h2 style="margin-bottom:1rem">Como os horários são oferecidos</h2><div class="form-grid">' +
          num("slotStepMinutes", "Grade de horários (minutos)", sets.slotStepMinutes, 5, 120, "De quanto em quanto tempo os horários começam. Ex.: 30 → 9h00, 9h30, 10h00…") +
          num("bufferMinutes", "Intervalo entre consultas (minutos)", sets.bufferMinutes, 0, 120, "Tempo livre depois de cada atendimento, para higienizar a sala.") +
          num("bookingMinNoticeHours", "Antecedência mínima para o cliente (horas)", sets.bookingMinNoticeHours, 0, 720, "O cliente não vê horários mais próximos que isso.") +
          num("bookingHorizonDays", "Agendamento disponível até (dias à frente)", sets.bookingHorizonDays, 1, 365, "") +
        '</div><p class="small muted" style="margin-top:1rem">A duração de cada atendimento é definida por serviço, em <a href="configuracoes.html?aba=servicos">Configurações › Serviços</a>.</p></section>' +
        '<p class="alert" data-msg hidden></p>' +
        '<div class="form-actions"><button class="btn btn--primary" type="submit" data-salvar>Salvar horários</button><span class="small muted">Agendamentos já marcados não são alterados.</span></div>' +
      "</form>";
    S.$all("[data-atende]", alvo).forEach(function (c) { c.onchange = function () { c.closest(".week-hours__row").classList.toggle("is-off", !c.checked); }; });
    S.$("[data-form-horarios]", alvo).addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = S.$("[data-msg]", alvo), regras = [], pausas = [], erro = null;
      S.$all(".week-hours__row", alvo).forEach(function (row) {
        if (!S.$("[data-atende]", row).checked) return;
        var wd = +row.getAttribute("data-wd"), ini = S.$("[data-ini]", row).value, fim = S.$("[data-fim]", row).value;
        var pi = S.$("[data-pini]", row).value, pf = S.$("[data-pfim]", row).value;
        if (!ini || !fim || fim <= ini) erro = T.WEEKDAYS[wd] + ": o horário final precisa ser depois do inicial.";
        if ((pi && !pf) || (!pi && pf)) erro = T.WEEKDAYS[wd] + ": preencha o início e o fim da pausa (ou deixe os dois vazios).";
        if (pi && pf && (pf <= pi || pi < ini || pf > fim)) erro = T.WEEKDAYS[wd] + ": a pausa precisa estar dentro do horário de atendimento.";
        regras.push({ weekday: wd, start: ini, end: fim });
        if (pi && pf) pausas.push({ weekday: wd, start: pi, end: pf, label: "Pausa" });
      });
      if (erro) return S.alerta(msg, erro);
      if (!regras.length) return S.alerta(msg, "Marque pelo menos um dia de atendimento.");
      var conf = {};
      ["slotStepMinutes", "bufferMinutes", "bookingMinNoticeHours", "bookingHorizonDays"].forEach(function (k) { conf[k] = S.$("#" + k, alvo).value; });
      var btn = S.$("[data-salvar]", alvo);
      S.ocupado(btn, true, "Salvando…");
      PS.api.salvarHorarios(regras, pausas).then(function () { return PS.api.salvarRegras(conf); })
        .then(function () { return Promise.all([PS.api.horariosDeAtendimento(), PS.api.clinica()]); })
        .then(function (r) { st.horarios = r[0]; clinica.settings = r[1].settings; S.ocupado(btn, false); S.alerta(msg, "Horários salvos. A nova disponibilidade já vale para o site e para o agendamento manual.", "ok"); })
        .catch(function (err) { S.ocupado(btn, false); S.alerta(msg, S.mensagem(err)); });
    });
  }
  function num(id, label, val, min, max, hint) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + label + '</label><input class="input" type="number" inputmode="numeric" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" required>' +
      (hint ? '<p class="field__hint">' + hint + "</p>" : "") + "</div>";
  }

  /* ======================= BLOQUEIOS E FOLGAS ======================= */
  function telaBloqueios() {
    var alvo = S.$("[data-aba-conteudo]");
    var hoje = T.todayIn(tz);
    alvo.innerHTML =
      '<div class="grid-2">' +
        '<section class="panel" aria-labelledby="h-novo-bl"><h2 id="h-novo-bl" style="margin-bottom:1rem">Bloquear horários</h2>' +
          '<form class="form" data-form-bl novalidate>' +
            '<div class="field"><label class="field__label" for="bl-tipo">O que deseja bloquear?</label><select class="select" id="bl-tipo">' +
              '<option value="horario">Um horário específico</option><option value="dia">Um dia inteiro</option><option value="ferias">Um período (férias)</option><option value="feriado">Feriado</option></select></div>' +
            '<div class="form-grid"><div class="field"><label class="field__label" for="bl-de">Data</label><input class="input" type="date" id="bl-de" min="' + hoje + '" value="' + hoje + '"></div>' +
            '<div class="field" data-so="ferias"><label class="field__label" for="bl-ate">Até (inclusive)</label><input class="input" type="date" id="bl-ate" min="' + hoje + '" value="' + T.addDays(hoje, 7) + '"></div>' +
            '<div class="field" data-so="horario"><label class="field__label" for="bl-hi">Das</label><input class="input" type="time" id="bl-hi" step="300" value="14:00"></div>' +
            '<div class="field" data-so="horario"><label class="field__label" for="bl-hf">Às</label><input class="input" type="time" id="bl-hf" step="300" value="15:00"></div></div>' +
            '<div class="field"><label class="field__label" for="bl-motivo">Motivo (uso interno)</label><input class="input" id="bl-motivo" maxlength="120" placeholder="Ex.: curso, consulta médica, viagem"><p class="field__hint">O motivo nunca aparece para os clientes: eles só deixam de ver esses horários.</p></div>' +
            '<p class="alert" data-msg hidden></p>' +
            '<div class="form-actions"><button class="btn btn--primary" type="submit" data-salvar>Bloquear</button></div>' +
          "</form></section>" +
        '<section class="panel" aria-labelledby="h-bls"><h2 id="h-bls" style="margin-bottom:1rem">Próximos bloqueios</h2><div data-lista-bl><p class="loading"><span class="spinner"></span>Carregando…</p></div></section>' +
      "</div>";
    var tipo = S.$("#bl-tipo", alvo);
    function mostrarCampos() { S.$all("[data-so]", alvo).forEach(function (f) { f.hidden = f.getAttribute("data-so") !== (tipo.value === "ferias" ? "ferias" : tipo.value === "horario" ? "horario" : "x"); }); }
    tipo.onchange = mostrarCampos; mostrarCampos();
    listarBloqueios();

    S.$("[data-form-bl]", alvo).addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = S.$("[data-msg]", alvo), de = S.$("#bl-de", alvo).value, b;
      if (!de) return S.alerta(msg, "Escolha a data.");
      if (tipo.value === "horario") {
        var hi = S.$("#bl-hi", alvo).value, hf = S.$("#bl-hf", alvo).value;
        if (!hi || !hf || hf <= hi) return S.alerta(msg, "O horário final precisa ser depois do inicial.");
        b = { startsAt: T.zonedToDate(de, hi, tz).toISOString(), endsAt: T.zonedToDate(de, hf, tz).toISOString(), kind: "block", allDay: false };
      } else if (tipo.value === "ferias") {
        var ate = S.$("#bl-ate", alvo).value;
        if (!ate || ate < de) return S.alerta(msg, "A data final precisa ser igual ou depois da inicial.");
        b = { startsAt: T.zonedToDate(de, "00:00", tz).toISOString(), endsAt: T.zonedToDate(T.addDays(ate, 1), "00:00", tz).toISOString(), kind: "vacation", allDay: true };
      } else {
        b = { startsAt: T.zonedToDate(de, "00:00", tz).toISOString(), endsAt: T.zonedToDate(T.addDays(de, 1), "00:00", tz).toISOString(), kind: tipo.value === "feriado" ? "holiday" : "other", allDay: true };
      }
      b.reason = S.$("#bl-motivo", alvo).value.trim();
      var btn = S.$("[data-salvar]", alvo);
      S.ocupado(btn, true, "Salvando…");
      PS.api.adicionarBloqueio(b).then(function (r) {
        S.ocupado(btn, false);
        S.alerta(msg, r.agendamentosNoPeriodo ? "Bloqueio salvo. Atenção: já existem " + r.agendamentosNoPeriodo + " agendamento(s) nesse período. Eles continuam marcados: revise na agenda e avise os pacientes se for cancelar." : "Bloqueio salvo. Esses horários não aparecem mais para agendamento.", r.agendamentosNoPeriodo ? "info" : "ok");
        listarBloqueios();
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msg, S.mensagem(err)); });
    });
  }

  function listarBloqueios() {
    var box = S.$("[data-lista-bl]");
    var agora = new Date();
    PS.api.bloqueios(agora.toISOString(), new Date(agora.getTime() + 400 * 86400000).toISOString()).then(function (l) {
      if (!l.length) { box.innerHTML = '<div class="empty">Nenhum bloqueio futuro.</div>'; return; }
      box.innerHTML = '<div class="ag-list">' + l.map(function (x) {
        var dias = Math.round((new Date(x.endsAt) - new Date(x.startsAt)) / 86400000);
        var quando = x.allDay
          ? (dias > 1 ? T.format.date(x.startsAt, tz) + " a " + T.format.date(new Date(new Date(x.endsAt).getTime() - 1), tz) : T.format.dateLong(x.startsAt, tz))
          : T.format.dateShort(x.startsAt, tz) + ", " + T.format.time(x.startsAt, tz) + "–" + T.format.time(x.endsAt, tz);
        return '<div class="ag-item ag-item--block"><span class="ag-item__time">' + S.esc(rotuloBloqueio(x.kind).split(" ")[0]) + "</span>" +
          '<span class="ag-item__who"><strong>' + S.esc(quando) + "</strong><span>" + S.esc(x.reason || "Sem motivo informado") + "</span></span>" +
          '<button type="button" class="btn btn--ghost btn--xs" data-remover="' + S.esc(x.id) + '" aria-label="Remover bloqueio de ' + S.esc(quando) + '">Remover</button></div>';
      }).join("") + "</div>";
      S.$all("[data-remover]", box).forEach(function (b) {
        b.onclick = function () {
          S.confirmar({ titulo: "Remover este bloqueio?", texto: "Os horários voltam a ficar disponíveis para agendamento.", confirmar: "Remover", perigo: true }).then(function (r) {
            if (!r) return;
            PS.api.removerBloqueio(b.getAttribute("data-remover")).then(function () { S.toast("Bloqueio removido."); listarBloqueios(); }).catch(function (e) { S.toast(S.mensagem(e), "erro"); });
          });
        };
      });
    }).catch(function (e) { box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }
})();
