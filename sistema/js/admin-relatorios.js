/* ==========================================================================
   PAINEL · RELATÓRIOS
   Calculados a partir dos agendamentos do período escolhido. A exportação
   (CSV) só existe dentro da área protegida e usa apenas dados que o servidor
   entregou para a administradora.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var tz, dados = [], periodo = null, pacientes = [];

  PS.admin.iniciar().then(function (ctx) {
    tz = ctx.clinica.timezone;
    if (PS.api.modo === "demo") S.$("[data-demo]").hidden = false;
    var hoje = T.todayIn(tz);
    S.$("#de").value = hoje.slice(0, 8) + "01";
    S.$("#ate").value = fimDoMes(hoje);
    gerar();
    proximos();
    PS.api.pacientes("").then(function (l) {
      pacientes = l;
      S.$("#pac").innerHTML = '<option value="">Escolha um paciente…</option>' + l.map(function (p) { return '<option value="' + S.esc(p.id) + '">' + S.esc(p.fullName) + "</option>"; }).join("");
    });
  }).catch(function (e) { S.$("[data-resultado]").innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  function fimDoMes(ymd) { var a = ymd.split("-").map(Number); return new Date(Date.UTC(a[0], a[1], 0)).toISOString().slice(0, 10); }
  function addMes(ymd, n) { var a = ymd.split("-").map(Number); return new Date(Date.UTC(a[0], a[1] - 1 + n, 1)).toISOString().slice(0, 10); }

  S.$all("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      var hoje = T.todayIn(tz), p = b.getAttribute("data-preset"), de, ate;
      if (p === "mes") { de = hoje.slice(0, 8) + "01"; ate = fimDoMes(hoje); }
      if (p === "anterior") { de = addMes(hoje, -1); ate = fimDoMes(de); }
      if (p === "90") { de = T.addDays(hoje, -89); ate = hoje; }
      if (p === "ano") { de = hoje.slice(0, 4) + "-01-01"; ate = hoje.slice(0, 4) + "-12-31"; }
      S.$("#de").value = de; S.$("#ate").value = ate; gerar();
    });
  });
  S.$("[data-form]").addEventListener("submit", function (e) { e.preventDefault(); gerar(); });

  function gerar() {
    var de = S.$("#de").value, ate = S.$("#ate").value, msg = S.$("[data-msg]");
    S.alerta(msg, null);
    if (!de || !ate || ate < de) return S.alerta(msg, "Escolha um período válido: a data final precisa ser igual ou depois da inicial.");
    if (T.diffDays(de, ate) > 366) return S.alerta(msg, "Escolha um período de até 1 ano.");
    periodo = [de, ate];
    var f = PS.admin.intervalo(de, ate, tz), box = S.$("[data-resultado]");
    box.innerHTML = '<p class="loading"><span class="spinner"></span>Calculando…</p>';
    PS.api.agendamentos(f[0], f[1]).then(function (l) {
      dados = l;
      var c = function (s) { return l.filter(function (a) { return a.status === s; }).length; };
      var concl = c("completed"), faltas = c("no_show"), canc = c("cancelled"), conf = c("confirmed"), pend = c("pending");
      var online = l.filter(function (a) { return a.source === "online"; }).length;
      var porServ = {}, porMes = {};
      l.forEach(function (a) {
        porServ[a.serviceName] = porServ[a.serviceName] || { total: 0, concl: 0 };
        porServ[a.serviceName].total++; if (a.status === "completed") porServ[a.serviceName].concl++;
        var m = T.partsIn(new Date(a.startsAt), tz).ymd.slice(0, 7);
        porMes[m] = porMes[m] || { total: 0, completed: 0, cancelled: 0, no_show: 0 };
        porMes[m].total++; if (porMes[m][a.status] !== undefined) porMes[m][a.status]++;
      });
      var servs = Object.keys(porServ).sort(function (a, b) { return porServ[b].total - porServ[a].total; });
      var maxS = servs.length ? porServ[servs[0]].total : 1;
      var meses = Object.keys(porMes).sort();
      var maxM = Math.max.apply(null, meses.map(function (m) { return porMes[m].total; }).concat([1]));

      box.innerHTML =
        '<div class="stats">' +
          st(l.length, "Agendamentos no período", online + " on-line · " + (l.length - online) + " manuais") +
          st(concl, "Atendimentos concluídos", conf + pend ? (conf + pend) + " ainda por acontecer" : "") +
          st(canc, "Cancelamentos", l.length ? Math.round(canc * 100 / l.length) + "% do total" : "") +
          st(faltas, "Faltas", concl + faltas ? "comparecimento de " + Math.round(concl * 100 / (concl + faltas)) + "%" : "") +
        "</div>" +
        '<div class="grid-2">' +
          '<section class="panel"><h2 style="margin-bottom:1rem">Serviços mais agendados</h2>' +
            (servs.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Serviço</th><th class="num">Agend.</th><th class="num">Concl.</th><th style="width:30%"><span class="sr-only">Proporção</span></th></tr></thead><tbody>' +
              servs.map(function (s) { return "<tr><td>" + S.esc(s) + '</td><td class="num">' + porServ[s].total + '</td><td class="num">' + porServ[s].concl + '</td><td><span class="bar-track"><span class="bar" style="width:' + Math.round(porServ[s].total * 100 / maxS) + '%"></span></span></td></tr>'; }).join("") +
              "</tbody></table></div>" : '<div class="empty">Sem agendamentos no período.</div>') + "</section>" +
          '<section class="panel"><h2 style="margin-bottom:1rem">Atendimentos por mês</h2>' +
            (meses.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th class="num">Total</th><th class="num">Concl.</th><th class="num">Canc.</th><th class="num">Faltas</th><th style="width:22%"><span class="sr-only">Proporção</span></th></tr></thead><tbody>' +
              meses.map(function (m) { var x = porMes[m]; return "<tr><td>" + S.esc(T.format.monthOf(m + "-01")) + '</td><td class="num">' + x.total + '</td><td class="num">' + x.completed + '</td><td class="num">' + x.cancelled + '</td><td class="num">' + x.no_show + '</td><td><span class="bar-track"><span class="bar" style="width:' + Math.round(x.total * 100 / maxM) + '%"></span></span></td></tr>'; }).join("") +
              "</tbody></table></div>" : '<div class="empty">Sem agendamentos no período.</div>') + "</section>" +
        "</div>" +
        '<section class="panel"><div class="panel__head"><h2>Agendamentos do período</h2><button type="button" class="btn btn--outline btn--sm" data-csv' + (l.length ? "" : " disabled") + '><svg class="icon" aria-hidden="true"><use href="#i-download"/></svg>Exportar planilha (CSV)</button></div>' +
          '<p class="small muted" style="margin-bottom:.75rem">O arquivo contém dados pessoais de pacientes: guarde em local seguro e não compartilhe.</p>' +
          (l.length ? '<div class="table-wrap"><table class="table table--cards"><thead><tr><th>Data</th><th>Paciente</th><th>Serviço</th><th>Origem</th><th>Situação</th></tr></thead><tbody>' +
            l.slice(0, 300).map(function (a) {
              return '<tr><td data-th="Data" class="nowrap">' + S.esc(T.format.date(a.startsAt, tz)) + " " + S.esc(T.format.time(a.startsAt, tz)) + '</td><td data-th="Paciente">' + S.esc(a.patientName) + '</td><td data-th="Serviço">' + S.esc(a.serviceName) +
                '</td><td data-th="Origem">' + (a.source === "online" ? "On-line" : "Manual") + "</td><td>" + S.chipStatus(a.status) + "</td></tr>";
            }).join("") + "</tbody></table></div>" + (l.length > 300 ? '<p class="small muted">Mostrando 300 de ' + l.length + ". A exportação inclui todos.</p>" : "") : '<div class="empty">Sem agendamentos no período.</div>') +
        "</section>";
    }).catch(function (e) { box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }
  function st(v, l, n) { return '<div class="stat"><span class="stat__value">' + v + '</span><span class="stat__label">' + S.esc(l) + "</span>" + (n ? '<span class="stat__note">' + S.esc(n) + "</span>" : "") + "</div>"; }

  S.$("[data-resultado]").addEventListener("click", function (e) {
    if (!e.target.closest("[data-csv]")) return;
    var STATUS = { pending: "Aguardando confirmação", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado", no_show: "Falta" };
    function cel(v) { v = String(v == null ? "" : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; } // evita fórmulas maliciosas no Excel
    var linhas = [["Data", "Horário", "Paciente", "Telefone", "Serviço", "Duração (min)", "Origem", "Situação"].map(cel).join(";")];
    dados.forEach(function (a) {
      linhas.push([T.format.date(a.startsAt, tz), T.format.time(a.startsAt, tz), a.patientName, a.patientPhone ? S.telefone(a.patientPhone) : "", a.serviceName, a.durationMinutes,
        a.source === "online" ? "On-line" : "Manual", STATUS[a.status] || a.status].map(cel).join(";"));
    });
    var blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "agendamentos_" + periodo[0] + "_a_" + periodo[1] + ".csv"; link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2000);
    S.toast("Planilha exportada.");
  });

  function proximos() {
    var agora = new Date();
    PS.api.agendamentos(agora.toISOString(), new Date(agora.getTime() + 14 * 86400000).toISOString()).then(function (l) {
      l = l.filter(function (a) { return a.status === "confirmed" || a.status === "pending"; });
      S.$("[data-proximos]").innerHTML = l.length ? '<div class="ag-list">' + l.map(function (a) { return PS.admin.itemAgenda(a, tz, true); }).join("") + "</div>" : '<div class="empty">Nenhum atendimento nos próximos 14 dias.</div>';
      S.$("[data-proximos]")._l = l;
    });
  }
  S.$("[data-proximos]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ag]"); if (!b) return;
    var a = (this._l || []).filter(function (x) { return x.id === b.getAttribute("data-ag"); })[0];
    if (a) PS.admin.abrirAgendamento(a, proximos);
  });

  S.$("#pac").addEventListener("change", function () {
    var box = S.$("[data-hist]"), id = this.value;
    if (!id) { box.innerHTML = ""; return; }
    box.innerHTML = '<p class="loading"><span class="spinner"></span>Carregando…</p>';
    PS.api.paciente(id).then(function (p) {
      box.innerHTML = p.appointments.length ? '<table class="table table--cards"><thead><tr><th>Data</th><th>Serviço</th><th>Situação</th></tr></thead><tbody>' +
        p.appointments.map(function (a) { return '<tr><td data-th="Data">' + S.esc(T.format.date(a.startsAt, tz)) + " " + S.esc(T.format.time(a.startsAt, tz)) + '</td><td data-th="Serviço">' + S.esc(a.serviceName) + "</td><td>" + S.chipStatus(a.status) + "</td></tr>"; }).join("") +
        "</tbody></table>" : '<div class="empty">Sem agendamentos.</div>';
    }).catch(function (e) { box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  });
})();
