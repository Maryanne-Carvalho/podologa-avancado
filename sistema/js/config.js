/* ==========================================================================
   CONFIGURAÇÃO DO SISTEMA — escolha entre DEMONSTRAÇÃO e SUPABASE (real)
   --------------------------------------------------------------------------
   modo: "demo"     → dados fictícios guardados só neste navegador.
                      NÃO existe login de verdade nem servidor. Serve para
                      conhecer e testar as telas.
   modo: "supabase" → banco de dados e login reais (Supabase).
                      Preencha url, anonKey e clinicId (veja docs/SUPABASE.md).

   ⚠ Aqui só entram dados PÚBLICOS. A chave "anon" pode ficar no site porque
     quem protege os dados são as regras de acesso do banco (RLS).
     NUNCA coloque a chave "service_role" neste arquivo nem em nenhum outro
     arquivo do site.
   ========================================================================== */
window.PS = window.PS || {};

window.PS.sistema = {
  modo: "supabase",

  supabase: {
    url: "https://ryrrbtosdskqpmewjyjr.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cnJidG9zZHNrcXBtZXdqeWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNTU1MDgsImV4cCI6MjEwODYzMTUwOH0.Sw-WKrNxNjDCXDSPd-aJERiJ1BJpzIUBtzIe26epSPU", // chave PÚBLICA "anon" (conferida: role = anon)
    clinicId: "7581fd98-de53-43dc-af16-bd563898e4ab" // Podologia Studio
  },

  /* Em produção, deixe false: a central de demonstração e as contas de teste
     ficam indisponíveis. (No modo "supabase" elas nunca existem.) */
  permitirDemonstracao: false,

  /* Endereço público do site (usado nos links de recuperação de senha). Vazio = detecta sozinho. */
  enderecoDoSite: "",

  /* Chaves de armazenamento da demonstração (separadas da Learning Page e do Elegance) */
  demoStorageKey: "avancado-demo:v1:podologia-studio",

  /* Versão da biblioteca do Supabase carregada no modo real */
  supabaseJs: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"
};
