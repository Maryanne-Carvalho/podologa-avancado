# Segurança: como o sistema protege os dados

Este texto explica **quem pode ver e fazer o quê** e **onde isso é garantido**. O código está em `supabase/migrations/002_seguranca_rls.sql` (regras) e `003_funcoes.sql` (funções).

## A ideia central

O site roda no navegador da pessoa, e qualquer um pode abrir o "inspecionar elemento" e mudar o que quiser ali. Por isso:

- **Esconder botões não é proteção.** É só conforto visual.
- **Toda regra importante é conferida no banco**, que fica no servidor do Supabase, fora do alcance do navegador.

Há três camadas:

1. **Login (Supabase Auth).** Quem é a pessoa. As senhas são guardadas pelo Supabase com hash (bcrypt); o nosso código nunca vê nem grava senha.
2. **Permissões de tabela (GRANT).** O que cada tipo de usuário pode tentar.
   - Começamos tirando **tudo** (`revoke all`) e liberamos só o necessário.
   - Exemplo: ninguém do site pode gravar direto nas tabelas `appointments` (agendamentos) e `clinic_members` (quem é administradora).
3. **Regras por linha (RLS — Row Level Security).** Entre as linhas de uma tabela, quais são suas.
   - Exemplo: a cliente lê a tabela de agendamentos, mas o banco só devolve as linhas dela.

Ações com várias regras juntas (agendar, cancelar, remarcar, aprovar) passam por **funções do banco**. Elas conferem tudo de novo antes de gravar.

## Os três perfis

| Perfil | Como é identificado | Como se ganha |
|---|---|---|
| Visitante (`anon`) | Sem login | Qualquer pessoa |
| Cliente | Login + linha em `patients` com o `user_id` dela | Cadastro no site (com aceite da política) |
| Administradora | Login + linha em `clinic_members` | **Só** pelo `setup-clinica-e-admin.sql` (feito por quem tem acesso ao painel do Supabase) ou por convite |

O papel **nunca** vem do formulário nem do navegador. A função `my_access(clinica)` consulta o banco e responde "admin", "client" ou "none". O navegador só usa essa resposta para escolher a tela, e cada ação é conferida de novo no servidor.

Testes feitos: uma cliente tentando se inserir em `clinic_members` recebe *permission denied*. Um cadastro enviando `role: "admin"` continua cliente.

## Regras por tabela

| Tabela | Visitante | Cliente | Administradora da clínica |
|---|---|---|---|
| `clinics` (nome, telefone…) | lê clínicas publicadas | lê | lê e edita campos públicos |
| `clinic_settings` (regras, cores) | lê | lê | edita |
| `clinic_private_settings` (e-mail de avisos) | — | — | lê e edita |
| `clinic_members` (quem é admin) | — | — | lê os da própria clínica; **ninguém grava pelo site** |
| `clinic_invites` | — | — | lê e apaga; cria só pela função `create_admin_invite` |
| `services` | lê ativos | lê ativos | cria, edita, desativa |
| `availability_rules` / `availability_breaks` | lê | lê | cria, edita, apaga |
| `schedule_exceptions` (bloqueios) | — (o motivo é privado) | — | tudo |
| `patients` | — | **só o próprio** (edita pelas funções) | da própria clínica: lê, cadastra, edita contato |
| `patient_notes` | — | — | tudo, na própria clínica |
| `appointments` | — | **só os próprios** (lê) | lê os da clínica; **altera só por funções** |
| `appointment_notes` | — | — | tudo, na própria clínica |
| `appointment_requests` | — | lê os próprios | lê os da clínica |
| `audit_log` | — | — | lê os da clínica |

Visitantes **não leem agendamentos**. Para mostrar horários livres, a função `get_available_slots` devolve só **início e fim de horários livres**, sem nome nem serviço de ninguém.

## Funções (o "balcão" do banco)

Estas funções são `SECURITY DEFINER`: rodam com permissão de dono do banco, mas **cada uma confere quem está chamando** antes de agir. Todas usam `search_path` vazio e nomes completos (`public.tabela`), para que ninguém troque uma tabela por outra de mesmo nome.

| Função | Quem pode | O que confere |
|---|---|---|
| `get_available_slots` | todos | horário de atendimento, pausas, bloqueios, ocupados, antecedência mínima, limite de dias, fuso |
| `book_appointment` | cliente ou admin | tudo acima, mais: horário ainda livre agora, limite de agendamentos ativos por cliente, paciente da mesma clínica. Faz **fila por clínica** (advisory lock) |
| `cancel_my_appointment`, `reschedule_my_appointment` | cliente | é dela? está dentro do prazo? regra direta ou com pedido? |
| `admin_set_status`, `admin_reschedule`, `admin_resolve_request` | admin da clínica | transições válidas (ex.: não marca "concluído" no futuro) |
| `register_my_patient`, `update_my_patient`, `export_my_data` | cliente | só os próprios dados; exige aceite da política |
| `anonymize_patient` | admin | apaga identificação e anotações, cancela horários futuros |
| `create_admin_invite`, `accept_admin_invite` | admin / convidada | código de uso único, com validade, guardado como hash SHA-256 |

## Reserva dupla: duas proteções

1. A função `book_appointment` trava a agenda da clínica durante a gravação (`pg_advisory_xact_lock`). Assim, dois pedidos simultâneos são atendidos um de cada vez, e o segundo já encontra o horário ocupado.
2. A própria tabela tem a restrição **`sem_sobreposicao`**: o PostgreSQL recusa dois agendamentos ativos (pendente ou confirmado) cujos intervalos se sobreponham na mesma clínica. O intervalo inclui o tempo de preparo entre atendimentos. Isso vale **mesmo** que alguém escreva no banco sem usar a função.

Testado: 8 pedidos simultâneos dão 1 aceito e 7 recusados. Duas gravações diretas simultâneas dão 1 recusada pela restrição.

## Outros cuidados

- **Chaves:** o site só usa a chave pública (anon/publishable). Se detectar `service_role` ou `sb_secret_` na configuração, o site se recusa a iniciar. Fora de `localhost`, exige **https**.
- **Mensagens de erro** são códigos curtos traduzidos na tela (ex.: "Esse horário acabou de ser reservado"). Elas não mostram detalhes internos nem dados de outras pessoas.
- **Login errado** responde sempre "E-mail ou senha incorretos". A mensagem não revela se o e-mail existe.
- **Recuperação de senha** responde sempre a mesma coisa, exista o e-mail ou não.
- **Registro de ações (`audit_log`)** guarda o quê, quando e qual registro, mas **não guarda nome, telefone ou e-mail** (testado).
- **Exportação CSV:** só existe no painel, para administradora, com os dados que o banco já liberou para ela. As células que começam com `=`, `+`, `-` ou `@` recebem um apóstrofo, para não virarem fórmula no Excel.
- **Textos digitados** são sempre "escapados" antes de aparecer na tela. Isso evita que alguém injete código.
- **Redirecionamento depois do login** só aceita páginas internas. Isso evita um link que mande a pessoa para outro site.

## Por que não usamos `FORCE ROW LEVEL SECURITY`

`FORCE` obrigaria até o dono das tabelas a obedecer o RLS. Nossas funções `SECURITY DEFINER` rodam como dono e fazem a própria checagem. Com `FORCE`, elas precisariam de regras extras só para si, o que deixaria o código mais confuso sem ganho real.

O site nunca usa o papel de dono: ele usa `anon` e `authenticated`, que obedecem o RLS sempre.

## O que a demonstração NÃO protege

No modo `demo` não existe servidor. O "servidor" é um script no próprio navegador que imita as mesmas regras, para você ver o comportamento.

Qualquer pessoa pode alterar esses dados pelo navegador, e por isso **a demonstração nunca deve receber dados reais**.
