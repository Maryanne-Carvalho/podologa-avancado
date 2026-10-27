/* ==========================================================================
   TEMPO — datas e horários no fuso da clínica
   O navegador da pessoa pode estar em outro fuso. Por isso toda conta de
   agenda é feita no fuso da CLÍNICA (ex.: America/Sao_Paulo) e os horários
   são guardados como instantes universais (ISO, em UTC), igual ao banco.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};

  var partsCache = {};
  function partsFormatter(tz) {
    if (!partsCache[tz]) {
      partsCache[tz] = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short"
      });
    }
    return partsCache[tz];
  }

  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  /* Partes de data/hora de um instante, vistas no fuso indicado */
  function partsIn(date, tz) {
    var out = {};
    partsFormatter(tz).formatToParts(date).forEach(function (p) { out[p.type] = p.value; });
    return {
      y: +out.year, m: +out.month, d: +out.day,
      hh: +out.hour === 24 ? 0 : +out.hour, mm: +out.minute, ss: +out.second,
      weekday: WD[out.weekday],
      ymd: out.year + "-" + out.month + "-" + out.day,
      hm: pad(+out.hour === 24 ? 0 : +out.hour) + ":" + out.minute
    };
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* Diferença (ms) entre o fuso e o UTC num instante */
  function offsetMs(date, tz) {
    var p = partsIn(date, tz);
    var asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
  }

  /* "2026-11-03" + "09:30" no fuso da clínica → Date (instante real) */
  function zonedToDate(ymd, hm, tz) {
    var a = ymd.split("-").map(Number);
    var b = hm.split(":").map(Number);
    var guess = Date.UTC(a[0], a[1] - 1, a[2], b[0], b[1] || 0, 0);
    var off1 = offsetMs(new Date(guess), tz);
    var t = guess - off1;
    var off2 = offsetMs(new Date(t), tz);
    if (off2 !== off1) t = guess - off2;   // ajuste em trocas de horário de verão
    return new Date(t);
  }

  function addDays(ymd, n) {
    var a = ymd.split("-").map(Number);
    var d = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function weekdayOf(ymd) {
    var a = ymd.split("-").map(Number);
    return new Date(Date.UTC(a[0], a[1] - 1, a[2])).getUTCDay();
  }

  function diffDays(a, b) {
    var x = a.split("-").map(Number), y = b.split("-").map(Number);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }

  function todayIn(tz) { return partsIn(new Date(), tz).ymd; }

  function hmToMin(hm) { var b = hm.split(":").map(Number); return b[0] * 60 + (b[1] || 0); }
  function minToHm(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }

  /* ---------- Formatação para leitura (sempre no fuso da clínica) ---------- */
  var fmtCache = {};
  function fmt(tz, opts) {
    var key = tz + JSON.stringify(opts);
    if (!fmtCache[key]) fmtCache[key] = new Intl.DateTimeFormat("pt-BR", Object.assign({ timeZone: tz }, opts));
    return fmtCache[key];
  }
  function toDate(v) { return v instanceof Date ? v : new Date(v); }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  var format = {
    time: function (v, tz) { return fmt(tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toDate(v)); },
    date: function (v, tz) { return fmt(tz, { day: "2-digit", month: "2-digit", year: "numeric" }).format(toDate(v)); },
    dateLong: function (v, tz) { return cap(fmt(tz, { weekday: "long", day: "numeric", month: "long" }).format(toDate(v))); },
    dateShort: function (v, tz) { return cap(fmt(tz, { weekday: "short", day: "numeric", month: "short" }).format(toDate(v)).replace(/\./g, "")); },
    monthYear: function (v, tz) { return cap(fmt(tz, { month: "long", year: "numeric" }).format(toDate(v))); },
    /* Datas "puras" (YYYY-MM-DD) sem conversão de fuso */
    ymdLong: function (ymd) {
      var a = ymd.split("-").map(Number);
      return cap(fmt("UTC", { weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.UTC(a[0], a[1] - 1, a[2], 12))));
    },
    ymdShort: function (ymd) {
      var a = ymd.split("-").map(Number);
      return fmt("UTC", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(Date.UTC(a[0], a[1] - 1, a[2], 12)));
    },
    monthOf: function (ymd) {
      var a = ymd.split("-").map(Number);
      return cap(fmt("UTC", { month: "long", year: "numeric" }).format(new Date(Date.UTC(a[0], a[1] - 1, 15))));
    }
  };

  var WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  var WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  PS.tempo = {
    cap: cap,
    partsIn: partsIn, zonedToDate: zonedToDate, addDays: addDays, weekdayOf: weekdayOf, diffDays: diffDays,
    todayIn: todayIn, hmToMin: hmToMin, minToHm: minToHm, pad: pad, format: format,
    WEEKDAYS: WEEKDAYS, WEEKDAYS_SHORT: WEEKDAYS_SHORT
  };
  if (typeof module !== "undefined") module.exports = PS.tempo;
})(typeof window !== "undefined" ? window : globalThis);
