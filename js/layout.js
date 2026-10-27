/* ==========================================================================
   ELEGANCE — ESTRUTURA COMPARTILHADA DAS PÁGINAS
   Gera, a partir de uma única fonte, tudo o que se repete em todas as
   páginas: ícones, barra de demonstração, cabeçalho com o menu, rodapé,
   janelas (WhatsApp e galeria), seletor de cores e avisos.
   Cada página só precisa de:
     <body data-page="sobre">  ·  <div data-layout="header">  ·  <div data-layout="footer">
   ========================================================================== */

(function () {
  "use strict";

  var data = window.PS.content;
  var page = document.body.getAttribute("data-page") || "inicio";

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  /* ---------------- Ícones (traço fino, herdam a cor do texto) ---------------- */
  var SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    '<symbol id="i-foot" viewBox="0 0 24 24"><path d="M8.6 9.2c3.3-1 7.3-.2 8.2 2.6.8 2.4-1 4.3-1.8 6.6-.7 2-1.6 3.6-4.2 3.6-3 0-4.6-2.6-4.4-5.8.2-3.3-.9-6.1 2.2-7z"/><circle cx="8.4" cy="5.3" r="1.5"/><circle cx="11.6" cy="4.3" r="1.2"/><circle cx="14.3" cy="4.7" r="1"/><circle cx="16.4" cy="6" r=".9"/><circle cx="17.9" cy="7.9" r=".8"/></symbol>' +
    '<symbol id="i-nail" viewBox="0 0 24 24"><path d="M7 21v-10a5 5 0 0 1 10 0v10"/><path d="M9.5 11.2a2.5 2.5 0 0 1 5 0V14h-5z"/></symbol>' +
    '<symbol id="i-layers" viewBox="0 0 24 24"><path d="M4 8.5c2.7-2 5.3 2 8 0s5.3 2 8 0"/><path d="M4 13c2.7-2 5.3 2 8 0s5.3 2 8 0"/><path d="M4 17.5c2.7-2 5.3 2 8 0s5.3 2 8 0"/></symbol>' +
    '<symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19C5 11 10 6 19.5 5 19.5 14 14.5 19 6 19z"/><path d="M5 19l8.5-8.5"/></symbol>' +
    '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.3a4.1 4.1 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/></symbol>' +
    '<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/></symbol>' +
    '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M4.5 17.5V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v6a2.5 2.5 0 0 1-2.5 2.5H8.5z"/><path d="M8.5 9h7M8.5 12h4.5"/></symbol>' +
    '<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></symbol>' +
    '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l7 3v5.2c0 4.8-3.3 8.3-7 9.8-3.7-1.5-7-5-7-9.8V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></symbol>' +
    '<symbol id="i-hands" viewBox="0 0 24 24"><path d="M12 8.2C10.9 6 7.5 6 7.2 9c-.3 2.9 4.8 6 4.8 6s5.1-3.1 4.8-6c-.3-3-3.7-3-4.8-.8z"/><path d="M3.5 13.5l3.5 3.5c.8.8 1.9 1.3 3 1.3h4.5"/><path d="M20.5 13.5L17 17"/></symbol>' +
    '<symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 4c.6 4.3 3.7 7.4 8 8-4.3.6-7.4 3.7-8 8-.6-4.3-3.7-7.4-8-8 4.3-.6 7.4-3.7 8-8z"/></symbol>' +
    '<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>' +
    '<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>' +
    '<symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>' +
    '<symbol id="i-chevron-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>' +
    '<symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>' +
    '<symbol id="i-zoom" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20M10.5 8v5M8 10.5h5"/></symbol>' +
    '<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M4 20.5l1.3-4.1A8.3 8.3 0 1 1 8.2 19.2z"/><path d="M9 8.6c-.4 3.5 2.9 6.8 6.4 6.4l.7-1.6-2-1-.9.9a4.3 4.3 0 0 1-2.5-2.5l.9-.9-1-2z"/></symbol>' +
    '<symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/></symbol>' +
    '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>' +
    '<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>' +
    '<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></symbol>' +
    '<symbol id="i-instagram" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6"/></symbol>' +
    '<symbol id="i-palette" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.7 1.6-1.5 0-1.2-1-1.6-1-2.6 0-1 .8-1.6 1.9-1.6H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z"/><g fill="currentColor" stroke="none"><circle cx="7.4" cy="11.6" r="1.25"/><circle cx="9.6" cy="7.4" r="1.25"/><circle cx="14.4" cy="7.2" r="1.25"/></g></symbol>' +
    '<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h11"/></symbol>' +
    '<symbol id="i-image" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 15.5l-4.5-4.5-8.5 8"/></symbol>' +
    '<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.7 4.3-5.5 7.5-5.5s6.1 1.8 7.5 5.5"/></symbol>' +
    '<symbol id="i-reset" viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4h4"/></symbol>' +
    '<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/></symbol>' +
    '<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></symbol>' +
    '</svg>';

  /* Modo do sistema (sistema/js/config.js): "demo" mostra a central de demonstração */
  var demoMode = !window.PS.sistema || window.PS.sistema.modo !== "supabase";

  /* ---------------- Barra de demonstração (fora do site) ---------------- */
  var DEMO_BAR =
    '<a class="skip-link" href="#conteudo">Pular para o conteúdo</a>' +
    '<div class="demo-bar" role="note"><div class="demo-bar__inner">' +
      '<p class="demo-bar__title"><strong>Avançado</strong> <span>Modelo Avançado · site + agendamento on-line</span></p>' +
      '<p class="demo-bar__note">' + (demoMode ? 'Demonstração com dados fictícios · <a href="demonstracao.html">Central de demonstração</a>' : 'Agendamento on-line da clínica') + '</p>' +
      '<button class="demo-bar__btn" type="button" data-colors-open aria-controls="color-panel" aria-expanded="false">' + icon("palette") +
        '<span class="demo-bar__long">Personalizar cores</span><span class="demo-bar__short">Cores</span></button>' +
    '</div></div>';

  /* ---------------- Cabeçalho ---------------- */
  function navLinks(cls) {
    return data.pages.map(function (p) {
      var current = p.id === page ? ' aria-current="page"' : "";
      return '<li><a class="' + cls + '" href="' + esc(p.href) + '"' + current + ">" + esc(p.label) + "</a></li>";
    }).join("");
  }

  var logo = function (extra, label) {
    return '<a class="logo' + (extra || "") + '" href="index.html" aria-label="' + esc(data.brand.name) + " — " + label + '">' +
      '<span class="logo__mark" aria-hidden="true">' + esc(data.brand.monogram) + "</span>" +
      '<span class="logo__text"><span class="logo__name">' + esc(data.brand.short) + '</span><span class="logo__sub">' + esc(data.brand.sub) + "</span></span></a>";
  };

  var HEADER =
    '<header class="header" data-header><div class="container header__inner">' +
      logo("", "página inicial") +
      '<nav class="nav" id="nav" aria-label="Navegação principal" data-nav>' +
        '<ul role="list" class="nav__list">' + navLinks("nav__link") + "</ul>" +
        '<a class="btn btn--primary btn--block nav__cta" href="agendar.html">' + icon("calendar") + "Agendar on-line</a>" +
        '<a class="nav__access" href="cliente/entrar.html">' + icon("user") + "Área do cliente</a>" +
      "</nav>" +
      '<div class="header__actions">' +
        '<a class="header__login" href="cliente/entrar.html" aria-label="Área do cliente: entrar">' + icon("user") + '<span>Entrar</span></a>' +
        '<a class="btn btn--primary btn--sm header__cta" href="agendar.html">Agendar on-line</a>' +
        '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav" data-menu-toggle>' +
          '<span class="sr-only" data-menu-label>Abrir menu</span>' +
          '<svg class="icon icon-open" aria-hidden="true"><use href="#i-menu"/></svg>' +
          '<svg class="icon icon-close" aria-hidden="true"><use href="#i-close"/></svg>' +
        "</button>" +
      "</div>" +
    "</div></header>";

  /* ---------------- Rodapé ---------------- */
  var c = data.contact;
  var social = (data.social || []).map(function (s) {
    return s.url
      ? '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + " · " + esc(s.handle) + "</a></li>"
      : "<li>" + esc(s.label) + " · " + esc(s.handle) + " (exemplo)</li>";
  }).join("");

  var FOOTER =
    '<footer class="footer">' +
      '<div class="container footer__cta">' +
        '<p class="footer__cta-text">Pronta para cuidar dos seus pés com calma?</p>' +
        '<a class="btn btn--on-deep" href="agendar.html">' + icon("calendar") + "Agendar on-line</a>" +
      "</div>" +
      '<div class="container footer__top">' +
        '<div class="footer__brand">' + logo(" logo--footer", "voltar à página inicial") +
          "<p>" + esc(data.brand.tagline) + "</p>" +
          "<p>" + esc(data.professional.name) + "</p>" +
        "</div>" +
        '<nav class="footer__col" aria-label="Páginas do site"><p class="footer__title">Páginas</p><ul role="list">' + navLinks("") + "</ul></nav>" +
        '<div class="footer__col"><p class="footer__title">Contato</p><ul role="list">' +
          "<li>WhatsApp " + esc(c.whatsappDisplay) + "</li>" +
          "<li>Telefone " + esc(c.phoneDisplay) + "</li>" +
          '<li class="break">' + esc(c.email) + "</li>" +
          (c.addressLines || []).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") +
          social +
        "</ul></div>" +
        '<div class="footer__col"><p class="footer__title">Horários</p><ul role="list">' +
          (c.hours || []).map(function (h) { return "<li>" + esc(h.days) + ": " + esc(h.time) + "</li>"; }).join("") +
        "</ul></div>" +
        '<nav class="footer__col" aria-label="Acessos"><p class="footer__title">Acessos</p><ul role="list">' +
          '<li><a href="agendar.html">Agendar on-line</a></li>' +
          '<li><a href="cliente/entrar.html">Área do cliente</a></li>' +
          '<li><a href="admin/entrar.html">Área da podóloga</a></li>' +
          '<li><a href="privacidade.html">Privacidade e dados</a></li>' +
          (demoMode ? '<li><a href="demonstracao.html">Central de demonstração</a></li>' : "") +
        "</ul></nav>" +
      "</div>" +
      '<div class="container footer__bottom">' +
        "<p>© " + new Date().getFullYear() + " " + esc(data.brand.name) + "</p>" +
        "<p>" + (demoMode ? "Modelo Avançado · demonstração com dados fictícios · " : "") + "não substitui avaliação médica</p>" +
      "</div>" +
    "</footer>";

  /* ---------------- Janelas, seletor de cores e avisos ---------------- */
  var EXTRAS =
    '<dialog class="modal" aria-labelledby="wa-title" data-wa-dialog><div class="modal__box">' +
      '<button class="modal__close" type="button" data-close-dialog aria-label="Fechar">' + icon("close") + "</button>" +
      '<span class="modal__icon" aria-hidden="true">' + icon("whatsapp") + "</span>" +
      '<h2 class="modal__title" id="wa-title" data-wa-title>Agendamento pelo WhatsApp</h2>' +
      '<p class="modal__text" data-wa-text></p>' +
      '<div class="modal__preview"><p class="modal__label">Mensagem que será enviada</p><p class="modal__message" data-wa-message></p></div>' +
      '<div class="modal__actions"><a class="btn btn--primary" href="#" target="_blank" rel="noopener" data-wa-link>Abrir WhatsApp (teste)</a>' +
      '<button class="btn btn--outline" type="button" data-close-dialog>Fechar</button></div>' +
    "</div></dialog>" +

    '<dialog class="lightbox" aria-label="Imagem ampliada" data-lightbox>' +
      '<figure class="lightbox__figure"><div class="lightbox__frame" data-lightbox-frame>' +
        '<img alt="" data-lightbox-img>' +
        '<div class="lightbox__fallback" data-lightbox-fallback hidden>' + icon("image") + "<span>Imagem indisponível</span></div>" +
      "</div>" +
      '<figcaption class="lightbox__caption"><span data-lightbox-caption></span><span class="lightbox__count" data-lightbox-count></span></figcaption></figure>' +
      '<button class="lightbox__btn lightbox__btn--close" type="button" data-lightbox-close aria-label="Fechar imagem ampliada">' + icon("close") + "</button>" +
      '<button class="lightbox__btn lightbox__btn--prev" type="button" data-lightbox-prev aria-label="Imagem anterior">' + icon("chevron-left") + "</button>" +
      '<button class="lightbox__btn lightbox__btn--next" type="button" data-lightbox-next aria-label="Próxima imagem">' + icon("chevron-right") + "</button>" +
    "</dialog>" +

    /* SELETOR DE CORES (demonstração) — controlado por js/palette-switcher.js */
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
      '<p class="color-panel__foot">A escolha vale para todas as páginas e fica salva neste navegador.</p>' +
    "</div>" +

    '<button class="back-to-top" type="button" data-back-to-top aria-label="Voltar ao topo da página">' + icon("arrow-up") + "</button>" +
    '<div class="toast" role="status" aria-live="polite" data-toast>' + icon("check") + "<span data-toast-text></span></div>";

  /* ---------------- Montagem ---------------- */
  document.body.insertAdjacentHTML("afterbegin", SPRITE + DEMO_BAR);
  var headerSlot = document.querySelector('[data-layout="header"]');
  var footerSlot = document.querySelector('[data-layout="footer"]');
  if (headerSlot) headerSlot.outerHTML = HEADER;
  if (footerSlot) footerSlot.outerHTML = FOOTER;
  document.body.insertAdjacentHTML("beforeend", EXTRAS);
})();
