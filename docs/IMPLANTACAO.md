# Implantação (colocar no ar de verdade)

## Antes de publicar: lista obrigatória

- [ ] Os passos 1 a 6 de `docs/SUPABASE.md` estão concluídos.
- [ ] Em `sistema/js/config.js`:
  - [ ] `modo: "supabase"`;
  - [ ] `permitirDemonstracao: false`;
  - [ ] `url`, `anonKey` (chave **pública**) e `clinicId` estão preenchidos;
  - [ ] `enderecoDoSite` tem o domínio com https.
- [ ] **Nenhuma** chave `service_role` / `sb_secret_` em nenhum arquivo. Para conferir: `grep -ri "service_role\|sb_secret" .` só deve mostrar comentários e avisos.
- [ ] **Não existe** conta de teste no Supabase (Authentication → Users). Não existe senha padrão. A conta da podóloga tem senha forte e é dela.
- [ ] `demonstracao.html` foi removida da publicação (recomendado). Com `permitirDemonstracao: false` ela já fica bloqueada, mas é melhor não publicar.
- [ ] SMTP próprio está configurado (passo 4 de `SUPABASE.md`).
- [ ] O texto de `privacidade.html` foi revisado por assessoria jurídica (veja `LGPD.md`).
- [ ] Os textos do site público em `js/content.js` estão com os dados reais (nome, telefone, endereço, horários, depoimentos **reais e autorizados**).
- [ ] O teste final (passo 8 de `SUPABASE.md`) foi feito e todos os itens passaram.

## Onde hospedar

O site é só HTML, CSS e JavaScript. Não precisa de servidor próprio.

Serve qualquer hospedagem de site estático com **https**: Netlify, Vercel, Cloudflare Pages, GitHub Pages ou a hospedagem do seu domínio.

Exemplo com Netlify (arrastar e soltar):

1. Entre em <https://app.netlify.com/drop>.
2. Arraste a pasta `avancado` (sem `supabase/tests`, `tests` e `node_modules`).
3. Ligue o seu domínio em Domain settings. O https é automático.
4. Atualize **Site URL** e **Redirect URLs** no Supabase com o domínio final.

Se usar variáveis de ambiente no lugar de editar o `config.js`, veja `.env.example`. Os três valores são públicos por natureza; o importante é **nunca** acrescentar a `service_role`.

## Recomendações de cabeçalhos (se a hospedagem permitir)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

A política de conteúdo (CSP) precisa liberar:

- `https://*.supabase.co` (conexão);
- `https://cdn.jsdelivr.net` (biblioteca do Supabase);
- `fonts.googleapis.com` e `fonts.gstatic.com` (fontes);
- `images.unsplash.com` (fotos de exemplo; troque pelas fotos da clínica e remova).

## O que esta versão NÃO faz (planeje antes de abrir)

- **Avisos automáticos** de novo agendamento, cancelamento ou resumo diário. As preferências são salvas, mas nada é enviado. Caminho sugerido: uma Supabase Edge Function disparada por Database Webhook, enviando por e-mail ou pela API oficial do WhatsApp Business.
- **Lembretes** para o paciente (WhatsApp/SMS).
- **Pagamentos.** A estrutura está preparada: preço e duração ficam "congelados" no agendamento, e o status é separado do pagamento.
- **Vários turnos por dia na tela.** O banco aceita, mas a tela edita um turno e uma pausa por dia.
- **Backups:** confira o plano do Supabase. O plano gratuito tem backup limitado e pausa projetos inativos.

## Manutenção

- Para mudar o banco no futuro, crie um **novo** arquivo de migração (`004_...sql`). Não edite os já aplicados.
- Antes de aplicar no projeto real, rode `supabase/tests/rodar-testes.sh` num PostgreSQL local.
- Revise periodicamente quem tem acesso administrativo (Configurações → Acesso).
