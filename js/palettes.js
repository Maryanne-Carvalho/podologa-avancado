/* Arquivo do Elegance — independente de qualquer outro projeto.
   Este arquivo pertence ao Elegance e pode ser alterado sem afetar outros projetos. */

/* ==========================================================================
   PALETAS PREDEFINIDAS
   Cada paleta define as 8 cores-base e um raio de borda (personalidade).
   As cores de texto sobre botões, links e seções escuras são calculadas
   automaticamente pelo motor de temas para manter a legibilidade.

   Para criar uma nova paleta, copie um bloco, troque o id, o nome e as cores.
   ========================================================================== */

window.PS = window.PS || {};

window.PS.palettes = [
  {
    id: "salvia-marfim",
    name: "Sálvia & Marfim",
    mood: "Natural e sereno",
    radius: 16,
    colors: {
      primary: "#587762",
      secondary: "#dfe7db",
      accent: "#9db59a",
      background: "#f8f5ec",
      surface: "#ffffff",
      text: "#23352a",
      muted: "#5b6b60",
      deep: "#2c4637"
    }
  },
  {
    id: "rosa-areia",
    name: "Rosa & Areia",
    mood: "Delicado e acolhedor",
    radius: 22,
    colors: {
      primary: "#9f5c63",
      secondary: "#ecdccb",
      accent: "#e3b2ad",
      background: "#fbf6f1",
      surface: "#ffffff",
      text: "#3d2b25",
      muted: "#735f57",
      deep: "#4f362e"
    }
  },
  {
    id: "azul-branco",
    name: "Azul & Branco",
    mood: "Clínico e confiável",
    radius: 12,
    colors: {
      primary: "#2d62a6",
      secondary: "#dde9f6",
      accent: "#7fb2e5",
      background: "#f7fafd",
      surface: "#ffffff",
      text: "#13233f",
      muted: "#4f5f78",
      deep: "#11284b"
    }
  },
  {
    id: "verde-dourado",
    name: "Verde & Dourado",
    mood: "Clássico e sofisticado",
    radius: 10,
    colors: {
      primary: "#1f4d3a",
      secondary: "#efe5cc",
      accent: "#c4a05a",
      background: "#faf6ec",
      surface: "#fffdf7",
      text: "#17301f",
      muted: "#56665a",
      deep: "#143326"
    }
  },
  {
    id: "lavanda-cinza",
    name: "Lavanda & Cinza",
    mood: "Calmo e contemporâneo",
    radius: 18,
    colors: {
      primary: "#6f5f9e",
      secondary: "#e6e2ee",
      accent: "#b8acd6",
      background: "#f9f8fb",
      surface: "#ffffff",
      text: "#2c2a33",
      muted: "#625e6b",
      deep: "#322e3d"
    }
  },
  {
    id: "terracota-creme",
    name: "Terracota & Creme",
    mood: "Quente e humano",
    radius: 14,
    colors: {
      primary: "#a9533a",
      secondary: "#ecdcc6",
      accent: "#d99a76",
      background: "#fbf5ec",
      surface: "#fffbf5",
      text: "#3b2519",
      muted: "#735b4e",
      deep: "#4b2a1d"
    }
  },
  {
    id: "coral-offwhite",
    name: "Coral & Off-white",
    mood: "Leve e luminoso",
    radius: 24,
    colors: {
      primary: "#bb4d39",
      secondary: "#fbe6e0",
      accent: "#f2a08e",
      background: "#fdf9f6",
      surface: "#ffffff",
      text: "#3a2621",
      muted: "#775d55",
      deep: "#4a2c25"
    }
  },
  {
    id: "preto-champagne",
    name: "Preto & Champagne",
    mood: "Elegante e noturno",
    radius: 6,
    colors: {
      primary: "#d2bd92",
      secondary: "#2a2724",
      accent: "#e6d6b3",
      background: "#141413",
      surface: "#1d1c1a",
      text: "#f2ede3",
      muted: "#b3ab9e",
      deep: "#26231f"
    }
  }
];
