export function buildTestLabCharterEmbeds() {
  const embed1 = {
    title: "Test Lab · Charte officielle",
    description:
      "Le Test Lab sert à transformer des observations de jeu en résultats utiles, sans inventer de conseils. " +
      "Le but n'est pas de prouver une idée à l'avance, mais de mesurer proprement ce qui se passe réellement.",
    fields: [
      {
        name: "1. Ce qu'un protocole doit faire",
        value:
          "• Dire clairement ce qu'il mesure
" +
          "• Dire ce qui doit rester fixe
" +
          "• Dire ce qui peut changer
" +
          "• Donner un minimum d'essais
" +
          "• Expliquer comment refaire le test proprement",
      },
      {
        name: "2. Ce qu'il faut garder stable",
        value:
          "Même cible si possible, même skill, même arme, mêmes buffs connus, même contexte de test. " +
          "On évite de changer plusieurs choses à la fois.",
      },
      {
        name: "3. Règle simple",
        value:
          "Si plusieurs variables changent en même temps, le résultat devient vite difficile à utiliser.",
      },
    ],
    footer: { text: "Charte · page 1/2" },
  };

  const embed2 = {
    title: "Test Lab · Qualité des résultats",
    description:
      "Chaque soumission doit être classée selon sa qualité. Le bot ne doit pas traiter toutes les données comme si elles avaient la même valeur.",
    fields: [
      {
        name: "Valide",
        value:
          "Le test respecte bien le protocole, le contexte est clair et il y a assez d'essais pour que le résultat soit utile.",
      },
      {
        name: "Douteux",
        value:
          "Le test peut être utile, mais il manque des éléments ou le nombre d'essais est encore trop faible. À relire avec prudence.",
      },
      {
        name: "Rejeté",
        value:
          "Le test ne permet pas de conclure proprement : trop peu d'essais, contexte incomplet, ou trop de choses ont changé en même temps.",
      },
      {
        name: "Comment le bot doit parler",
        value:
          "Le bot doit toujours préciser si un résultat est :
" +
          "• Confirmé par résultats publiés
" +
          "• Probable, mais encore à retester
" +
          "• Encore trop flou pour conclure",
      },
    ],
    footer: { text: "Charte · page 2/2" },
  };

  return { embeds: [embed1, embed2], flags: 64 };
}
