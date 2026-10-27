/* ==========================================================================
   PAINEL · PACIENTES
   Busca, cadastro, contato, histórico, serviços realizados e anotações
   administrativas. Anotações não devem conter dados de saúde (decisão desta
   versão; ver docs/LGPD.md).
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var params = new URLSearchParams(location.search);
  var tz, lista = S.$("[data-lista]"), det = S.$("[data-detalhe]"), atual = params.get("id");

  PS.admin.iniciar().then(function (ctx) {
    tz = ctx.clinica.timezone;
    buscar();
    if (atual) abrir(atual);
  }).catch(function (e) { lista.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });

  var timer;
  S.$("[data-q]").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(buscar, 220); });

  function buscar() {
    PS.api.pacientes(S.$("[data-q]").value).then(function (l) {
      S.$("[data-total]").textContent = l.length + (l.length === 1 ? " paciente" : " pacientes");
      lista.innerHTML = l.length ? l.map(function (p) {
        return '<button type="button" class="pat-item" data-id="' + S.esc(p.id) + '"' + (p.id === atual ? ' aria-current="true"' : "") + "><span><strong>" + S.esc(p.fullName) + (p.archived ? ' <span class="tag-demo">anonimizado</span>' : "") +
          "</strong><span>" + S.esc(p.phone ? S.telefone(p.phone) : "sem telefone") + (p.hasAccount ? " · tem conta no site" : "") + '</span></span><span class="small muted nowrap">' +
          (p.nextAppointment ? "próximo " + S.esc(T.format.dateShort(p.nextAppointment, tz)) : p.lastVisit ? "último " + S.esc(T.format.date(p.lastVisit, tz)) : "") + "</span></button>";
      }).join("") : '<div class="empty">Nenhum paciente encontrado.</div>';
    }).catch(function (e) { lista.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }

  lista.addEventListener("click", function (e) {
    var b = e.target.closest("[data-id]");
    if (!b) return;
    atual = b.getAttribute("data-id");
    history.replaceState(null, "", "?id=" + encodeURIComponent(atual));
    S.$all("[data-id]", lista).forEach(function (x) { x.setAttribute("aria-current", x === b ? "true" : "false"); });
    abrir(atual);
    if (window.innerWidth < 900) det.scrollIntoView({ behavior: "smooth" });
  });

  function abrir(id) {
    det.innerHTML = '<p class="loading"><span class="spinner"></span>Carregando…</p>';
    PS.api.paciente(id).then(function (p) {
      var ap = p.appointments;
      var conta = function (s) { return ap.filter(function (a) { return a.status === s; }).length; };
      var feitos = {};
      ap.filter(function (a) { return a.status === "completed"; }).forEach(function (a) { feitos[a.serviceName] = (feitos[a.serviceName] || 0) + 1; });
      det.innerHTML =
        '<div class="panel__head"><h2>' + S.esc(p.fullName) + "</h2>" + (PS.api.modo === "demo" ? '<span class="tag-demo">paciente fictício</span>' : "") + "</div>" +
        '<dl class="kv"><div><dt>Telefone</dt><dd>' + S.esc(p.phone ? S.telefone(p.phone) : "—") + "</dd></div>" +
          "<div><dt>E-mail</dt><dd>" + S.esc(p.email || "—") + "</dd></div>" +
          "<div><dt>Conta no site</dt><dd>" + (p.hasAccount ? "Sim (o próprio paciente agenda)" : "Não") + "</dd></div>" +
          "<div><dt>Cadastro</dt><dd>" + (p.createdVia === "self" ? "Feito pelo paciente" : "Feito pela clínica") + (p.consentAt ? " · aceitou a política em " + S.esc(T.format.date(p.consentAt, tz)) : "") + "</dd></div></dl>" +
        (p.archived ? '<div class="alert alert--info" style="margin-top:1rem">Cadastro anonimizado a pedido do titular. O histórico é mantido sem identificação.</div>' :
          '<div class="actions-row" style="margin:1rem 0"><a class="btn btn--primary btn--sm" href="novo-agendamento.html?paciente=' + encodeURIComponent(p.id) + '">Novo agendamento</a>' +
          '<button type="button" class="btn btn--outline btn--sm" data-editar>Editar contato</button></div>') +
        '<div class="stats" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:1rem 0">' +
          mini(ap.length, "agendamentos") + mini(conta("completed"), "concluídos") + mini(conta("no_show"), "faltas") + mini(conta("cancelled"), "cancelados") + "</div>" +
        '<h3 style="margin:1.25rem 0 .5rem">Serviços realizados</h3>' +
        (Object.keys(feitos).length ? '<ul class="small" style="padding-left:1.1rem">' + Object.keys(feitos).map(function (k) { return "<li>" + S.esc(k) + ": " + feitos[k] + "</li>"; }).join("") + "</ul>" : '<p class="muted small">Nenhum atendimento concluído ainda.</p>') +
        '<h3 style="margin:1.25rem 0 .5rem">Histórico de agendamentos</h3>' +
        (ap.length ? '<div class="ag-list">' + ap.map(function (a) { return PS.admin.itemAgenda(a, tz, true); }).join("") + "</div>" : '<p class="muted small">Sem agendamentos.</p>') +
        '<h3 style="margin:1.5rem 0 .5rem">Anotações administrativas</h3>' +
        '<p class="small muted">Ex.: preferência de horário ou forma de contato. <strong>Não registre informações de saúde</strong> (diagnósticos, medicamentos, condições).</p>' +
        '<ul class="note-list" style="margin:.75rem 0">' + (p.notes.length ? p.notes.map(function (n) {
          return "<li><span>" + S.esc(n.body) + "<small>" + S.esc(T.format.date(n.createdAt, tz)) + '</small></span><button type="button" class="btn btn--ghost btn--xs" data-del-nota="' + S.esc(n.id) + '">Apagar</button></li>';
        }).join("") : '<li class="muted small">Nenhuma anotação.</li>') + "</ul>" +
        (p.archived ? "" : '<form class="form" data-nova-nota><label class="sr-only" for="nova-nota">Nova anotação</label><textarea class="input" id="nova-nota" rows="2" maxlength="500" placeholder="Nova anotação administrativa"></textarea>' +
          '<div class="form-actions"><button class="btn btn--outline btn--sm" type="submit">Adicionar anotação</button></div></form>') +
        (p.archived ? "" : '<details style="margin-top:2rem"><summary class="small">Pedido de exclusão de dados (LGPD)</summary><p class="small muted" style="margin:.75rem 0">Anonimiza o cadastro: remove nome, telefone e e-mail, apaga as anotações e cancela os horários futuros. O histórico de atendimentos permanece sem identificação. Confirme antes os prazos legais de guarda com sua assessoria.</p>' +
          '<button type="button" class="btn btn--danger btn--sm" data-anonimizar>Anonimizar cadastro</button></details>');
      det._p = p;
    }).catch(function (e) { det.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
  }
  function mini(v, l) { return '<div class="stat" style="padding:.7rem"><span class="stat__value" style="font-size:1.6rem">' + v + '</span><span class="stat__note">' + l + "</span></div>"; }

  det.addEventListener("click", function (e) {
    var p = det._p; if (!p) return;
    var ag = e.target.closest("[data-ag]");
    if (ag) { var a = p.appointments.filter(function (x) { return x.id === ag.getAttribute("data-ag"); })[0]; if (a) PS.admin.abrirAgendamento(a, function () { abrir(p.id); }); return; }
    if (e.target.closest("[data-editar]")) return editar(p);
    var dn = e.target.closest("[data-del-nota]");
    if (dn) {
      S.confirmar({ titulo: "Apagar esta anotação?", confirmar: "Apagar", perigo: true }).then(function (r) {
        if (r) PS.api.removerAnotacao(dn.getAttribute("data-del-nota")).then(function () { abrir(p.id); });
      });
      return;
    }
    if (e.target.closest("[data-anonimizar]")) {
      S.confirmar({ titulo: "Anonimizar o cadastro de " + p.fullName + "?", texto: "Esta ação não pode ser desfeita. Nome, telefone e e-mail serão apagados e os horários futuros, cancelados.", confirmar: "Anonimizar", perigo: true })
        .then(function (r) {
          if (!r) return;
          PS.api.anonimizarPaciente(p.id).then(function () { S.toast("Cadastro anonimizado."); abrir(p.id); buscar(); }).catch(function (err) { S.toast(S.mensagem(err), "erro"); });
        });
    }
  });
  det.addEventListener("submit", function (e) {
    if (!e.target.matches("[data-nova-nota]")) return;
    e.preventDefault();
    var t = S.$("#nova-nota", det).value.trim();
    if (!t) return;
    PS.api.adicionarAnotacao(det._p.id, t).then(function () { S.toast("Anotação adicionada."); abrir(det._p.id); }).catch(function (err) { S.toast(S.mensagem(err), "erro"); });
  });

  function editar(p) {
    var novo = !p;
    p = p || { fullName: "", phone: "", email: "" };
    var d = S.janela(novo ? "Cadastrar paciente" : "Editar contato",
      '<form class="form" data-f novalidate>' +
        '<div class="field"><label class="field__label" for="ed-nome">Nome completo</label><input class="input" id="ed-nome" maxlength="120" value="' + S.esc(p.fullName) + '"><p class="field__error" hidden></p></div>' +
        '<div class="field"><label class="field__label" for="ed-tel">Telefone</label><input class="input" id="ed-tel" type="tel" inputmode="tel" value="' + S.esc(p.phone ? S.telefone(p.phone) : "") + '"><p class="field__error" hidden></p></div>' +
        '<div class="field"><label class="field__label" for="ed-email">E-mail (opcional)</label><input class="input" id="ed-email" type="email" value="' + S.esc(p.email || "") + '"><p class="field__error" hidden></p></div>' +
        '<p class="alert" data-erro hidden></p><div class="sys-dialog__actions"><button class="btn btn--primary" type="submit">Salvar</button></div></form>');
    S.$("[data-f]", d).addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = S.$("#ed-nome", d), tel = S.$("#ed-tel", d), email = S.$("#ed-email", d), dig = tel.value.replace(/\D/g, "");
      S.erroCampo(nome, nome.value.trim().length >= 2 ? "" : "Informe o nome.");
      S.erroCampo(tel, !dig || (dig.length >= 10 && dig.length <= 13) ? "" : "Telefone com DDD.");
      S.erroCampo(email, !email.value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value) ? "" : "E-mail inválido.");
      if (S.$('[aria-invalid="true"]', d)) return;
      PS.api.salvarPaciente({ id: novo ? null : p.id, fullName: nome.value, phone: dig, email: email.value }).then(function (id) {
        d.close(); S.toast(novo ? "Paciente cadastrado." : "Contato atualizado."); atual = id; buscar(); abrir(id);
      }).catch(function (err) { S.alerta(S.$("[data-erro]", d), S.mensagem(err)); });
    });
  }
  S.$("[data-novo-paciente]").addEventListener("click", function () { editar(null); });
})();
