/* ==========================================================================
   SITE PÚBLICO — ajustes do modelo Avançado
   • Modo real (Supabase): usa as cores salvas pela clínica e esconde o seletor
     de demonstração dos visitantes.
   • Modo demonstração: mantém o seletor de cores do Elegance.
   ========================================================================== */
(function () {
  "use strict";
  var PS = window.PS;
  if (!PS.api || !PS.sys) return;
  if (PS.api.modo === "supabase") {
    document.documentElement.classList.add("sem-seletor");
    PS.api.pronto.then(function () { return PS.api.clinica(); }).then(PS.sys.aplicarCoresDaClinica).catch(function () {});
  }
})();
