# Ligar o modelo ao Supabase (modo real), passo a passo

Tempo estimado: 30 a 60 minutos. Você precisa de uma conta gratuita em <https://supabase.com>.

> Antes de começar: **nada aqui usa a chave `service_role`.**
>
> Ela dá acesso total ao banco, ignorando todas as regras de segurança. Por isso **nunca** vai para o site, para o GitHub nem para mensagens.
>
> O site usa só a chave **anon** (pública). Quem protege os dados são as regras do banco (RLS).

---

## Passo 1 — Criar o projeto

1. No Supabase, clique em **New project**.
2. Escolha um nome e uma **senha forte para o banco**. Guarde essa senha num gerenciador de senhas; ela não vai para o site.
3. Região: **South America (São Paulo)**. Os dados ficam no Brasil e a resposta é mais rápida.
4. Espere o projeto ficar pronto (1–2 minutos).

## Passo 2 — Criar as tabelas, as regras e as funções

Abra **SQL Editor → New query**. Rode os arquivos **nesta ordem**, um de cada vez. Para cada um: copie o conteúdo inteiro, cole e clique em **Run**.

1. `supabase/migrations/001_tabelas.sql`: tabelas, tipos e a trava que impede dois atendimentos no mesmo horário.
2. `supabase/migrations/002_seguranca_rls.sql`: regras de acesso (quem vê o quê).
3. `supabase/migrations/003_funcoes.sql`: funções de agendar, cancelar, remarcar, aprovar pedidos, convites etc.

Cada um deve terminar com "Success. No rows returned". Se aparecer erro, pare e não rode o próximo. O erro mais comum é rodar fora de ordem.

> **Não rode** nada da pasta `supabase/tests/` no projeto real. Aqueles arquivos criam usuários e clínicas falsos e servem só para um PostgreSQL local de testes.

Confira em **Database → Extensions** se `btree_gist` está ativa. A migração 001 ativa sozinha, mas é bom conferir.

## Passo 3 — Configurar o login (Authentication)

Em **Authentication → Sign In / Providers → Email**:

- **Enable Email provider**: ligado.
- **Confirm email**: **ligado**. A pessoa só entra depois de confirmar o e-mail.
- **Minimum password length**: 8 ou mais. Se o seu plano tiver a opção "Leaked password protection", ligue também.
- **Allow anonymous sign-ins**: **desligado**.

Em **Authentication → URL Configuration**:

- **Site URL**: o endereço do site, com https. Exemplo: `https://www.suaclinica.com.br/`.
- **Redirect URLs**: adicione estes três endereços, trocando pelo seu domínio:
  - `https://www.suaclinica.com.br/cliente/entrar.html`
  - `https://www.suaclinica.com.br/cliente/nova-senha.html`
  - `https://www.suaclinica.com.br/admin/aceitar-convite.html`

Em **Authentication → Emails** (modelos):

- Traduza os textos de "Confirm signup" e "Reset password" para o português.
- Não remova o link `{{ .ConfirmationURL }}`.

## Passo 4 — Envio de e-mails (SMTP)

O envio de e-mails que vem no Supabase é **limitado a poucos e-mails por hora** e serve só para testes.

Para uso real:

1. Vá em **Project Settings → Authentication → SMTP Settings**.
2. Preencha os dados de um serviço de e-mail transacional (por exemplo Resend, Brevo, Amazon SES ou o SMTP do seu provedor).
3. Use um remetente do domínio da clínica, por exemplo `nao-responda@suaclinica.com.br`.

Sem isso, cadastro e recuperação de senha podem falhar quando houver vários pedidos.

## Passo 5 — Criar a clínica e a primeira administradora

1. Em **Authentication → Users → Add user → Create new user**, crie a conta da podóloga com o e-mail dela e uma senha forte.
   - Melhor ainda: use **Send invitation**, para ela mesma criar a senha.
   - **Não use senha padrão** e não reaproveite as senhas da demonstração.
2. Abra `supabase/setup-clinica-e-admin.sql`, troque os valores do bloco **EDITE AQUI** (e-mail, nome, fuso etc.) e rode no SQL Editor.
3. A mensagem final mostra o **ID da clínica** (um código como `3f2a…`). Copie esse código.

Por que assim? No site, ninguém consegue se tornar administradora escolhendo "Podóloga" num formulário. O papel de administradora só é criado:

- por este script, por quem tem acesso ao painel do Supabase; ou
- por convite de outra administradora (painel → Configurações → Acesso).

## Passo 6 — Preencher o `sistema/js/config.js`

Pegue os dados em **Project Settings → API** (ou **API Keys**):

- o **Project URL**;
- a chave pública: **anon public**, ou, nos projetos novos, a **publishable** (`sb_publishable_...`).

Nunca use a **secret** (`sb_secret_...`) nem a **service_role**.

```js
window.PS.sistema = {
  modo: "supabase",
  supabase: {
    url: "https://SEU-PROJETO.supabase.co",
    anonKey: "eyJhbGciOi... (a chave ANON, nunca a service_role)",
    clinicId: "ID copiado no passo 5"
  },
  permitirDemonstracao: false,
  enderecoDoSite: "https://www.suaclinica.com.br/",
  ...
};
```

O arquivo `.env.example` lista os mesmos três valores, caso você use um sistema de publicação com variáveis de ambiente.

Se alguém colar a chave `service_role` ou uma `sb_secret_` aqui por engano, o site **se recusa a funcionar** e mostra um aviso.

## Passo 7 — Publicar com https

Veja `docs/IMPLANTACAO.md`. O login real **não funciona** abrindo o arquivo com dois cliques (`file://`). É preciso um endereço com **https**.

Para testar no seu computador antes de publicar:

1. Rode `npx serve .` (ou `python3 -m http.server 8080`) dentro da pasta.
2. Acesse `http://localhost:8080`.
3. Adicione `http://localhost:8080/...` nas Redirect URLs.

## Passo 8 — Teste final (obrigatório antes de abrir para clientes)

Faça cada item e marque. Use **dois navegadores diferentes**, ou um normal e uma janela anônima, para ter duas pessoas.

| # | Teste | Resultado esperado |
|---|---|---|
| 1 | Entrar em `admin/entrar.html` com a conta da podóloga | Abre o painel |
| 2 | Configurações → Clínica: preencher telefone, endereço e WhatsApp | Aparece no painel e nos portais. Os textos do site público (telefone, endereço, horários exibidos) ficam em `js/content.js`: atualize lá também |
| 3 | Configurações → Serviços: revisar nomes, durações e preços | Lista atualizada em `agendar.html` |
| 4 | Agenda → Horários: conferir dias e horários | `agendar.html` só mostra horários dentro deles |
| 5 | Criar conta de cliente em `cliente/cadastro.html` com um e-mail seu | Chega e-mail de confirmação |
| 6 | Confirmar o e-mail e entrar | Abre "Meus agendamentos" |
| 7 | Agendar um horário | Aparece na agenda da podóloga |
| 8 | Na segunda pessoa, tentar o mesmo horário | O horário não aparece ou é recusado |
| 9 | Cliente tentando abrir `admin/index.html` | É mandada para o login com "sem permissão" |
| 10 | "Esqueci minha senha" | Chega o e-mail e a troca funciona |
| 11 | Cancelar pelo portal do cliente | Segue a regra configurada (direto ou pedido) |
| 12 | Painel → Relatórios → Exportar CSV | Baixa a planilha |
| 13 | Configurações → Identidade visual → salvar outra paleta | Site e portais mudam de cor ao recarregar |
| 14 | Sair e tentar voltar com o botão "voltar" do navegador | Pede login de novo |

Se algum item falhar, **não abra para clientes**. Anote a mensagem que apareceu e o passo em que falhou.

> Lembrete: a ponte com o Supabase (`sistema/js/api-supabase.js`) foi escrita e revisada, mas **não pôde ser executada contra um projeto real** durante o desenvolvimento. Este teste final é justamente para isso.

---

## Rodar os testes do banco (opcional, para quem quiser conferir)

Em um **PostgreSQL local** (nunca no projeto real):

```bash
DB=welumen_test ./supabase/tests/rodar-testes.sh
```

O script cria um banco descartável, imita as partes do Supabase de que o modelo precisa e roda os testes:

- os 72 testes de permissões e agenda;
- as reservas simultâneas;
- a comparação com o navegador.
