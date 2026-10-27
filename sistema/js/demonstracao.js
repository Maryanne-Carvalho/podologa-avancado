/* ==========================================================================
   CENTRAL DE DEMONSTRAÇÃO
   Contas de teste, roteiro do que testar, teste de reserva dupla e botão
   para restaurar os dados fictícios. Só funciona no modo "demo".
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS, S = PS.sys, T = PS.tempo;
  var alvo = document.querySelector("[data-demo-estado]");
  if (!alvo) return;

  if (PS.api.modo !== "demo") {
    alvo.innerHTML = '<div class="panel"><h2>Demonstração desativada</h2><p class="muted">Esta instalação usa o banco de dados real (Supabase). Contas de teste e dados fictícios não existem aqui.</p></div>';
    return;
  }

  PS.api.pronto.then(function () { return PS.api.clinica(); }).then(function (clinica) {
    var C = PS.api.demo.contas();
    alvo.innerHTML =
      '<div class="grid-2">' +
        '<section class="panel" aria-labelledby="d-contas"><h2 id="d-contas">Contas de teste</h2>' +
          '<p class="muted small" style="margin-bottom:1rem">Existem só nesta demonstração. No modo real elas não existem e a podóloga é criada por um procedimento controlado.</p>' +
          '<dl class="kv"><div><dt>Podóloga</dt><dd><code>' + S.esc(C.podologa.email) + "</code><br>senha <code>" + S.esc(C.podologa.senha) + "</code></dd></div>" +
          '<div><dt>Cliente</dt><dd><code>' + S.esc(C.cliente.email) + "</code><br>senha <code>" + S.esc(C.cliente.senha) + "</code></dd></div></dl>" +
          '<div class="actions-row" style="margin-top:1rem"><a class="btn btn--primary btn--sm" href="admin/entrar.html?demo=podologa">Entrar como podóloga</a>' +
          '<a class="btn btn--outline btn--sm" href="cliente/entrar.html?demo=cliente">Entrar como cliente</a></div>' +
        "</section>" +
        '<section class="panel" aria-labelledby="d-roteiro"><h2 id="d-roteiro">O que testar</h2><ol class="small" style="padding-left:1.1rem;display:grid;gap:.45rem;margin-top:.5rem">' +
          '<li><a href="admin/agenda.html?aba=horarios">Configurar dias, horários, duração e pausas</a> (podóloga)</li>' +
          '<li><a href="admin/agenda.html?aba=bloqueios">Bloquear um horário, um dia inteiro ou férias</a></li>' +
          '<li><a href="admin/novo-agendamento.html">Fazer um agendamento manual</a> (paciente por telefone)</li>' +
          '<li><a href="agendar.html">Agendar como cliente pelo site</a></li>' +
          '<li><a href="cliente/index.html">Cancelar ou pedir reagendamento</a> (cliente) e responder em <a href="admin/index.html">Visão geral</a></li>' +
          '<li><a href="admin/pacientes.html">Cadastrar e consultar pacientes</a></li>' +
          '<li><a href="admin/relatorios.html">Ver relatórios por período</a></li>' +
          "<li>Trocar as cores no botão <strong>Cores</strong> (vale para o site e para as áreas do sistema)</li>" +
        "</ol></section>" +
      "</div>" +
      '<section class="panel" aria-labelledby="d-dupla"><div class="panel__head"><h2 id="d-dupla">Tentativa de reservar o mesmo horário duas vezes</h2>' +
        '<button type="button" class="btn btn--primary btn--sm" data-dupla><svg class="icon" aria-hidden="true"><use href="#i-flask"/></svg>Rodar o teste</button></div>' +
        '<p class="muted">Duas pessoas fictícias tentam reservar o mesmo horário no mesmo instante. Só uma pode conseguir.</p>' +
        '<div data-dupla-res aria-live="polite" style="margin-top:1rem"></div>' +
        '<p class="small muted" style="margin-top:1rem">No banco real, esta proteção foi testada com 8 reservas simultâneas: 1 aceita e 7 recusadas (veja <code>tests/RESULTADOS.md</code>).</p>' +
      "</section>" +
      '<section class="panel" aria-labelledby="d-reset"><h2 id="d-reset">Restaurar os dados fictícios</h2>' +
        '<p class="muted">Apaga tudo o que foi feito nesta demonstração (agendamentos, pacientes, ajustes) e volta ao estado inicial. Não afeta as cores escolhidas.</p>' +
        '<div class="actions-row" style="margin-top:1rem"><button type="button" class="btn btn--outline btn--sm" data-reset><svg class="icon" aria-hidden="true"><use href="#i-refresh"/></svg>Restaurar dados</button></div></section>' +
      '<section class="panel panel--soft" aria-labelledby="d-real"><h2 id="d-real">O que falta para funcionar de verdade</h2>' +
        '<ul class="small" style="padding-left:1.1rem;display:grid;gap:.4rem;margin-top:.5rem">' +
          "<li>Criar um projeto no Supabase e rodar os arquivos de <code>supabase/migrations</code>.</li>" +
          "<li>Criar a conta da podóloga e rodar <code>supabase/setup-clinica-e-admin.sql</code>.</li>" +
          "<li>Preencher <code>sistema/js/config.js</code> com o endereço e a chave pública (anon) e trocar o modo para <code>supabase</code>.</li>" +
          "<li>Configurar um provedor de e-mail no Supabase para confirmação de conta e recuperação de senha.</li>" +
          "<li>Publicar o site num endereço <code>https://</code>.</li></ul>" +
        '<p class="small" style="margin-top:.75rem">Passo a passo em <code>docs/SUPABASE.md</code> e <code>docs/IMPLANTACAO.md</code>.</p></section>';

    S.$("[data-dupla]").addEventListener("click", function () {
      var b = this, res = S.$("[data-dupla-res]");
      S.ocupado(b, true, "Testando…");
      PS.api.demo.testarReservaDupla().then(function (r) {
        S.ocupado(b, false);
        var ok = r.resultados.filter(function (x) { return x.ok; }).length;
        res.innerHTML = '<p><strong>Horário disputado:</strong> <span>' + S.esc(T.format.dateLong(r.horario, clinica.timezone)) + "</span> às " + S.esc(T.format.time(r.horario, clinica.timezone)) + " · " + S.esc(r.servico) + "</p>" +
          '<ul class="result-list" style="margin-top:.5rem">' + r.resultados.map(function (x) {
            return "<li><span class=\"" + (x.ok ? "ok" : "no") + "\">" + (x.ok ? "✓ Reservou" : "✗ Recusado") + "</span> " + S.esc(x.pessoa) + (x.ok ? "" : " — " + S.esc(S.mensagem({ code: x.code }))) + "</li>";
          }).join("") + "</ul>" +
          '<div class="alert ' + (ok === 1 ? "alert--ok" : "alert--error") + '" style="margin-top:.75rem">' + (ok === 1 ? "Resultado correto: apenas uma reserva foi aceita." : "Resultado inesperado: " + ok + " reservas aceitas.") + "</div>";
      }).catch(function (e) { S.ocupado(b, false); res.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
    });

    S.$("[data-reset]").addEventListener("click", function () {
      S.confirmar({ titulo: "Restaurar os dados fictícios?", texto: "Tudo o que foi feito nesta demonstração será apagado e você precisará entrar de novo.", confirmar: "Restaurar", perigo: true })
        .then(function (r) {
          if (!r) return;
          PS.api.demo.restaurar().then(function () { S.toast("Dados de demonstração restaurados."); });
        });
    });
  }).catch(function (e) { alvo.innerHTML = '<div class="alert alert--error">' + S.esc(S.mensagem(e)) + "</div>"; });
})();
