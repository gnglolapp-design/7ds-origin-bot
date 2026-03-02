const COLOR = 0x06b6d4;
const ELEMENT_SELECT_ID = 'elements:select';

const ELEMENTS = {
  fire: {
    label: '🔥 Feu',
    title: 'Éléments — Feu',
    color: 0xef4444,
    identity: 'Pression continue, Burn, usure et DPS prolongé.',
    status: 'Burn',
    effect: 'Inflige des dégâts de feu dans le temps et réduit progressivement la Défense de la cible.',
    roles: ['DPS régulier', 'pression prolongée', 'érosion de boss'],
    examples: ['Guila', 'Tristan', 'Tioreh'],
    tips: ['Très bon dans les combats qui durent.', 'Excellent quand ton équipe profite de la baisse de défense.'],
  },
  lightning: {
    label: '⚡ Foudre',
    title: 'Éléments — Foudre',
    color: 0xf59e0b,
    identity: 'Explosion, Shock, interruption et fenêtres de burst.',
    status: 'Shock / Paralysis',
    effect: 'Shock inflige des dégâts périodiques et peut se propager. Paralysis neutralise la cible et réduit sa Défense Foudre.',
    roles: ['Burst', 'contrôle', 'setup d’interruption'],
    examples: ['Gilthunder', 'Drake', 'Daisy'],
    tips: ['Très fort pour ouvrir une fenêtre de dégâts après contrôle.', 'Idéal si ton équipe sait capitaliser sur Paralysis ou Shock.'],
  },
  wind: {
    label: '🌪️ Vent',
    title: 'Éléments — Vent',
    color: 0x22c55e,
    identity: 'Pression mobile, Bleed et dégâts soutenus.',
    status: 'Bleed',
    effect: 'Inflige des dégâts de Vent sur la durée, réduit l’efficacité des soins et peut se propager.',
    roles: ['DPS soutenu', 'pression constante', 'poursuite'],
    examples: ['Howzer', 'Elaine', 'Daisy (staff)'],
    tips: ['Très utile sur les combats longs.', 'S’apprécie dans les rotations propres et constantes.'],
  },
  darkness: {
    label: '🌑 Ténèbres',
    title: 'Éléments — Ténèbres',
    color: 0x8b5cf6,
    identity: 'Burst offensif, Curse et grosses synergies sur Burst Darkness.',
    status: 'Curse',
    effect: 'Inflige des dégâts de Ténèbres sur la durée et réduit la Défense Ténèbres.',
    roles: ['Burst', 'snowball offensif', 'amplification mono-élément'],
    examples: ['Meliodas', 'Bug'],
    tips: ['Très bon dans les équipes full Darkness.', 'Plus tu capitalises sur les fenêtres Burst, plus il brille.'],
  },
  cold: {
    label: '❄️ Glace',
    title: 'Éléments — Glace',
    color: 0x38bdf8,
    identity: 'Contrôle, ralentissement et préparation de gros dégâts.',
    status: 'Chill / Freeze',
    effect: 'Chill réduit la vitesse de déplacement et la résistance Cold Burst. À plein cumul, la cible peut être Freeze.',
    roles: ['Contrôle', 'setup', 'sécurisation'],
    examples: ['Jericho', 'Manny'],
    tips: ['Très fort pour ralentir le combat et sécuriser une équipe.', 'Idéal pour préparer un gros hit sur une cible immobilisée.'],
  },
  earth: {
    label: '🪨 Terre',
    title: 'Éléments — Terre',
    color: 0x84cc16,
    identity: 'Contrôle lourd, Petrify et punition mono-cible.',
    status: 'Petrify',
    effect: 'Petrify incapacite la cible, augmente les dégâts Physical / Earth reçus et réduit les autres dégâts élémentaires.',
    roles: ['Contrôle', 'setup physique/terre', 'punition ciblée'],
    examples: ['Diane', 'Dreydrin', 'King (wand)'],
    tips: ['Très fort pour verrouiller une cible clé.', 'Excellent si la team exploite Terre ou Physique.'],
  },
  holy: {
    label: '✨ Sacré',
    title: 'Éléments — Sacré',
    color: 0xeab308,
    identity: 'Utilité, support et profils hybrides.',
    status: 'Pas d’état universel identifié',
    effect: 'Le guide récupéré ne liste pas de DoT ou contrôle générique propre au Sacré. Il faut surtout lire les compétences des héros.',
    roles: ['Support', 'soin', 'utilitaire'],
    examples: ['Elizabeth', 'Elaine (staff)', 'Manny (staff)'],
    tips: ['Se lit surtout via le kit individuel du perso.', 'Souvent très utile même sans gros indicateur offensif direct.'],
  },
  physical: {
    label: '🗡️ Physique',
    title: 'Éléments — Physique',
    color: 0xf97316,
    identity: 'Dégâts directs et grosse synergie avec Petrify.',
    status: 'Synergie avec Petrify',
    effect: 'Le guide ne donne pas de DoT dédié au Physique, mais Petrify augmente fortement les dégâts Physical reçus.',
    roles: ['Dégâts directs', 'punition mono-cible', 'finisher'],
    examples: ['Griamore', 'Dreyfus', 'Guila (shield)'],
    tips: ['Très intéressant quand un setup Terre prépare la cible.', 'Souvent plus simple à lire : gros dégâts, peu de détour.'],
  },
};

function selectComponents(selected = 'lightning') {
  return [{
    type: 1,
    components: [{
      type: 3,
      custom_id: ELEMENT_SELECT_ID,
      placeholder: 'Choisir un élément',
      min_values: 1,
      max_values: 1,
      options: Object.entries(ELEMENTS).map(([value, e]) => ({
        label: e.label,
        value,
        description: e.identity.slice(0, 95),
        default: value === selected,
      })),
    }],
  }];
}

function overviewEmbed(selected = 'lightning') {
  const current = ELEMENTS[selected] || ELEMENTS.lightning;
  return {
    color: COLOR,
    author: { name: 'Éléments · Lecture rapide' },
    title: 'Éléments — Hub',
    description: 'Vue de synthèse des éléments présents dans les données du bot. Une seule fiche est affichée à la fois pour éviter l’empilement d’embeds.',
    fields: [
      { name: 'Élément ouvert', value: `${current.label}\n${current.identity}`, inline: true },
      { name: 'Statut principal', value: current.status, inline: true },
      { name: 'Tous les éléments', value: Object.values(ELEMENTS).map((e) => `• ${e.label}`).join('\n'), inline: false },
      { name: 'Comment lire la fiche', value: '• identité du style\n• statut / effet majeur\n• rôles fréquents\n• exemples\n• conseils rapides', inline: false },
    ],
    footer: { text: 'Éléments · navigation compacte' },
  };
}

function detailEmbed(key) {
  const e = ELEMENTS[key] || ELEMENTS.lightning;
  return {
    color: e.color,
    author: { name: e.label },
    title: e.title,
    description: e.identity,
    fields: [
      { name: 'Statut / effet principal', value: `**${e.status}**\n${e.effect}`, inline: false },
      { name: 'Rôles fréquents', value: e.roles.map((x) => `• ${x}`).join('\n'), inline: true },
      { name: 'Exemples de personnages', value: e.examples.map((x) => `• ${x}`).join('\n'), inline: true },
      { name: 'Conseils rapides', value: e.tips.map((x) => `• ${x}`).join('\n'), inline: false },
      { name: 'Tous les éléments', value: Object.values(ELEMENTS).map((el) => `• ${el.label}`).join('\n'), inline: false },
    ],
    footer: { text: 'Éléments · identité / statut / usages' },
  };
}

export function handleElementsCommand(_env) {
  const key = 'lightning';
  return {
    type: 4,
    data: {
      embeds: [detailEmbed(key)],
      components: selectComponents(key),
    },
  };
}

export function handleElementsComponent(_env, interaction) {
  const key = interaction?.data?.values?.[0] || 'lightning';
  return {
    type: 7,
    data: {
      embeds: [detailEmbed(key)],
      components: selectComponents(key),
    },
  };
}
