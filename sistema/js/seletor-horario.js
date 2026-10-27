/* ==========================================================================
   SELETOR DE DATA E HORÁRIO
   Calendário do mês com os dias que têm horários livres e, ao escolher um
   dia, a lista de horários. Os horários vêm de PS.api.horariosLivres (no modo
   real, a função get_available_slots do banco). Dias sem horário aparecem
   riscados e não podem ser escolhidos.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, T = PS.tempo, S = PS.sys;

  PS.seletorHorario = function (container, opts) {
    var tz = opts.tz;
    var hoje = T.todayIn(tz);
    var limiteDias = opts.horizonDays || 60;
    var ultimoDia = T.addDays(hoje, limiteDias);
    var st = { serviceId: opts.serviceId, mes: (opts.inicioYmd || hoje).slice(0, 8) + "01", dia: null, slot: null, porDia: {}, carregando: false, pedido: 0 };

    container.innerHTML =
      '<div class="picker' + (opts.lado === false ? "" : " picker--side") + '">' +
        '<div class="cal" data-cal>' +
          '<div class="cal__head"><button type="button" class="cal__nav" data-prev aria-label="Mês anterior"><svg class="icon" aria-hidden="true"><use href="#i-chevron-left"/></svg></button>' +
          '<p class="cal__title" data-mes aria-live="polite"></p>' +
          '<button type="button" class="cal__nav" data-next aria-label="Próximo mês"><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button></div>' +
          '<div class="cal__grid" data-grid></div>' +
          '<div class="cal__legend"><span><i class="lg-free"></i>Dia com horários livres</span><span><i class="lg-none"></i>Sem horários</span></div>' +
        "</div>" +
        '<div class="slots-box" data-slots-box aria-live="polite"></div>' +
      "</div>";

    var grid = S.$("[data-grid]", container), titulo = S.$("[data-mes]", container), box = S.$("[data-slots-box]", container);
    var prev = S.$("[data-prev]", container), next = S.$("[data-next]", container);

    function fimDoMes(m) { var a = m.split("-").map(Number); var d = new Date(Date.UTC(a[0], a[1], 0)); return m.slice(0, 8) + T.pad(d.getUTCDate()); }
    function addMes(m, n) { var a = m.split("-").map(Number); var d = new Date(Date.UTC(a[0], a[1] - 1 + n, 1)); return d.getUTCFullYear() + "-" + T.pad(d.getUTCMonth() + 1) + "-01"; }

    function carregar() {
      if (!st.serviceId) { grid.innerHTML = ""; box.innerHTML = '<p class="muted">Escolha um serviço para ver os horários.</p>'; return Promise.resolve(); }
      var de = st.mes < hoje ? hoje : st.mes;
      var ate = fimDoMes(st.mes) > ultimoDia ? ultimoDia : fimDoMes(st.mes);
      var meu = ++st.pedido;
      st.carregando = true;
      desenhar();
      box.innerHTML = '<p class="loading"><span class="spinner" aria-hidden="true"></span>Consultando horários livres…</p>';
      if (de > ate) { st.porDia = {}; st.carregando = false; desenhar(); mostrarHorarios(); return Promise.resolve(); }
      return PS.api.horariosLivres(st.serviceId, de, ate, opts.ignoreId).then(function (lista) {
        if (meu !== st.pedido) return;
        st.porDia = {};
        lista.forEach(function (s) { (st.porDia[s.ymd] = st.porDia[s.ymd] || []).push(s); });
        st.carregando = false;
        if (st.dia && !st.porDia[st.dia]) { st.dia = null; }
        if (st.slot && !(st.porDia[st.slot.ymd] || []).some(function (x) { return x.startsAt === st.slot.startsAt; })) { st.slot = null; avisar(); }
        if (!st.dia) st.dia = Object.keys(st.porDia).sort()[0] || null;
        desenhar(); mostrarHorarios();
      }).catch(function (e) {
        if (meu !== st.pedido) return;
        st.carregando = false;
        box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + ' <button type="button" class="btn btn--xs btn--outline" data-retry>Tentar de novo</button></div>';
        S.$("[data-retry]", box).addEventListener("click", carregar);
      });
    }

    function desenhar() {
      titulo.textContent = T.format.monthOf(st.mes);
      prev.disabled = st.mes <= hoje.slice(0, 8) + "01";
      next.disabled = addMes(st.mes, 1) > ultimoDia;
      var html = T.WEEKDAYS_SHORT.map(function (w) { return '<span class="cal__wd" aria-hidden="true">' + w + "</span>"; }).join("");
      var wd0 = T.weekdayOf(st.mes);
      for (var i = 0; i < wd0; i++) html += '<span class="cal__day is-empty" aria-hidden="true"></span>';
      var fim = fimDoMes(st.mes);
      for (var d = st.mes; d <= fim; d = T.addDays(d, 1)) {
        var n = (st.porDia[d] || []).length;
        var cls = "cal__day" + (n ? " is-available" : "") + (d === st.dia ? " is-selected" : "") + (d === hoje ? " is-today" : "");
        var label = T.format.ymdLong(d) + (st.carregando ? "" : n ? ": " + n + (n === 1 ? " horário livre" : " horários livres") : ": sem horários");
        html += '<button type="button" class="' + cls + '" data-dia="' + d + '"' + (n ? "" : " disabled") + ' aria-label="' + S.esc(label) + '"' +
          (d === st.dia ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + (+d.slice(8)) + "</button>";
      }
      grid.innerHTML = html;
    }

    function mostrarHorarios() {
      if (st.carregando) return;
      if (!st.dia) {
        box.innerHTML = '<div class="empty">Não há horários livres neste mês. ' + (next.disabled ? "" : "Veja o próximo mês.") + "</div>";
        return;
      }
      var lista = st.porDia[st.dia] || [];
      var grupos = { "Manhã": [], "Tarde": [], "Noite": [] };
      lista.forEach(function (s) { var h = +s.hm.slice(0, 2); grupos[h < 12 ? "Manhã" : h < 18 ? "Tarde" : "Noite"].push(s); });
      var html = '<p class="slots-box__title">Horários livres em <span>' + S.esc(T.format.ymdLong(st.dia)) + "</span></p>" +
        '<div class="slots" role="radiogroup" aria-label="Horários livres">';
      Object.keys(grupos).forEach(function (g) {
        if (!grupos[g].length) return;
        html += '<p class="slots__period" aria-hidden="true">' + g + "</p>";
        grupos[g].forEach(function (s) {
          var sel = st.slot && st.slot.startsAt === s.startsAt;
          html += '<button type="button" class="slot" role="radio" aria-checked="' + (sel ? "true" : "false") + '" data-slot="' + s.startsAt + '" aria-label="' + s.hm + '">' + s.hm + "</button>";
        });
      });
      html += "</div>";
      if (opts.nota) html += '<p class="small muted">' + S.esc(opts.nota) + "</p>";
      box.innerHTML = html;
    }

    function avisar() { if (opts.onChange) opts.onChange(st.slot); }

    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dia]");
      if (!b || b.disabled) return;
      st.dia = b.getAttribute("data-dia");
      desenhar(); mostrarHorarios();
      var first = S.$(".slot", box); if (first) first.focus();
    });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-slot]");
      if (!b) return;
      var iso = b.getAttribute("data-slot");
      st.slot = (st.porDia[st.dia] || []).filter(function (s) { return s.startsAt === iso; })[0] || null;
      S.$all(".slot", box).forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      avisar();
    });
    box.addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) === -1) return;
      var all = S.$all(".slot", box), i = all.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === "ArrowRight" || e.key === "ArrowDown" ? Math.min(i + 1, all.length - 1) : Math.max(i - 1, 0);
      all[n].focus();
    });
    prev.addEventListener("click", function () { st.mes = addMes(st.mes, -1); st.dia = null; carregar(); });
    next.addEventListener("click", function () { st.mes = addMes(st.mes, 1); st.dia = null; carregar(); });

    carregar();
    return {
      definirServico: function (id) { st.serviceId = id; st.slot = null; st.dia = null; avisar(); return carregar(); },
      atualizar: function () { return carregar(); },
      escolhido: function () { return st.slot; },
      limpar: function () { st.slot = null; avisar(); mostrarHorarios(); }
    };
  };
})();
