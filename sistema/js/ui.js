/* ==========================================================================
   FERRAMENTAS COMUNS DAS TELAS DO SISTEMA
   Mensagens de erro em português, avisos, confirmações, formatação,
   proteção de páginas privadas e faixa de demonstração.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var T = PS.tempo;

  /* ---------- Mensagens claras para cada código de erro ---------- */
  var MENSAGENS = {
    AUTH_REQUIRED: "Sua sessão terminou. Entre novamente para continuar.",
    INVALID_LOGIN: "E-mail ou senha incorretos. Confira e tente de novo.",
    EMAIL_NOT_CONFIRMED: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
    NOT_ADMIN: "Esta conta não tem acesso à área da podóloga. Se você é cliente, use a Área do cliente.",
    USE_ADMIN_LOGIN: "Esta é uma conta administrativa. Entre pela Área da podóloga.",
    EMAIL_IN_USE: "Já existe uma conta com este e-mail. Entre ou recupere a senha.",
    WEAK_PASSWORD: "A senha precisa ter pelo menos 8 caracteres.",
    CONSENT_REQUIRED: "Para criar a conta, é preciso aceitar a política de privacidade.",
    INVALID_NAME: "Informe o nome completo (de 2 a 120 caracteres).",
    INVALID_PHONE: "Informe um telefone com DDD, só números (10 a 13 dígitos).",
    INVALID_WHATSAPP: "Informe o WhatsApp com 55 + DDD + número (12 ou 13 dígitos).",
    INVALID_EMAIL: "Informe um e-mail válido.",
    INVALID_DATA: "Alguns dados estão inválidos. Confira os campos.",
    RESET_LINK_INVALID: "Este link de redefinição expirou ou já foi usado. Peça um novo.",
    SLOT_UNAVAILABLE: "Esse horário acabou de ser ocupado ou não está mais disponível. Escolha outro horário.",
    SERVICE_NOT_FOUND: "Este serviço não está disponível para agendamento.",
    PATIENT_PROFILE_REQUIRED: "Complete seu cadastro de cliente para agendar.",
    PATIENT_REQUIRED: "Escolha o paciente.",
    PATIENT_NOT_FOUND: "Paciente não encontrado.",
    TOO_MANY_ACTIVE_BOOKINGS: "Você já tem o número máximo de agendamentos ativos. Cancele ou aguarde um deles para marcar outro.",
    CANCEL_DEADLINE_PASSED: "O prazo para cancelar pelo site terminou. Fale com a clínica pelo WhatsApp.",
    RESCHEDULE_DEADLINE_PASSED: "O prazo para reagendar pelo site terminou. Fale com a clínica pelo WhatsApp.",
    ALREADY_STARTED: "Este atendimento já começou ou já passou.",
    INVALID_STATUS: "Este agendamento não pode mais ser alterado.",
    INVALID_TRANSITION: "Essa mudança de situação não é permitida.",
    NOT_STARTED_YET: "Só é possível marcar como concluído ou falta depois do horário do atendimento.",
    REQUEST_ALREADY_OPEN: "Já existe um pedido aguardando resposta para este agendamento.",
    NOT_FOUND: "Registro não encontrado.",
    FORBIDDEN: "Você não tem permissão para fazer isso.",
    INVALID_RANGE: "Período inválido.",
    INVALID_HOURS: "Confira os horários: o fim precisa ser depois do início.",
    INVALID_SETTINGS: "Algum valor das configurações está fora do permitido.",
    INVALID_DURATION: "A duração precisa ficar entre 10 e 480 minutos.",
    INVALID_PRICE: "Preço inválido.",
    TEXT_TOO_LONG: "Texto muito longo (máximo de 500 caracteres).",
    NETWORK: "Sem conexão com o servidor. Verifique a internet e tente de novo.",
    RATE_LIMIT: "Muitas tentativas seguidas. Aguarde alguns minutos.",
    DEMO_ONLY: "Disponível apenas com o Supabase configurado.",
    DEMO_DISABLED: "A demonstração está desativada nesta instalação.",
    SUPABASE_NOT_CONFIGURED: "O modo real está ativado, mas faltam os dados do Supabase em sistema/js/config.js.",
    SERVICE_ROLE_IN_BROWSER: "Bloqueado por segurança: a chave “service_role” foi colocada no site. Troque pela chave pública “anon”.",
    HTTPS_REQUIRED: "O modo real precisa ser aberto por um endereço https://.",
    SUPABASE_LIB_LOAD_FAILED: "Não foi possível carregar a conexão com o Supabase. Verifique a internet.",
    NO_SLOTS: "Não há horários livres no período para o teste.",
    UNKNOWN: "Algo deu errado. Tente novamente em instantes."
  };
  function mensagem(e) {
    var code = (e && (e.code || e.message)) || "UNKNOWN";
    return MENSAGENS[code] || MENSAGENS.UNKNOWN;
  }

  /* ---------- Textos de status ---------- */
  var STATUS = {
    pending: { label: "Aguardando confirmação", cls: "st--pending" },
    confirmed: { label: "Confirmado", cls: "st--confirmed" },
    completed: { label: "Concluído", cls: "st--completed" },
    cancelled: { label: "Cancelado", cls: "st--cancelled" },
    no_show: { label: "Falta", cls: "st--noshow" }
  };
  function chipStatus(s) {
    var x = STATUS[s] || { label: s, cls: "" };
    return '<span class="st ' + x.cls + '">' + esc(x.label) + "</span>";
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function reais(cents) {
    if (cents == null) return "—";
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function telefone(d) {
    d = String(d || "");
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    if (d.length >= 12) return "+" + d.slice(0, 2) + " (" + d.slice(2, 4) + ") " + d.slice(4, d.length - 4) + "-" + d.slice(-4);
    return d;
  }

  /* ---------- Aviso flutuante (mesmo componente do Elegance) ---------- */
  var toastTimer;
  function toast(msg, tipo, ms) {
    var el = $("[data-toast]");
    if (!el) {
      document.body.insertAdjacentHTML("beforeend", '<div class="toast" role="status" aria-live="polite" data-toast><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span data-toast-text></span></div>');
      el = $("[data-toast]");
    }
    el.classList.toggle("toast--error", tipo === "erro");
    $("[data-toast-text]", el).textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, ms || (tipo === "erro" ? 5200 : 3200));
  }
  PS.ui = PS.ui || {};
  PS.ui.toast = function (m, d) { toast(m, null, d); };

  /* ---------- Janela de confirmação (para ações destrutivas) ---------- */
  function confirmar(opts) {
    return new Promise(function (resolve) {
      var d = document.createElement("dialog");
      d.className = "sys-dialog";
      d.innerHTML =
        '<form method="dialog" class="sys-dialog__box">' +
          '<h2 class="sys-dialog__title">' + esc(opts.titulo) + "</h2>" +
          (opts.texto ? '<p class="sys-dialog__text">' + esc(opts.texto) + "</p>" : "") +
          (opts.campo ? '<label class="field"><span class="field__label">' + esc(opts.campo) + '</span><textarea class="input" rows="2" maxlength="300" data-campo></textarea></label>' : "") +
          '<div class="sys-dialog__actions">' +
            '<button class="btn btn--outline" value="cancel" type="submit">' + esc(opts.cancelar || "Voltar") + "</button>" +
            '<button class="btn ' + (opts.perigo ? "btn--danger" : "btn--primary") + '" value="ok" type="submit" data-ok>' + esc(opts.confirmar || "Confirmar") + "</button>" +
          "</div>" +
        "</form>";
      document.body.appendChild(d);
      d.addEventListener("close", function () {
        var campo = $("[data-campo]", d);
        var ok = d.returnValue === "ok";
        resolve(ok ? { ok: true, texto: campo ? campo.value.trim() : "" } : null);
        d.remove();
      });
      d.showModal();
      $(opts.perigo ? ".btn--outline" : "[data-ok]", d).focus();
    });
  }

  /* ---------- Janela genérica com conteúdo ---------- */
  function janela(titulo, html, opts) {
    var d = document.createElement("dialog");
    d.className = "sys-dialog" + (opts && opts.larga ? " sys-dialog--wide" : "");
    d.innerHTML = '<div class="sys-dialog__box"><div class="sys-dialog__head"><h2 class="sys-dialog__title">' + esc(titulo) + "</h2>" +
      '<button class="sys-dialog__close" type="button" aria-label="Fechar" data-fechar><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button></div>' +
      '<div class="sys-dialog__body">' + html + "</div></div>";
    document.body.appendChild(d);
    d.addEventListener("close", function () { d.remove(); });
    $("[data-fechar]", d).addEventListener("click", function () { d.close(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    d.showModal();
    return d;
  }

  /* ---------- Botão com estado de carregamento ---------- */
  function ocupado(btn, sim, texto) {
    if (!btn) return;
    if (sim) { btn.dataset.txt = btn.innerHTML; btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(texto || "Aguarde…"); }
    else { btn.disabled = false; btn.removeAttribute("aria-busy"); if (btn.dataset.txt) btn.innerHTML = btn.dataset.txt; }
  }

  /* ---------- Mensagens dentro de formulários ---------- */
  function alerta(el, msg, tipo) {
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.className = "alert " + (tipo === "ok" ? "alert--ok" : tipo === "info" ? "alert--info" : "alert--error");
    el.textContent = msg;
    if (tipo !== "ok" && tipo !== "info") el.focus && el.setAttribute("tabindex", "-1");
  }
  function erroCampo(input, msg) {
    var f = input.closest(".field");
    var box = f && f.querySelector(".field__error");
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (box) { box.textContent = msg || ""; box.hidden = !msg; }
  }

  /* ---------- Caminho até a raiz do site (páginas em cliente/ e admin/) ---------- */
  var raiz = document.body && document.body.getAttribute("data-raiz") || "";

  /* ---------- Proteção de páginas privadas ----------
     Isto só organiza a navegação (manda para o login certo). A proteção de
     verdade é feita pelo servidor: sem permissão, os dados não chegam. */
  function proteger(perfil) {
    return PS.api.pronto.then(function () { return PS.api.sessao(); }).then(function (s) {
      var destino = perfil === "admin" ? raiz + "admin/entrar.html" : raiz + "cliente/entrar.html";
      var volta = encodeURIComponent(location.pathname.split("/").slice(-2).join("/") + location.search);
      if (!s) { location.replace(destino + "?voltar=" + volta); return new Promise(function () {}); }
      if (perfil === "admin" && s.role !== "admin") { location.replace(destino + "?motivo=sem-permissao"); return new Promise(function () {}); }
      if (perfil === "client" && s.role !== "client") {
        location.replace(s.role === "admin" ? raiz + "admin/index.html" : destino + "?motivo=sem-cadastro");
        return new Promise(function () {});
      }
      return s;
    });
  }

  /* Destino seguro depois do login (só caminhos internos, nunca outro site) */
  function voltarPara(padrao) {
    var v = new URLSearchParams(location.search).get("voltar") || "";
    if (/^(cliente|admin)\/[\w-]+\.html(\?[\w=&%-]*)?$/.test(v) || /^[\w-]+\.html(\?[\w=&%-]*)?$/.test(v)) {
      return (v.indexOf("/") === -1 ? raiz : raiz) + v;
    }
    return padrao;
  }

  /* ---------- Faixa: demonstração ou modo real ---------- */
  function faixaModo() {
    var m = PS.api && PS.api.modo;
    var el = document.createElement("div");
    el.setAttribute("role", "note");
    if (m === "demo") {
      el.className = "mode-bar mode-bar--demo";
      el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-info"/></svg><span><strong>Demonstração com dados fictícios.</strong> Não há login real nem servidor: tudo fica salvo só neste navegador. ' +
        '<a href="' + raiz + 'demonstracao.html">Central de demonstração</a></span>';
      if (PS.api.armazenamentoDisponivel === false) el.innerHTML += '<span> · O navegador bloqueou o armazenamento: os dados reiniciam a cada página.</span>';
    } else if (m === "supabase") {
      return null;
    } else {
      el.className = "mode-bar mode-bar--error";
      el.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-info"/></svg><span>Sistema indisponível: verifique sistema/js/config.js.</span>';
    }
    return el;
  }

  /* ---------- Paleta: leva a escolha pelo endereço se o navegador bloquear o armazenamento ---------- */
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !PS.theme || PS.theme.storageAvailable) return;
    var href = link.getAttribute("data-orig-href") || link.getAttribute("href");
    if (!/^(\.\.\/)?([\w-]+\/)?[\w-]+\.html(\?[^#]*)?(#.*)?$/.test(href)) return;
    link.setAttribute("data-orig-href", href);
    var parts = href.split("#");
    var sep = parts[0].indexOf("?") === -1 ? "?" : "&";
    link.setAttribute("href", parts[0] + sep + "tema=" + encodeURIComponent(PS.theme.toQuery()) + (parts[1] ? "#" + parts[1] : ""));
  });

  /* ---------- Identidade visual da clínica ----------
     No modo real, as cores salvas pela podóloga valem para todos.
     Na demonstração, vale a escolha feita no seletor deste navegador. */
  function aplicarCoresDaClinica(clinica) {
    if (!PS.theme || !clinica || !clinica.settings) return;
    if (PS.api.modo !== "supabase") return;
    var b = clinica.settings.branding || {};
    var st = PS.theme.getState();
    var iguais = st && st.palette.id === b.paletteId && JSON.stringify(st.overrides) === JSON.stringify(b.overrides || {});
    if (iguais) return;
    PS.theme.setPalette(b.paletteId || "rosa-areia");
    Object.keys(b.overrides || {}).forEach(function (k) { PS.theme.setOverride(k, b.overrides[k], { animate: false }); });
  }

  PS.sys = {
    esc: esc, $: $, $all: $all, mensagem: mensagem, MENSAGENS: MENSAGENS, STATUS: STATUS, chipStatus: chipStatus,
    reais: reais, telefone: telefone, toast: toast, confirmar: confirmar, janela: janela, ocupado: ocupado,
    alerta: alerta, erroCampo: erroCampo, proteger: proteger, voltarPara: voltarPara, faixaModo: faixaModo,
    aplicarCoresDaClinica: aplicarCoresDaClinica, raiz: raiz
  };
})(window);
