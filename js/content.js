/* ==========================================================================
   ELEGANCE — DADOS DO SITE (arquivo único de personalização)

   Todas as páginas (início, sobre, clínica, serviços, avaliações e contato)
   leem os textos, fotos e contatos daqui. Para adaptar o site a uma cliente,
   normalmente basta editar ESTE arquivo.

   Tudo abaixo é DEMONSTRATIVO: a profissional, a formação, o endereço,
   os telefones e os depoimentos são fictícios.
   ========================================================================== */

window.PS = window.PS || {};

/* ---------- Configurações técnicas ---------- */
window.PS.config = {
  model: "Avançado",
  defaultPalette: "rosa-areia",          // paleta inicial e do botão "Cores padrão"
  storageKey: "avancado-demo:podologia-studio:cores", // chave exclusiva do Avançado (demonstração). Não afeta a Learning Page nem o Elegance.
  imageTimeout: 9000,

  /* WhatsApp
     number: somente dígitos, com 55 + DDD + número. Deixe "" se ainda não houver número.
     isDemoNumber: true  → mostra uma janela explicando que é demonstração antes de abrir.
     isDemoNumber: false → o botão abre o WhatsApp diretamente (use com o número real). */
  whatsapp: {
    number: "5511900000000",             // NÚMERO FICTÍCIO DE DEMONSTRAÇÃO
    isDemoNumber: true,
    defaultMessage: "Olá, Dra. Marina! Vi o site do Podologia Studio e gostaria de agendar um atendimento.",
    serviceMessage: "Olá, Dra. Marina! Vi o site do Podologia Studio e gostaria de informações sobre: {servico}."
  }
};

/* Fotos (Unsplash, uso gratuito). Troque por "assets/img/nome.jpg" para usar fotos próprias. */
var U = function (id, w) {
  return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + (w || 1200) + "&q=75";
};

window.PS.content = {
  brand: {
    name: "Podologia Studio",
    short: "Podologia",
    sub: "Studio",
    monogram: "PS",
    tagline: "Podologia clínica e cuidados preventivos em São Paulo."
  },

  professional: {
    name: "Dra. Marina Oliveira",
    firstName: "Marina",
    role: "Podologia clínica e cuidados preventivos",
    experienceYears: "8"
  },

  /* Menu principal (mesma ordem em todas as páginas) */
  pages: [
    { id: "inicio", label: "Início", href: "index.html" },
    { id: "sobre", label: "Sobre mim", href: "sobre.html" },
    { id: "clinica", label: "A clínica", href: "clinica.html" },
    { id: "servicos", label: "Serviços", href: "servicos.html" },
    { id: "avaliacoes", label: "Avaliações", href: "avaliacoes.html" },
    { id: "contato", label: "Contato", href: "contato.html" }
  ],

  /* ======================= INÍCIO ======================= */
  hero: {
    eyebrow: "Podologia clínica · São Paulo",
    titleStart: "Pés bem cuidados,",
    titleEmphasis: "passos mais leves.",
    subtitle: "Atendimento podológico individual, em um consultório tranquilo e higienizado. Cada consulta começa com escuta e termina com orientações claras para o seu dia a dia."
  },

  home: {
    aboutTeaser: "Sou podóloga há oito anos e acredito em um atendimento sem pressa: primeiro eu escuto, depois avalio e, por fim, explico tudo o que foi feito e como cuidar dos pés em casa.",
    featuredServices: [0, 1, 2],        // posições dos serviços em destaque na página inicial
    clinicPreview: ["clinica-1", "clinica-2", "clinica-3", "clinica-4"]
  },

  differentials: [
    { icon: "hands", title: "Atendimento individualizado", text: "Um horário só seu, com tempo para conversar e um cuidado pensado para a sua realidade." },
    { icon: "shield", title: "Atenção à higiene", text: "Instrumentais esterilizados, materiais descartáveis quando indicado e ambiente higienizado entre atendimentos." },
    { icon: "home", title: "Ambiente acolhedor", text: "Um consultório calmo e confortável, para você se sentir à vontade desde a chegada." },
    { icon: "leaf", title: "Cuidado preventivo", text: "Orientações para manter os pés saudáveis entre uma consulta e outra." },
    { icon: "chat", title: "Comunicação clara", text: "Cada etapa é explicada antes de acontecer. Você pode perguntar e pedir pausas quando quiser." }
  ],

  steps: [
    { title: "Primeiro contato", text: "Você manda uma mensagem contando o que sente ou qual cuidado procura." },
    { title: "Agendamento", text: "Combinamos dia e horário. Você recebe a confirmação e dicas para o dia da consulta." },
    { title: "Avaliação profissional", text: "Conversamos e avalio os seus pés para entender o que o seu caso pede." },
    { title: "Orientações e cuidados", text: "Realizamos os cuidados indicados para você e combinamos os próximos passos, se forem necessários." }
  ],

  /* ======================= SOBRE MIM ======================= */
  about: {
    heroTitle: "Olá, eu sou a Marina.",
    heroText: "Podóloga, apaixonada por gente e por detalhes. Há oito anos cuido de pés com a mesma convicção do primeiro dia: ninguém deveria conviver com incômodos que podem ser cuidados com atenção e informação.",
    numbers: [
      { value: "8", label: "anos de atuação", note: "dado demonstrativo" },
      { value: "6", label: "áreas de cuidado", note: "conforme os serviços" },
      { value: "1", label: "pessoa por horário", note: "atendimento individual" }
    ],
    story: [
      "Cresci observando minha avó cuidar das próprias mãos e dos pés com um ritual quase sagrado: bacia morna, toalha macia e muita paciência. Foi com ela que aprendi que cuidado é um gesto de respeito.",
      "Antes da podologia, trabalhei alguns anos na área administrativa de uma clínica. Ali percebi quantas pessoas chegavam com dores que vinham dos pés e que, por vergonha ou falta de informação, eram deixadas para depois.",
      "Decidi mudar de rumo. Estudei, pratiquei e montei um consultório pequeno de propósito: um lugar onde dá tempo de conversar, explicar e acompanhar de perto."
    ],
    quote: "Eu não quero que você saia daqui só com os pés cuidados. Quero que saia entendendo o que fazer até a próxima vez.",
    motivation: {
      title: "Por que escolhi a podologia",
      paragraphs: [
        "Os pés carregam a gente o dia inteiro e quase nunca recebem atenção. Quando algo incomoda, muda o jeito de andar, de trabalhar e até de sair de casa.",
        "Na podologia encontrei uma forma de devolver conforto a esses pequenos gestos. E encontrei, também, a chance de ensinar: boa parte do cuidado acontece em casa, com informação certa."
      ]
    },
    timeline: [
      { year: "2015", title: "Encontro com a podologia", text: "Primeiro contato com a área e início dos estudos." },
      { year: "2017", title: "Formação concluída", text: "Início dos atendimentos em consultório compartilhado." },
      { year: "2019", title: "Foco em pés sensíveis", text: "Aprofundamento no cuidado de pessoas idosas e com diabetes." },
      { year: "2021", title: "Podologia Studio", text: "Abertura do consultório próprio, com atendimento individual." },
      { year: "Hoje", title: "Cuidado contínuo", text: "Atualização constante e atendimento com hora marcada." }
    ],
    educationIsDemo: true,
    education: [
      { title: "Curso Técnico em Podologia", place: "Instituição de ensino (exemplo)", year: "2017" },
      { title: "Aperfeiçoamento em cuidados com pés sensíveis", place: "Curso livre (exemplo)", year: "2019" },
      { title: "Biossegurança em serviços de saúde", place: "Curso livre (exemplo)", year: "2020" },
      { title: "Atualização em órteses de unha", place: "Curso livre (exemplo)", year: "2023" }
    ],
    philosophy: "Cuidar dos pés é devolver conforto aos pequenos gestos do dia: caminhar, trabalhar, estar com quem a gente ama.",
    values: [
      { title: "Escuta", text: "Antes de qualquer procedimento, entender a sua rotina, o seu calçado e o que você sente." },
      { title: "Transparência", text: "Explicar o que será feito, por que e quais são os limites de cada cuidado." },
      { title: "Respeito", text: "Sem julgamentos, no seu tempo, com pausas sempre que você precisar." },
      { title: "Responsabilidade", text: "Indicar outro profissional quando o seu caso pedir um olhar diferente." }
    ],
    highlights: [
      "Consultas com horário reservado, sem pressa",
      "Explicações simples e orientações por escrito",
      "Encaminhamento a outros profissionais quando necessário",
      "Retornos combinados conforme a sua necessidade"
    ],
    note: "Perfil, trajetória e formação fictícios, criados para demonstração. Em um site real, informe apenas dados verdadeiros da profissional."
  },

  /* ======================= SERVIÇOS ======================= */
  /* Ícones disponíveis: foot, nail, layers, leaf, heart, calendar, chat, home, shield, hands, sparkle */
  services: [
    {
      id: "avaliacao",
      title: "Avaliação podológica",
      tag: "Primeira consulta",
      icon: "foot",
      image: { src: U("1675159364615-38e1f6b62282"), alt: "Mãos de profissional cuidando de um pé apoiado sobre toalha branca" },
      summary: "Uma análise cuidadosa da pele, das unhas e dos pontos de apoio dos pés, para montar um plano de cuidados possível para a sua rotina.",
      description: "É o ponto de partida de qualquer atendimento. Conversamos sobre seus hábitos, calçados, histórico de saúde e o que tem incomodado. Em seguida, observo a pele, as unhas e as regiões de maior apoio dos pés.",
      goal: "Entender o que os seus pés precisam e definir, junto com você, quais cuidados fazem sentido agora e quais podem esperar.",
      how: ["Conversa sobre rotina, calçados e queixas", "Avaliação visual da pele, das unhas e das áreas de apoio", "Explicação do que foi observado, sem termos difíceis", "Plano de cuidados e orientações por escrito"],
      booking: [
        { label: "Tempo reservado", value: "cerca de 1 hora (exemplo)" },
        { label: "Como chegar", value: "pés limpos e, se possível, sem esmalte" },
        { label: "O que trazer", value: "o calçado que mais usa e informações de tratamentos em andamento" }
      ]
    },
    {
      id: "unhas",
      title: "Cuidados com as unhas",
      tag: "Unhas",
      icon: "nail",
      image: { src: U("1519419451778-14599a49ec41"), alt: "Profissional segurando o pé de uma pessoa durante um cuidado" },
      summary: "Corte técnico, unhas encravadas ou espessas, sempre com manejo delicado e orientação para evitar novos incômodos.",
      description: "Unhas que machucam, encravam com frequência ou ficaram grossas e difíceis de cortar costumam ser um dos principais motivos de procura. O cuidado é feito com instrumentais esterilizados e atenção ao conforto durante todo o procedimento.",
      goal: "Aliviar o incômodo causado pela unha e orientar o corte e o calçado adequados para diminuir a chance de o problema voltar.",
      how: ["Avaliação da unha e da pele ao redor", "Cuidado indicado para o seu caso, com explicação prévia", "Orientação sobre corte, calçados e sinais de alerta", "Retorno combinado, se necessário"],
      booking: [
        { label: "Tempo reservado", value: "de 40 a 60 minutos (exemplo)" },
        { label: "Quando procurar", value: "dor, vermelhidão ou unha que encrava com frequência" },
        { label: "Importante", value: "sinais de infecção podem exigir avaliação médica" }
      ]
    },
    {
      id: "calos",
      title: "Calos e calosidades",
      tag: "Pele",
      icon: "layers",
      image: { src: U("1768508236664-3f294aaf7d41"), alt: "Close-up de um cuidado no calcanhar" },
      summary: "Remoção cuidadosa de calos e áreas de pele endurecida, com dicas de calçado e hidratação para o dia a dia.",
      description: "Calos e calosidades são respostas da pele ao atrito e à pressão. A remoção é feita de forma cuidadosa e indolor na maioria dos casos, e a conversa sobre calçados e pisada ajuda a entender por que eles aparecem.",
      goal: "Trazer mais conforto ao caminhar e ajudar a identificar o que está causando o atrito.",
      how: ["Identificação das áreas de pressão", "Remoção cuidadosa da pele endurecida", "Sugestões de calçado, meias e hidratação", "Encaminhamento a outro profissional, quando a pisada pedir"],
      booking: [
        { label: "Tempo reservado", value: "cerca de 45 minutos (exemplo)" },
        { label: "Evite antes", value: "lixar ou cortar calos em casa nos dias anteriores" },
        { label: "Frequência", value: "definida na avaliação, conforme a necessidade" }
      ]
    },
    {
      id: "prevencao",
      title: "Orientação preventiva",
      tag: "Prevenção",
      icon: "leaf",
      image: { src: U("1627903634010-cacbe106fad2"), alt: "Pés descansando sobre tecido marrom" },
      summary: "Como cortar as unhas, escolher meias e calçados e reconhecer sinais que merecem atenção. Informação prática para levar para casa.",
      description: "Um atendimento focado em educação: você aprende a cuidar dos pés no dia a dia, com orientações adaptadas à sua rotina, ao seu trabalho e às atividades que pratica.",
      goal: "Dar autonomia para que você mantenha os pés saudáveis e saiba quando procurar ajuda.",
      how: ["Conversa sobre rotina, trabalho e esportes", "Demonstração do corte correto das unhas", "Dicas de higiene, secagem e hidratação", "Material de apoio para consultar em casa"],
      booking: [
        { label: "Tempo reservado", value: "cerca de 40 minutos (exemplo)" },
        { label: "Ideal para", value: "quem quer prevenir incômodos ou cuida de familiares" },
        { label: "Pode ser feito", value: "junto com outro atendimento" }
      ]
    },
    {
      id: "sensiveis",
      title: "Pés sensíveis",
      tag: "Atenção redobrada",
      icon: "heart",
      image: { src: U("1611073615830-9f76902c10fe"), alt: "Mãos sendo cuidadas com delicadeza sobre toalha marrom" },
      summary: "Atendimento atento para pessoas idosas, gestantes e pessoas com diabetes, sempre em complemento ao acompanhamento médico.",
      description: "Algumas pessoas precisam de cuidado ainda mais delicado: pele fina, circulação diferente, sensibilidade reduzida ou dificuldade para alcançar os próprios pés. O atendimento é feito com calma, materiais adequados e comunicação próxima com a família, quando for o caso.",
      goal: "Oferecer cuidado podológico seguro e confortável, observando sinais que precisam ser acompanhados por outros profissionais de saúde.",
      how: ["Conversa sobre condições de saúde e cuidados atuais", "Avaliação detalhada da pele e das unhas", "Cuidados realizados com técnica delicada", "Orientações para a pessoa e para quem a acompanha"],
      booking: [
        { label: "Tempo reservado", value: "cerca de 1 hora (exemplo)" },
        { label: "Traga", value: "informações sobre medicamentos e acompanhamento médico" },
        { label: "Importante", value: "não substitui a consulta médica" }
      ]
    },
    {
      id: "acompanhamento",
      title: "Acompanhamento podológico",
      tag: "Rotina de cuidado",
      icon: "calendar",
      image: { src: U("1519415510236-718bdfcd89c8"), alt: "Pés descansando ao lado de flores" },
      summary: "Retornos combinados de acordo com a avaliação, para manter os cuidados em dia e ajustar as orientações quando for preciso.",
      description: "Para quem já passou pela avaliação e precisa de cuidados periódicos. Os intervalos são definidos caso a caso e revistos a cada encontro, sem pacotes obrigatórios.",
      goal: "Manter os pés confortáveis ao longo do tempo e perceber cedo qualquer mudança.",
      how: ["Revisão do que mudou desde o último encontro", "Cuidados de manutenção indicados", "Ajuste das orientações de casa", "Definição do próximo retorno, se necessário"],
      booking: [
        { label: "Tempo reservado", value: "de 30 a 50 minutos (exemplo)" },
        { label: "Intervalo", value: "definido na avaliação, nunca imposto" },
        { label: "Agendamento", value: "pelo WhatsApp, com antecedência" }
      ]
    }
  ],

  /* ======================= A CLÍNICA ======================= */
  clinic: {
    heroTitle: "Um espaço pensado para você se sentir à vontade.",
    heroText: "Pequeno de propósito, silencioso e organizado. Cada detalhe do consultório foi escolhido para que o atendimento seja confortável, seguro e sem pressa.",
    heroImage: { src: U("1519494140681-8b17d830a3e9", 1800), alt: "Ambiente interno claro e organizado" },
    intro: [
      "O Podologia Studio funciona em uma sala comercial tranquila na Vila Mariana. Atendo uma pessoa por vez, com intervalo entre os horários para higienização completa do ambiente.",
      "Quis criar um lugar que não parecesse frio nem apressado: luz natural, plantas, poltronas confortáveis e música baixa. Um consultório onde dá vontade de voltar."
    ],
    facts: [
      { value: "1", label: "sala de atendimento exclusiva" },
      { value: "15 min", label: "entre horários para higienização (exemplo)" },
      { value: "100%", label: "dos atendimentos com hora marcada" }
    ],
    spaces: [
      {
        kicker: "Chegada",
        title: "Recepção",
        text: "Uma recepção pequena e silenciosa, com água, poltronas confortáveis e luz natural. Como os atendimentos têm hora marcada, você raramente espera.",
        bullets: ["Poltronas confortáveis", "Água e chá à disposição", "Ambiente climatizado"],
        image: { src: U("1706458315547-1a60ada6d278"), alt: "Fileira de cadeiras brancas diante de uma janela iluminada" }
      },
      {
        kicker: "Atendimento",
        title: "Sala de atendimento",
        text: "A sala é reservada a uma pessoa por vez. A cadeira reclinável permite que você fique confortável enquanto conversamos e durante todo o cuidado.",
        bullets: ["Cadeira reclinável e ajustável", "Iluminação adequada para o atendimento", "Privacidade total"],
        image: { src: U("1628372095387-017d1099fc19"), alt: "Sala de atendimento com maca clara (imagem ilustrativa)" }
      },
      {
        kicker: "Organização",
        title: "Equipamentos e materiais",
        text: "Instrumentais organizados e identificados, materiais descartáveis separados e um fluxo claro entre o que é limpo e o que precisa ser processado.",
        bullets: ["Instrumentais em embalagens lacradas", "Materiais descartáveis de uso único", "Áreas separadas de limpeza e guarda"],
        image: { src: U("1584820927498-cfe5211fd8bf"), alt: "Pessoa calçando luvas descartáveis azuis" }
      }
    ],
    biosafety: [
      { title: "Limpeza", text: "Os instrumentais são lavados e secos logo após cada atendimento." },
      { title: "Esterilização", text: "Em seguida, passam por esterilização em autoclave, com controle de cada ciclo." },
      { title: "Embalagem lacrada", text: "Ficam guardados em embalagens fechadas e identificadas até o próximo uso." },
      { title: "Abertura na sua frente", text: "A embalagem é aberta no início do seu atendimento, para você acompanhar." }
    ],
    biosafetyNote: "Exemplo de como apresentar o protocolo de biossegurança. Descreva apenas o que é praticado de fato no consultório.",
    experience: [
      { title: "Chegada", text: "Você é recebida pelo nome, sem fila e sem pressa." },
      { title: "Conversa", text: "Falamos sobre rotina, calçados e o que tem incomodado." },
      { title: "Avaliação", text: "Observo os pés e explico o que encontrei." },
      { title: "Cuidado", text: "Realizo os cuidados combinados, com pausas se você quiser." },
      { title: "Orientações", text: "Você leva para casa um resumo do que fazer até o próximo encontro." }
    ]
  },

  /* Galeria da clínica (o modo "large", "tall" e "wide" define o tamanho no desktop).
     Use apenas fotos próprias ou com licença. Nunca publique pacientes sem autorização por escrito. */
  gallery: [
    { id: "clinica-1", src: U("1519494140681-8b17d830a3e9", 1600), alt: "Ambiente interno claro e organizado", caption: "Ambiente claro e organizado", layout: "large" },
    { id: "clinica-2", src: U("1581982231900-6a1a46b744c9", 900), alt: "Poltronas estofadas em tons claros", caption: "Poltronas da sala de espera", layout: "tall" },
    { id: "clinica-3", src: U("1602595688238-9fffe12d5af3", 900), alt: "Vaso com samambaia diante de uma parede de vidro", caption: "Plantas e luz natural", layout: "" },
    { id: "clinica-4", src: U("1675159364615-38e1f6b62282", 900), alt: "Mãos cuidando de um pé apoiado sobre toalha branca", caption: "Cuidado com atenção a cada detalhe", layout: "" },
    { id: "clinica-5", src: U("1706458315547-1a60ada6d278", 1400), alt: "Cadeiras brancas diante de uma janela", caption: "Recepção iluminada", layout: "wide" },
    { id: "clinica-6", src: U("1584820927498-cfe5211fd8bf", 900), alt: "Pessoa calçando luvas descartáveis azuis", caption: "Materiais descartáveis", layout: "" },
    { id: "clinica-7", src: U("1580616118171-77f0a6d1ab0d", 900), alt: "Poltronas de madeira com estofado branco", caption: "Espaço de espera confortável", layout: "tall" },
    { id: "clinica-8", src: U("1712638932314-e2b185ca0930", 1400), alt: "Atendimento com toalhas brancas", caption: "Toalhas e materiais individuais", layout: "wide" },
    { id: "clinica-9", src: U("1631248055158-edec7a3c072b", 900), alt: "Planta verde em vaso sobre piso claro", caption: "Detalhes que acolhem", layout: "" }
  ],

  /* ======================= AVALIAÇÕES ======================= */
  /* Substitua por relatos REAIS e AUTORIZADOS e mude testimonialsAreDemo para false.
     Não publique notas, estrelas ou avaliações inventadas. */
  testimonialsAreDemo: true,
  testimonials: [
    { text: "Eu adiava a consulta por vergonha. Fui recebida com muita calma, entendi o que estava acontecendo e saí com um passo a passo para cuidar em casa.", name: "Ana", service: "Avaliação podológica", featured: true },
    { text: "Levei minha mãe, que tem os pés bem sensíveis. Gostei da paciência e de como cada etapa foi explicada antes de começar.", name: "Ricardo", service: "Pés sensíveis" },
    { text: "Ambiente limpo, pontualidade e muita atenção. As dicas sobre calçado e hidratação já mudaram minha rotina.", name: "Carla", service: "Calos e calosidades" },
    { text: "Pontual e muito atenciosa.", name: "Juliana", service: "Cuidados com as unhas" },
    { text: "Trabalho o dia inteiro em pé e achava normal terminar a semana com dor. Entendi o papel do calçado e da pisada e fui encaminhada para avaliar a palmilha.", name: "Fernanda", service: "Orientação preventiva" },
    { text: "Gostei de ver a embalagem dos instrumentos sendo aberta na minha frente. Passa muita segurança.", name: "Patrícia", service: "Cuidados com as unhas" },
    { text: "Fui sem saber direito o que esperar. Saí sabendo cortar as unhas do jeito certo e com um papel com as orientações. Simples e muito útil.", name: "Marcos", service: "Orientação preventiva" },
    { text: "Atendimento sem pressa, coisa rara hoje em dia.", name: "Helena", service: "Acompanhamento podológico" },
    { text: "Meu pai tem diabetes e sempre teve receio de cuidar dos pés. A forma cuidadosa e a conversa com a família fizeram toda a diferença para ele se sentir seguro.", name: "Luciana", service: "Pés sensíveis" }
  ],
  reviewsIntro: "Cada atendimento é diferente, mas algumas coisas se repetem: tempo para conversar, explicações claras e um ambiente onde dá para relaxar.",

  /* ======================= CONTATO ======================= */
  contact: {
    intro: "Escolha o canal que preferir. O jeito mais rápido de agendar é pelo WhatsApp: conte o que procura e enviamos os horários disponíveis.",
    whatsappDisplay: "(11) 90000-0000",
    phoneDisplay: "(11) 3000-0000",
    phoneLink: "",                       // ex.: "+551130000000". Vazio = exibido só como texto.
    email: "contato@podologiastudio.exemplo",
    emailLink: false,                    // true para virar link "mailto:" (use com e-mail real)
    addressLines: ["Rua das Acácias, 120 — sala 4", "Vila Mariana, São Paulo – SP"],
    addressNote: "Referência ilustrativa: próximo à estação de metrô",
    mapUrl: "",                          // link do mapa. Vazio = espaço reservado.
    responseTime: "Respondemos em horário comercial (exemplo)",
    hours: [
      { days: "Segunda a sexta", time: "9h às 19h" },
      { days: "Sábado", time: "9h às 13h" },
      { days: "Domingos e feriados", time: "Fechado" }
    ],
    howTo: [
      { title: "Envie uma mensagem", text: "Conte brevemente o que você sente ou qual cuidado procura." },
      { title: "Escolha o horário", text: "Enviamos as opções disponíveis para você escolher com calma." },
      { title: "Receba a confirmação", text: "Com o horário, você recebe o endereço e dicas para a consulta." }
    ],
    isDemo: true
  },

  /* Perguntas exibidas na página de contato */
  faq: [
    { q: "Como funciona o primeiro atendimento?", a: "Começamos com uma conversa sobre a sua rotina e o que tem incomodado. Depois, faço a avaliação dos pés e explico o que observei. Os cuidados realizados no dia dependem do que a avaliação indicar." },
    { q: "Como faço para agendar?", a: "Pelo WhatsApp. Conte brevemente o que procura e escolha um dos horários disponíveis. A confirmação chega pela mesma conversa." },
    { q: "Quanto tempo devo reservar para a consulta?", a: "Reserve cerca de uma hora para a primeira consulta. Os retornos costumam ser mais curtos, mas o tempo varia conforme o cuidado necessário." },
    { q: "Como me preparar?", a: "Venha com os pés limpos, sem esmalte se possível, e traga o calçado que mais usa no dia a dia. Se faz algum tratamento médico, traga as informações que tiver." },
    { q: "Como obter informações sobre valores?", a: "Os valores variam conforme o cuidado indicado. Envie uma mensagem pelo WhatsApp para receber as informações atualizadas." },
    { q: "E se eu precisar remarcar?", a: "Avise com antecedência pelo WhatsApp e combinamos um novo horário." },
    { q: "O atendimento substitui a consulta médica?", a: "Não. A podologia cuida da saúde dos pés e trabalha em conjunto com outros profissionais. Quando necessário, você recebe a orientação de procurar atendimento médico." }
  ],

  /* Redes sociais: preencha "url" para virar link. Sem url, aparece só como texto. */
  social: [
    { label: "Instagram", handle: "@podologiastudio.exemplo", url: "" }
  ],

  /* Imagens avulsas usadas nas páginas */
  images: {
    hero: { src: U("1675159364615-38e1f6b62282", 1100), alt: "Mãos de profissional cuidando de um pé apoiado sobre toalha branca" },
    portrait: { src: U("1594824476967-48c8b964273f", 1000), alt: "Retrato ilustrativo de profissional da saúde sorrindo, de braços cruzados" },
    cta: { src: U("1712638932314-e2b185ca0930", 1100), alt: "Atendimento tranquilo com toalhas brancas" },
    aboutDetail1: { src: U("1584820927498-cfe5211fd8bf", 900), alt: "Profissional calçando luvas descartáveis" },
    aboutDetail2: { src: U("1602595688238-9fffe12d5af3", 900), alt: "Planta diante de uma parede de vidro no consultório" },
    aboutDetail3: { src: U("1611073615830-9f76902c10fe", 1200), alt: "Mãos recebendo cuidado delicado" },
    servicesHero: { src: U("1712638932314-e2b185ca0930", 1600), alt: "Atendimento com toalhas brancas e gestos delicados" },
    reviews: { src: U("1580616118171-77f0a6d1ab0d", 1000), alt: "Poltronas confortáveis em um ambiente claro" },
    contact: { src: U("1706458315547-1a60ada6d278", 1200), alt: "Recepção com cadeiras brancas diante da janela" }
  }
};
