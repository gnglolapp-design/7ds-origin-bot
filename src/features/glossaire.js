const COLOR = 0xef4444;
const INFO_COLOR = 0x2563eb;
const FOOTER = 'Glossaire — navigation compacte';
const SELECT_ID = 'glossaire:section';

const SECTION_META = {
  combat: { label: '⚔️ Combat', description: 'Attaques, compétences et logique de rotation' },
  burst: { label: '💥 Burst', description: 'Jauge, déclenchement et fenêtres de dégâts' },
  tag: { label: '🔁 Tag', description: 'Swap, Tag Gauge et rotations d’équipe' },
  status: { label: '🧪 Effets d’état', description: 'Référence des principaux statuts de combat' },
  tips: { label: '🧠 Conseils', description: 'Priorités pratiques en solo et multijoueur' },
};

const GLOSSARY = {
  overview:
    "Repères essentiels pour comprendre le système de combat de Seven Deadly Sins: Origin : types d’attaques, Burst, swaps Tag, statuts et bonnes habitudes de rotation.",
  combat: {
    intro:
      "Le combat est en temps réel : tu contrôles un héros à la fois pendant que l’IA pilote les autres. L’objectif n’est pas seulement de taper, mais de gérer cooldowns, placement, esquives et timing des swaps.",
    blocks: [
      {
        title: 'Attaque normale',
        body: "Combo de base répété avec l’attaque standard. Chaque arme change la portée, l’animation et la répartition des hits — utile pour charger la jauge, maintenir la pression et finir une rotation.",
      },
      {
        title: 'Attaque spéciale',
        body: "Compétence signature de l’arme, parfois instantanée, parfois chargeable. C’est souvent la pièce centrale du kit offensif ou défensif et elle conditionne le rythme du personnage.",
      },
      {
        title: 'Compétence normale (E)',
        body: "Compétence à cooldown apportant dégâts, buff, debuff, soin, barrière, mobilité ou utilité. Beaucoup de rotations tournent autour de cette compétence.",
      },
      {
        title: 'Mouvement ultime',
        body: "Compétence la plus impactante du kit. Elle consomme la magie accumulée et sert à ouvrir une fenêtre de burst, appliquer un gros contrôle ou sécuriser une phase clé.",
      },
    ],
  },
  burst: {
    intro:
      "La jauge de Burst se remplit pendant le combat. Une fois pleine, tu peux déclencher un Burst élémentaire : explosion liée à l’élément du héros actif, souvent décisive pour le DPS et les synergies d’équipe.",
    build: [
      'Infliger des dégâts avec attaques normales et compétences',
      'Exploiter les compétences qui ajoutent directement de la jauge',
      'Recevoir des dégâts, ce qui peut aussi accélérer le remplissage',
      'Améliorer les stats et effets liés à l’efficacité de Burst',
    ],
    effects:
      "Un Burst inflige de lourds dégâts élémentaires et applique souvent un debuff important : baisse de défense élémentaire, DoT, contrôle ou setup. Beaucoup de héros gagnent énormément de valeur quand la cible est sous Burst.",
    windows: [
      'Interrompre / contrôler le boss puis déclencher le burst',
      'Garder ultimes et grosses compétences pour la fenêtre de knockdown',
      'Utiliser le Burst pour activer les passifs et dégâts conditionnels de l’équipe',
    ],
  },
  tag: {
    intro:
      "Le système de Tag permet de changer de personnage en plein combat. Le héros qui entre déclenche immédiatement une Tag Skill liée à son arme, ce qui donne un vrai rôle au swap dans les rotations.",
    gauge:
      "La Tag Gauge se remplit naturellement au fil du combat. Quand elle est suffisante, tu peux switch pour poursuivre une rotation, éviter un temps mort, repositionner l’équipe ou déclencher une compétence de tag.",
    points:
      "Certains héros restaurent des Tag Points via Burst, passifs ou conditions d’arme. Cela permet d’enchaîner les swaps plus vite et de garder une pression constante sur les boss.",
    rules: [
      'Swap pour maintenir le DPS quand un kit entre en downtime',
      'Utiliser la Tag Skill comme outil de setup, d’interruption ou de finition',
      'Éviter de gaspiller un swap juste avant une grosse fenêtre de dégâts',
    ],
  },
  status: {
    control: [
      { title: 'Stun', body: 'La cible est incapacitée et ne peut plus agir.' },
      { title: 'Freeze', body: 'La cible est incapacitée. Un coup de compétence retire le gel et déclenche un bonus de dégâts.' },
      { title: 'Paralysis', body: 'La cible est incapacitée. Sa Défense Foudre diminue de 15% et l’effet persiste si elle reste sous Shock.' },
      { title: 'Petrify', body: 'La cible est incapacitée. Les dégâts Physique / Terre reçus augmentent, tandis que les autres dégâts élémentaires sont réduits.' },
      { title: 'Bind', body: 'Empêche les déplacements mais la cible peut encore agir.' },
    ],
    dots: [
      { title: 'Bleed', body: 'Inflige des dégâts de Vent sur la durée, réduit l’efficacité des soins et peut se propager.' },
      { title: 'Burn', body: 'Inflige des dégâts de Feu sur la durée et réduit progressivement la Défense de la cible.' },
      { title: 'Shock', body: 'Inflige des dégâts de Foudre toutes les 2 secondes et peut se propager aux ennemis proches quand la cible est touchée.' },
      { title: 'Curse', body: 'Inflige des dégâts de Ténèbres sur la durée et réduit la Défense Ténèbres.' },
      { title: 'Chill', body: 'Réduit la vitesse de déplacement et la résistance au Burst de Glace. Peut évoluer vers Freeze au maximum d’accumulation.' },
    ],
  },
  tips: {
    general: [
      'Apprends les temps de recharge pour éviter les rotations vides.',
      'Empile d’abord les debuffs / contrôles avant de lancer tes gros dégâts.',
      'Garde ultimes et bursts pour les fenêtres de knockdown ou d’interruption.',
      'Observe les indicateurs du boss au lieu de spammer tes compétences hors timing.',
    ],
    solo: [
      'En solo, privilégie la survie et la régularité plutôt qu’un burst mal timé.',
      'Évite de tout consommer d’un coup si le boss prépare une mécanique punitive.',
    ],
    multi: [
      'En multijoueur, spécialise les rôles : interruption, setup, burst, maintien.',
      'Un seul joueur peut parfois gérer l’interrupt pendant que les autres burst.',
    ],
  },
};

function truncate(v, n = 350) {
  const s = String(v || '').trim();
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trim()}…`;
}

function sectionOptions(selected = 'combat') {
  return [{
    type: 1,
    components: [{
      type: 3,
      custom_id: SELECT_ID,
      options: Object.entries(SECTION_META).map(([value, meta]) => ({
        label: meta.label,
        value,
        description: meta.description,
        default: value === selected,
      })),
      placeholder: 'Choisir une section du glossaire',
      min_values: 1,
      max_values: 1,
    }],
  }];
}

function baseIntroEmbed(selected = 'combat') {
  const meta = SECTION_META[selected] || SECTION_META.combat;
  return {
    color: COLOR,
    author: { name: 'Glossaire · repères de combat' },
    title: 'Glossaire — Hub',
    description: GLOSSARY.overview,
    fields: [
      {
        name: 'Section ouverte',
        value: `${meta.label}\n${meta.description}`,
        inline: true,
      },
      {
        name: 'Utilisation',
        value: 'Le glossaire sert de référence rapide quand tu veux vérifier un terme, un système ou un statut sans rouvrir un guide entier.',
        inline: true,
      },
      {
        name: 'Sections disponibles',
        value: Object.values(SECTION_META).map((s) => `• ${s.label}`).join('\n'),
        inline: false,
      },
    ],
    footer: { text: FOOTER },
  };
}

function buildCombatEmbeds() {
  return [{
    color: COLOR,
    author: { name: '⚔️ Glossaire · Combat' },
    title: 'Combat — bases de lecture',
    description: GLOSSARY.combat.intro,
    fields: GLOSSARY.combat.blocks.map((b) => ({
      name: b.title,
      value: truncate(b.body, 260),
      inline: true,
    })),
    footer: { text: FOOTER },
  }];
}

function buildBurstEmbeds() {
  return [{
    color: COLOR,
    author: { name: '💥 Glossaire · Burst' },
    title: 'Burst — jauge et fenêtres',
    description: GLOSSARY.burst.intro,
    fields: [
      {
        name: 'Remplir la jauge',
        value: GLOSSARY.burst.build.map((x) => `• ${x}`).join('\n'),
        inline: false,
      },
      {
        name: 'Ce que le Burst apporte',
        value: truncate(GLOSSARY.burst.effects, 950),
        inline: false,
      },
      {
        name: 'Bon timing de burst',
        value: GLOSSARY.burst.windows.map((x) => `• ${x}`).join('\n'),
        inline: false,
      },
    ],
    footer: { text: FOOTER },
  }];
}

function buildTagEmbeds() {
  return [{
    color: COLOR,
    author: { name: '🔁 Glossaire · Tag' },
    title: 'Tag — swaps et rotation',
    description: GLOSSARY.tag.intro,
    fields: [
      { name: 'Tag Gauge', value: truncate(GLOSSARY.tag.gauge, 380), inline: true },
      { name: 'Tag Points', value: truncate(GLOSSARY.tag.points, 380), inline: true },
      { name: 'Bonnes pratiques', value: GLOSSARY.tag.rules.map((x) => `• ${x}`).join('\n'), inline: false },
    ],
    footer: { text: FOOTER },
  }];
}

function buildStatusEmbeds() {
  return [
    {
      color: COLOR,
      author: { name: '🧪 Glossaire · Contrôle' },
      title: 'Effets d’état — contrôle',
      description: 'Statuts qui neutralisent, bloquent ou ouvrent une vraie fenêtre de dégâts.',
      fields: GLOSSARY.status.control.map((s) => ({ name: s.title, value: truncate(s.body, 220), inline: false })),
      footer: { text: FOOTER },
    },
    {
      color: INFO_COLOR,
      author: { name: '🧪 Glossaire · Pression / DoT' },
      title: 'Effets d’état — pression et dégâts sur la durée',
      description: 'Statuts qui servent surtout à user la cible, amplifier un élément ou préparer une combo.',
      fields: GLOSSARY.status.dots.map((s) => ({ name: s.title, value: truncate(s.body, 220), inline: false })),
      footer: { text: FOOTER },
    },
  ];
}

function buildTipsEmbeds() {
  return [{
    color: INFO_COLOR,
    author: { name: '🧠 Glossaire · Conseils pratiques' },
    title: 'Conseils — solo et multi',
    fields: [
      { name: 'Priorités générales', value: GLOSSARY.tips.general.map((x) => `• ${x}`).join('\n'), inline: false },
      { name: 'Si tu joues solo', value: GLOSSARY.tips.solo.map((x) => `• ${x}`).join('\n'), inline: true },
      { name: 'Si tu joues en multi', value: GLOSSARY.tips.multi.map((x) => `• ${x}`).join('\n'), inline: true },
    ],
    footer: { text: FOOTER },
  }];
}

function renderSection(section) {
  switch (section) {
    case 'burst': return buildBurstEmbeds();
    case 'tag': return buildTagEmbeds();
    case 'status': return buildStatusEmbeds();
    case 'tips': return buildTipsEmbeds();
    case 'combat':
    default:
      return buildCombatEmbeds();
  }
}


function singleSectionEmbed(section) {
  const embeds = renderSection(section);
  const first = embeds[0] || { color: COLOR, title: 'Glossaire', description: "Non disponible pour l'instant", fields: [] };
  if (embeds.length <= 1) return first;
  const merged = { ...first, fields: [...(first.fields || [])] };
  for (const extra of embeds.slice(1)) {
    if (extra.description) {
      merged.fields.push({ name: extra.title || extra.author?.name || 'Suite', value: truncate(extra.description, 500), inline: false });
    }
    for (const field of extra.fields || []) {
      merged.fields.push(field);
    }
  }
  merged.footer = { text: FOOTER };
  return merged;
}

export async function handleGlossaireCommand() {
  const section = 'combat';
  return {
    type: 4,
    data: {
      embeds: [singleSectionEmbed(section)],
      components: sectionOptions(section),
    },
  };
}

export async function handleGlossaireComponent(_env, interaction) {
  const section = interaction?.data?.values?.[0] || 'combat';
  return {
    type: 7,
    data: {
      embeds: [singleSectionEmbed(section)],
      components: sectionOptions(section),
    },
  };
}
