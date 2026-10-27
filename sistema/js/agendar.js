/* ==========================================================================
   AGENDAMENTO ON-LINE (página pública agendar.html)
   1 Serviço · 2 Data e horário · 3 Identificação · 4 Resumo · 5 Confirmação
   O visitante escolhe serviço e horário SEM precisar de login. Só para
   confirmar é preciso entrar ou criar a conta. A escolha fica guardada
   durante o login e volta aqui no resumo.
   A confirmação é sempre revalidada no servidor.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var raiz = document.getElementById("agendar");
  if (!raiz) return;
  var RASCUNHO = "avancado:rascunho-agendamento";

  var st = { passo: 1, clinica: null, servicos: [], servico: null, slot: null, sessao: null, seletor: null, resultado: null };
  var PASSOS = ["Serviço", "Data e horário", "Identificação", "Resumo", "Confirmação"];

  function salvarRascunho() {
    try { sessionStorage.setItem(RASCUNHO, JSON.stringify({ serviceId: st.servico && st.servico.id, slot: st.slot, em: Date.now() })); } catch (e) {}
  }
  function lerRascunho() {
    try {
      var r = JSON.parse(sessionStorage.getItem(RASCUNHO) || "null");
      if (r && Date.now() - r.em < 3600000) return r;
    } catch (e) {}
    return null;
  }
  function limparRascunho() { try { sessionStorage.removeItem(RASCUNHO); } catch (e) {} }

  function passos() {
    return '<ol class="wizard-steps" aria-label="Etapas do agendamento">' + PASSOS.map(function (p, i) {
      var n = i + 1;
      return "<li" + (n === st.passo ? ' aria-current="step"' : "") + (n < st.passo ? ' class="is-done"' : "") + "><span>" + p + "</span></li>";
    }).join("") + "</ol>";
  }

  function quando(slot) {
    return T.format.ymdLong(slot.ymd) + " às " + slot.hm;
  }

  function render() {
    var c = st.clinica, html = passos();
    if (st.passo === 1) {
      html += '<section class="panel" aria-labelledby="p1"><h2 id="p1">Qual atendimento você procura?</h2>' +
        '<p class="muted" style="margin:.35rem 0 1rem">Se não tiver certeza, escolha a avaliação podológica: ela é o ponto de partida.</p>' +
        '<div class="choice-list" role="radiogroup" aria-labelledby="p1">' +
        st.servicos.map(function (s) {
          var sel = st.servico && st.servico.id === s.id;
          return '<button type="button" class="choice" role="radio" aria-checked="' + sel + '" data-servico="' + S.esc(s.id) + '">' +
            '<span class="choice__icon" aria-hidden="true"><svg class="icon"><use href="#i-foot"/></svg></span>' +
            '<span class="choice__title">' + S.esc(s.name) + "</span>" +
            '<span class="choice__meta">' + s.durationMinutes + " min" + (s.priceCents != null ? " · " + S.reais(s.priceCents) + (PS.api.modo === "demo" ? " (valor ilustrativo)" : "") : "") +
            (s.description ? "<br>" + S.esc(s.description) : "") + "</span></button>";
        }).join("") + "</div>" +
        '<div class="form-actions" style="margin-top:1.25rem"><button type="button" class="btn btn--primary" data-ir="2"' + (st.servico ? "" : " disabled") + ">Ver datas disponíveis</button></div></section>";
    }
    if (st.passo === 2) {
      html += '<section class="panel" aria-labelledby="p2"><div class="panel__head"><h2 id="p2">Escolha o dia e o horário</h2>' +
        '<span class="muted">' + S.esc(st.servico.name) + " · " + st.servico.durationMinutes + " min</span></div>" +
        '<div data-seletor></div>' +
        '<div class="form-actions" style="margin-top:1.25rem"><button type="button" class="btn btn--outline" data-ir="1">Voltar</button>' +
        '<button type="button" class="btn btn--primary" data-ir="3" data-continuar' + (st.slot ? "" : " disabled") + ">Continuar</button></div></section>";
    }
    if (st.passo === 3) {
      var s = st.sessao;
      html += '<section class="panel" aria-labelledby="p3"><h2 id="p3">Identificação</h2>';
      if (s && s.role === "client") {
        html += '<p style="margin:.5rem 0 1rem">Você está conectada(o) como <strong>' + S.esc(s.name) + "</strong> (" + S.esc(s.email) + ").</p>" +
          '<div class="form-actions"><button type="button" class="btn btn--outline" data-ir="2">Voltar</button><button type="button" class="btn btn--primary" data-ir="4">Revisar agendamento</button></div>';
      } else if (s && s.role === "admin") {
        html += '<div class="alert alert--info" style="margin:.75rem 0">Você está conectada como administradora. Para marcar um horário para um paciente, use o agendamento manual do painel.</div>' +
          '<div class="form-actions"><a class="btn btn--primary" href="admin/novo-agendamento.html">Abrir agendamento manual</a></div>';
      } else {
        html += '<p class="muted" style="margin:.5rem 0 1rem">Para confirmar o horário de <strong>' + S.esc(quando(st.slot)) + "</strong>, entre na sua conta ou crie uma. Leva menos de um minuto e sua escolha fica guardada.</p>" +
          '<div class="form-actions"><a class="btn btn--primary" href="cliente/entrar.html?voltar=agendar.html" data-guardar>Entrar</a>' +
          '<a class="btn btn--outline" href="cliente/cadastro.html?voltar=agendar.html" data-guardar>Criar conta</a>' +
          '<button type="button" class="btn btn--ghost" data-ir="2">Trocar horário</button></div>' +
          '<p class="small muted" style="margin-top:1rem">Pedimos só nome, telefone e e-mail, para identificar o agendamento e avisar sobre mudanças. <a href="privacidade.html">Como usamos seus dados</a>.</p>';
      }
      html += "</section>";
    }
    if (st.passo === 4) {
      var regra = c.settings;
      html += '<section class="panel summary" aria-labelledby="p4"><h2 id="p4">Confira o agendamento</h2><dl>' +
        "<div><dt>Serviço</dt><dd>" + S.esc(st.servico.name) + "</dd></div>" +
        '<div><dt>Data</dt><dd>' + S.esc(T.format.ymdLong(st.slot.ymd)) + "</dd></div>" +
        "<div><dt>Horário</dt><dd>" + st.slot.hm + " (duração aproximada de " + st.servico.durationMinutes + " min)</dd></div>" +
        (st.servico.priceCents != null ? "<div><dt>Valor</dt><dd>" + S.reais(st.servico.priceCents) + (PS.api.modo === "demo" ? " <span class=\"tag-demo\">ilustrativo</span>" : "") + " · pagamento na clínica</dd></div>" : "") +
        "<div><dt>Local</dt><dd>" + S.esc([c.addressLine1, c.addressLine2].filter(Boolean).join(", ")) + (PS.api.modo === "demo" ? ' <span class="tag-demo">fictício</span>' : "") + "</dd></div>" +
        "<div><dt>Em nome de</dt><dd>" + S.esc(st.sessao.name) + "</dd></div>" +
        "</dl>" +
        '<div class="alert alert--info">' + S.esc(regra.policyText || ("Cancelamentos pelo site até " + regra.cancelMinHours + " horas antes.")) +
        (regra.onlineBookingMode === "approval" ? " Este agendamento ficará “Aguardando confirmação” até a clínica aprovar." : "") + "</div>" +
        '<p class="alert" data-erro hidden></p>' +
        '<div class="form-actions"><button type="button" class="btn btn--outline" data-ir="2">Trocar horário</button>' +
        '<button type="button" class="btn btn--primary" data-confirmar>Confirmar agendamento</button></div></section>';
    }
    if (st.passo === 5) {
      var r = st.resultado, pend = r.status === "pending";
      html += '<section class="panel success' + (pend ? " success--pending" : "") + '" aria-labelledby="p5" tabindex="-1" data-foco>' +
        '<span class="success__icon" aria-hidden="true"><svg class="icon"><use href="#i-' + (pend ? "clock" : "check") + '"/></svg></span>' +
        '<h2 id="p5">' + (pend ? "Pedido enviado: aguardando confirmação" : "Agendamento confirmado!") + "</h2>" +
        '<p><strong>' + S.esc(st.servico.name) + "</strong> · " + S.esc(T.format.dateLong(r.startsAt, c.timezone)) + " às " + S.esc(T.format.time(r.startsAt, c.timezone)) + "</p>" +
        '<p class="muted">' + (pend ? "A clínica vai analisar o pedido. Você acompanha a situação em Meus agendamentos." : "Você pode consultar, cancelar ou pedir para reagendar em Meus agendamentos, conforme as regras da clínica.") + "</p>" +
        (PS.api.modo === "demo" ? '<p class="small muted">Demonstração: nenhum aviso é enviado e nenhuma clínica real recebe este agendamento.</p>' : "") +
        '<div class="form-actions" style="justify-content:center"><a class="btn btn--primary" href="cliente/index.html">Ver meus agendamentos</a>' +
        '<button type="button" class="btn btn--outline" data-novo>Agendar outro horário</button></div></section>';
    }
    raiz.innerHTML = html;

    if (st.passo === 2) {
      st.seletor = PS.seletorHorario(S.$("[data-seletor]", raiz), {
        serviceId: st.servico.id, tz: c.timezone, horizonDays: c.settings.bookingHorizonDays,
        inicioYmd: st.slot ? st.slot.ymd : null,
        nota: "Horários no fuso da clínica (" + c.timezone.replace("_", " ") + "). Antecedência mínima de " + c.settings.bookingMinNoticeHours + " h.",
        onChange: function (slot) { st.slot = slot; var b = S.$("[data-continuar]", raiz); if (b) b.disabled = !slot; }
      });
    }
    var f = S.$("[data-foco]", raiz); if (f) f.focus();
  }

  function ir(n) {
    st.passo = n;
    render();
    raiz.scrollIntoView({ behavior: "smooth", block: "start" });
    var h = S.$("h2", raiz); if (h && n !== 5) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  raiz.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;
    if (t.hasAttribute("data-servico")) {
      var id = t.getAttribute("data-servico");
      st.servico = st.servicos.filter(function (s) { return s.id === id; })[0];
      st.slot = null;
      S.$all("[data-servico]", raiz).forEach(function (b) { b.setAttribute("aria-checked", b === t ? "true" : "false"); });
      S.$("[data-ir='2']", raiz).disabled = false;
      return;
    }
    if (t.hasAttribute("data-ir")) {
      var n = +t.getAttribute("data-ir");
      if (n === 3 && st.sessao && st.sessao.role === "client") n = 4;
      ir(n);
      return;
    }
    if (t.hasAttribute("data-guardar")) { salvarRascunho(); return; }
    if (t.hasAttribute("data-novo")) { st.servico = null; st.slot = null; st.resultado = null; ir(1); return; }
    if (t.hasAttribute("data-confirmar")) {
      var erroEl = S.$("[data-erro]", raiz);
      S.alerta(erroEl, null);
      S.ocupado(t, true, "Confirmando…");
      PS.api.agendar(st.servico.id, st.slot.startsAt).then(function (r) {
        limparRascunho();
        st.resultado = r;
        ir(5);
      }).catch(function (err) {
        S.ocupado(t, false);
        if (err.code === "AUTH_REQUIRED") { salvarRascunho(); location.href = "cliente/entrar.html?voltar=agendar.html"; return; }
        S.alerta(erroEl, S.mensagem(err));
        if (err.code === "SLOT_UNAVAILABLE") {
          st.slot = null;
          var voltar = document.createElement("button");
          voltar.type = "button"; voltar.className = "btn btn--xs btn--outline"; voltar.textContent = "Escolher outro horário";
          voltar.style.marginLeft = ".5rem"; voltar.setAttribute("data-ir", "2");
          erroEl.appendChild(voltar);
        }
      });
    }
  });

  PS.api.pronto.then(function () {
    return Promise.all([PS.api.clinica(), PS.api.servicos(), PS.api.sessao()]);
  }).then(function (r) {
    st.clinica = r[0]; st.servicos = r[1]; st.sessao = r[2];
    PS.sys.aplicarCoresDaClinica(st.clinica);
    var q = new URLSearchParams(location.search).get("servico");
    var rasc = lerRascunho();
    if (rasc && rasc.serviceId && rasc.slot) {
      st.servico = st.servicos.filter(function (s) { return s.id === rasc.serviceId; })[0] || null;
      st.slot = rasc.slot;
      if (st.servico && st.sessao && st.sessao.role === "client") { st.passo = 4; }
      else if (st.servico) { st.passo = 3; }
    } else if (q) {
      st.servico = st.servicos.filter(function (s) { return s.id === q; })[0] || null;
      if (st.servico) st.passo = 2;
    }
    render();
  }).catch(function (e) {
    raiz.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>";
  });
})();
