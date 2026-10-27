/* ==========================================================================
   PAINEL · AGENDAMENTO MANUAL (telefone, WhatsApp ou presencial)
   Usa a MESMA regra de disponibilidade do agendamento on-line: o servidor
   revalida o horário antes de gravar e recusa horários ocupados.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var params = new URLSearchParams(location.search);
  var st = { paciente: null, servico: null, slot: null, servicos: [], seletor: null };
  var tz, alvo = S.$("[data-novo]");

  PS.admin.iniciar().then(function (ctx) {
    tz = ctx.clinica.timezone;
    return PS.api.servicos(false);
  }).then(function (svcs) {
    st.servicos = svcs;
    st.servico = svcs.filter(function (s) { return s.id === params.get("servico"); })[0] || null;
    montar();
    if (params.get("paciente")) {
      PS.api.paciente(params.get("paciente")).then(function (p) { if (!p.archived) escolherPaciente({ id: p.id, fullName: p.fullName, phone: p.phone }); }).catch(function () {});
    }
  }).catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  function montar() {
    alvo.innerHTML =
      '<section class="panel" aria-labelledby="h1p"><div class="panel__head"><h2 id="h1p">1. Paciente</h2><button type="button" class="btn btn--outline btn--sm" data-novo-pac>' +
        '<svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Cadastrar novo paciente</button></div>' +
        '<div data-pac-escolhido></div>' +
        '<div data-pac-busca><div class="search"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><input class="input" type="search" placeholder="Buscar por nome ou telefone" aria-label="Buscar paciente" data-q autocomplete="off"></div>' +
        '<div class="pat-list" data-resultados style="margin-top:.75rem"></div></div></section>' +
      '<section class="panel" aria-labelledby="h2p"><h2 id="h2p" style="margin-bottom:1rem">2. Serviço</h2>' +
        '<div class="choice-list" role="radiogroup" aria-labelledby="h2p">' + st.servicos.map(function (s) {
          return '<button type="button" class="choice" role="radio" aria-checked="' + (st.servico && st.servico.id === s.id) + '" data-svc="' + S.esc(s.id) + '">' +
            '<span class="choice__icon" aria-hidden="true"><svg class="icon"><use href="#i-foot"/></svg></span><span class="choice__title">' + S.esc(s.name) + '</span><span class="choice__meta">' + s.durationMinutes + " min" + (s.priceCents != null ? " · " + S.reais(s.priceCents) : "") + "</span></button>";
        }).join("") + "</div></section>" +
      '<section class="panel" aria-labelledby="h3p"><h2 id="h3p" style="margin-bottom:1rem">3. Data e horário</h2><div data-sel><p class="muted">Escolha o serviço para ver os horários livres.</p></div></section>' +
      '<section class="panel summary" aria-labelledby="h4p"><h2 id="h4p">4. Confirmar</h2>' +
        '<div data-resumo><p class="muted">Preencha as etapas acima.</p></div>' +
        '<div class="field" style="margin-top:1rem"><label class="field__label" for="nota">Observação administrativa (opcional)</label><textarea class="input" id="nota" rows="2" maxlength="500" placeholder="Ex.: marcou por telefone"></textarea><p class="field__hint">Só a clínica vê. Não registre informações de saúde.</p></div>' +
        '<p class="alert" data-erro hidden></p>' +
        '<div class="form-actions"><button type="button" class="btn btn--primary" data-confirmar disabled>Confirmar agendamento</button></div></section>';

    var q = S.$("[data-q]"), timer;
    q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(buscar, 220); });
    buscar();
    if (st.servico) montarSeletor();
  }

  function buscar() {
    var box = S.$("[data-resultados]"), termo = S.$("[data-q]").value;
    PS.api.pacientes(termo).then(function (l) {
      l = l.filter(function (p) { return !p.archived; }).slice(0, termo ? 12 : 6);
      box.innerHTML = l.length ? l.map(function (p) {
        return '<button type="button" class="pat-item" data-pac="' + S.esc(p.id) + '" data-nome="' + S.esc(p.fullName) + '" data-tel="' + S.esc(p.phone || "") + '"><span><strong>' + S.esc(p.fullName) + "</strong><span>" + S.esc(p.phone ? S.telefone(p.phone) : "sem telefone") + "</span></span>" +
          '<span class="small muted">' + (p.nextAppointment ? "próximo: " + S.esc(T.format.dateShort(p.nextAppointment, tz)) : "") + "</span></button>";
      }).join("") : '<div class="empty">Nenhum paciente encontrado. Use “Cadastrar novo paciente”.</div>';
    }).catch(function (e) { box.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }

  function escolherPaciente(p) {
    st.paciente = p;
    S.$("[data-pac-busca]").hidden = true;
    S.$("[data-pac-escolhido]").innerHTML = '<div class="pat-item" aria-current="true"><span><strong>' + S.esc(p.fullName) + "</strong><span>" + S.esc(p.phone ? S.telefone(p.phone) : "sem telefone") + "</span></span>" +
      '<button type="button" class="btn btn--ghost btn--xs" data-trocar>Trocar</button></div>';
    resumo();
  }

  function montarSeletor() {
    st.slot = null;
    var pre = params.get("inicio");
    st.seletor = PS.seletorHorario(S.$("[data-sel]"), {
      serviceId: st.servico.id, tz: tz, horizonDays: 180,
      inicioYmd: pre ? T.partsIn(new Date(pre), tz).ymd : null,
      nota: "Mesma disponibilidade do site, sem a antecedência mínima exigida dos clientes.",
      onChange: function (s) { st.slot = s; resumo(); }
    });
  }

  function resumo() {
    var ok = st.paciente && st.servico && st.slot;
    S.$("[data-confirmar]").disabled = !ok;
    S.$("[data-resumo]").innerHTML = "<dl>" +
      "<div><dt>Paciente</dt><dd>" + (st.paciente ? S.esc(st.paciente.fullName) : "—") + "</dd></div>" +
      "<div><dt>Serviço</dt><dd>" + (st.servico ? S.esc(st.servico.name) + " · " + st.servico.durationMinutes + " min" : "—") + "</dd></div>" +
      "<div><dt>Quando</dt><dd>" + (st.slot ? S.esc(T.format.ymdLong(st.slot.ymd)) + " às " + st.slot.hm : "—") + "</dd></div></dl>";
  }

  alvo.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-pac")) return escolherPaciente({ id: b.getAttribute("data-pac"), fullName: b.getAttribute("data-nome"), phone: b.getAttribute("data-tel") });
    if (b.hasAttribute("data-trocar")) { st.paciente = null; S.$("[data-pac-escolhido]").innerHTML = ""; S.$("[data-pac-busca]").hidden = false; S.$("[data-q]").focus(); return resumo(); }
    if (b.hasAttribute("data-svc")) {
      st.servico = st.servicos.filter(function (s) { return s.id === b.getAttribute("data-svc"); })[0];
      S.$all("[data-svc]").forEach(function (x) { x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      montarSeletor(); return resumo();
    }
    if (b.hasAttribute("data-novo-pac")) return novoPaciente();
    if (b.hasAttribute("data-confirmar")) {
      var erro = S.$("[data-erro]");
      S.alerta(erro, null); S.ocupado(b, true, "Confirmando…");
      PS.api.agendar(st.servico.id, st.slot.startsAt, st.paciente.id).then(function (r) {
        var nota = S.$("#nota").value.trim();
        return (nota ? PS.api.salvarObservacao(r.id, nota) : Promise.resolve()).then(function () { return r; });
      }).then(function (r) {
        PS.admin.atualizarPendencias();
        alvo.innerHTML = '<section class="panel success"><span class="success__icon" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>' +
          "<h2>Agendamento confirmado</h2><p><strong>" + S.esc(st.paciente.fullName) + "</strong> · " + S.esc(st.servico.name) + "<br>" + S.esc(T.format.dateLong(r.startsAt, tz)) + " às " + S.esc(T.format.time(r.startsAt, tz)) + "</p>" +
          '<p class="muted small">Lembre-se de avisar o paciente com a data e o horário.</p>' +
          '<div class="form-actions" style="justify-content:center"><a class="btn btn--primary" href="agenda.html?dia=' + T.partsIn(new Date(r.startsAt), tz).ymd + '">Ver na agenda</a><a class="btn btn--outline" href="novo-agendamento.html">Novo agendamento</a></div></section>';
      }).catch(function (err) {
        S.ocupado(b, false); S.alerta(erro, S.mensagem(err));
        if (err.code === "SLOT_UNAVAILABLE" && st.seletor) { st.slot = null; resumo(); st.seletor.atualizar(); }
      });
    }
  });

  function novoPaciente() {
    var d = S.janela("Cadastrar novo paciente",
      '<form class="form" data-f novalidate>' +
        '<div class="field"><label class="field__label" for="np-nome">Nome completo</label><input class="input" id="np-nome" maxlength="120" required autocomplete="off"><p class="field__error" hidden></p></div>' +
        '<div class="field"><label class="field__label" for="np-tel">Telefone</label><input class="input" id="np-tel" type="tel" inputmode="tel" autocomplete="off"><p class="field__hint">Com DDD. Recomendado para avisar sobre o horário.</p><p class="field__error" hidden></p></div>' +
        '<div class="field"><label class="field__label" for="np-email">E-mail (opcional)</label><input class="input" id="np-email" type="email" autocomplete="off"><p class="field__error" hidden></p></div>' +
        '<p class="small muted">Colete só o necessário e informe ao paciente que os dados serão usados para os agendamentos.</p>' +
        '<p class="alert" data-erro hidden></p>' +
        '<div class="sys-dialog__actions"><button class="btn btn--primary" type="submit">Cadastrar e selecionar</button></div></form>');
    S.$("#np-nome", d).focus();
    S.$("[data-f]", d).addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = S.$("#np-nome", d), tel = S.$("#np-tel", d), email = S.$("#np-email", d);
      var dig = tel.value.replace(/\D/g, "");
      S.erroCampo(nome, nome.value.trim().length >= 2 ? "" : "Informe o nome.");
      S.erroCampo(tel, !dig || (dig.length >= 10 && dig.length <= 13) ? "" : "Telefone com DDD (10 a 13 dígitos).");
      S.erroCampo(email, !email.value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value) ? "" : "E-mail inválido.");
      if (S.$('[aria-invalid="true"]', d)) return;
      PS.api.salvarPaciente({ fullName: nome.value, phone: dig, email: email.value }).then(function (id) {
        d.close(); S.toast("Paciente cadastrado.");
        escolherPaciente({ id: id, fullName: nome.value.trim().replace(/\s+/g, " "), phone: dig });
      }).catch(function (err) { S.alerta(S.$("[data-erro]", d), S.mensagem(err)); });
    });
  }
})();
