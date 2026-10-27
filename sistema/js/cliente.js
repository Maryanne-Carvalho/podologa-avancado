/* ==========================================================================
   PORTAL DO CLIENTE
   entrar · cadastro · recuperar senha · nova senha · meus agendamentos · meus dados
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var page = document.body.getAttribute("data-page");
  var params = new URLSearchParams(location.search);
  var voltarQS = params.get("voltar") ? "?voltar=" + encodeURIComponent(params.get("voltar")) : "";

  function emailOk(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()); }

  /* Mostrar/ocultar senha */
  S.$all("[data-toggle-senha]").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = b.parentNode.querySelector("input");
      var ver = i.type === "password";
      i.type = ver ? "text" : "password";
      b.textContent = ver ? "Ocultar" : "Mostrar";
      b.setAttribute("aria-pressed", ver ? "true" : "false");
    });
  });

  function contasDemo(alvo, tipo) {
    if (!alvo) return;
    if (PS.api.modo !== "demo") { alvo.remove(); return; }
    var c = PS.api.demo.contas()[tipo];
    alvo.innerHTML = "<strong>Demonstração:</strong> não existe login real aqui. Use a conta fictícia " +
      "<code>" + S.esc(c.email) + "</code> com a senha <code>" + S.esc(c.senha) + '</code>, ou crie uma conta de teste. ' +
      '<button type="button" class="btn btn--xs btn--outline" data-preencher>Preencher</button>';
    alvo.hidden = false;
    S.$("[data-preencher]", alvo).addEventListener("click", function () {
      S.$("#email").value = c.email; S.$("#senha").value = c.senha; S.$("#senha").focus();
    });
    if (params.get("demo") === tipo) { S.$("#email").value = c.email; S.$("#senha").value = c.senha; }
  }
  PS.sys.contasDemo = contasDemo;

  /* ======================= ENTRAR ======================= */
  if (page === "entrar") {
    var msg = S.$("[data-msg]");
    PS.api.pronto.then(function () {
      contasDemo(S.$("[data-demo-contas]"), "cliente");
      return PS.api.sessao();
    }).then(function (s) {
      if (s && s.role === "client" && !params.get("saiu")) location.replace(S.voltarPara("index.html"));
    }).catch(function (e) { S.alerta(msg, S.mensagem(e)); });
    S.$("[data-link-cadastro]").href = "cadastro.html" + voltarQS;
    if (params.get("saiu")) S.alerta(msg, "Você saiu da sua conta.", "ok");
    if (params.get("motivo") === "sem-cadastro") S.alerta(msg, "Esta conta não tem cadastro de cliente nesta clínica.", "info");
    if (params.get("voltar") === "agendar.html") S.alerta(msg, "Entre para confirmar o horário escolhido. Sua escolha está guardada.", "info");

    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = S.$("#email"), senha = S.$("#senha"), btn = S.$("[data-enviar]");
      var ok = true;
      S.erroCampo(email, emailOk(email.value) ? "" : "Informe um e-mail válido."); ok = ok && emailOk(email.value);
      S.erroCampo(senha, senha.value ? "" : "Informe a senha."); ok = ok && !!senha.value;
      if (!ok) return;
      S.ocupado(btn, true, "Entrando…"); S.alerta(msg, null);
      PS.api.entrar(email.value, senha.value, "client").then(function () {
        location.href = S.voltarPara("index.html");
      }).catch(function (err) {
        S.ocupado(btn, false);
        S.alerta(msg, S.mensagem(err));
        if (err.code === "USE_ADMIN_LOGIN") msg.insertAdjacentHTML("beforeend", ' <a href="../admin/entrar.html">Ir para a Área da podóloga</a>');
      });
    });
  }

  /* ======================= CADASTRO ======================= */
  if (page === "cadastro") {
    var msgC = S.$("[data-msg]");
    S.$("[data-link-entrar]").href = "entrar.html" + voltarQS;
    PS.api.pronto.then(function () {
      if (PS.api.modo === "demo") { var a = S.$("[data-demo-aviso]"); a.hidden = false; }
    }).catch(function (e) { S.alerta(msgC, S.mensagem(e)); });

    S.$("#telefone").addEventListener("input", function () { this.value = this.value.replace(/[^\d()\s-]/g, ""); });

    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = S.$("#nome"), tel = S.$("#telefone"), email = S.$("#email"), senha = S.$("#senha"), conf = S.$("#senha2"), aceite = S.$("#aceite");
      var digitos = tel.value.replace(/\D/g, "");
      var erros = 0;
      function chk(input, cond, m) { S.erroCampo(input, cond ? "" : m); if (!cond) erros++; }
      chk(nome, nome.value.trim().replace(/\s+/g, " ").length >= 2 && nome.value.trim().indexOf(" ") > 0, "Informe nome e sobrenome.");
      chk(tel, digitos.length >= 10 && digitos.length <= 13, "Informe o telefone com DDD.");
      chk(email, emailOk(email.value), "Informe um e-mail válido.");
      chk(senha, senha.value.length >= 8, "Use pelo menos 8 caracteres.");
      chk(conf, conf.value === senha.value && conf.value.length > 0, "As senhas não são iguais.");
      chk(aceite, aceite.checked, "É preciso aceitar a política de privacidade.");
      if (erros) { var first = S.$('[aria-invalid="true"]'); if (first) first.focus(); return; }
      var btn = S.$("[data-enviar]");
      S.ocupado(btn, true, "Criando conta…"); S.alerta(msgC, null);
      PS.api.cadastrarCliente({ nome: nome.value, telefone: digitos, email: email.value, senha: senha.value, aceite: aceite.checked }).then(function (r) {
        if (r.precisaConfirmarEmail) {
          S.$("[data-form]").hidden = true;
          S.alerta(msgC, "Conta criada! Enviamos um link de confirmação para " + email.value.trim() + ". Depois de confirmar, entre para concluir o agendamento.", "ok");
          return;
        }
        location.href = S.voltarPara("index.html");
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msgC, S.mensagem(err)); });
    });
  }

  /* ======================= RECUPERAR SENHA ======================= */
  if (page === "recuperar") {
    var msgR = S.$("[data-msg]");
    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = S.$("#email"), btn = S.$("[data-enviar]");
      if (!emailOk(email.value)) { S.erroCampo(email, "Informe um e-mail válido."); return; }
      S.erroCampo(email, "");
      S.ocupado(btn, true, "Enviando…");
      PS.api.pronto.then(function () { return PS.api.pedirNovaSenha(email.value, "nova-senha.html"); }).then(function (r) {
        S.ocupado(btn, false);
        S.alerta(msgR, "Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.", "ok");
        if (PS.api.modo === "demo") {
          var box = S.$("[data-demo-link]");
          box.hidden = false;
          box.innerHTML = r.linkDeTeste
            ? "<strong>Demonstração:</strong> nenhum e-mail é enviado. Use o link de teste: <a href=\"" + S.esc(r.linkDeTeste) + "\">criar nova senha</a>."
            : "<strong>Demonstração:</strong> não há conta com este e-mail. (Na vida real a mensagem acima é a mesma, para não revelar quem tem conta.)";
        }
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msgR, S.mensagem(err)); });
    });
  }

  /* ======================= NOVA SENHA ======================= */
  if (page === "nova-senha") {
    var msgN = S.$("[data-msg]");
    var demoToken = (location.hash.match(/demo-token=([\w]+)/) || [])[1];
    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var s1 = S.$("#senha"), s2 = S.$("#senha2"), btn = S.$("[data-enviar]");
      S.erroCampo(s1, s1.value.length >= 8 ? "" : "Use pelo menos 8 caracteres.");
      S.erroCampo(s2, s2.value === s1.value ? "" : "As senhas não são iguais.");
      if (s1.value.length < 8 || s1.value !== s2.value) return;
      S.ocupado(btn, true, "Salvando…");
      PS.api.pronto.then(function () { return PS.api.definirNovaSenha(s1.value, { demoToken: demoToken }); }).then(function () {
        S.$("[data-form]").hidden = true;
        S.alerta(msgN, "Senha alterada. Agora você já pode entrar com a nova senha.", "ok");
        S.$("[data-depois]").hidden = false;
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msgN, S.mensagem(err)); });
    });
  }

  /* ======================= MEUS AGENDAMENTOS ======================= */
  if (page === "agendamentos") {
    var area = S.$("[data-lista]"), clinica, regras;
    S.proteger("client").then(function (s) {
      S.$("[data-nome]").textContent = s.name.split(" ")[0];
      return PS.api.clinica();
    }).then(function (c) { clinica = c; regras = c.settings; S.aplicarCoresDaClinica(c); carregar(); })
      .catch(function (e) { area.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

    function podeAlterar(a, horas) { return new Date(a.startsAt).getTime() - Date.now() > horas * 3600000; }

    function carregar() {
      area.innerHTML = '<p class="loading"><span class="spinner" aria-hidden="true"></span>Carregando seus agendamentos…</p>';
      PS.api.meusAgendamentos().then(function (lista) {
        var agora = Date.now();
        var prox = lista.filter(function (a) { return (a.status === "pending" || a.status === "confirmed") && new Date(a.startsAt).getTime() > agora; });
        var hist = lista.filter(function (a) { return prox.indexOf(a) === -1; }).reverse();
        var tz = clinica.timezone;
        var html = '<section aria-labelledby="h-prox"><div class="panel__head"><h2 id="h-prox">Próximos atendimentos</h2><a class="btn btn--primary btn--sm" href="../agendar.html"><svg class="icon" aria-hidden="true"><use href="#i-calendar-plus"/></svg>Novo agendamento</a></div>';
        if (!prox.length) html += '<div class="empty">Você não tem atendimentos marcados. <a href="../agendar.html">Ver horários livres</a></div>';
        else html += '<div class="appt-cards">' + prox.map(function (a) {
          var r = a.request && a.request.status === "pending" ? a.request : null;
          var podeC = podeAlterar(a, regras.cancelMinHours), podeR = podeAlterar(a, regras.rescheduleMinHours);
          return '<article class="appt-card" aria-label="' + S.esc(a.serviceName) + '">' +
            '<div class="appt-card__top"><p class="appt-card__when">' + S.esc(T.format.dateLong(a.startsAt, tz)) + " · " + S.esc(T.format.time(a.startsAt, tz)) + "</p>" + S.chipStatus(a.status) + "</div>" +
            '<p class="appt-card__what">' + S.esc(a.serviceName) + " · " + a.durationMinutes + " min</p>" +
            (a.status === "pending" && !r ? '<p class="small muted">A clínica ainda vai confirmar este horário.</p>' : "") +
            (r ? '<p class="appt-card__req"><strong>Aguardando confirmação:</strong> ' + (r.type === "cancel" ? "pedido de cancelamento" : "pedido para mudar para " + S.esc(T.format.dateShort(r.proposedStartsAt, tz)) + " às " + S.esc(T.format.time(r.proposedStartsAt, tz))) +
              ' <button type="button" class="btn btn--xs btn--outline" data-desistir="' + r.id + '">Desistir do pedido</button></p>' : "") +
            '<div class="actions-row">' +
              (r ? "" :
                '<button type="button" class="btn btn--outline btn--sm" data-reagendar="' + a.id + '"' + (podeR ? "" : " disabled") + ">Reagendar</button>" +
                '<button type="button" class="btn btn--ghost btn--sm" data-cancelar="' + a.id + '"' + (podeC ? "" : " disabled") + ">Cancelar</button>") +
            "</div>" +
            (!r && (!podeC || !podeR) ? '<p class="small muted">O prazo para alterar pelo site terminou. Fale com a clínica pelo WhatsApp.</p>' : "") +
          "</article>";
        }).join("") + "</div>";
        html += "</section>";
        html += '<section class="panel panel--soft small" style="margin-top:1rem" aria-label="Regras da clínica"><strong>Regras da clínica:</strong> ' +
          "cancelamento pelo site até " + regras.cancelMinHours + " h antes" + (regras.clientCancelMode === "approval" ? " (depende de confirmação da clínica)" : "") +
          "; reagendamento até " + regras.rescheduleMinHours + " h antes" + (regras.clientRescheduleMode === "approval" ? " (depende de confirmação da clínica)" : "") + ".</section>";
        html += '<section style="margin-top:2rem" aria-labelledby="h-hist"><h2 id="h-hist" style="margin-bottom:1rem">Histórico</h2>';
        if (!hist.length) html += '<div class="empty">Seu histórico aparece aqui depois do primeiro atendimento.</div>';
        else html += '<div class="panel"><table class="table table--cards"><thead><tr><th>Data</th><th>Serviço</th><th>Situação</th></tr></thead><tbody>' +
          hist.map(function (a) {
            return '<tr><td data-th="Data">' + S.esc(T.format.date(a.startsAt, tz)) + " " + S.esc(T.format.time(a.startsAt, tz)) + '</td><td data-th="Serviço">' + S.esc(a.serviceName) + "</td><td>" + S.chipStatus(a.status) + "</td></tr>";
          }).join("") + "</tbody></table></div>";
        html += "</section>";
        area.innerHTML = html;
        area._lista = lista;
      }).catch(function (e) { area.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
    }

    area.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var lista = area._lista || [];
      if (b.hasAttribute("data-cancelar")) {
        var a = lista.filter(function (x) { return x.id === b.getAttribute("data-cancelar"); })[0];
        S.confirmar({ titulo: "Cancelar este atendimento?", texto: a.serviceName + " · " + T.format.dateLong(a.startsAt, clinica.timezone) + " às " + T.format.time(a.startsAt, clinica.timezone) +
          (regras.clientCancelMode === "approval" && a.status !== "pending" ? ". O pedido será enviado à clínica e ficará aguardando confirmação." : ". O horário ficará livre para outra pessoa."),
          campo: "Motivo (opcional)", confirmar: "Cancelar atendimento", cancelar: "Manter", perigo: true })
          .then(function (r) {
            if (!r) return;
            PS.api.cancelarMeu(a.id, r.texto).then(function (res) {
              S.toast(res === "cancelled" ? "Atendimento cancelado." : "Pedido de cancelamento enviado. Aguardando confirmação da clínica.");
              carregar();
            }).catch(function (err) { S.toast(S.mensagem(err), "erro"); carregar(); });
          });
      }
      if (b.hasAttribute("data-reagendar")) {
        var ap = lista.filter(function (x) { return x.id === b.getAttribute("data-reagendar"); })[0];
        var d = S.janela("Escolher novo horário", '<p class="muted small" style="margin-bottom:1rem">' + S.esc(ap.serviceName) + " · horário atual: " + S.esc(T.format.dateShort(ap.startsAt, clinica.timezone)) + " às " + S.esc(T.format.time(ap.startsAt, clinica.timezone)) + "</p>" +
          '<div data-sel></div><p class="alert" data-erro hidden></p><div class="sys-dialog__actions" style="margin-top:1rem"><button type="button" class="btn btn--primary" data-ok disabled>Confirmar novo horário</button></div>', { larga: true });
        var escolhido = null;
        PS.seletorHorario(S.$("[data-sel]", d), {
          serviceId: ap.serviceId, tz: clinica.timezone, horizonDays: regras.bookingHorizonDays, ignoreId: ap.id, lado: false,
          onChange: function (s) { escolhido = s; S.$("[data-ok]", d).disabled = !s; }
        });
        S.$("[data-ok]", d).addEventListener("click", function () {
          var btn = this;
          S.ocupado(btn, true, "Enviando…");
          PS.api.reagendarMeu(ap.id, escolhido.startsAt).then(function (res) {
            d.close();
            S.toast(res === "rescheduled" ? "Horário alterado." : "Pedido de reagendamento enviado. Aguardando confirmação da clínica.");
            carregar();
          }).catch(function (err) { S.ocupado(btn, false); S.alerta(S.$("[data-erro]", d), S.mensagem(err)); });
        });
      }
      if (b.hasAttribute("data-desistir")) {
        PS.api.desistirDoPedido(b.getAttribute("data-desistir")).then(function () { S.toast("Pedido retirado."); carregar(); })
          .catch(function (err) { S.toast(S.mensagem(err), "erro"); });
      }
    });
  }

  /* ======================= MEUS DADOS ======================= */
  if (page === "dados") {
    var msgD = S.$("[data-msg]");
    S.proteger("client").then(function () { return Promise.all([PS.api.meuCadastro(), PS.api.clinica()]); }).then(function (r) {
      var p = r[0]; S.aplicarCoresDaClinica(r[1]);
      S.$("#nome").value = p.fullName; S.$("#telefone").value = S.telefone(p.phone); S.$("#email").value = p.email || "";
      S.$("[data-consent]").textContent = p.consentAt ? "Política de privacidade aceita em " + T.format.date(p.consentAt, r[1].timezone) + "." : "";
      var wa = r[1].whatsapp;
      S.$("[data-exclusao]").innerHTML = "Para pedir a exclusão do seu cadastro, fale com a clínica" + (wa ? " pelo WhatsApp " + S.esc(S.telefone(wa)) : "") +
        ". O cadastro é anonimizado e o histórico de atendimentos pode ser mantido sem identificação pelo prazo exigido por lei.";
    }).catch(function (e) { S.alerta(msgD, S.mensagem(e)); });

    S.$("[data-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = S.$("#nome"), tel = S.$("#telefone"), btn = S.$("[data-enviar]");
      var dig = tel.value.replace(/\D/g, "");
      S.erroCampo(nome, nome.value.trim().length >= 2 ? "" : "Informe o nome.");
      S.erroCampo(tel, dig.length >= 10 && dig.length <= 13 ? "" : "Informe o telefone com DDD.");
      if (nome.value.trim().length < 2 || dig.length < 10 || dig.length > 13) return;
      S.ocupado(btn, true, "Salvando…");
      PS.api.atualizarMeuCadastro({ nome: nome.value, telefone: dig }).then(function () {
        S.ocupado(btn, false); S.alerta(msgD, "Dados atualizados.", "ok");
      }).catch(function (err) { S.ocupado(btn, false); S.alerta(msgD, S.mensagem(err)); });
    });

    S.$("[data-baixar]").addEventListener("click", function () {
      PS.api.exportarMeusDados().then(function (d) {
        var blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "meus-dados.json"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        S.toast("Arquivo com seus dados baixado.");
      }).catch(function (e) { S.toast(S.mensagem(e), "erro"); });
    });
  }
})();
