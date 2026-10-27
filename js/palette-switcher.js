/* ==========================================================================
   ELEGANCE — SELETOR DE CORES DA DEMONSTRAÇÃO
   Painel compacto e discreto para a podóloga experimentar as 8 paletas
   e ajustar a cor principal e a de destaque. Usa apenas arquivos desta
   pasta (palettes.js, color-utils.js e theme-engine.js).
   A escolha vale para todas as páginas do Elegance (chave própria de
   armazenamento definida em js/content.js).

   Para entregar o site final sem o seletor: remova este script das
   páginas e o bloco "SELETOR DE CORES" de js/layout.js.
   ========================================================================== */

(function () {
  "use strict";

  var PS = window.PS;
  var theme = PS.theme;
  var panel = document.querySelector("[data-colors-panel]");
  if (!theme || !panel) return;

  var list = panel.querySelector("[data-swatch-list]");
  var current = panel.querySelector("[data-colors-current]");
  var legibility = panel.querySelector("[data-colors-legibility]");
  var openers = Array.prototype.slice.call(document.querySelectorAll("[data-colors-open]"));
  var fabSwatches = document.querySelector("[data-colors-fab-swatches]");
  var pickers = Array.prototype.slice.call(panel.querySelectorAll("[data-color-picker]"));
  var lastOpener = null;

  function toast(msg) { if (PS.ui && PS.ui.toast) PS.ui.toast(msg); }

  /* ---------- Amostras das paletas ---------- */
  var options = PS.palettes.map(function (p) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "false");
    b.setAttribute("tabindex", "-1");
    b.dataset.palette = p.id;
    b.innerHTML =
      '<span class="swatch__dot" aria-hidden="true">' +
        '<i style="background:' + p.colors.primary + '"></i>' +
        '<i style="background:' + p.colors.accent + '"></i>' +
        '<i style="background:' + p.colors.secondary + '"></i>' +
      "</span>" +
      '<span class="swatch__name"></span>';
    b.querySelector(".swatch__name").textContent = p.name;
    b.addEventListener("click", function () { choose(p.id, true); });
    list.appendChild(b);
    return b;
  });

  function choose(id, announce) {
    var st = theme.getState();
    if (st && st.palette.id === id && !st.customized) return;
    var r = theme.setPalette(id);
    if (announce) toast("Paleta “" + r.palette.name + "” aplicada a todas as páginas.");
  }

  list.addEventListener("keydown", function (e) {
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    var i = options.indexOf(document.activeElement);
    if (i < 0) i = 0;
    var n = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (i + keys[e.key] + options.length) % options.length;
    options[n].focus();
    choose(options[n].dataset.palette, false);
  });

  /* ---------- Ajuste manual: cor principal e de destaque ---------- */
  pickers.forEach(function (input) {
    var key = input.getAttribute("data-color-picker");
    input.addEventListener("input", function () { theme.setOverride(key, input.value, { animate: false }); });
    input.addEventListener("change", function () {
      theme.setOverride(key, input.value, { animate: false });
      toast((key === "primary" ? "Cor principal" : "Cor de destaque") + " ajustada.");
    });
  });

  panel.querySelector("[data-colors-reset]").addEventListener("click", function () {
    var r = theme.resetOriginal();
    toast("Cores padrão restauradas: “" + r.palette.name + "”.");
  });

  /* ---------- Atualiza o painel quando as cores mudam ---------- */
  function render(st) {
    if (!st) return;
    options.forEach(function (b) {
      var on = b.dataset.palette === st.palette.id;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.setAttribute("tabindex", on ? "0" : "-1");
    });
    current.textContent = st.palette.name + (st.customized ? " (ajustada)" : "");
    pickers.forEach(function (input) {
      var key = input.getAttribute("data-color-picker");
      if (document.activeElement !== input) input.value = st.colors[key];
      var hex = panel.querySelector('[data-color-hex="' + key + '"]');
      if (hex) hex.textContent = st.colors[key].toUpperCase();
    });
    var worst = st.checks.reduce(function (m, c) { return c.ratio < m.ratio ? c : m; }, st.checks[0]);
    var good = worst.ratio >= 4.5;
    legibility.className = "color-panel__legibility " + (good ? "is-good" : "is-warn");
    legibility.textContent = good
      ? "Leitura confortável em todo o site."
      : "Atenção: “" + worst.name.toLowerCase() + "” ficou com pouco contraste. Experimente um tom mais escuro.";
    if (fabSwatches) {
      fabSwatches.innerHTML = "";
      ["primary", "accent", "secondary"].forEach(function (k) {
        var i = document.createElement("i");
        i.style.background = st.colors[k];
        fabSwatches.appendChild(i);
      });
    }
  }

  document.addEventListener("ps:themechange", function (e) { render(e.detail); });
  render(theme.getState());

  /* ---------- Abrir e fechar ---------- */
  function open(opener) {
    lastOpener = opener || null;
    panel.hidden = false;
    document.documentElement.classList.add("colors-open");
    openers.forEach(function (o) { o.setAttribute("aria-expanded", "true"); });
    (list.querySelector('[aria-checked="true"]') || options[0]).focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    document.documentElement.classList.remove("colors-open");
    openers.forEach(function (o) { o.setAttribute("aria-expanded", "false"); });
    if (returnFocus !== false) {
      var target = lastOpener && lastOpener.offsetParent !== null ? lastOpener : document.querySelector(".color-fab");
      if (target) target.focus({ preventScroll: true });
    }
  }

  openers.forEach(function (o) {
    o.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.hidden) open(o); else close();
    });
  });

  panel.querySelector("[data-colors-close]").addEventListener("click", function () { close(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  document.addEventListener("click", function (e) {
    if (!panel.hidden && !panel.contains(e.target)) close(false);
  });
})();
