/* ==========================================================================
   PAINEL DA PODÓLOGA — partes comuns
   Proteção da área, nome da clínica no menu, contador de pendências e a
   janela de detalhes de um agendamento (confirmar, concluir, falta,
   cancelar, remarcar, observação administrativa, responder pedidos).
   Lembrete: esconder ou mostrar botões aqui é só organização. Quem impede
   ações indevidas é o servidor.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;

  var ctx = { sessao: null, clinica: null };

  function intervaloDoDia(ymd, tz) {
    return [T.zonedToDate(ymd, "00:00", tz).toISOString(), T.zonedToDate(T.addDays(ymd, 1), "00:00", tz).toISOString()];
  }
  function intervalo(deYmd, ateYmdInclusivo, tz) {
    return [T.zonedToDate(deYmd, "00:00", tz).toISOString(), T.zonedToDate(T.addDays(ateYmdInclusivo, 1), "00:00", tz).toISOString()];
  }

  function atualizarPendencias() {
    return Promise.all([PS.api.pedidosPendentes(), proximosPendentes()]).then(function (r) {
      var n = r[0].length + r[1].length;
      var b = S.$("[data-badge-pendentes]");
      if (b) { b.hidden = !n; b.textContent = n; b.setAttribute("aria-label", n + " pendências"); }
      return n;
    }).catch(function () {});
  }
  function proximosPendentes() {
    var agora = new Date();
    return PS.api.agendamentos(agora.toISOString(), new Date(agora.getTime() + 400 * 86400000).toISOString())
      .then(function (l) { return l.filter(function (a) { return a.status === "pending"; }); });
  }

  function iniciar() {
    return S.proteger("admin").then(function (s) {
      ctx.sessao = s;
      var e = S.$("[data-user-email]"); if (e) e.textContent = s.email;
      return PS.api.clinica();
    }).then(function (c) {
      ctx.clinica = c;
      var n = S.$("[data-clinic-name]"); if (n) n.textContent = c.name + (PS.api.modo === "demo" ? " · demonstração" : "");
      S.aplicarCoresDaClinica(c);
      atualizarPendencias();
      return ctx;
    });
  }

  function quando(a, tz) {
    return T.format.dateLong(a.startsAt, tz) + " · " + T.format.time(a.startsAt, tz) + "–" + T.format.time(a.endsAt, tz);
  }

  /* ---------- Janela de detalhes de um agendamento ---------- */
  function abrirAgendamento(a, aoMudar) {
    var tz = ctx.clinica.timezone;
    var passou = new Date(a.startsAt) <= new Date();
    var r = a.request && a.request.status === "pending" ? a.request : null;
    var acoes = [];
    if (a.status === "pending") acoes.push(["confirmed", "Confirmar", "btn--primary"]);
    if (a.status === "confirmed" && passou) { acoes.push(["completed", "Marcar como concluído", "btn--primary"]); acoes.push(["no_show", "Registrar falta", "btn--outline"]); }
    if (a.status === "completed") acoes.push(["no_show", "Corrigir: foi falta", "btn--outline"]);
    if (a.status === "no_show") acoes.push(["completed", "Corrigir: foi atendido", "btn--outline"]);
    var ativo = a.status === "pending" || a.status === "confirmed";

    var html =
      '<dl class="kv">' +
        '<div><dt>Paciente</dt><dd><a href="pacientes.html?id=' + encodeURIComponent(a.patientId) + '">' + S.esc(a.patientName) + "</a>" + (a.patientPhone ? "<br><span class=\"muted small\">" + S.esc(S.telefone(a.patientPhone)) + "</span>" : "") + "</dd></div>" +
        "<div><dt>Serviço</dt><dd>" + S.esc(a.serviceName) + " · " + a.durationMinutes + " min" + (a.priceCents != null ? " · " + S.reais(a.priceCents) : "") + "</dd></div>" +
        "<div><dt>Quando</dt><dd>" + S.esc(quando(a, tz)) + "</dd></div>" +
        "<div><dt>Situação</dt><dd>" + S.chipStatus(a.status) + "</dd></div>" +
        "<div><dt>Origem</dt><dd>" + (a.source === "online" ? "Agendado pelo cliente (on-line)" : "Agendamento manual da clínica") + "</dd></div>" +
        (a.status === "cancelled" ? "<div><dt>Cancelamento</dt><dd>" + (a.cancelledBy === "admin" ? "pela clínica" : "pelo cliente") + (a.cancelReason ? " · " + S.esc(a.cancelReason) : "") + "</dd></div>" : "") +
      "</dl>" +
      (r ? '<div class="appt-card__req"><strong>Pedido do cliente aguardando resposta:</strong> ' +
        (r.type === "cancel" ? "cancelar este horário" : "mudar para " + S.esc(T.format.dateLong(r.proposedStartsAt, tz)) + " às " + S.esc(T.format.time(r.proposedStartsAt, tz))) +
        (r.reason ? ". Motivo: " + S.esc(r.reason) : "") +
        '<div class="actions-row" style="margin-top:.6rem"><button type="button" class="btn btn--primary btn--xs" data-pedido="sim">Aprovar</button><button type="button" class="btn btn--outline btn--xs" data-pedido="nao">Recusar</button></div></div>' : "") +
      '<div class="actions-row">' +
        acoes.map(function (x) { return '<button type="button" class="btn ' + x[2] + ' btn--sm" data-status="' + x[0] + '">' + x[1] + "</button>"; }).join("") +
        (ativo ? '<button type="button" class="btn btn--outline btn--sm" data-remarcar>Remarcar</button><button type="button" class="btn btn--ghost btn--sm" data-cancelar>Cancelar agendamento</button>' : "") +
      "</div>" +
      '<form class="form" data-nota><div class="field"><label class="field__label" for="nota-ag">Observação administrativa</label>' +
        '<textarea class="input" id="nota-ag" maxlength="500" rows="2" placeholder="Ex.: paciente pediu para chegar 10 minutos antes"></textarea>' +
        '<p class="field__hint">Visível só para a clínica. Não registre informações de saúde aqui.</p></div>' +
        '<div class="form-actions"><button class="btn btn--outline btn--sm" type="submit">Salvar observação</button></div></form>' +
      '<p class="alert" data-erro hidden></p>';

    var d = S.janela("Agendamento", html, { larga: false });
    S.$("#nota-ag", d).value = a.note || "";
    var erro = S.$("[data-erro]", d);

    function feito(msg) { d.close(); S.toast(msg); atualizarPendencias(); if (aoMudar) aoMudar(); }
    function falhou(e) { S.alerta(erro, S.mensagem(e)); }

    S.$all("[data-status]", d).forEach(function (b) {
      b.addEventListener("click", function () {
        var st = b.getAttribute("data-status");
        S.ocupado(b, true);
        PS.api.mudarStatus(a.id, st).then(function () { feito("Situação atualizada: " + S.STATUS[st].label + "."); }).catch(function (e) { S.ocupado(b, false); falhou(e); });
      });
    });
    var bc = S.$("[data-cancelar]", d);
    if (bc) bc.addEventListener("click", function () {
      S.confirmar({ titulo: "Cancelar este agendamento?", texto: a.patientName + " · " + quando(a, tz) + ". O horário ficará livre. Avise o paciente pelo telefone ou WhatsApp.",
        campo: "Motivo (opcional, visível para o paciente)", confirmar: "Cancelar agendamento", cancelar: "Voltar", perigo: true }).then(function (res) {
        if (!res) return;
        PS.api.mudarStatus(a.id, "cancelled", res.texto).then(function () { feito("Agendamento cancelado."); }).catch(falhou);
      });
    });
    var br = S.$("[data-remarcar]", d);
    if (br) br.addEventListener("click", function () {
      d.close();
      escolherHorario("Remarcar: " + a.patientName, a.serviceId, a.id, function (slot) {
        return PS.api.remarcar(a.id, slot.startsAt).then(function () { S.toast("Agendamento remarcado."); if (aoMudar) aoMudar(); });
      });
    });
    S.$all("[data-pedido]", d).forEach(function (b) {
      b.addEventListener("click", function () {
        var sim = b.getAttribute("data-pedido") === "sim";
        S.ocupado(b, true);
        PS.api.responderPedido(r.id, sim).then(function () { feito(sim ? "Pedido aprovado." : "Pedido recusado."); }).catch(function (e) { S.ocupado(b, false); falhou(e); });
      });
    });
    S.$("[data-nota]", d).addEventListener("submit", function (e) {
      e.preventDefault();
      PS.api.salvarObservacao(a.id, S.$("#nota-ag", d).value).then(function () { S.toast("Observação salva."); a.note = S.$("#nota-ag", d).value; if (aoMudar) aoMudar(); }).catch(falhou);
    });
    return d;
  }

  /* Janela com o seletor de horários (mesma regra de disponibilidade) */
  function escolherHorario(titulo, serviceId, ignoreId, aoConfirmar) {
    var d = S.janela(titulo, '<div data-sel></div><p class="alert" data-erro hidden></p><div class="sys-dialog__actions" style="margin-top:1rem"><button type="button" class="btn btn--primary" data-ok disabled>Confirmar horário</button></div>', { larga: true });
    var escolhido = null;
    var sel = PS.seletorHorario(S.$("[data-sel]", d), { serviceId: serviceId, tz: ctx.clinica.timezone, horizonDays: 180, ignoreId: ignoreId, lado: false,
      onChange: function (s) { escolhido = s; S.$("[data-ok]", d).disabled = !s; } });
    S.$("[data-ok]", d).addEventListener("click", function () {
      var b = this; S.ocupado(b, true);
      aoConfirmar(escolhido).then(function () { d.close(); }).catch(function (e) { S.ocupado(b, false); S.alerta(S.$("[data-erro]", d), S.mensagem(e)); if (e.code === "SLOT_UNAVAILABLE") sel.atualizar(); });
    });
  }

  function itemAgenda(a, tz, mostrarData) {
    return '<button type="button" class="ag-item' + (a.status === "cancelled" ? " ag-item--cancelled" : "") + '" data-ag="' + S.esc(a.id) + '">' +
      '<span class="ag-item__time">' + S.esc(T.format.time(a.startsAt, tz)) + "<small>" + (mostrarData ? S.esc(T.format.dateShort(a.startsAt, tz)) : a.durationMinutes + " min") + "</small></span>" +
      '<span class="ag-item__who"><strong>' + S.esc(a.patientName) + "</strong><span>" + S.esc(a.serviceName) + (a.request && a.request.status === "pending" ? " · pedido aguardando resposta" : "") + "</span></span>" +
      S.chipStatus(a.status) + "</button>";
  }

  PS.admin = {
    ctx: ctx, iniciar: iniciar, abrirAgendamento: abrirAgendamento, escolherHorario: escolherHorario, itemAgenda: itemAgenda,
    intervaloDoDia: intervaloDoDia, intervalo: intervalo, atualizarPendencias: atualizarPendencias, quando: quando
  };

  /* ---------- Aceitar convite de administradora ---------- */
  if (document.body.getAttribute("data-page") === "aceitar-convite") {
    var msgI = S.$("[data-msg]");
    PS.api.pronto.then(function () { if (PS.api.modo === "demo") { S.alerta(msgI, S.mensagem({ code: "DEMO_ONLY" }), "info"); S.$("[data-form]").hidden = true; } })
      .catch(function (e) { S.alerta(msgI, S.mensagem(e)); });
    var cod = new URLSearchParams(location.search).get("codigo");
    if (cod) S.$("#codigo").value = cod;
    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = S.$("[data-enviar]");
      S.ocupado(btn, true, "Confirmando…");
      PS.api.aceitarConvite(S.$("#email").value, S.$("#senha").value, S.$("#codigo").value).then(function (r) {
        if (r.precisaConfirmarEmail) { S.ocupado(btn, false); S.alerta(msgI, "Conta criada. Confirme o e-mail pelo link enviado e volte a esta página para usar o código.", "ok"); return; }
        location.href = "index.html";
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msgI, err.code === "INVITE_INVALID" ? "Código inválido, expirado, já usado ou de outro e-mail." : S.mensagem(err)); });
    });
  }

  /* ---------- Tela de entrada da podóloga ---------- */
  if (document.body.getAttribute("data-page") === "admin-entrar") {
    var params = new URLSearchParams(location.search);
    var msg = S.$("[data-msg]");
    PS.api.pronto.then(function () {
      PS.sys.contasDemo(S.$("[data-demo-contas]"), "podologa");
      return PS.api.sessao();
    }).then(function (s) { if (s && s.role === "admin" && !params.get("saiu")) location.replace(S.voltarPara("index.html")); })
      .catch(function (e) { S.alerta(msg, S.mensagem(e)); });
    if (params.get("saiu")) S.alerta(msg, "Você saiu da área administrativa.", "ok");
    if (params.get("motivo") === "sem-permissao") S.alerta(msg, "Esta conta não tem permissão de administradora. Entre com a conta da podóloga.", "info");
    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = S.$("#email"), senha = S.$("#senha"), btn = S.$("[data-enviar]");
      var okE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
      S.erroCampo(email, okE ? "" : "Informe um e-mail válido.");
      S.erroCampo(senha, senha.value ? "" : "Informe a senha.");
      if (!okE || !senha.value) return;
      S.ocupado(btn, true, "Entrando…"); S.alerta(msg, null);
      PS.api.entrar(email.value, senha.value, "admin").then(function () { location.href = S.voltarPara("index.html"); })
        .catch(function (err) { S.ocupado(btn, false); S.alerta(msg, S.mensagem(err)); });
    });
  }
})();
