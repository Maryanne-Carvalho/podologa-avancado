/* ==========================================================================
   DISPONIBILIDADE — cálculo dos horários livres
   Mesma regra da função app.compute_slots do banco (supabase/migrations/003):
     • dias e horários de atendimento (podem ser vários turnos por dia);
     • grade de horários (ex.: de 30 em 30 minutos);
     • duração do serviço;
     • pausas (ex.: almoço) — o atendimento inteiro precisa caber fora delas;
     • bloqueios, feriados e férias;
     • agendamentos ativos + intervalo entre consultas;
     • antecedência mínima e limite de dias à frente (para clientes).
   No modo real, isto serve só para MOSTRAR horários. Quem decide se a
   reserva pode ser gravada é o servidor.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var T = PS.tempo || (typeof require !== "undefined" ? require("./tempo.js") : null);

  function overlap(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }

  /**
   * @param {object} o
   *  fromYmd, toYmd, tz, rules[{weekday,start,end}], breaks[{weekday,start,end}],
   *  exceptions[{startsAt,endsAt}], appointments[{id,startsAt,occupiedUntil,status}],
   *  durationMin, bufferMin, stepMin, minNoticeHours, horizonDays,
   *  enforceWindow (true = regras do cliente), ignoreId, now (Date)
   * @returns [{startsAt, endsAt, ymd, hm}]
   */
  function calcular(o) {
    var now = (o.now || new Date()).getTime();
    var out = [];
    var seen = {};
    var dur = o.durationMin, step = o.stepMin, buf = o.bufferMin || 0;
    if (!(dur > 0) || !(step > 0)) return out;
    var maxDays = Math.min(T.diffDays(o.fromYmd, o.toYmd), 62);

    var exc = (o.exceptions || []).map(function (x) { return [new Date(x.startsAt).getTime(), new Date(x.endsAt).getTime()]; });
    var busy = (o.appointments || []).filter(function (a) {
      return (a.status === "pending" || a.status === "confirmed") && (!o.ignoreId || a.id !== o.ignoreId);
    }).map(function (a) { return [new Date(a.startsAt).getTime(), new Date(a.occupiedUntil).getTime()]; });

    for (var i = 0; i <= maxDays; i++) {
      var ymd = T.addDays(o.fromYmd, i);
      var wd = T.weekdayOf(ymd);
      var dayRules = (o.rules || []).filter(function (r) { return +r.weekday === wd; });
      var dayBreaks = (o.breaks || []).filter(function (b) { return +b.weekday === wd; });

      dayRules.forEach(function (r) {
        var startMin = T.hmToMin(r.start), endMin = T.hmToMin(r.end);
        for (var m = startMin; m + dur <= endMin; m += step) {
          var hm = T.minToHm(m);
          var s = T.zonedToDate(ymd, hm, o.tz).getTime();
          var e = s + dur * 60000;

          if (o.enforceWindow) {
            if (s < now + (o.minNoticeHours || 0) * 3600000) continue;
            if (s > now + (o.horizonDays || 60) * 86400000) continue;
          } else if (s < now - 30 * 60000) continue;

          var inBreak = dayBreaks.some(function (b) {
            return m < T.hmToMin(b.end) && m + dur > T.hmToMin(b.start);
          });
          if (inBreak) continue;
          if (exc.some(function (x) { return overlap(s, e, x[0], x[1]); })) continue;
          if (busy.some(function (a) { return overlap(s, e + buf * 60000, a[0], a[1]); })) continue;

          if (seen[s]) continue;
          seen[s] = true;
          out.push({ startsAt: new Date(s).toISOString(), endsAt: new Date(e).toISOString(), ymd: ymd, hm: hm });
        }
      });
    }
    out.sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; });
    return out;
  }

  /* O horário exato está entre os livres? (usado para validar antes de gravar) */
  function horarioLivre(o, startsAtIso) {
    var target = new Date(startsAtIso).getTime();
    var ymd = T.partsIn(new Date(target), o.tz).ymd;
    var lista = calcular(Object.assign({}, o, { fromYmd: ymd, toYmd: ymd }));
    return lista.some(function (s) { return new Date(s.startsAt).getTime() === target; });
  }

  PS.disponibilidade = { calcular: calcular, horarioLivre: horarioLivre };
  if (typeof module !== "undefined") module.exports = PS.disponibilidade;
})(typeof window !== "undefined" ? window : globalThis);
