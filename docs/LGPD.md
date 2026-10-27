# Privacidade e LGPD: o que foi feito e o que precisa de validação

> **Aviso importante:** implementar estas medidas **não torna o sistema automaticamente adequado à LGPD**.
>
> Adequação envolve também contratos, base legal, prazos de guarda, atendimento aos titulares, registro das operações e treinamento. Isso **precisa ser validado por profissional jurídico** e, quando for o caso, pelo encarregado (DPO) da clínica.
>
> Este documento lista o que o sistema faz tecnicamente, para facilitar essa conversa.

## Que dados o sistema guarda

| Dado | Para quê | Onde |
|---|---|---|
| Nome, telefone, e-mail do paciente | Identificar e contatar sobre o agendamento | `patients` |
| Data e hora do aceite da política | Registrar o consentimento/ciência | `patients.consent_at` |
| Agendamentos (serviço, data, situação, origem) | Organizar a agenda e o histórico | `appointments` |
| Pedidos de cancelamento/remarcação e motivo opcional | Atender o pedido | `appointment_requests` |
| Anotações **administrativas** (ex.: "prefere manhã") | Organização interna | `patient_notes`, `appointment_notes` |
| Login (e-mail e senha com hash) | Acesso à conta | Supabase Auth (não fica nas nossas tabelas) |
| Registro de ações (o quê, quando, qual registro) | Segurança e auditoria | `audit_log`, **sem** nome, telefone ou e-mail |

**O que o sistema não guarda nesta versão (por decisão):**

- dados de saúde: diagnóstico, condições, medicamentos, prontuário, fotos;
- CPF, data de nascimento, endereço do paciente;
- dados de pagamento.

As telas de anotação avisam: "Não registre informações de saúde".

Por que isso importa: dados de saúde são **dados pessoais sensíveis** (art. 5º, II, e art. 11 da LGPD). Exigem cuidados e bases legais específicos. Um prontuário também tem regras próprias dos conselhos profissionais e prazos de guarda. Se a clínica quiser prontuário no futuro, isso deve ser planejado com assessoria jurídica e técnica.

## Medidas implementadas

- **Minimização:** só os campos necessários para agendar. O e-mail é opcional no cadastro feito pela clínica.
- **Ciência da política:** o cadastro on-line exige marcar o aceite da `privacidade.html`. O banco recusa o cadastro sem isso (testado), e a data do aceite fica registrada.
- **Acesso restrito:** cada cliente vê só os próprios dados. A administradora vê só os da própria clínica. Veja `SEGURANCA.md` (testado com duas clínicas).
- **Direito de acesso/portabilidade:** em "Meus dados", a cliente baixa um arquivo com os próprios dados (`export_my_data`).
- **Direito de correção:** a cliente edita nome e telefone em "Meus dados".
- **Pedido de exclusão:** no painel, "Anonimizar cadastro" faz o seguinte:
  - apaga nome, telefone, e-mail e anotações;
  - cancela horários futuros;
  - mantém o histórico de atendimentos **sem identificação**, para estatística e obrigações.
  
  A conta de login, se existir, deve ser apagada em Authentication → Users, no Supabase.
- **Logs sem dados pessoais:** o registro de ações guarda só identificadores técnicos.
- **Exportação controlada:** o CSV só existe no painel, e a tela avisa que o arquivo contém dados pessoais.
- **Demonstração separada:** os dados fictícios ficam só no navegador, com marcação "fictício", e não se misturam com o banco real.
- **Dados no Brasil:** a recomendação é criar o projeto Supabase na região São Paulo. Verifique os termos do Supabase como operador.

## Pontos que precisam de decisão/validação jurídica

1. **Texto da política de privacidade** (`privacidade.html`): é um modelo. Ajuste:
   - o controlador (razão social, CNPJ, contato);
   - o encarregado;
   - as finalidades;
   - o compartilhamento (Supabase, provedor de e-mail);
   - os direitos e os canais de contato.
2. **Base legal** de cada tratamento. Por exemplo, execução de contrato ou procedimentos preliminares para o agendamento, e consentimento para comunicações de marketing (não implementadas).
3. **Prazos de guarda:** quanto tempo manter o histórico, os logs e os cadastros inativos. O sistema não apaga nada automaticamente.
4. **Contrato com operadores:** Supabase (banco e login), provedor de SMTP e, no futuro, WhatsApp ou pagamentos.
5. **Procedimento para pedidos de titulares:** quem atende, em quanto tempo e como confirmar a identidade.
6. **Incidentes de segurança:** plano de resposta e comunicação (ANPD e titulares, quando aplicável).
7. **Acesso de equipe:** cada pessoa da clínica deve ter o **próprio** login de administradora. Use o convite e não compartilhe senha. Remova o acesso de quem sair.
8. **Cookies e armazenamento local:** o site guarda a escolha de cores e a sessão de login no navegador. Avalie se a política deve mencionar isso. O modelo não usa rastreadores nem analytics.
