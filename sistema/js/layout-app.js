/* ==========================================================================
   MOLDURA DAS TELAS DO SISTEMA (portal do cliente, painel e telas de acesso)
   Mesma identidade do Elegance: barra escura de demonstração, logotipo,
   botões e o MESMO seletor de cores (js/palette-switcher.js).
   Cada página informa: <body data-area="admin|cliente|acesso" data-page="..." data-raiz="../">
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS;
  var data = PS.content;
  var body = document.body;
  var area = body.getAttribute("data-area");
  var page = body.getAttribute("data-page");
  var R = body.getAttribute("data-raiz") || "";
  var demo = !PS.sistema || PS.sistema.modo !== "supabase";
  var esc = PS.sys.esc;

  function icon(n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function logo(href, cls) {
    return '<a class="logo' + (cls || "") + '" href="' + href + '" aria-label="' + esc(data.brand.name) + ' — site">' +
      '<span class="logo__mark" aria-hidden="true">' + esc(data.brand.monogram) + "</span>" +
      '<span class="logo__text"><span class="logo__name">' + esc(data.brand.short) + '</span><span class="logo__sub">' + esc(data.brand.sub) + "</span></span></a>";
  }

  var titulo = area === "admin" ? "Área da podóloga" : area === "cliente" ? "Área do cliente" : "Acesso";
  var DEMO_BAR =
    '<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>' +
    '<div class="demo-bar" role="note"><div class="demo-bar__inner">' +
      '<p class="demo-bar__title"><strong>Avançado</strong> <span>' + esc(titulo) + "</span></p>" +
      '<p class="demo-bar__note">' + (demo ? 'Demonstração com dados fictícios · <a href="' + R + 'demonstracao.html">Central de demonstração</a>' : esc(data.brand.name)) + "</p>" +
      '<button class="demo-bar__btn" type="button" data-colors-open aria-controls="color-panel" aria-expanded="false">' + icon("palette") +
        '<span class="demo-bar__long">Personalizar cores</span><span class="demo-bar__short">Cores</span></button>' +
    "</div></div>";

  /* ---------- Painel da podóloga ---------- */
  var ADMIN_NAV = [
    { id: "inicio", href: "index.html", label: "Visão geral", icon: "grid" },
    { id: "agenda", href: "agenda.html", label: "Agenda", icon: "calendar" },
    { id: "novo", href: "novo-agendamento.html", label: "Novo agendamento", icon: "calendar-plus" },
    { id: "pacientes", href: "pacientes.html", label: "Pacientes", icon: "users" },
    { id: "relatorios", href: "relatorios.html", label: "Relatórios", icon: "chart" },
    { id: "configuracoes", href: "configuracoes.html", label: "Configurações", icon: "cog" }
  ];
  function adminShell() {
    var nav = ADMIN_NAV.map(function (n) {
      return '<li><a href="' + n.href + '"' + (n.id === page ? ' aria-current="page"' : "") + ">" + icon(n.icon) + "<span>" + n.label + "</span>" +
        (n.id === "inicio" ? '<span class="badge" data-badge-pendentes hidden></span>' : "") + "</a></li>";
    }).join("");
    return '<div class="app">' +
      '<aside class="app-side" id="app-side" aria-label="Menu da área administrativa" data-side>' +
        logo(R + "index.html") +
        '<p class="app-side__clinic" data-clinic-name></p>' +
        '<nav><ul role="list">' + nav + "</ul></nav>" +
        '<div class="app-side__foot">' +
          '<p class="app-side__user" data-user-email></p>' +
          '<a href="' + R + 'index.html" target="_blank" rel="noopener">' + icon("home") + "Ver o site</a>" +
          '<button type="button" data-sair>' + icon("logout") + "Sair</button>" +
        "</div>" +
      "</aside>" +
      '<div class="app-main">' +
        '<div class="app-mtop">' + logo(R + "index.html") +
          '<button type="button" aria-controls="app-side" aria-expanded="false" data-side-toggle aria-label="Abrir menu">' + icon("menu") + "</button></div>" +
        '<div data-mode-bar></div>' +
        '<main id="conteudo" class="app-content" tabindex="-1"></main>' +
      "</div></div>";
  }

  /* ---------- Portal do cliente ---------- */
  function clienteShell() {
    var links = [
      { id: "agendamentos", href: "index.html", label: "Meus agendamentos", icon: "list" },
      { id: "agendar", href: R + "agendar.html", label: "Agendar", icon: "calendar-plus" },
      { id: "dados", href: "meus-dados.html", label: "Meus dados", icon: "user" }
    ].map(function (l) {
      return '<a href="' + l.href + '"' + (l.id === page ? ' aria-current="page"' : "") + ">" + icon(l.icon) + '<span class="lbl">' + l.label + "</span></a>";
    }).join("");
    return '<header class="sys-top"><div class="container sys-top__inner">' + logo(R + "index.html") +
      '<span class="sys-top__area">Área do cliente</span>' +
      '<nav class="sys-top__nav" aria-label="Área do cliente">' + links +
        '<button type="button" data-sair>' + icon("logout") + '<span class="lbl">Sair</span></button></nav>' +
      "</div></header>" +
      '<div data-mode-bar></div>' +
      '<main id="conteudo" class="container portal" tabindex="-1"></main>';
  }

  /* ---------- Telas de acesso (login, cadastro, senha) ---------- */
  function acessoShell() {
    return '<header class="sys-top"><div class="container sys-top__inner">' + logo(R + "index.html") +
      '<nav class="sys-top__nav" aria-label="Voltar"><a href="' + R + 'index.html">' + icon("arrow-left") + '<span class="lbl">Voltar ao site</span></a></nav>' +
      "</div></header>" +
      '<div data-mode-bar></div>' +
      '<main id="conteudo" class="auth" tabindex="-1"></main>';
  }

  /* ---------- Seletor de cores: o mesmo do Elegance ---------- */
  var CORES =
    '<button class="color-fab" type="button" data-colors-open aria-controls="color-panel" aria-expanded="false" title="Experimentar outras cores">' +
      '<span class="color-fab__swatches" data-colors-fab-swatches aria-hidden="true"></span><span class="color-fab__text">Cores</span></button>' +
    '<div class="color-panel" id="color-panel" role="dialog" aria-modal="false" aria-labelledby="color-panel-title" data-colors-panel hidden>' +
      '<div class="color-panel__head">' +
        '<div><p class="color-panel__kicker">Demonstração</p><h2 class="color-panel__title" id="color-panel-title">Cores do site</h2></div>' +
        '<button class="color-panel__close" type="button" data-colors-close aria-label="Fechar seletor de cores">' + icon("close") + "</button>" +
      "</div>" +
      '<p class="color-panel__label" id="color-panel-palettes">Paletas · <span data-colors-current></span></p>' +
      '<div class="color-panel__swatches" role="radiogroup" aria-labelledby="color-panel-palettes" data-swatch-list></div>' +
      '<p class="color-panel__label">Ajuste fino</p>' +
      '<div class="color-panel__pickers">' +
        '<label class="color-picker"><input type="color" data-color-picker="primary"><span>Cor principal</span><code data-color-hex="primary"></code></label>' +
        '<label class="color-picker"><input type="color" data-color-picker="accent"><span>Cor de destaque</span><code data-color-hex="accent"></code></label>' +
      "</div>" +
      '<p class="color-panel__legibility" data-colors-legibility aria-live="polite"></p>' +
      '<button class="color-panel__reset" type="button" data-colors-reset>' + icon("reset") + "Restaurar cores padrão</button>" +
      '<p class="color-panel__foot">A escolha vale para o site e para as áreas do sistema, e fica salva neste navegador.</p>' +
    "</div>" +
    '<div class="toast" role="status" aria-live="polite" data-toast>' + icon("check") + "<span data-toast-text></span></div>";

  var shell = area === "admin" ? adminShell() : area === "cliente" ? clienteShell() : acessoShell();
  var tpl = document.querySelector("template[data-conteudo]");
  body.insertAdjacentHTML("afterbegin", DEMO_BAR + '<div class="site sys" id="site">' + shell + "</div>");
  if (tpl) document.getElementById("conteudo").appendChild(tpl.content.cloneNode(true));
  body.insertAdjacentHTML("beforeend", CORES);
  if (!demo) document.documentElement.classList.add("sem-seletor");

  var bar = PS.sys.faixaModo();
  var slot = document.querySelector("[data-mode-bar]");
  if (bar && slot) slot.replaceWith(bar); else if (slot) slot.remove();

  /* Menu lateral no celular */
  var side = document.querySelector("[data-side]");
  var tog = document.querySelector("[data-side-toggle]");
  if (side && tog) {
    var scrim;
    function fechar() { side.classList.remove("is-open"); tog.setAttribute("aria-expanded", "false"); if (scrim) { scrim.remove(); scrim = null; } }
    tog.addEventListener("click", function () {
      if (side.classList.contains("is-open")) return fechar();
      side.classList.add("is-open"); tog.setAttribute("aria-expanded", "true");
      scrim = document.createElement("div"); scrim.className = "app-scrim"; scrim.addEventListener("click", fechar);
      document.body.appendChild(scrim);
      var first = side.querySelector("a"); if (first) first.focus();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && side.classList.contains("is-open")) { fechar(); tog.focus(); } });
  }

  /* Sair */
  document.querySelectorAll("[data-sair]").forEach(function (b) {
    b.addEventListener("click", function () {
      PS.api.sair().then(function () { location.href = area === "admin" ? "entrar.html?saiu=1" : "entrar.html?saiu=1"; });
    });
  });
})();
