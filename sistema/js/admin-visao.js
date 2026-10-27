/* ==========================================================================
   PAINEL · VISÃO GERAL
   Números calculados a partir dos agendamentos guardados (na demonstração,
   os dados são fictícios e isso aparece indicado na tela).
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var alvo = S.$("[data-visao]");

  PS.admin.iniciar().then(carregar).catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  function carregar() {
    var c = PS.admin.ctx.clinica, tz = c.timezone;
    var hoje = T.todayIn(tz);
    var inicioMes = hoje.slice(0, 8) + "01";
    var a = hoje.split("-").map(Number);
    var fimMes = new Date(Date.UTC(a[0], a[1], 0)).toISOString().slice(0, 10);
    var mes = PS.admin.intervalo(inicioMes, fimMes, tz);
    var dia = PS.admin.intervaloDoDia(hoje, tz);
    var agora = new Date();
    S.$("[data-hoje]").textContent = T.format.ymdLong(hoje);
    if (PS.api.modo === "demo") S.$("[data-demo]").hidden = false;

    Promise.all([
      PS.api.agendamentos(mes[0] < dia[0] ? mes[0] : dia[0], new Date(Math.max(new Date(mes[1]), agora.getTime() + 60 * 86400000)).toISOString()),
      PS.api.pedidosPendentes(),
      PS.api.servicos(false)
    ]).then(function (r) {
      var todos = r[0], pedidos = r[1], servicos = r[2];
      var doDia = todos.filter(function (x) { return x.startsAt >= dia[0] && x.startsAt < dia[1]; });
      var doMes = todos.filter(function (x) { return x.startsAt >= mes[0] && x.startsAt < mes[1]; });
      var ativosHoje = doDia.filter(function (x) { return x.status !== "cancelled"; });
      var pendentes = todos.filter(function (x) { return x.status === "pending" && new Date(x.startsAt) > agora; });
      var proximos = todos.filter(function (x) { return (x.status === "confirmed" || x.status === "pending") && new Date(x.endsAt) > agora; }).slice(0, 8);
      var conta = function (st) { return doMes.filter(function (x) { return x.status === st; }).length; };
      var concl = conta("completed"), faltas = conta("no_show"), canc = conta("cancelled");
      var menor = servicos.slice().sort(function (x, y) { return x.durationMinutes - y.durationMinutes; })[0];

      S.$("[data-stats]").innerHTML =
        stat(ativosHoje.length, "Atendimentos hoje", doDia.length - ativosHoje.length ? (doDia.length - ativosHoje.length) + " cancelado(s) hoje" : "", "agenda.html") +
        stat('<span data-livres>…</span>', "Horários livres hoje", menor ? "para " + menor.name.toLowerCase() + " (" + menor.durationMinutes + " min)" : "", "agenda.html") +
        stat(pendentes.length + pedidos.length, "Aguardando sua resposta", pendentes.length + " agendamento(s) · " + pedidos.length + " pedido(s)", "#pendencias", pendentes.length + pedidos.length > 0) +
        stat(canc, "Cancelamentos no mês", "", "relatorios.html");

      if (menor) {
        PS.api.horariosLivres(menor.id, hoje, hoje).then(function (l) {
          var el = S.$("[data-livres]"); if (el) el.textContent = l.length;
        }).catch(function () { var el = S.$("[data-livres]"); if (el) el.textContent = "—"; });
      } else S.$("[data-livres]").textContent = "—";

      var comparecimento = concl + faltas ? Math.round(concl * 100 / (concl + faltas)) + "%" : "—";
      S.$("[data-mes]").innerHTML = '<dl class="kv">' +
        "<div><dt>Agendamentos</dt><dd>" + doMes.length + "</dd></div>" +
        "<div><dt>Concluídos</dt><dd>" + concl + "</dd></div>" +
        "<div><dt>Faltas</dt><dd>" + faltas + "</dd></div>" +
        "<div><dt>Cancelados</dt><dd>" + canc + "</dd></div>" +
        "<div><dt>Comparecimento</dt><dd>" + comparecimento + '</dd></div></dl><p class="small" style="margin-top:.75rem"><a href="relatorios.html">Ver relatórios completos</a></p>';

      var pend = S.$("[data-pendencias]");
      if (!pendentes.length && !pedidos.length) pend.innerHTML = '<div class="empty">Nada aguardando resposta.</div>';
      else pend.innerHTML = '<div class="ag-list">' +
        pendentes.map(function (x) { return PS.admin.itemAgenda(x, tz, true); }).join("") +
        pedidos.map(function (q) {
          var ap = q.appointment;
          return '<div class="ag-item"><span class="ag-item__time">' + S.esc(T.format.time(ap.startsAt, tz)) + "<small>" + S.esc(T.format.dateShort(ap.startsAt, tz)) + "</small></span>" +
            '<span class="ag-item__who"><strong>' + S.esc(ap.patientName) + "</strong><span>" +
            (q.type === "cancel" ? "Pede para cancelar" : "Pede para mudar para " + S.esc(T.format.dateShort(q.proposedStartsAt, tz)) + " às " + S.esc(T.format.time(q.proposedStartsAt, tz))) +
            (q.reason ? " · " + S.esc(q.reason) : "") + "</span></span>" +
            '<span class="actions-row"><button type="button" class="btn btn--primary btn--xs" data-q="' + q.id + '" data-sim>Aprovar</button><button type="button" class="btn btn--outline btn--xs" data-q="' + q.id + '">Recusar</button></span></div>';
        }).join("") + "</div>";

      var prox = S.$("[data-proximos]");
      prox.innerHTML = proximos.length ? '<div class="ag-list">' + proximos.map(function (x) { return PS.admin.itemAgenda(x, tz, true); }).join("") + "</div>"
        : '<div class="empty">Nenhum atendimento marcado. <a href="novo-agendamento.html">Fazer um agendamento</a></div>';

      alvo._todos = todos;
    }).catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }

  function stat(v, label, nota, href, alerta) {
    return '<a class="stat' + (alerta ? " stat--alert" : "") + '" href="' + href + '"><span class="stat__value">' + v + '</span><span class="stat__label">' + S.esc(label) + "</span>" +
      (nota ? '<span class="stat__note">' + S.esc(nota) + "</span>" : "") + "</a>";
  }

  alvo.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ag]");
    if (b) {
      var a = (alvo._todos || []).filter(function (x) { return x.id === b.getAttribute("data-ag"); })[0];
      if (a) PS.admin.abrirAgendamento(a, carregar);
      return;
    }
    var q = e.target.closest("[data-q]");
    if (q) {
      var sim = q.hasAttribute("data-sim");
      S.ocupado(q, true);
      PS.api.responderPedido(q.getAttribute("data-q"), sim).then(function () {
        S.toast(sim ? "Pedido aprovado." : "Pedido recusado."); PS.admin.atualizarPendencias(); carregar();
      }).catch(function (err) { S.ocupado(q, false); S.toast(S.mensagem(err), "erro"); });
    }
  });
})();
