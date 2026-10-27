/* Arquivo do Elegance — independente de qualquer outro projeto.
   Este arquivo pertence ao Elegance e pode ser alterado sem afetar outros projetos. */

/* ==========================================================================
   UTILITÁRIOS DE COR
   Conversões, mistura e cálculo de contraste (WCAG 2.x).
   ========================================================================== */

window.PS = window.PS || {};

window.PS.color = (function () {
  "use strict";

  function normalizeHex(hex) {
    if (typeof hex !== "string") return null;
    var h = hex.trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return "#" + h.toLowerCase();
  }

  function hexToRgb(hex) {
    var h = normalizeHex(hex);
    if (!h) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    };
  }

  function rgbToHex(rgb) {
    function part(v) {
      var n = Math.max(0, Math.min(255, Math.round(v)));
      return (n < 16 ? "0" : "") + n.toString(16);
    }
    return "#" + part(rgb.r) + part(rgb.g) + part(rgb.b);
  }

  /* Mistura em sRGB: weight = proporção da cor "a" (igual ao color-mix do CSS) */
  function mix(a, b, weight) {
    var ca = hexToRgb(a);
    var cb = hexToRgb(b);
    var w = Math.max(0, Math.min(1, weight));
    return rgbToHex({
      r: ca.r * w + cb.r * (1 - w),
      g: ca.g * w + cb.g * (1 - w),
      b: ca.b * w + cb.b * (1 - w)
    });
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    var ch = [c.r, c.g, c.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function contrast(a, b) {
    var la = luminance(a);
    var lb = luminance(b);
    var hi = Math.max(la, lb);
    var lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  function minContrast(fg, backgrounds) {
    return backgrounds.reduce(function (min, bg) {
      return Math.min(min, contrast(fg, bg));
    }, Infinity);
  }

  function isDark(hex) {
    return luminance(hex) < 0.18;
  }

  /* Ajusta "fg" (escurecendo ou clareando aos poucos) até atingir o contraste
     mínimo contra todos os fundos informados. Mantém o matiz o máximo possível. */
  function ensureContrast(fg, backgrounds, min) {
    var bgs = Array.isArray(backgrounds) ? backgrounds : [backgrounds];
    if (minContrast(fg, bgs) >= min) return normalizeHex(fg);

    var avgLum = bgs.reduce(function (s, bg) { return s + luminance(bg); }, 0) / bgs.length;
    var preferred = avgLum > 0.4 ? "#000000" : "#ffffff";
    var other = preferred === "#000000" ? "#ffffff" : "#000000";
    var targets = [preferred, other];

    for (var t = 0; t < targets.length; t++) {
      for (var step = 0.04; step <= 1.0001; step += 0.04) {
        var candidate = mix(targets[t], fg, step);
        if (minContrast(candidate, bgs) >= min) return candidate;
      }
    }
    return preferred;
  }

  /* Escolhe, entre as candidatas, a primeira que atinge o contraste mínimo;
     se nenhuma atingir, devolve a de maior contraste. */
  function pickReadable(bg, candidates, min) {
    var best = candidates[0];
    var bestRatio = 0;
    for (var i = 0; i < candidates.length; i++) {
      var r = contrast(candidates[i], bg);
      if (r >= min) return normalizeHex(candidates[i]);
      if (r > bestRatio) { bestRatio = r; best = candidates[i]; }
    }
    return normalizeHex(best);
  }

  function grade(ratio) {
    if (ratio >= 7) return { key: "aaa", label: "AAA" };
    if (ratio >= 4.5) return { key: "aa", label: "AA" };
    if (ratio >= 3) return { key: "large", label: "Títulos" };
    return { key: "low", label: "Baixo" };
  }

  return {
    normalizeHex: normalizeHex,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    mix: mix,
    luminance: luminance,
    contrast: contrast,
    minContrast: minContrast,
    isDark: isDark,
    ensureContrast: ensureContrast,
    pickReadable: pickReadable,
    grade: grade
  };
})();
