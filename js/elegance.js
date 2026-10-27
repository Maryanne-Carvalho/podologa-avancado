/* ==========================================================================
   ELEGANCE — conteúdo e interações de todas as páginas
   1. Preenche cada página com os dados de js/content.js
      (cada bloco só é montado se existir na página atual)
   2. Imagens com quadro substituto quando não carregam
   3. WhatsApp com janela de demonstração
   4. Menu móvel · FAQ · carrossel · galeria ampliável
   5. Cabeçalho ao rolar · voltar ao topo · paleta mantida entre páginas
   A estrutura comum (menu, rodapé, janelas) vem de js/layout.js.
   O motor de cores fica em js/theme-engine.js e o seletor em js/palette-switcher.js.
   ========================================================================== */

(function () {
  "use strict";

  var PS = window.PS;
  var data = PS.content;
  var config = PS.config;
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Utilitários                                                          */
  /* ------------------------------------------------------------------ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + esc(name) + '"/></svg>';
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Bloco de imagem com substituto (o carregamento é feito na parte 2) */
  function media(img, extraClass, fallbackIcon, tag) {
    var t = tag || "figure";
    var inner = t === "figure" ? "div" : "span";
    if (!img) img = {};
    return "<" + t + ' class="media ' + (extraClass || "") + '" data-src="' + esc(img.src || "") + '" data-alt="' + esc(img.alt || "") + '">' +
      '<img alt="" decoding="async">' +
      "<" + inner + ' class="media__fallback" aria-hidden="true">' + icon(fallbackIcon || "image") + "<span>Imagem ilustrativa</span></" + inner + ">" +
    "</" + t + ">";
  }

  var renderers = {};
  function render(name, fn) { renderers[name] = fn; }

  /* ------------------------------------------------------------------ */
  /* Aviso flutuante (usado também pelo seletor de cores)               */
  /* ------------------------------------------------------------------ */
  var toastEl = $("[data-toast]");
  var toastText = $("[data-toast-text]");
  var toastTimer = null;
  PS.ui = PS.ui || {};
  PS.ui.toast = function (message, duration) {
    if (!toastEl) return;
    toastText.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, duration || 2600);
  };

  /* ------------------------------------------------------------------ */
  /* 1. Conteúdo                                                          */
  /* ------------------------------------------------------------------ */
  var c = data.contact;
  var addr = c.addressLines || [];
  var demoChip = c.isDemo ? ' <span class="demo-chip">fictício</span>' : "";

  /* ---- Comuns ---- */
  render("differentials", function () {
    return data.differentials.map(function (d, i) {
      return '<li class="diff' + (i === 0 ? " diff--lead" : "") + (i === 3 ? " diff--soft" : "") + '">' +
        '<span class="diff__icon">' + icon(d.icon) + "</span><h3>" + esc(d.title) + "</h3><p>" + esc(d.text) + "</p></li>";
    }).join("");
  });

  render("steps", function () {
    return data.steps.map(function (s, i) {
      return '<li class="step"><span class="step__num" aria-hidden="true">' + pad(i + 1) + "</span>" +
        '<h3><span class="sr-only">Etapa ' + (i + 1) + ": </span>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></li>";
    }).join("");
  });

  render("hours", function () {
    return (c.hours || []).map(function (h) {
      return '<tr><th scope="row">' + esc(h.days) + "</th><td>" + esc(h.time) + "</td></tr>";
    }).join("");
  });

  render("address", function () {
    return addr.map(esc).join("<br>") +
      (c.addressNote ? '<span class="contact__hint">' + esc(c.addressNote) + "</span>" : "") +
      (c.isDemo ? '<span class="contact__hint">Endereço demonstrativo, apenas para ilustração.</span>' : "");
  });

  render("map", function () {
    return '<div class="map-slot">' +
      '<div class="map-slot__art" aria-hidden="true">' +
        '<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">' +
          '<path d="M-10 130 C80 110 140 150 220 120 S340 70 420 90"/><path d="M60 -10 L110 210"/>' +
          '<path d="M250 -10 C240 60 270 130 260 210"/><path class="thin" d="M-10 45 L420 35"/>' +
          '<path class="thin" d="M-10 175 L420 165"/><path class="thin" d="M170 -10 L190 210"/>' +
        "</svg>" +
        '<span class="map-slot__pin">' + icon("pin") + "</span>" +
      "</div>" +
      '<div class="map-slot__text">' +
        "<p><strong>" + esc(addr[0] || "") + "</strong><br>" + esc(addr[1] || "") + "</p>" +
        (c.mapUrl
          ? '<a class="link-arrow" href="' + esc(c.mapUrl) + '" target="_blank" rel="noopener">Abrir no mapa' + icon("arrow") + "</a>"
          : '<p class="note">Espaço reservado para o mapa incorporado. Configure o link em <code>js/content.js</code>.</p>') +
      "</div></div>";
  });

  render("faq", function () {
    return data.faq.map(function (f, i) {
      var id = "faq-" + (i + 1);
      return '<div class="accordion__item"><h3>' +
        '<button class="accordion__trigger" type="button" aria-expanded="false" aria-controls="' + id + '" id="' + id + '-btn">' +
          esc(f.q) + '<span class="accordion__sign" aria-hidden="true"></span></button></h3>' +
        '<div class="accordion__panel" id="' + id + '" role="region" aria-labelledby="' + id + '-btn" hidden><div><p>' + esc(f.a) + "</p></div></div></div>";
    }).join("");
  });

  render("gallery", function () {
    return data.gallery.map(function (g, i) {
      return '<li class="gallery__item' + (g.layout ? " gallery__item--" + esc(g.layout) : "") + '">' +
        '<button class="gallery__btn" type="button" data-gallery-index="' + i + '" aria-label="Ampliar imagem: ' + esc(g.caption || g.alt) + '">' +
          media({ src: g.src, alt: g.alt }, "gallery__media", "image", "span") +
          '<span class="gallery__caption">' + esc(g.caption) + "</span>" +
          '<span class="gallery__zoom" aria-hidden="true">' + icon("zoom") + "</span>" +
        "</button></li>";
    }).join("");
  });

  function slide(t, i, total) {
    return '<figure class="slide" role="group" aria-roledescription="avaliação" aria-label="' + (i + 1) + " de " + total + '" data-slide>' +
      '<svg class="slide__mark" viewBox="0 0 40 32" aria-hidden="true"><path d="M0 32V19C0 8.5 6 2 16 0l2 4.5C12 6.4 9 10.6 9 16h8v16zm22 0V19C22 8.5 28 2 38 0l2 4.5C34 6.4 31 10.6 31 16h8v16z"/></svg>' +
      '<blockquote class="slide__quote"><p>' + esc(t.text) + "</p></blockquote>" +
      '<figcaption class="slide__author"><span class="slide__avatar" aria-hidden="true">' + esc(t.name.charAt(0)) + "</span>" +
        "<span><strong>" + esc(t.name) + "</strong><small>" + esc(t.service) + (data.testimonialsAreDemo ? " · exemplo fictício" : "") + "</small></span></figcaption>" +
    "</figure>";
  }

  /* ---- Início ---- */
  render("home-services", function () {
    var picks = (data.home.featuredServices || [0, 1, 2]).map(function (i) { return data.services[i]; }).filter(Boolean);
    return picks.map(function (s, i) {
      return '<li class="feature-tile' + (i === 0 ? " feature-tile--lead" : "") + '">' +
        media(s.image, "feature-tile__media", s.icon) +
        '<div class="feature-tile__body">' +
          '<p class="feature-tile__tag">' + icon(s.icon) + esc(s.tag) + "</p>" +
          "<h3>" + esc(s.title) + "</h3>" +
          "<p>" + esc(s.summary) + "</p>" +
          '<a class="link-arrow" href="servicos.html#' + esc(s.id) + '">Saiba mais<span class="sr-only"> sobre ' + esc(s.title) + "</span>" + icon("arrow") + "</a>" +
        "</div></li>";
    }).join("");
  });

  render("clinic-preview", function () {
    var ids = data.home.clinicPreview || [];
    var items = ids.map(function (id) {
      return data.gallery.filter(function (g) { return g.id === id; })[0];
    }).filter(Boolean);
    return items.map(function (g, i) {
      return '<a class="preview-tile preview-tile--' + (i + 1) + '" href="clinica.html#galeria" aria-label="' + esc(g.caption) + ' — ver na página da clínica">' +
        media({ src: g.src, alt: g.alt }, "preview-tile__media", "image", "span") + "</a>";
    }).join("");
  });

  render("testimonials-carousel", function () {
    var list = data.testimonials.slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); }).slice(0, 3);
    return list.map(function (t, i) { return slide(t, i, list.length); }).join("");
  });

  /* ---- Sobre mim ---- */
  render("about-numbers", function () {
    return data.about.numbers.map(function (n) {
      return '<div class="numbers__item"><dt>' + esc(n.label) + (n.note ? "<small>" + esc(n.note) + "</small>" : "") + "</dt><dd>" + esc(n.value) + "</dd></div>";
    }).join("");
  });

  render("about-story", function () {
    return data.about.story.map(function (p, i) {
      return "<p" + (i === 0 ? ' class="dropcap"' : "") + ">" + esc(p) + "</p>";
    }).join("");
  });

  render("about-motivation", function () {
    return data.about.motivation.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  });

  render("about-timeline", function () {
    return data.about.timeline.map(function (t) {
      return '<li class="timeline__item"><span class="timeline__year">' + esc(t.year) + "</span>" +
        '<div><h3 class="timeline__title">' + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></div></li>";
    }).join("");
  });

  render("about-education", function () {
    return data.about.education.map(function (e) {
      return '<li class="education__item"><span class="education__year">' + esc(e.year) + "</span>" +
        "<div><p class=\"education__name\">" + esc(e.title) + "</p><p class=\"education__place\">" + esc(e.place) + "</p></div></li>";
    }).join("");
  });

  render("about-values", function () {
    return data.about.values.map(function (v, i) {
      return '<li class="value-col"><span class="value-col__num" aria-hidden="true">' + pad(i + 1) + "</span>" +
        "<h3>" + esc(v.title) + "</h3><p>" + esc(v.text) + "</p></li>";
    }).join("");
  });

  render("about-highlights", function () {
    return data.about.highlights.map(function (h) {
      return "<li>" + icon("check") + "<span>" + esc(h) + "</span></li>";
    }).join("");
  });

  /* ---- A clínica ---- */
  render("clinic-intro", function () {
    return data.clinic.intro.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  });

  render("clinic-facts", function () {
    return data.clinic.facts.map(function (f) {
      return '<div class="facts__item"><dt>' + esc(f.label) + "</dt><dd>" + esc(f.value) + "</dd></div>";
    }).join("");
  });

  render("clinic-spaces", function () {
    return data.clinic.spaces.map(function (s, i) {
      return '<article class="space' + (i % 2 ? " space--reverse" : "") + '" aria-labelledby="space-' + i + '">' +
        media(s.image, "space__media", "home") +
        '<div class="space__copy">' +
          '<p class="space__num" aria-hidden="true">' + pad(i + 1) + "</p>" +
          '<p class="kicker">' + esc(s.kicker) + "</p>" +
          '<h2 id="space-' + i + '">' + esc(s.title) + "</h2>" +
          "<p>" + esc(s.text) + "</p>" +
          '<ul class="space__list" role="list">' + s.bullets.map(function (b) { return "<li>" + icon("check") + esc(b) + "</li>"; }).join("") + "</ul>" +
        "</div></article>";
    }).join("");
  });

  render("biosafety", function () {
    return data.clinic.biosafety.map(function (b, i) {
      return '<li class="bio-step"><span class="bio-step__num" aria-hidden="true">' + pad(i + 1) + "</span>" +
        "<div><h3>" + esc(b.title) + "</h3><p>" + esc(b.text) + "</p></div></li>";
    }).join("");
  });

  render("clinic-experience", function () {
    return data.clinic.experience.map(function (e, i) {
      return '<li class="journey__item"><span class="journey__dot" aria-hidden="true">' + (i + 1) + "</span>" +
        "<h3>" + esc(e.title) + "</h3><p>" + esc(e.text) + "</p></li>";
    }).join("");
  });

  /* ---- Serviços ---- */
  render("services-index", function () {
    return data.services.map(function (s) {
      return '<li><a class="chip-link" href="#' + esc(s.id) + '">' + icon(s.icon) + esc(s.title) + "</a></li>";
    }).join("");
  });

  render("services-detail", function () {
    return data.services.map(function (s, i) {
      return '<section class="service-detail' + (i % 2 ? " service-detail--alt" : "") + '" id="' + esc(s.id) + '" aria-labelledby="' + esc(s.id) + '-title">' +
        '<div class="container service-detail__grid">' +
          '<div class="service-detail__visual">' +
            media(s.image, "service-detail__media", s.icon) +
            '<span class="service-detail__num" aria-hidden="true">' + pad(i + 1) + "</span>" +
          "</div>" +
          '<div class="service-detail__body">' +
            '<p class="service-detail__tag">' + icon(s.icon) + esc(s.tag) + "</p>" +
            '<h2 id="' + esc(s.id) + '-title">' + esc(s.title) + "</h2>" +
            '<p class="service-detail__desc">' + esc(s.description) + "</p>" +
            '<div class="service-detail__goal"><h3>Objetivo do atendimento</h3><p>' + esc(s.goal) + "</p></div>" +
          "</div>" +
          '<div class="service-detail__info">' +
            '<div class="info-block"><h3>Como funciona</h3><ol class="info-block__steps" role="list">' +
              s.how.map(function (h, k) { return '<li><span aria-hidden="true">' + (k + 1) + "</span>" + esc(h) + "</li>"; }).join("") +
            "</ol></div>" +
            '<div class="info-block info-block--soft"><h3>Para agendar</h3><dl class="info-block__dl">' +
              s.booking.map(function (b) { return "<div><dt>" + esc(b.label) + "</dt><dd>" + esc(b.value) + "</dd></div>"; }).join("") +
            "</dl></div>" +
            '<div class="service-detail__actions">' +
              '<a class="btn btn--primary" href="agendar.html?servico=' + encodeURIComponent(s.id) + '">' + icon("calendar") +
                '<span>Agendar este serviço<span class="sr-only">: ' + esc(s.title) + "</span></span></a>" +
              '<button class="link-arrow" type="button" data-whatsapp data-service="' + esc(s.title) + '">Dúvidas pelo WhatsApp' + icon("arrow") + "</button>" +
              '<a class="link-arrow" href="#servicos-title">Voltar ao índice' + icon("arrow-up") + "</a>" +
            "</div>" +
          "</div>" +
        "</div></section>";
    }).join("");
  });

  /* ---- Avaliações ---- */
  render("reviews-featured", function () {
    var t = data.testimonials.filter(function (x) { return x.featured; })[0] || data.testimonials[0];
    return '<div class="container featured-quote__inner">' +
      '<svg class="featured-quote__mark" viewBox="0 0 40 32" aria-hidden="true"><path d="M0 32V19C0 8.5 6 2 16 0l2 4.5C12 6.4 9 10.6 9 16h8v16zm22 0V19C22 8.5 28 2 38 0l2 4.5C34 6.4 31 10.6 31 16h8v16z"/></svg>' +
      '<blockquote class="featured-quote__text"><p>' + esc(t.text) + "</p></blockquote>" +
      '<p class="featured-quote__author"><strong>' + esc(t.name) + "</strong> · " + esc(t.service) +
        (data.testimonialsAreDemo ? ' <span class="demo-chip demo-chip--on-deep">exemplo fictício</span>' : "") + "</p>" +
    "</div>";
  });

  render("reviews-grid", function () {
    var list = data.testimonials.filter(function (x) { return !x.featured; });
    return list.map(function (t) {
      var size = t.text.length > 140 ? " review--long" : t.text.length < 50 ? " review--short" : "";
      return '<li class="review' + size + '">' +
        '<figure class="review__figure">' +
          '<svg class="review__mark" viewBox="0 0 40 32" aria-hidden="true"><path d="M0 32V19C0 8.5 6 2 16 0l2 4.5C12 6.4 9 10.6 9 16h8v16zm22 0V19C22 8.5 28 2 38 0l2 4.5C34 6.4 31 10.6 31 16h8v16z"/></svg>' +
          '<blockquote class="review__text"><p>' + esc(t.text) + "</p></blockquote>" +
          '<figcaption class="review__author"><span class="review__avatar" aria-hidden="true">' + esc(t.name.charAt(0)) + "</span>" +
            "<span><strong>" + esc(t.name) + "</strong><small>" + esc(t.service) + "</small></span></figcaption>" +
        "</figure>" +
        (data.testimonialsAreDemo ? '<span class="review__demo">Exemplo de demonstração</span>' : "") +
      "</li>";
    }).join("");
  });

  /* ---- Contato ---- */
  render("contact-channels", function () {
    var phone = c.phoneLink ? '<a href="tel:' + esc(c.phoneLink) + '">' + esc(c.phoneDisplay) + "</a>" : esc(c.phoneDisplay) + demoChip;
    var email = c.emailLink ? '<a class="break" href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : '<span class="break">' + esc(c.email) + "</span>" + demoChip;
    var social = (data.social || []).map(function (s) {
      return s.url
        ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + " · " + esc(s.handle) + "</a>"
        : esc(s.label) + " · " + esc(s.handle) + ' <span class="demo-chip">exemplo</span>';
    }).join("<br>") || "Não configurado";
    var items = [
      { icon: "whatsapp", title: "WhatsApp", value: esc(c.whatsappDisplay) + demoChip, extra: '<button class="link-arrow" type="button" data-whatsapp>Abrir conversa' + icon("arrow") + "</button>" },
      { icon: "phone", title: "Telefone", value: phone, extra: '<p class="note">Ligações em horário de atendimento.</p>' },
      { icon: "mail", title: "E-mail", value: email, extra: '<p class="note">Para dúvidas que não são urgentes.</p>' },
      { icon: "instagram", title: "Redes sociais", value: social, extra: '<p class="note">Dicas de cuidado e novidades do consultório.</p>' }
    ];
    return items.map(function (it) {
      return '<li class="channel"><span class="channel__icon">' + icon(it.icon) + "</span>" +
        "<h3>" + it.title + '</h3><p class="channel__value">' + it.value + "</p>" + it.extra + "</li>";
    }).join("");
  });

  render("contact-howto", function () {
    return c.howTo.map(function (h, i) {
      return '<li class="howto__item"><span class="howto__num" aria-hidden="true">' + (i + 1) + "</span>" +
        "<div><h3>" + esc(h.title) + "</h3><p>" + esc(h.text) + "</p></div></li>";
    }).join("");
  });

  /* ---- Navegação entre páginas (anterior / próxima) ---- */
  render("page-pager", function () {
    var current = document.body.getAttribute("data-page");
    var pages = data.pages;
    var i = pages.map(function (p) { return p.id; }).indexOf(current);
    if (i < 0) return "";
    var prev = pages[i - 1];
    var next = pages[i + 1] || pages[0];
    return '<div class="container page-pager__inner">' +
      (prev
        ? '<a class="page-pager__link page-pager__link--prev" href="' + esc(prev.href) + '">' + icon("chevron-left") + '<span><small>Página anterior</small>' + esc(prev.label) + "</span></a>"
        : "<span></span>") +
      '<a class="page-pager__link page-pager__link--next" href="' + esc(next.href) + '"><span><small>' + (pages[i + 1] ? "Próxima página" : "Voltar ao início") + "</small>" + esc(next.label) + "</span>" + icon("chevron-right") + "</a>" +
    "</div>";
  });

  /* ---- Execução: monta apenas os blocos presentes na página ---- */
  $all("[data-render]").forEach(function (el) {
    var fn = renderers[el.getAttribute("data-render")];
    if (fn) el.innerHTML = fn();
  });

  $all("[data-bind]").forEach(function (el) {
    var value = get(data, el.getAttribute("data-bind"));
    if (value != null && value !== "") el.textContent = value;
  });

  $all("[data-bind-address-short]").forEach(function (el) {
    if (addr.length) el.textContent = addr[addr.length - 1];
  });

  if (!c.isDemo) $all("[data-demo-chip]").forEach(function (el) { el.remove(); });
  if (!data.testimonialsAreDemo) $all("[data-testimonial-flag]").forEach(function (el) { el.remove(); });
  if (!data.about.educationIsDemo) $all("[data-education-flag]").forEach(function (el) { el.remove(); });

  /* ------------------------------------------------------------------ */
  /* 2. Imagens com substituto                                            */
  /* ------------------------------------------------------------------ */
  function setupImage(holder, src, alt) {
    var img = holder.querySelector("img");
    if (!img) return;
    function fallback() {
      holder.classList.remove("is-loaded");
      holder.classList.add("is-fallback");
      if (alt) {
        holder.setAttribute("role", "img");
        holder.setAttribute("aria-label", alt + " (imagem indisponível)");
      }
    }
    if (!src) { fallback(); return; }
    img.alt = alt || "";
    var timer = setTimeout(function () {
      if (!img.complete || img.naturalWidth === 0) fallback();
    }, config.imageTimeout || 9000);
    img.addEventListener("load", function () {
      clearTimeout(timer);
      if (img.naturalWidth === 0) return fallback();
      holder.classList.remove("is-fallback");
      holder.removeAttribute("role");
      holder.removeAttribute("aria-label");
      holder.classList.add("is-loaded");
    });
    img.addEventListener("error", function () { clearTimeout(timer); fallback(); });
    img.src = src;
  }

  var jobs = [];
  $all(".media").forEach(function (el) {
    var d = null;
    if (el.hasAttribute("data-image")) d = data.images[el.getAttribute("data-image")];
    else if (el.hasAttribute("data-image-path")) d = get(data, el.getAttribute("data-image-path"));
    else if (el.hasAttribute("data-src")) d = { src: el.getAttribute("data-src"), alt: el.getAttribute("data-alt") };
    else return;
    var inGalleryButton = !!el.closest("[data-gallery-index], .preview-tile");
    jobs.push({ el: el, src: d && d.src, alt: inGalleryButton ? "" : (d && d.alt) || "" });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        var job = entry.target._imgJob;
        setupImage(job.el, job.src, job.alt);
      });
    }, { rootMargin: "600px 0px" });
    jobs.forEach(function (job) { job.el._imgJob = job; io.observe(job.el); });
  } else {
    jobs.forEach(function (job) { setupImage(job.el, job.src, job.alt); });
  }

  /* ------------------------------------------------------------------ */
  /* 3. WhatsApp                                                          */
  /* ------------------------------------------------------------------ */
  var wa = config.whatsapp || {};
  var waNumber = String(wa.number || "").replace(/\D/g, "");
  var waDialog = $("[data-wa-dialog]");
  var lightbox = $("[data-lightbox]");
  var lastTrigger = null;

  function waMessage(service) {
    return service ? (wa.serviceMessage || wa.defaultMessage).replace("{servico}", service) : wa.defaultMessage;
  }

  function waUrl(message) {
    return "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message);
  }

  function openModal(dialog, trigger) {
    lastTrigger = trigger || document.activeElement;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    root.classList.add("has-modal");
  }

  function closeModal(dialog) {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else { dialog.removeAttribute("open"); onModalClosed(); }
  }

  function onModalClosed() {
    root.classList.remove("has-modal");
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }

  [waDialog, lightbox].forEach(function (dialog) {
    if (dialog) dialog.addEventListener("close", onModalClosed);
  });

  function startWhatsApp(service, trigger) {
    var message = waMessage(service);
    if (waNumber && !wa.isDemoNumber) {
      window.open(waUrl(message), "_blank", "noopener");
      return;
    }
    var link = $("[data-wa-link]", waDialog);
    $("[data-wa-message]", waDialog).textContent = message;
    if (!waNumber) {
      $("[data-wa-title]", waDialog).textContent = "WhatsApp ainda não configurado";
      $("[data-wa-text]", waDialog).textContent = "Este site é uma demonstração e ainda não tem um número cadastrado. Para ativar, informe o número em js/content.js. Depois disso, este botão abrirá a conversa já com a mensagem abaixo.";
      link.hidden = true;
    } else {
      $("[data-wa-title]", waDialog).textContent = "Agendamento pelo WhatsApp";
      $("[data-wa-text]", waDialog).textContent = "Este modelo usa um número fictício de demonstração. No site da cliente, este botão abre a conversa diretamente, já com a mensagem abaixo. Você pode testar a abertura, mas a mensagem não chegará a ninguém.";
      link.hidden = false;
      link.href = waUrl(message);
    }
    openModal(waDialog, trigger);
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-whatsapp]");
    if (!trigger) return;
    event.preventDefault();
    closeMenu();
    startWhatsApp(trigger.getAttribute("data-service") || "", trigger);
  });

  $all("[data-close-dialog]", waDialog).forEach(function (b) {
    b.addEventListener("click", function () { closeModal(waDialog); });
  });
  $("[data-wa-link]", waDialog).addEventListener("click", function () {
    setTimeout(function () { closeModal(waDialog); }, 50);
  });
  waDialog.addEventListener("click", function (event) {
    if (event.target === waDialog) closeModal(waDialog); // clique fora da caixa
  });

  /* ------------------------------------------------------------------ */
  /* 4a. Menu móvel                                                       */
  /* ------------------------------------------------------------------ */
  var nav = $("[data-nav]");
  var menuBtn = $("[data-menu-toggle]");
  var menuLabel = $("[data-menu-label]");
  var header = $("[data-header]");

  function openMenu() {
    nav.classList.add("is-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuLabel.textContent = "Fechar menu";
    header.classList.add("is-menu-open");
  }

  function closeMenu() {
    if (!nav || !nav.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuLabel.textContent = "Abrir menu";
    header.classList.remove("is-menu-open");
  }

  menuBtn.addEventListener("click", function () {
    if (nav.classList.contains("is-open")) closeMenu(); else openMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { closeMenu(); menuBtn.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (nav.classList.contains("is-open") && !header.contains(e.target)) closeMenu();
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(function (entries) {
      if (entries[0].contentRect.width >= 1140) closeMenu();
    }).observe(document.getElementById("site"));
  }

  /* ------------------------------------------------------------------ */
  /* 4b. FAQ                                                              */
  /* ------------------------------------------------------------------ */
  $all("[data-accordion]").forEach(function (acc) {
    var triggers = $all(".accordion__trigger", acc);
    function setOpen(trigger, open) {
      var item = trigger.closest(".accordion__item");
      var panel = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        panel.hidden = false;
        void panel.offsetHeight;
        item.classList.add("is-open");
      } else {
        item.classList.remove("is-open");
        setTimeout(function () { if (!item.classList.contains("is-open")) panel.hidden = true; }, reduceMotion ? 0 : 300);
      }
    }
    triggers.forEach(function (t, i) {
      t.addEventListener("click", function () {
        var willOpen = t.getAttribute("aria-expanded") !== "true";
        triggers.forEach(function (o) { if (o !== t && o.getAttribute("aria-expanded") === "true") setOpen(o, false); });
        setOpen(t, willOpen);
      });
      t.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown") next = triggers[(i + 1) % triggers.length];
        if (e.key === "ArrowUp") next = triggers[(i - 1 + triggers.length) % triggers.length];
        if (e.key === "Home") next = triggers[0];
        if (e.key === "End") next = triggers[triggers.length - 1];
        if (next) { e.preventDefault(); next.focus(); }
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* 4c. Carrossel de avaliações (sem rolagem automática)                */
  /* ------------------------------------------------------------------ */
  $all("[data-carousel]").forEach(function (car) {
    var slides = $all("[data-slide]", car);
    var track = $(".carousel__track", car);
    var dotsBox = $("[data-carousel-dots]", car);
    var index = 0;
    if (slides.length < 2) { $(".carousel__controls", car).hidden = true; return; }

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "carousel__dot";
      b.setAttribute("aria-label", "Mostrar avaliação " + (i + 1));
      b.addEventListener("click", function () { go(i); });
      dotsBox.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (-100 * index) + "%)";
      slides.forEach(function (s, k) {
        s.setAttribute("aria-hidden", k === index ? "false" : "true");
        s.classList.toggle("is-active", k === index);
      });
      dots.forEach(function (d, k) {
        if (k === index) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    }

    $("[data-carousel-prev]", car).addEventListener("click", function () { go(index - 1); });
    $("[data-carousel-next]", car).addEventListener("click", function () { go(index + 1); });
    car.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    });
    var startX = null;
    track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
    go(0);
  });

  /* ------------------------------------------------------------------ */
  /* 4d. Galeria ampliável                                                */
  /* ------------------------------------------------------------------ */
  var lbImg = $("[data-lightbox-img]");
  var lbFallback = $("[data-lightbox-fallback]");
  var lbCaption = $("[data-lightbox-caption]");
  var lbCount = $("[data-lightbox-count]");
  var lbIndex = 0;

  function showImage(i) {
    var total = data.gallery.length;
    lbIndex = (i + total) % total;
    var g = data.gallery[lbIndex];
    lbFallback.hidden = true;
    lbImg.hidden = false;
    lbImg.onerror = function () { lbImg.hidden = true; lbFallback.hidden = false; };
    lbImg.alt = g.alt;
    lbImg.src = g.src;
    lbCaption.textContent = g.caption || g.alt;
    lbCount.textContent = (lbIndex + 1) + " / " + total;
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-gallery-index]");
    if (!btn) return;
    showImage(Number(btn.getAttribute("data-gallery-index")));
    openModal(lightbox, btn);
    $("[data-lightbox-close]", lightbox).focus();
  });

  $("[data-lightbox-close]", lightbox).addEventListener("click", function () { closeModal(lightbox); });
  $("[data-lightbox-prev]", lightbox).addEventListener("click", function () { showImage(lbIndex - 1); });
  $("[data-lightbox-next]", lightbox).addEventListener("click", function () { showImage(lbIndex + 1); });
  lightbox.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") showImage(lbIndex - 1);
    if (e.key === "ArrowRight") showImage(lbIndex + 1);
  });
  lightbox.addEventListener("click", function (e) {
    // Clique fora da imagem (fundo escuro ou áreas vazias ao redor) fecha
    if (e.target === lightbox || e.target.classList.contains("lightbox__figure") || e.target.hasAttribute("data-lightbox-frame")) {
      closeModal(lightbox);
    }
  });

  /* ------------------------------------------------------------------ */
  /* 5. Cabeçalho, voltar ao topo e paleta entre páginas                  */
  /* ------------------------------------------------------------------ */
  var backTop = $("[data-back-to-top]");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle("is-scrolled", y > 40);
    backTop.classList.toggle("is-visible", y > 800);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  backTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    $(".header .logo").focus({ preventScroll: true });
  });

  /* A paleta é salva no navegador e lida por todas as páginas. Se o
     armazenamento estiver bloqueado, ela segue junto no endereço do link. */
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link || !PS.theme || PS.theme.storageAvailable) return;
    var href = link.getAttribute("data-orig-href") || link.getAttribute("href");
    if (!/^([\w-]+\/)?[\w-]+\.html(\?[^#]*)?(#.*)?$/.test(href)) return;
    link.setAttribute("data-orig-href", href);
    var parts = href.split("#");
    var sep = parts[0].indexOf("?") === -1 ? "?" : "&";
    link.setAttribute("href", parts[0] + sep + "tema=" + encodeURIComponent(PS.theme.toQuery()) + (parts[1] ? "#" + parts[1] : ""));
  });
})();
