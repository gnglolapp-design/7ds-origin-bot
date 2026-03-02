function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function safeUrlLike(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function collectWeaponTexts(weapon = {}) {
  const chunks = [weapon.name, weapon.attribute];
  for (const skill of weapon.skills || []) {
    chunks.push(skill?.name, skill?.kind, skill?.description);
  }
  for (const potential of weapon.potentials || []) {
    chunks.push(potential?.text);
    for (const item of potential?.items || []) chunks.push(item);
  }
  return chunks.filter(Boolean).join("\n");
}

function collectCharacterTexts(char = {}) {
  const chunks = [char.name, char.description, char.attribute, ...(char.roles || [])];
  for (const weapon of char.weapons || []) chunks.push(collectWeaponTexts(weapon));
  return chunks.filter(Boolean).join("\n");
}

const TAG_RULES = [
  { label: "Burst", patterns: ["burst", "ultimate move", "ultimate", "bonus damage", "finisher", "damage equal to", "window of damage", "fenetre de degats"] },
  { label: "Crit", patterns: ["crit rate", "crit damage", "critical", "critical hit", "critique", "crit "] },
  { label: "Back Attack", patterns: ["back attack", "attaque arriere", "attaques dans le dos"] },
  { label: "AoE", patterns: ["all enemies", "nearby enemies", "area damage", "aoe", "plusieurs ennemis", "enemies within range"] },
  { label: "Mono-cible", patterns: ["target enemy", "single target", "single enemy", "ennemi cible", "a single enemy"] },
  { label: "Barrier", patterns: ["barrier", "bouclier", "shield equal to", "gains a barrier"] },
  { label: "Taunt", patterns: ["taunt", "provoc"] },
  { label: "Shock", patterns: ["shock"] },
  { label: "Burn", patterns: ["burn", "brulure"] },
  { label: "Bleed", patterns: ["bleed", "saign"] },
  { label: "Freeze", patterns: ["freeze", "gel", "frozen"] },
  { label: "Stun", patterns: ["stun", "etourdi", "stagger"] },
  { label: "Sustain", patterns: ["restores hp", "restore hp", "heal", "heals", "recover hp", "recovery", "regen", "restaure les pv", "soigne", "soin"] },
  { label: "Support", patterns: ["all allies", "all allied", "allied heroes", "attack of allies", "allies within range", "buffs allies", "octroie aux alli", "augmente l'attaque des alli"] },
  { label: "Contrôle", patterns: ["interrupt", "interruption", "knockdown", "stun", "freeze", "taunt", "restrain", "silence", "airborne"] },
  { label: "DoT", patterns: ["damage over time", "every 0.5 sec", "every second", "per second", "dot"] },
  { label: "Tank", patterns: ["max hp", "mitigation", "damage taken", "block", "barrier", "taunt", "pv max", "takes reduced damage"] },
  { label: "Mobilité", patterns: ["dash", "movement speed", "move speed", "reposition", "mobility", "teleport"] },
];

function detectTagsFromText(text) {
  const haystack = normalize(text);
  const tags = [];
  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => haystack.includes(normalize(pattern)))) tags.push(rule.label);
  }
  return tags;
}

function unique(list = []) {
  return [...new Set(list.filter(Boolean))];
}

function topItemsByCount(items = [], max = 6) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([label]) => label);
}

function orientationScores(tags = []) {
  const score = { dps: 0, support: 0, control: 0, tank: 0 };
  for (const tag of tags) {
    if (["Burst", "Crit", "Back Attack", "AoE", "Mono-cible", "Shock", "Burn", "Bleed", "DoT"].includes(tag)) score.dps += 2;
    if (["Support", "Sustain", "Barrier"].includes(tag)) score.support += 2;
    if (["Contrôle", "Freeze", "Stun", "Taunt"].includes(tag)) score.control += 2;
    if (["Tank", "Barrier", "Taunt", "Sustain"].includes(tag)) score.tank += 2;
  }
  return score;
}

function pickOrientation(tags = []) {
  const scores = orientationScores(tags);
  const labels = {
    dps: "DPS / pression",
    support: "Support / survie",
    control: "Contrôle / rythme",
    tank: "Frontline / tank",
  };
  const ordered = Object.entries(scores)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  return ordered.slice(0, 2).map(([key]) => labels[key]);
}

export function analyzeWeaponIdentity(weapon = {}) {
  const text = collectWeaponTexts(weapon);
  const tags = unique(detectTagsFromText(text));
  const orientations = pickOrientation(tags);
  const hasData = Boolean((weapon.skills || []).length || (weapon.potentials || []).length);

  return {
    hasData,
    tags,
    orientations,
    summary: hasData
      ? orientations.length
        ? orientations.join(" · ")
        : "Style encore flou pour l’instant"
      : "Non disponible pour l’instant",
  };
}

export function analyzeCharacterProfile(char = {}) {
  const text = collectCharacterTexts(char);
  const weaponAnalyses = (char.weapons || []).map((weapon) => ({
    name: weapon.name,
    ...analyzeWeaponIdentity(weapon),
    weapon,
  }));
  const allTags = topItemsByCount(detectTagsFromText(text).concat(weaponAnalyses.flatMap((entry) => entry.tags)), 8);
  const orientations = topItemsByCount(weaponAnalyses.flatMap((entry) => entry.orientations), 3);
  return {
    tags: allTags,
    orientations,
    weapons: weaponAnalyses,
  };
}


function looksLikeEffectSentence(value = "") {
  const line = String(value || "").trim();
  if (!line) return false;
  if (line.length < 40) return false;
  return /(increases|decreases|restores|cooldown|damage|chance|max hp|when in combat|enemy|hero|barrier|attack by|critical|crit chance|augmente|diminue|inflige|dégâts|barriere|barrière|attaque|défense|combat)/i.test(line);
}

function isLikelyEnglishCostumeName(value = "") {
  const line = normalize(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return false;
  const words = [
    "the", "of", "and", "holy", "knight", "guardian", "casual", "outing", "family", "time", "young",
    "friendly", "apprentice", "royal", "butler", "employee", "light", "flame", "trail", "shadow", "walk",
    "instinct", "runaway", "moment", "secretive", "traveler", "trace", "memories", "simple", "honor",
    "dignity", "trusted", "grandmaster", "returned", "demon", "day", "cheerful", "saint", "one", "only",
    "storms", "lightning", "explosions", "nice", "solid", "carefree", "promising"
  ];
  return words.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`, "i").test(line)) || /'s\b/.test(String(value || ""));
}

function isLikelyFrenchCostumeName(value = "") {
  const raw = String(value || "");
  const line = normalize(raw)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return false;
  if (/[àâäçéèêëîïôöùûüÿœ]/i.test(raw)) return true;
  const words = [
    "le", "la", "les", "de", "du", "des", "un", "une", "chevalier", "chevaliere", "sacre", "saint",
    "sortie", "famille", "temps", "gardien", "gardienne", "royal", "flamme", "trace", "souvenirs", "ombre",
    "detente", "moment", "dignite", "defense", "foudre", "prometteur", "tempetes", "jeune", "unique", "seul",
    "revenue", "voyageuse", "visiere", "etoile", "jour", "beau", "mur", "fer", "forteresse", "princesse",
    "majordome", "instructeur", "royaume", "decontractee"
  ];
  return words.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`, "i").test(line));
}

function pickPreferredCostumeName(primaryName, secondaryName) {
  const a = String(primaryName || "").trim();
  const b = String(secondaryName || "").trim();
  if (!a) return b || null;
  if (!b) return a || null;
  const aFr = isLikelyFrenchCostumeName(a);
  const bFr = isLikelyFrenchCostumeName(b);
  const aEn = isLikelyEnglishCostumeName(a);
  const bEn = isLikelyEnglishCostumeName(b);
  if (aFr && bEn) return a;
  if (bFr && aEn) return b;
  return a.length <= b.length ? a : b;
}

function mergeCostumeEntry(primary = {}, secondary = {}) {
  return {
    ...secondary,
    ...primary,
    name: pickPreferredCostumeName(primary?.name, secondary?.name),
    description: primary?.description || secondary?.description || null,
    passive: primary?.passive || secondary?.passive || null,
    effect_title: primary?.effect_title || secondary?.effect_title || null,
    effect: primary?.effect || secondary?.effect || null,
    image: safeUrlLike(primary?.image) ? primary.image : safeUrlLike(secondary?.image) ? secondary.image : primary?.image || secondary?.image || null,
    source_url: safeUrlLike(primary?.source_url) ? primary.source_url : safeUrlLike(secondary?.source_url) ? secondary.source_url : primary?.source_url || secondary?.source_url || null,
  };
}

function collapseLocalizedCostumePairs(costumes = []) {
  const list = Array.isArray(costumes) ? costumes.filter(Boolean) : [];
  if (list.length < 6 || list.length % 2 !== 0) return list;
  const half = list.length / 2;
  const first = list.slice(0, half);
  const second = list.slice(half);
  const firstFrench = first.filter((item) => isLikelyFrenchCostumeName(item?.name)).length;
  const firstEnglish = first.filter((item) => isLikelyEnglishCostumeName(item?.name)).length;
  const secondFrench = second.filter((item) => isLikelyFrenchCostumeName(item?.name)).length;
  const secondEnglish = second.filter((item) => isLikelyEnglishCostumeName(item?.name)).length;

  const firstLooksFrench = secondEnglish >= Math.max(2, Math.floor(half * 0.5)) && firstEnglish <= Math.max(1, Math.floor(half * 0.25));
  const firstLooksEnglish = firstEnglish >= Math.max(2, Math.floor(half * 0.5)) && secondEnglish <= Math.max(1, Math.floor(half * 0.25));
  if (!firstLooksFrench && !firstLooksEnglish) return list;

  const primary = firstLooksFrench ? first : second;
  const secondary = firstLooksFrench ? second : first;
  return primary.map((entry, index) => ({ ...mergeCostumeEntry(entry, secondary[index] || {}), name: entry?.name || secondary[index]?.name || null }));
}

function dedupeCostumesByName(costumes = []) {
  const out = [];
  const byName = new Map();
  for (const costume of Array.isArray(costumes) ? costumes : []) {
    const key = normalize(costume?.name).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!key) continue;
    if (!byName.has(key)) {
      byName.set(key, out.length);
      out.push(costume);
      continue;
    }
    const idx = byName.get(key);
    out[idx] = mergeCostumeEntry(out[idx], costume);
  }
  return out;
}

export function isSourceLikeCostumeLabel(value = "") {
  const label = normalize(value);
  if (!label) return false;
  return [
    "7dsorigin.gg",
    "7ds origins gg",
    "7dsorigins.gg",
    "genshin.gg",
    "hideoutgacha",
  ].some((token) => label === token || label.includes(token));
}

function isRealCostume(costume = {}) {
  const label = normalize(costume?.name);
  if (!label) return false;
  if (label.includes("aucun skin disponible")) return false;
  if (label.includes("bientot ajoute")) return false;
  if (looksLikeEffectSentence(costume?.name)) return false;
  if (isSourceLikeCostumeLabel(label)) return false;
  return true;
}

export function resolveCharacterCostumes(char = {}) {
  const raw = Array.isArray(char?.costumes) ? char.costumes.filter((entry) => entry && typeof entry === "object") : [];
  const named = [];
  const imageOnly = [];

  for (const costume of raw) {
    if (isRealCostume(costume)) named.push({ ...costume });
    else if (safeUrlLike(costume?.image) || safeUrlLike(costume?.source_url)) imageOnly.push({ ...costume });
  }

  if (!named.length) {
    return raw.map((entry, idx) => ({
      ...entry,
      name: isRealCostume(entry) ? entry.name : (entry?.name || `Costume ${idx + 1}`),
    }));
  }

  let resolved = dedupeCostumesByName(named);

  let imageCursor = 0;
  resolved = resolved.map((costume) => {
    if (safeUrlLike(costume?.image)) return costume;
    const donor = imageOnly[imageCursor++];
    if (!donor) return costume;
    return mergeCostumeEntry(costume, donor);
  });

  resolved = collapseLocalizedCostumePairs(resolved);
  resolved = dedupeCostumesByName(resolved);

  return resolved.filter(isRealCostume);
}

export function countRealCostumes(char = {}) {
  return resolveCharacterCostumes(char).filter(isRealCostume).length;
}

export function describeCharacterCompleteness(char = {}) {
  const portraits = char?.images?.portrait ? "Portrait · OK" : "Portrait · Non disponible pour l’instant";
  const stats = Object.keys(char?.stats || {}).length ? "Stats · OK" : "Stats · Non disponible pour l’instant";
  const weapons = (char?.weapons || []).length ? `Armes · ${(char.weapons || []).length}` : "Armes · Non disponible pour l’instant";
  const skills = (char?.weapons || []).some((weapon) => (weapon?.skills || []).length) ? "Skills · OK" : "Skills · Non disponible pour l’instant";
  const potentials = (char?.weapons || []).some((weapon) => (weapon?.potentials || []).length) ? "Potentiels · OK" : "Potentiels · Non disponible pour l’instant";
  const resolvedCostumes = resolveCharacterCostumes(char);
  const costumes = resolvedCostumes.length ? `Costumes · ${resolvedCostumes.length}` : "Costumes · Non disponible pour l’instant";
  const costumeImages = resolvedCostumes.some((costume) => costume?.image) ? "Images costumes · OK" : "Images costumes · Non disponible pour l’instant";
  return [portraits, stats, weapons, skills, potentials, costumes, costumeImages];
}

const BOSS_READING_RULES = [
  {
    key: "Interruptions",
    patterns: ["interruption", "interrompre", "tag", "contour bleu", "knockdown", "stagger"],
    pressure: "interruption des grosses capacités",
    demand: "garder un Tag prêt sur les timings critiques",
  },
  {
    key: "Placement",
    patterns: ["positionnement", "angles", "trajectoire", "distance", "devant", "derriere", "courte portee", "longue portee", "melee", "projectiles"],
    pressure: "placement et analyse des angles",
    demand: "jouer proprement autour des portées et du front du boss",
  },
  {
    key: "Burst windows",
    patterns: ["burst", "fenetre de degats", "recoveries", "bouclier casse", "noyau", "bras dans le sol", "ouverture"],
    pressure: "fenêtres de dégâts courtes mais rentables",
    demand: "conserver les bursts pour les vraies ouvertures",
  },
  {
    key: "Survie",
    patterns: ["pression constante", "survie", "punir", "degats", "esquives", "ultimate", "enrage", "menaçante"],
    pressure: "pression continue sur la durée",
    demand: "sécuriser la survie si le DPS reste juste",
  },
  {
    key: "Phases",
    patterns: ["phase", "transition", "volante", "grimper", "bouclier", "objectif", "invocation", "rituel"],
    pressure: "combat à phases / objectifs",
    demand: "lire l’objectif actif avant de forcer le DPS",
  },
  {
    key: "Coordination",
    patterns: ["multijoueur", "coordonnez", "repartissez", "joueur pret", "equipe"],
    pressure: "coordination d’équipe utile",
    demand: "mieux en groupe ou avec rôles bien répartis",
  },
];

function collectBossText(boss = {}) {
  const chunks = [boss.name, boss.description, boss.guide?.title, boss.guide?.subtitle];
  for (const section of boss.guide?.sections || []) {
    chunks.push(section.label, section.title, section.subtitle, section.body);
    for (const paragraph of section.paragraphs || []) chunks.push(paragraph);
    for (const bullet of section.bullets || []) chunks.push(bullet);
    if (section.callout) chunks.push(section.callout.title, section.callout.text);
    for (const field of section.fields || []) chunks.push(field.name, field.value);
  }
  return chunks.filter(Boolean).join("\n");
}

function detectBossWarnings(text, boss = {}) {
  const haystack = normalize(text);
  const warnings = [];
  const push = (label) => { if (!warnings.includes(label)) warnings.push(label); };

  if (haystack.includes("rituel") || haystack.includes("invocation")) push("ouverture via invocation / rituel");
  if (haystack.includes("volante") || haystack.includes("flying")) push("phase volante qui coupe le rythme du combat");
  if (haystack.includes("enrage") || haystack.includes("ultimate")) push("fin de combat punitive si le fight traîne");
  if (haystack.includes("bouclier") || haystack.includes("shield")) push("objectif de bouclier à gérer avant le vrai burst");
  if (haystack.includes("grimper") || haystack.includes("climb")) push("transition de montée / noyau à convertir en DPS");
  if (haystack.includes("laser")) push("punition à distance si le positionnement est mauvais");
  if (haystack.includes("derriere")) push("certaines réactions punitives selon l’angle d’attaque");
  if (haystack.includes("projectiles") || haystack.includes("boules de feu")) push("pression mixte mêlée + distance");
  if (haystack.includes("stun")) push("risque de contrôle de zone si l’équipe reste packée");

  if (!warnings.length && boss?.guide?.sections?.length) {
    push("analyse de section recommandée avant d’investir les bursts");
  }

  return warnings.slice(0, 3);
}

export function analyzeBossCombatReading(boss = {}) {
  const text = collectBossText(boss);
  const haystack = normalize(text);
  const matched = BOSS_READING_RULES.filter((rule) => rule.patterns.some((pattern) => haystack.includes(normalize(pattern))));

  const pressures = unique(matched.map((rule) => rule.pressure)).slice(0, 3);
  const demands = unique(matched.map((rule) => rule.demand)).slice(0, 4);
  const warnings = detectBossWarnings(text, boss);

  return {
    pressures: pressures.length ? pressures : ["analyse du guide disponible mais encore peu structurée"],
    demands: demands.length ? demands : ["ouvrir la section active et jouer autour des timings clés"],
    warnings,
  };
}

export function describeBossCompleteness(boss = {}) {
  const portrait = boss?.images?.portrait ? "Visuel boss · OK" : "Visuel boss · Non disponible pour l’instant";
  const sections = (boss?.guide?.sections || []).length ? `Sections guide · ${(boss.guide.sections || []).length}` : "Sections guide · Non disponible pour l’instant";
  const sectionFields = (boss?.guide?.sections || []).some((section) => (section?.fields || []).length) ? "Encadrés / champs · OK" : "Encadrés / champs · Non disponible pour l’instant";
  const sectionImages = (boss?.guide?.sections || []).some((section) => section?.image) ? "Images de section · OK" : "Images de section · Non disponible pour l’instant";
  return [portrait, sections, sectionFields, sectionImages];
}


export function summarizeCharacterStrengths(char = {}) {
  const profile = analyzeCharacterProfile(char);
  const strengths = [];
  if (profile.orientations.length) strengths.push(`Orientation dominante · ${profile.orientations.join(' · ')}`);
  if (profile.tags.some((tag) => ['Burst', 'Crit', 'AoE', 'Mono-cible', 'Back Attack'].includes(tag))) {
    const offensive = profile.tags.filter((tag) => ['Burst', 'Crit', 'AoE', 'Mono-cible', 'Back Attack', 'DoT', 'Shock', 'Burn', 'Bleed'].includes(tag)).slice(0, 4);
    if (offensive.length) strengths.push(`Pression offensive · ${offensive.join(' · ')}`);
  }
  if (profile.tags.some((tag) => ['Support', 'Sustain', 'Barrier', 'Tank', 'Taunt'].includes(tag))) {
    const utility = profile.tags.filter((tag) => ['Support', 'Sustain', 'Barrier', 'Tank', 'Taunt'].includes(tag)).slice(0, 4);
    if (utility.length) strengths.push(`Utilité / survie · ${utility.join(' · ')}`);
  }
  if (profile.tags.some((tag) => ['Contrôle', 'Freeze', 'Stun', 'Taunt'].includes(tag))) {
    const control = profile.tags.filter((tag) => ['Contrôle', 'Freeze', 'Stun', 'Taunt'].includes(tag)).slice(0, 3);
    if (control.length) strengths.push(`Contrôle repéré · ${control.join(' · ')}`);
  }
  return strengths.slice(0, 4);
}

export function summarizeCharacterUnknowns(char = {}) {
  const gaps = [];
  if (!char?.description) gaps.push('Description générale encore légère');
  if (!(char?.weapons || []).length) gaps.push('Armes non consolidées');
  if (!(char?.weapons || []).some((weapon) => (weapon?.skills || []).length)) gaps.push('Skills non disponibles pour l’instant');
  if (!(char?.weapons || []).some((weapon) => (weapon?.potentials || []).length)) gaps.push('Potentiels non disponibles pour l’instant');
  const costumes = resolveCharacterCostumes(char);
  if (!costumes.length) gaps.push('Costumes non disponibles pour l’instant');
  else if (!costumes.some((costume) => safeUrlLike(costume?.image))) gaps.push('Images de costumes non disponibles pour l’instant');
  return gaps.slice(0, 4);
}

export function summarizeBossMechanics(boss = {}) {
  const reading = analyzeBossCombatReading(boss);
  const mechanics = [];
  if (reading.pressures.length) mechanics.push(`Le combat met surtout la pression sur ${reading.pressures[0]}.`);
  if (reading.demands.length) mechanics.push(`Le guide pousse surtout à ${reading.demands[0]}.`);
  if (reading.warnings.length) mechanics.push(`Risque majeur · ${reading.warnings[0]}.`);
  return {
    opening: mechanics[0] || 'Lecture boss encore partielle pour l’instant.',
    critical: reading.demands.slice(0, 3),
    warnings: reading.warnings.slice(0, 3),
  };
}
