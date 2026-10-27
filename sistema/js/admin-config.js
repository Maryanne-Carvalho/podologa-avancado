/* ==========================================================================
   PAINEL · CONFIGURAÇÕES DA CLÍNICA
   Clínica · Serviços · Regras · Notificações · Identidade visual · Acesso
   Tudo pertence à clínica da administradora conectada (no modo real, o banco
   só aceita alterações da própria clínica).
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var params = new URLSearchParams(location.search);
  var aba = params.get("aba") || "clinica";
  var clinica, alvo = S.$("[data-aba-conteudo]");

  PS.admin.iniciar().then(function (ctx) { clinica = ctx.clinica; abas(); })
    .catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  function abas() {
    S.$all("[data-aba]").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-aba") === aba ? "true" : "false");
      b.onclick = function () { aba = b.getAttribute("data-aba"); history.replaceState(null, "", "?aba=" + aba); abas(); };
    });
    ({ clinica: telaClinica, servicos: telaServicos, regras: telaRegras, notificacoes: telaNotificacoes, cores: telaCores, acesso: telaAcesso }[aba] || telaClinica)();
  }
  function recarregarClinica() { return PS.api.clinica().then(function (c) { clinica = c; PS.admin.ctx.clinica = c; }); }
  function campo(id, label, val, tipo, extra, hint) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="' + (tipo || "text") + '" value="' + S.esc(val == null ? "" : val) + '" ' + (extra || "") + ">" +
      (hint ? '<p class="field__hint">' + hint + "</p>" : "") + '<p class="field__error" hidden></p></div>';
  }
  function salvarCom(form, fn, okMsg) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = S.$("[type=submit]", form), msg = S.$("[data-msg]", form);
      S.ocupado(btn, true, "Salvando…"); S.alerta(msg, null);
      Promise.resolve().then(fn).then(recarregarClinica).then(function () { S.ocupado(btn, false); S.alerta(msg, okMsg || "Alterações salvas.", "ok"); })
        .catch(function (err) { S.ocupado(btn, false); S.alerta(msg, S.mensagem(err)); });
    });
  }

  /* ---------------- Clínica ---------------- */
  function telaClinica() {
    var c = clinica;
    alvo.innerHTML = '<form class="panel form" data-f novalidate><h2>Dados da clínica</h2>' +
      (PS.api.modo === "demo" ? '<p class="small muted">Demonstração: dados fictícios.</p>' : "") +
      '<div class="form-grid">' +
        campo("c-nome", "Nome da clínica", c.name, "text", 'maxlength="120" required') +
        campo("c-prof", "Nome da profissional", c.professionalName, "text", 'maxlength="120"') +
        campo("c-tel", "Telefone", c.phone ? S.telefone(c.phone) : "", "tel", 'inputmode="tel"', "Com DDD.") +
        campo("c-wa", "WhatsApp", c.whatsapp || "", "tel", 'inputmode="tel"', "55 + DDD + número, só dígitos. Ex.: 5511900000000") +
        campo("c-email", "E-mail de contato", c.email, "email") +
        '<div class="field"><span class="field__label">Fuso horário</span><p>' + S.esc(c.timezone) + '</p><p class="field__hint">Definido na configuração inicial (supabase/setup-clinica-e-admin.sql).</p></div>' +
        '<div class="span-2">' + campo("c-end1", "Endereço", c.addressLine1, "text", 'maxlength="160"') + "</div>" +
        '<div class="span-2">' + campo("c-end2", "Bairro, cidade e estado", c.addressLine2, "text", 'maxlength="160"') + "</div>" +
      '</div><p class="alert" data-msg hidden></p><div class="form-actions"><button class="btn btn--primary" type="submit">Salvar dados da clínica</button></div></form>';
    salvarCom(S.$("[data-f]", alvo), function () {
      return PS.api.salvarClinica({ name: S.$("#c-nome").value, professionalName: S.$("#c-prof").value, phone: S.$("#c-tel").value, whatsapp: S.$("#c-wa").value,
        email: S.$("#c-email").value.trim(), addressLine1: S.$("#c-end1").value, addressLine2: S.$("#c-end2").value });
    }, "Dados da clínica salvos.");
  }

  /* ---------------- Serviços ---------------- */
  function telaServicos() {
    alvo.innerHTML = '<section class="panel"><div class="panel__head"><h2>Serviços oferecidos</h2><button type="button" class="btn btn--primary btn--sm" data-novo><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Novo serviço</button></div>' +
      '<p class="small muted" style="margin-bottom:1rem">A duração define quanto tempo cada atendimento ocupa na agenda. Serviços desativados somem do agendamento on-line, mas o histórico continua.</p>' +
      '<div data-lista><p class="loading"><span class="spinner"></span>Carregando…</p></div></section>';
    function listar() {
      PS.api.servicos(true).then(function (l) {
        S.$("[data-lista]", alvo).innerHTML = '<table class="table table--cards"><thead><tr><th>Serviço</th><th class="num">Duração</th><th class="num">Preço</th><th>Situação</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>' +
          l.map(function (s) {
            return '<tr><td data-th="Serviço"><strong>' + S.esc(s.name) + '</strong></td><td data-th="Duração" class="num">' + s.durationMinutes + ' min</td><td data-th="Preço" class="num">' + S.reais(s.priceCents) +
              "</td><td>" + (s.isActive ? '<span class="st st--confirmed">Ativo</span>' : '<span class="st st--cancelled">Desativado</span>') + '</td><td><button type="button" class="btn btn--ghost btn--xs" data-editar="' + S.esc(s.id) + '">Editar</button></td></tr>';
          }).join("") + "</tbody></table>";
        alvo._l = l;
      }).catch(function (e) { S.$("[data-lista]", alvo).innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
    }
    listar();
    alvo.onclick = function (e) {
      var ed = e.target.closest("[data-editar]");
      if (ed) return editar((alvo._l || []).filter(function (s) { return s.id === ed.getAttribute("data-editar"); })[0]);
      if (e.target.closest("[data-novo]")) editar(null);
    };
    function editar(s) {
      s = s || { name: "", durationMinutes: 50, priceCents: null, isActive: true, description: "" };
      var d = S.janela(s.id ? "Editar serviço" : "Novo serviço", '<form class="form" data-f novalidate>' +
        campo("s-nome", "Nome", s.name, "text", 'maxlength="80"') +
        '<div class="form-grid">' + campo("s-dur", "Duração (minutos)", s.durationMinutes, "number", 'min="10" max="480" step="5"') +
        campo("s-preco", "Preço (R$, opcional)", s.priceCents != null ? (s.priceCents / 100).toFixed(2).replace(".", ",") : "", "text", 'inputmode="decimal" placeholder="Ex.: 150,00"', "Deixe vazio para não exibir.") + "</div>" +
        '<div class="field"><label class="field__label" for="s-desc">Descrição curta</label><textarea class="input" id="s-desc" rows="2" maxlength="600">' + S.esc(s.description || "") + "</textarea></div>" +
        '<label class="check"><input type="checkbox" id="s-ativo"' + (s.isActive ? " checked" : "") + "><span>Disponível para agendamento</span></label>" +
        '<p class="alert" data-erro hidden></p><div class="sys-dialog__actions"><button class="btn btn--primary" type="submit">Salvar serviço</button></div></form>');
      S.$("[data-f]", d).addEventListener("submit", function (e) {
        e.preventDefault();
        var preco = S.$("#s-preco", d).value.trim().replace(/\./g, "").replace(",", ".");
        var centavos = preco === "" ? null : Math.round(parseFloat(preco) * 100);
        if (preco !== "" && (isNaN(centavos) || centavos < 0)) return S.alerta(S.$("[data-erro]", d), "Preço inválido. Use o formato 150,00.");
        PS.api.salvarServico({ id: s.id, name: S.$("#s-nome", d).value, durationMinutes: S.$("#s-dur", d).value, priceCents: centavos, isActive: S.$("#s-ativo", d).checked, description: S.$("#s-desc", d).value.trim() })
          .then(function () { d.close(); S.toast("Serviço salvo."); listar(); })
          .catch(function (err) { S.alerta(S.$("[data-erro]", d), S.mensagem(err)); });
      });
    }
  }

  /* ---------------- Regras de agendamento ---------------- */
  function telaRegras() {
    var s = clinica.settings;
    function radio(nome, valor, rotulo, atual) { return '<label class="check"><input type="radio" name="' + nome + '" value="' + valor + '"' + (atual === valor ? " checked" : "") + "><span>" + rotulo + "</span></label>"; }
    alvo.innerHTML = '<form class="stack" data-f novalidate>' +
      '<section class="panel form"><h2>Agendamento on-line</h2>' +
        '<fieldset class="field" style="border:0;padding:0"><legend class="field__label">Quando o cliente agenda pelo site</legend>' +
          radio("modo", "auto", "Confirmar na hora (recomendado)", s.onlineBookingMode) + radio("modo", "approval", "Deixar “Aguardando confirmação” até eu aprovar", s.onlineBookingMode) + "</fieldset>" +
        '<div class="form-grid">' + campo("r-max", "Máximo de agendamentos futuros por cliente", s.maxActiveBookingsPerClient, "number", 'min="1" max="20"', "Evita que uma pessoa reserve muitos horários.") + "</div>" +
        '<p class="small muted">Grade, intervalo entre consultas e antecedência ficam em <a href="agenda.html?aba=horarios">Agenda › Horários de atendimento</a>.</p></section>' +
      '<section class="panel form"><h2>Cancelamento e reagendamento pelo cliente</h2><div class="form-grid">' +
        campo("r-canc", "Cancelar pelo site até (horas antes)", s.cancelMinHours, "number", 'min="0" max="720"') +
        campo("r-reag", "Reagendar pelo site até (horas antes)", s.rescheduleMinHours, "number", 'min="0" max="720"') + "</div>" +
        '<fieldset class="field" style="border:0;padding:0"><legend class="field__label">Cancelamento</legend>' + radio("canc", "direct", "O cliente cancela direto", s.clientCancelMode) + radio("canc", "approval", "Precisa da minha aprovação", s.clientCancelMode) + "</fieldset>" +
        '<fieldset class="field" style="border:0;padding:0"><legend class="field__label">Reagendamento</legend>' + radio("reag", "direct", "O cliente troca direto para outro horário livre", s.clientRescheduleMode) + radio("reag", "approval", "Precisa da minha aprovação", s.clientRescheduleMode) + "</fieldset>" +
        '<div class="field"><label class="field__label" for="r-texto">Texto da política (aparece no resumo do agendamento)</label><textarea class="input" id="r-texto" rows="3" maxlength="1000">' + S.esc(s.policyText || "") + "</textarea></div>" +
      '</section><p class="alert" data-msg hidden></p><div class="form-actions"><button class="btn btn--primary" type="submit">Salvar regras</button></div></form>';
    var f = S.$("[data-f]", alvo);
    function val(n) { var x = S.$('input[name="' + n + '"]:checked', f); return x && x.value; }
    salvarCom(f, function () {
      return PS.api.salvarRegras({ onlineBookingMode: val("modo"), maxActiveBookingsPerClient: S.$("#r-max").value, cancelMinHours: S.$("#r-canc").value, rescheduleMinHours: S.$("#r-reag").value,
        clientCancelMode: val("canc"), clientRescheduleMode: val("reag"), policyText: S.$("#r-texto").value });
    }, "Regras salvas. Elas valem para os próximos pedidos dos clientes.");
  }

  /* ---------------- Notificações ---------------- */
  function telaNotificacoes() {
    alvo.innerHTML = '<p class="loading"><span class="spinner"></span>Carregando…</p>';
    PS.api.notificacoes().then(function (n) {
      alvo.innerHTML = '<form class="panel form" data-f novalidate><h2>Preferências de notificação</h2>' +
        campo("n-email", "E-mail para avisos da clínica", n.notifyEmail, "email") +
        '<label class="check"><input type="checkbox" id="n-novo"' + (n.notifyOnNewBooking ? " checked" : "") + "><span>Avisar quando houver um novo agendamento on-line</span></label>" +
        '<label class="check"><input type="checkbox" id="n-canc"' + (n.notifyOnCancellation ? " checked" : "") + "><span>Avisar sobre cancelamentos e pedidos de reagendamento</span></label>" +
        '<label class="check"><input type="checkbox" id="n-resumo"' + (n.notifyDailySummary ? " checked" : "") + "><span>Enviar resumo da agenda do dia seguinte</span></label>" +
        '<div class="alert alert--info">As preferências ficam salvas, mas o <strong>envio automático de e-mails ainda não está ativo</strong> nesta versão: ele exige um provedor de e-mail e uma função agendada no Supabase (ver docs/IMPLANTACAO.md).</div>' +
        '<p class="alert" data-msg hidden></p><div class="form-actions"><button class="btn btn--primary" type="submit">Salvar preferências</button></div></form>';
      salvarCom(S.$("[data-f]", alvo), function () {
        return PS.api.salvarNotificacoes({ notifyEmail: S.$("#n-email").value.trim(), notifyOnNewBooking: S.$("#n-novo").checked, notifyOnCancellation: S.$("#n-canc").checked, notifyDailySummary: S.$("#n-resumo").checked });
      }, "Preferências salvas.");
    }).catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }

  /* ---------------- Identidade visual ---------------- */
  function telaCores() {
    var b = clinica.settings.branding || { paletteId: "rosa-areia", overrides: {} };
    var st = PS.theme.getState();
    alvo.innerHTML = '<section class="panel"><h2>Identidade visual da clínica</h2>' +
      '<p class="muted" style="margin:.5rem 0 1rem">Escolha a paleta e, se quiser, ajuste a cor principal e a de destaque. A prévia aparece na hora em todo o painel.</p>' +
      '<div class="choice-list" role="radiogroup" aria-label="Paletas">' + PS.palettes.map(function (p) {
        return '<button type="button" class="choice" role="radio" aria-checked="' + (st.palette.id === p.id) + '" data-pal="' + p.id + '"><span class="choice__icon" aria-hidden="true" style="background:linear-gradient(135deg,' + p.colors.primary + " 0 50%," + p.colors.accent + ' 50% 100%)"></span>' +
          '<span class="choice__title">' + S.esc(p.name) + '</span><span class="choice__meta">' + S.esc(p.mood || "") + "</span></button>";
      }).join("") + "</div>" +
      '<div class="form-grid" style="margin-top:1.25rem"><div class="field"><label class="field__label" for="cor-p">Cor principal</label><input class="input" type="color" id="cor-p" value="' + st.colors.primary + '" style="min-height:52px"></div>' +
      '<div class="field"><label class="field__label" for="cor-a">Cor de destaque</label><input class="input" type="color" id="cor-a" value="' + st.colors.accent + '" style="min-height:52px"></div></div>' +
      '<p class="alert" data-contraste aria-live="polite" style="margin-top:1rem"></p>' +
      '<p class="small muted">Atualmente salvo para a clínica: <strong>' + S.esc((PS.theme.getPalette(b.paletteId) || {}).name || b.paletteId) + "</strong>" + (Object.keys(b.overrides || {}).length ? " (com ajustes)" : "") + ".</p>" +
      '<p class="alert" data-msg hidden></p>' +
      '<div class="form-actions"><button type="button" class="btn btn--primary" data-salvar>Salvar como cores da clínica</button><button type="button" class="btn btn--outline" data-padrao>Restaurar cores padrão</button></div>' +
      '<p class="small muted" style="margin-top:1rem">' + (PS.api.modo === "demo" ? "Na demonstração, as cores também mudam pelo botão Cores e ficam salvas neste navegador." : "No modo real, as cores salvas aqui valem para o site público e para as áreas do cliente e da podóloga.") + "</p></section>";
    function avaliar() {
      var s = PS.theme.getState();
      var pior = s.checks.reduce(function (m, c) { return c.ratio < m.ratio ? c : m; }, s.checks[0]);
      // O motor já escurece/clareia textos sozinho; mas se a cor ESCOLHIDA quase some no fundo,
      // botões e destaques ficam apagados. Avisamos a pessoa nos dois casos.
      var bruto = PS.color.contrast(s.colors.primary, s.colors.background);
      var fmt = function (n) { return n.toFixed(1).replace(".", ",") + ":1"; };
      var aviso = pior.ratio < 4.5 ? "Atenção: “" + pior.name.toLowerCase() + "” ficou com pouco contraste (" + fmt(pior.ratio) + "). Experimente um tom mais escuro."
        : bruto < 3 ? "Atenção: a cor principal tem pouco contraste com o fundo (" + fmt(bruto) + "). Os textos foram ajustados automaticamente, mas botões e destaques podem ficar apagados. Experimente um tom mais forte."
        : "Legibilidade confortável em todo o sistema.";
      S.alerta(S.$("[data-contraste]", alvo), aviso, pior.ratio >= 4.5 && bruto >= 3 ? "ok" : "error");
      S.$all("[data-pal]", alvo).forEach(function (x) { x.setAttribute("aria-checked", x.getAttribute("data-pal") === s.palette.id ? "true" : "false"); });
      S.$("#cor-p").value = s.colors.primary; S.$("#cor-a").value = s.colors.accent;
    }
    avaliar();
    S.$all("[data-pal]", alvo).forEach(function (x) { x.onclick = function () { PS.theme.setPalette(x.getAttribute("data-pal")); avaliar(); }; });
    S.$("#cor-p").oninput = function () { PS.theme.setOverride("primary", this.value, { animate: false }); avaliar(); };
    S.$("#cor-a").oninput = function () { PS.theme.setOverride("accent", this.value, { animate: false }); avaliar(); };
    S.$("[data-padrao]", alvo).onclick = function () { PS.theme.resetOriginal(); avaliar(); };
    S.$("[data-salvar]", alvo).onclick = function () {
      var s = PS.theme.getState(), btn = this;
      S.ocupado(btn, true, "Salvando…");
      PS.api.salvarCores({ paletteId: s.palette.id, overrides: s.overrides }).then(recarregarClinica).then(function () {
        S.ocupado(btn, false); S.alerta(S.$("[data-msg]", alvo), "Cores da clínica salvas: " + s.palette.name + (s.customized ? " (ajustada)" : "") + ".", "ok");
      }).catch(function (e) { S.ocupado(btn, false); S.alerta(S.$("[data-msg]", alvo), S.mensagem(e)); });
    };
  }

  /* ---------------- Acesso (administradoras) ---------------- */
  function telaAcesso() {
    var demo = PS.api.modo === "demo";
    alvo.innerHTML = '<section class="panel"><h2>Quem pode acessar a área administrativa</h2>' +
      '<p class="muted" style="margin:.5rem 0 1rem">Não existe cadastro aberto de administradora. A primeira conta é criada na configuração inicial do Supabase. Outras pessoas só entram por convite de uma administradora, e a permissão é conferida pelo banco a cada acesso.</p>' +
      (demo ? '<div class="alert alert--info">Na demonstração não há convites: a única administradora é a conta fictícia da podóloga.</div>' :
        '<form class="form" data-f novalidate>' + campo("inv-email", "E-mail da pessoa convidada", "", "email") +
        '<p class="alert" data-msg hidden></p><div class="form-actions"><button class="btn btn--primary" type="submit">Gerar convite</button></div></form>' +
        '<p class="small muted" style="margin-top:1rem">A pessoa cria uma conta com esse mesmo e-mail e usa o código do convite (válido por 7 dias, uso único). O código aparece só uma vez.</p>') +
      "</section>";
    var f = S.$("[data-f]", alvo);
    if (f) f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = S.$("#inv-email").value.trim(), msg = S.$("[data-msg]", f);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return S.alerta(msg, "Informe um e-mail válido.");
      PS.api.convidarAdministradora(email).then(function (codigo) {
        S.alerta(msg, "Convite criado. Envie este código para " + email + " por um canal seguro: " + codigo, "ok");
      }).catch(function (err) { S.alerta(msg, S.mensagem(err)); });
    });
  }
})();
