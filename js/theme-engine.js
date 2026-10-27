/* Arquivo do Elegance — independente de qualquer outro projeto.
   Este arquivo pertence ao Elegance e pode ser alterado sem afetar outros projetos. */

/* ==========================================================================
   MOTOR DE TEMAS
   Recebe uma paleta (+ ajustes manuais), calcula as cores derivadas que
   garantem legibilidade e aplica tudo como variáveis CSS no <html>.
   Usado pelo seletor de cores do Elegance (js/palette-switcher.js).
   A paleta é salva com a chave definida em PS.config.storageKey.
   ========================================================================== */

window.PS = window.PS || {};

window.PS.theme = (function () {
  "use strict";

  var C = window.PS.color;
  var config = window.PS.config;
  var palettes = window.PS.palettes;
  var root = document.documentElement;

  var EDITABLE = ["primary", "accent", "secondary"];

  var state = {
    paletteId: config.defaultPalette,
    overrides: {}
  };

  var transitionTimer = null;
  var lastResult = null;

  function getPalette(id) {
    for (var i = 0; i < palettes.length; i++) {
      if (palettes[i].id === id) return palettes[i];
    }
    return palettes[0];
  }

  /* ---------- Cálculo das cores ---------- */
  function compute(palette, overrides) {
    var c = {};
    Object.keys(palette.colors).forEach(function (k) { c[k] = C.normalizeHex(palette.colors[k]); });
    Object.keys(overrides || {}).forEach(function (k) {
      var v = C.normalizeHex(overrides[k]);
      if (v && EDITABLE.indexOf(k) !== -1) c[k] = v;
    });

    var darkTheme = C.isDark(c.background);
    var lightInk = darkTheme ? c.text : "#ffffff";
    var darkInk = darkTheme ? c.background : c.text;

    // Fundos "claros" onde aparecem textos (iguais aos color-mix do CSS)
    var secondarySoft = C.mix(c.secondary, c.background, 0.55);
    var primarySoft = C.mix(c.primary, c.surface, 0.12);
    var accentSoft = C.mix(c.accent, c.surface, 0.22);
    var readingBgs = [c.background, c.surface, secondarySoft];

    var text = C.ensureContrast(c.text, readingBgs, 7);
    var muted = C.ensureContrast(c.muted, readingBgs, 4.5);

    var onPrimaryPref = C.isDark(c.primary) || C.luminance(c.primary) < 0.3 ? [lightInk, "#ffffff", darkInk, "#111111"] : [darkInk, "#111111", lightInk, "#ffffff"];
    var onPrimary = C.pickReadable(c.primary, onPrimaryPref, 4.5);

    var onAccent = C.pickReadable(c.accent, [darkInk, "#111111", lightInk, "#ffffff"], 4.5);

    var primaryInk = C.ensureContrast(c.primary, readingBgs.concat([primarySoft]), 4.5);
    var accentInk = C.ensureContrast(c.accent, readingBgs.concat([accentSoft]), 4.5);

    var onDeep = C.pickReadable(c.deep, [c.background, c.surface, "#ffffff", c.text], 7);
    var footerBg = C.mix(c.deep, "#000000", 0.92);
    var accentOnDeep = C.ensureContrast(c.accent, [c.deep, footerBg], 4.5);
    var mutedOnDeep = C.ensureContrast(C.mix(onDeep, c.deep, 0.78), [c.deep, footerBg], 4.5);

    var tokens = {
      "--color-primary": c.primary,
      "--color-secondary": c.secondary,
      "--color-accent": c.accent,
      "--color-background": c.background,
      "--color-surface": c.surface,
      "--color-text": text,
      "--color-muted": muted,
      "--color-deep": c.deep,
      "--color-on-primary": onPrimary,
      "--color-on-accent": onAccent,
      "--color-on-deep": onDeep,
      "--color-primary-ink": primaryInk,
      "--color-accent-ink": accentInk,
      "--color-accent-on-deep": accentOnDeep,
      "--color-muted-on-deep": mutedOnDeep,
      "--radius-base": (palette.radius || 16) + "px"
    };

    var checks = [
      { id: "text", name: "Texto sobre o fundo", fg: text, bg: c.background },
      { id: "button", name: "Botão principal", fg: onPrimary, bg: c.primary },
      { id: "link", name: "Links e destaques", fg: primaryInk, bg: c.background },
      { id: "deep", name: "Seções escuras", fg: onDeep, bg: c.deep }
    ].map(function (chk) {
      chk.ratio = C.contrast(chk.fg, chk.bg);
      chk.grade = C.grade(chk.ratio);
      return chk;
    });

    return { colors: c, tokens: tokens, checks: checks, dark: darkTheme };
  }

  /* ---------- Aplicação ---------- */
  function apply(options) {
    var opts = options || {};
    var palette = getPalette(state.paletteId);
    var result = compute(palette, state.overrides);

    if (opts.animate !== false) {
      root.classList.add("is-theming");
      clearTimeout(transitionTimer);
      transitionTimer = setTimeout(function () { root.classList.remove("is-theming"); }, 650);
    }

    Object.keys(result.tokens).forEach(function (name) {
      root.style.setProperty(name, result.tokens[name]);
    });
    root.style.colorScheme = result.dark ? "dark" : "light";
    root.setAttribute("data-palette", palette.id);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", result.colors.background);

    lastResult = {
      palette: palette,
      overrides: Object.assign({}, state.overrides),
      customized: Object.keys(state.overrides).length > 0,
      colors: result.colors,
      tokens: result.tokens,
      checks: result.checks
    };

    save();
    document.dispatchEvent(new CustomEvent("ps:themechange", { detail: lastResult }));
    return lastResult;
  }

  /* ---------- Persistência (opcional; falha em silêncio) ---------- */
  function save() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(state));
    } catch (e) { /* armazenamento indisponível: segue sem salvar */ }
  }

  function applyData(data) {
    if (!data || typeof data.paletteId !== "string") return;
    state.paletteId = getPalette(data.paletteId).id;
    state.overrides = {};
    if (data.overrides && typeof data.overrides === "object") {
      EDITABLE.forEach(function (k) {
        var v = C.normalizeHex(data.overrides[k]);
        if (v) state.overrides[k] = v;
      });
    }
  }

  /* O armazenamento do navegador pode estar bloqueado (modo privado, arquivos
     abertos localmente em alguns navegadores). Nesse caso, sites com várias
     páginas levam a paleta pela URL: ?tema=rosa-areia.p9f5c63.ae3b2ad */
  var storageAvailable = (function () {
    try {
      var k = config.storageKey + ":test";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function toQuery() {
    var parts = [state.paletteId];
    Object.keys(state.overrides).forEach(function (k) {
      parts.push(k.charAt(0) + state.overrides[k].slice(1));
    });
    return parts.join(".");
  }

  function fromQuery() {
    try {
      var match = /[?&]tema=([^&#]+)/.exec(window.location.search);
      if (!match) return null;
      var parts = decodeURIComponent(match[1]).split(".");
      var data = { paletteId: parts[0], overrides: {} };
      var keys = { p: "primary", a: "accent", s: "secondary" };
      parts.slice(1).forEach(function (part) {
        var key = keys[part.charAt(0)];
        if (key) data.overrides[key] = "#" + part.slice(1);
      });
      return data;
    } catch (e) { return null; }
  }

  function load() {
    try {
      var raw = localStorage.getItem(config.storageKey);
      if (raw) applyData(JSON.parse(raw));
    } catch (e) { /* dados inválidos ou armazenamento bloqueado: usa o padrão */ }
    var fromUrl = fromQuery();
    if (fromUrl) applyData(fromUrl);
  }

  /* ---------- API pública ---------- */
  function setPalette(id) {
    state.paletteId = getPalette(id).id;
    state.overrides = {};
    return apply();
  }

  function setOverride(key, hex, opts) {
    var v = C.normalizeHex(hex);
    if (!v || EDITABLE.indexOf(key) === -1) return lastResult;
    var base = C.normalizeHex(getPalette(state.paletteId).colors[key]);
    if (v === base) delete state.overrides[key];
    else state.overrides[key] = v;
    return apply(opts);
  }

  function restore() {
    state.overrides = {};
    return apply();
  }

  function resetOriginal() {
    state.paletteId = getPalette(config.defaultPalette).id;
    state.overrides = {};
    return apply();
  }

  function init() {
    load();
    return apply({ animate: false });
  }

  return {
    init: init,
    setPalette: setPalette,
    setOverride: setOverride,
    restore: restore,
    resetOriginal: resetOriginal,
    compute: compute,
    getPalette: getPalette,
    getState: function () { return lastResult; },
    storageAvailable: storageAvailable,
    toQuery: toQuery,
    editable: EDITABLE.slice()
  };
})();
