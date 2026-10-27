/* ==========================================================================
   ESCOLHE A PONTE DE DADOS conforme sistema/js/config.js
   Todas as telas usam PS.api.* sem saber se é demonstração ou Supabase.
   ========================================================================== */
(function (root) {
  "use strict";
  var PS = root.PS = root.PS || {};
  var modo = (PS.sistema && PS.sistema.modo) || "demo";

  if (modo === "supabase") {
    PS.api = PS.apiSupabase;
  } else if (modo === "demo") {
    if (PS.sistema.permitirDemonstracao === false) {
      PS.api = { modo: "desativado", pronto: Promise.reject(Object.assign(new Error("DEMO_DISABLED"), { code: "DEMO_DISABLED" })) };
    } else {
      PS.api = PS.apiDemo;
    }
  } else {
    PS.api = { modo: "invalido", pronto: Promise.reject(Object.assign(new Error("INVALID_MODE"), { code: "INVALID_MODE" })) };
  }
  if (PS.api && PS.api.pronto && PS.api.pronto.catch) PS.api.pronto.catch(function () {});
})(window);
