function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unique(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function collectWeaponText(weapon = {}) {
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

function collectCharacterText(char = {}) {
  const chunks = [char.name, char.description, char.attribute, ...(char.roles || [])];
  for (const weapon of char.weapons || []) chunks.push(collectWeaponText(weapon));
  return chunks.filter(Boolean).join("\n");
}

const EFFECT_RULES = [
  { label: "Brûlure", family: "dot", baseWeight: 2.2, patterns: ["burn", "burning", "brulure", "flame", "ignite"] },
  { label: "Shock", family: "dot", baseWeight: 2.1, patterns: ["shock", "electrocute", "electrified", "lightning defense"] },
  { label: "Saignement", family: "dot", baseWeight: 2.1, patterns: ["bleed", "saign", "hemorrhage"] },
  { label: "Gel", family: "control", baseWeight: 2.3, patterns: ["freeze", "frozen", "gel"] },
  { label: "Stun", family: "control", baseWeight: 2.5, patterns: ["stun", "stagger", "etourdi", "airborne"] },
  { label: "Interruption", family: "control", baseWeight: 2.2, patterns: ["interrupt", "interruption", "cancel", "knockdown"] },
  { label: "Provocation", family: "frontline", baseWeight: 2.2, patterns: ["taunt", "provoc"] },
  { label: "Barrière", family: "survival", baseWeight: 2.1, patterns: ["barrier", "bouclier", "shield equal to", "gains a barrier"] },
  { label: "Soin", family: "survival", baseWeight: 2.1, patterns: ["heal", "heals", "restores hp", "recover hp", "regen", "recovery", "restaure les pv", "soigne"] },
  { label: "Crit", family: "burst", baseWeight: 1.7, patterns: ["crit rate", "crit damage", "critical hit", "critical", "critique"] },
  { label: "Back Attack", family: "burst", baseWeight: 2.0, patterns: ["back attack", "attaque arriere"] },
  { label: "Buff", family: "utility", baseWeight: 1.6, patterns: ["all allies gain", "grants", "buff", "augmente", "octroie", "increases attack of allies", "increase allies"] },
  { label: "Debuff", family: "utility", baseWeight: 1.7, patterns: ["debuff", "reduces", "decrease", "diminue", "movement speed", "defense decrease"] },
  { label: "AoE", family: "pressure", baseWeight: 1.7, patterns: ["all enemies", "nearby enemies", "area damage", "aoe", "plusieurs ennemis", "enemies within range"] },
  { label: "Mono-cible", family: "burst", baseWeight: 1.6, patterns: ["single target", "single enemy", "target enemy", "ennemi cible", "a single enemy"] },
  { label: "Mobilité", family: "mobility", baseWeight: 1.7, patterns: ["dash", "move speed", "movement speed", "reposition", "teleport", "blink"] },
];

const FAMILY_TO_AXES = {
  dot: { pressure: 0.18, setup: 0.05 },
  control: { control: 0.2, setup: 0.12 },
  frontline: { survival: 0.14, stability: 0.1, control: 0.08 },
  survival: { survival: 0.2, stability: 0.14, utility: 0.08 },
  burst: { burst: 0.18, conversion: 0.15, execution_demand: 0.08 },
  utility: { utility: 0.18, setup: 0.08 },
  pressure: { pressure: 0.16, conversion: 0.05 },
  mobility: { mobility: 0.2, execution_demand: 0.05 },
};

const ROLE_HINTS = [
  { patterns: ["dps"], add: { burst: 0.12, pressure: 0.12, conversion: 0.05 } },
  { patterns: ["support", "soutien"], add: { utility: 0.2, stability: 0.08, autonomy: 0.05 } },
  { patterns: ["defense", "défense", "tank"], add: { survival: 0.18, stability: 0.12, front_dependency: -0.08 } },
  { patterns: ["debuffer"], add: { utility: 0.16, setup: 0.08 } },
  { patterns: ["heal"], add: { survival: 0.18, stability: 0.1, utility: 0.08 } },
];

const TAG_HINTS = {
  Burst: { burst: 0.18, conversion: 0.14, execution_demand: 0.08 },
  Crit: { burst: 0.12, conversion: 0.1 },
  "Back Attack": { burst: 0.14, conversion: 0.12, execution_demand: 0.04 },
  "Mono-cible": { burst: 0.12, conversion: 0.1 },
  AoE: { pressure: 0.16, setup: 0.04 },
  DoT: { pressure: 0.18, setup: 0.05 },
  Burn: { pressure: 0.14 },
  Bleed: { pressure: 0.14 },
  Shock: { pressure: 0.14 },
  Support: { utility: 0.2, stability: 0.08 },
  Sustain: { survival: 0.18, stability: 0.12 },
  Barrier: { survival: 0.18, stability: 0.12 },
  Tank: { survival: 0.2, stability: 0.14, front_dependency: -0.08 },
  Contrôle: { control: 0.18, setup: 0.08 },
  Freeze: { control: 0.16, setup: 0.08 },
  Stun: { control: 0.18, setup: 0.08 },
  Taunt: { control: 0.1, survival: 0.12, stability: 0.08 },
  Mobilité: { mobility: 0.18, execution_demand: 0.04 },
};

const AXIS_LABELS = {
  burst: "burst / finition",
  pressure: "pression continue",
  control: "contrôle / ouverture",
  utility: "utilité / support",
  survival: "survie / tenue",
  mobility: "mobilité / placement",
  setup: "setup / préparation",
  conversion: "gros dégâts au bon moment",
  stability: "fiabilité du kit",
  autonomy: "autonomie",
  support_dependency: "dépendance au support",
  front_dependency: "besoin d’un front stable",
  execution_demand: "exigence d’exécution",
};

function buildBaseVector() {
  return {
    burst: 0,
    pressure: 0,
    control: 0,
    utility: 0,
    survival: 0,
    mobility: 0,
    setup: 0,
    conversion: 0,
    stability: 0,
    autonomy: 0,
    support_dependency: 0,
    front_dependency: 0,
    execution_demand: 0,
  };
}

function addScore(vector, key, value) {
  vector[key] = round2((vector[key] || 0) + Number(value || 0));
}

function addScores(vector, payload = {}, factor = 1) {
  for (const [key, value] of Object.entries(payload || {})) addScore(vector, key, value * factor);
}

function detectEffectsDetailed(text = "") {
  const haystack = normalize(text);
  if (!haystack) return [];
  const detected = [];
  for (const rule of EFFECT_RULES) {
    const matches = unique((rule.patterns || []).filter((pattern) => haystack.includes(normalize(pattern))));
    if (!matches.length) continue;
    const matchFactor = Math.min(1.35, 0.82 + (matches.length - 1) * 0.18);
    const weight = round2(rule.baseWeight * matchFactor);
    detected.push({
      label: rule.label,
      family: rule.family,
      weight,
      hits: matches.length,
      confidence: clamp01(0.54 + Math.min(0.34, matches.length * 0.11) + Math.min(0.08, rule.baseWeight * 0.03)),
    });
  }
  return detected;
}

function summarizeFamilies(effectDetails = []) {
  const families = {};
  for (const effect of effectDetails) {
    families[effect.family] = round2((families[effect.family] || 0) + effect.weight);
  }
  return families;
}

function applyEffectsToVector(vector, effects = []) {
  for (const effect of effects) addScores(vector, FAMILY_TO_AXES[effect.family], effect.weight / 2.1);
}

function applyTagsToVector(vector, tags = []) {
  for (const tag of unique(tags)) addScores(vector, TAG_HINTS[tag], 1);
}

function applyRolesToVector(vector, roles = []) {
  const normalizedRoles = (roles || []).map(normalize);
  for (const rule of ROLE_HINTS) {
    if (rule.patterns.some((pattern) => normalizedRoles.some((role) => role.includes(pattern)))) addScores(vector, rule.add, 1);
  }
}

function inferBaseStability(vector) {
  return (vector.survival * 0.28) + (vector.utility * 0.14) + (vector.control * 0.08) + (vector.pressure * 0.04) - (vector.execution_demand * 0.14) - (vector.burst * 0.06);
}

function finalizeVector(vector, effectFamilies = {}) {
  const supportNeedBase = (vector.burst * 0.21) + (vector.setup * 0.2) + (vector.execution_demand * 0.17) - (vector.utility * 0.18) - (vector.survival * 0.1);
  const frontNeedBase = (vector.burst * 0.14) + (vector.pressure * 0.09) + (vector.execution_demand * 0.09) - (vector.survival * 0.2) - (vector.control * 0.05);
  const autonomyBase = (vector.utility * 0.22) + (vector.survival * 0.2) + (vector.control * 0.08) - (supportNeedBase * 0.35) - (frontNeedBase * 0.2);
  const stabilityBase = inferBaseStability(vector);

  vector.support_dependency = clamp01(vector.support_dependency + supportNeedBase + 0.12 + ((effectFamilies.utility || 0) > 2 ? -0.04 : 0));
  vector.front_dependency = clamp01(vector.front_dependency + frontNeedBase + 0.11 + ((effectFamilies.frontline || 0) > 2 ? -0.06 : 0));
  vector.autonomy = clamp01(vector.autonomy + autonomyBase + 0.22);
  vector.stability = clamp01(vector.stability + stabilityBase + 0.2);

  for (const key of Object.keys(vector)) vector[key] = clamp01(vector[key]);
  return vector;
}

function topAxisEntries(vector, keys, min = 0.18, max = 3) {
  return keys
    .map((key) => [key, Number(vector?.[key] || 0)])
    .filter(([, value]) => value >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
}

function labelsFromEntries(entries) {
  return entries.map(([key]) => AXIS_LABELS[key] || key);
}

function buildDominantLabels(vector) {
  return labelsFromEntries(topAxisEntries(vector, ["pressure", "burst", "control", "utility", "survival", "mobility"], 0.24, 2));
}

function buildSecondaryLabels(vector) {
  return labelsFromEntries(topAxisEntries(vector, ["conversion", "setup", "stability", "autonomy"], 0.24, 2));
}


function buildFunctionLabels(vector, families = {}, effects = []) {
  const effectNames = unique((effects || []).map((entry) => entry.label));
  const out = [];
  if (vector.control >= 0.44 && (vector.setup >= 0.28 || effectNames.some((name) => ["Stun", "Gel", "Interruption"].includes(name)))) {
    out.push("ouvre / sécurise une fenêtre");
  }
  if (vector.conversion >= 0.46 && vector.burst >= 0.4) out.push("convertit vite une ouverture");
  if (vector.pressure >= 0.54 && vector.burst < 0.64) out.push("maintient une pression lisible sur la durée");
  if (vector.utility >= 0.46 && vector.survival >= 0.38) out.push("stabilise le plan de jeu de l’équipe");
  if (vector.setup >= 0.4 && vector.conversion < 0.52) out.push("prépare le terrain pour un autre perso");
  if (vector.survival >= 0.52 && vector.control < 0.38) out.push("protège le bon moment plutôt que de le créer");
  if ((vector.control >= 0.36 && vector.burst >= 0.44) || (vector.execution_demand >= 0.58 && vector.conversion >= 0.52)) {
    out.push("profite surtout des erreurs de timing");
  }
  if (!out.length && vector.survival >= 0.48 && vector.utility >= 0.34) out.push("protège la fiabilité du kit du cycle");
  if (!out.length && vector.pressure >= 0.48) out.push("tient l’espace sans rendre la compo trop fragile");
  if (!out.length && vector.burst >= 0.48) out.push("cherche surtout une conversion propre");
  return unique(out).slice(0, 4);
}

function buildDependencyLines(vector) {
  const lines = [];
  if (vector.support_dependency >= 0.68) lines.push("demande un support clair pour convertir son pic de valeur sans se désunir");
  else if (vector.support_dependency >= 0.5) lines.push("gagne nettement en confort avec un soutien simple ou une protection légère");

  if (vector.front_dependency >= 0.66) lines.push("préfère qu’un autre perso tienne le front avant son vrai tour de dégâts");
  else if (vector.front_dependency <= 0.22 && vector.survival >= 0.46) lines.push("peut absorber une partie du front si la compo ne lui demande pas tout le travail défensif");

  if (vector.execution_demand >= 0.66) lines.push("punit fortement les erreurs de timing, surtout quand la fenêtre utile est courte");
  else if (vector.execution_demand <= 0.26 && vector.stability >= 0.48) lines.push("reste lisible même quand le rythme du combat se dégrade un peu");

  if (vector.autonomy <= 0.28) lines.push("perd rapidement en valeur si l’équipe n’aligne pas le plan autour de lui");
  else if (vector.autonomy >= 0.66) lines.push("garde de la valeur même si la compo n’ouvre pas parfaitement son plan idéal");

  return unique(lines).slice(0, 4);
}

function buildStabilitySummary(vector) {
  if (vector.stability >= 0.74 && vector.execution_demand <= 0.4) return "perso assez simple à jouer, avec une bonne marge si le combat se dérègle";
  if (vector.stability >= 0.56) return "perso plutôt simple à jouer tant que le combat reste lisible";
  if (vector.stability >= 0.38) return "perso plus dépendant des bonnes conditions quand le combat casse le rythme";
  return "perso qui demande un bon timing et perd vite en valeur si son moment arrive trop tard";
}

function buildConversionSummary(vector) {
  if (vector.conversion >= 0.72 && vector.burst >= 0.5) return "convertit très bien une ouverture courte, mais aime qu’elle soit bien préparée";
  if (vector.conversion >= 0.54) return "valorise bien les fenêtres claires, sans dépendre uniquement d’un all-in";
  if (vector.pressure >= 0.6 && vector.burst < 0.5) return "gagne surtout par pression continue plus que par grosse conversion ponctuelle";
  if (vector.setup >= 0.42) return "prépare davantage la fenêtre qu’il ne la convertit lui-même";
  return "conversion encore floue avec les données actuelles";
}

function buildCompatibilityLines(vector, functions = []) {
  const lines = [];
  if (functions.includes("ouvre / sécurise une fenêtre")) lines.push("aime avoir derrière lui un perso capable de finir vite l’ouverture créée");
  if (functions.includes("convertit vite une ouverture")) lines.push("gagne beaucoup si l’équipe lui donne une fenêtre simple plutôt qu’un combat brouillon");
  if (functions.includes("maintient une pression lisible sur la durée")) lines.push("préfère les combats où la régularité vaut plus qu’un seul pic de burst");
  if (functions.includes("stabilise le plan de jeu de l’équipe")) lines.push("aide une équipe agressive à rester propre sur la durée");
  if (functions.includes("prépare le terrain pour un autre perso")) lines.push("combine mieux avec un carry qui exploite vite le setup déjà posé");
  if (functions.includes("tient l’espace sans rendre la compo trop fragile")) lines.push("permet à un autre perso plus fragile de rester concentré sur ses dégâts");
  if (vector.mobility >= 0.55) lines.push("reste plus confortable dans les fights qui forcent beaucoup de replacement");
  if (vector.support_dependency >= 0.6 && vector.survival < 0.42) lines.push("devient vite plus exigeant si personne ne couvre la protection ou le buff simple");
  return unique(lines).slice(0, 4);
}


function buildPlanRole(vector, functions = []) {
  const roles = [];
  if (functions.includes("ouvre / sécurise une fenêtre") || (vector.control >= 0.5 && vector.setup >= 0.34)) roles.push("aide à bien démarrer le combat");
  if (functions.includes("convertit vite une ouverture") || (vector.conversion >= 0.58 && vector.burst >= 0.48)) roles.push("finit bien une vraie fenêtre de dégâts");
  if (functions.includes("stabilise le plan de jeu de l’équipe") || functions.includes("protège la fiabilité du kit du cycle") || (vector.survival >= 0.5 && vector.utility >= 0.38)) roles.push("aide l'équipe à garder un combat propre");
  if (functions.includes("maintient une pression lisible sur la durée") || (vector.pressure >= 0.58 && vector.burst < 0.58)) roles.push("garde la pression");
  if (functions.includes("protège le bon moment plutôt que de le créer") || (vector.survival >= 0.58 && vector.utility >= 0.26 && vector.control < 0.4)) roles.push("protège le bon moment pour jouer");
  if (functions.includes("profite surtout des erreurs de timing") || (vector.burst >= 0.58 && vector.execution_demand >= 0.52)) roles.push("profite d'une erreur adverse");
  if (!roles.length && vector.setup >= 0.38) roles.push("prépare le terrain");
  return unique(roles).slice(0, 3);
}


function buildPlanLines(vector, functions = [], roles = []) {
  const lines = [];
  if (roles.includes("aide à bien démarrer le combat")) lines.push("**Début de combat** · cherche d’abord à installer un bon moment pour jouer plutôt que de vider tout son kit immédiatement.");
  if (roles.includes("finit bien une vraie fenêtre de dégâts")) lines.push("**Gros dégâts** · garde sa vraie valeur pour le moment où une vraie fenêtre s’ouvre.");
  if (roles.includes("aide l'équipe à garder un combat propre")) lines.push("**Stabilité** · aide l’équipe à remettre le combat dans le bon sens au lieu de forcer un deuxième gros tour brouillon.");
  if (roles.includes("protège le bon moment pour jouer")) lines.push("**Protection** · sécurise le bon moment pour qu’un autre perso joue sans perdre toute la marge défensive.");
  if (roles.includes("garde la pression")) lines.push("**Rythme** · gagne surtout en gardant une pression régulière au lieu de forcer un gros tour trop tôt.");
  if (roles.includes("profite d'une erreur adverse")) lines.push("**Erreur adverse** · devient surtout dangereux quand l’adversaire ou le boss laisse une vraie erreur.");
  if (!lines.length && vector.execution_demand >= 0.6) lines.push("**Rythme** · demande un combat propre et devient moins bon si on s’engage trop tôt.");
  if (!lines.length && vector.stability >= 0.56) lines.push("**Tempo** · garde de la valeur même si le combat s’allonge un peu.");
  if (vector.support_dependency >= 0.62) lines.push("**Attention** · devient plus simple à jouer si un autre perso apporte buff simple, contrôle ou protection.");
  else if (vector.front_dependency >= 0.62) lines.push("**Attention** · préfère qu’un front stable absorbe le début du combat avant son vrai tour de dégâts.");
  else if (vector.execution_demand >= 0.66) lines.push("**Attention** · perd vite sa valeur si la fenêtre est forcée trop tôt ou sans bien lire le rythme du combat.");
  return unique(lines).slice(0, 5);
}

function buildPlanRiskLines(vector, functions = [], roles = []) {
  const lines = [];
  if (roles.includes("finit bien une vraie fenêtre de dégâts") && vector.setup >= 0.42) lines.push("perd beaucoup de valeur si la fenêtre arrive mal ou trop tôt");
  if (roles.includes("garde la pression") && vector.pressure >= 0.6 && vector.burst < 0.45) lines.push("souffre si le combat ne laisse jamais installer une pression propre");
  if (roles.includes("aide l'équipe à garder un combat propre") && vector.utility >= 0.42 && vector.autonomy < 0.48) lines.push("aide moins si personne ne profite ensuite de l'espace gagné");
  if (roles.includes("protège le bon moment pour jouer")) lines.push("semble moins rentable si l’équipe n’a personne pour profiter de la fenêtre sécurisée");
  if (roles.includes("profite d'une erreur adverse")) lines.push("devient beaucoup moins naturel si le combat ne donne pas de vraie erreur à exploiter");
  if (vector.support_dependency >= 0.62) lines.push("perd vite en lisibilité sans buff simple, protection ou contrôle autour de lui");
  if (vector.front_dependency >= 0.62) lines.push("se casse plus facilement si le front tombe avant sa vraie phase de valeur");
  if (vector.execution_demand >= 0.7) lines.push("tolère mal un combat brouillon ou un engagement trop rapide");
  return unique(lines).slice(0, 3);
}

function buildSynergyLines(vector, functions = [], roles = []) {
  const lines = [];
  if (roles.includes("aide à bien démarrer le combat")) lines.push("se complète bien avec un perso qui finit vite une fenêtre déjà créée");
  if (roles.includes("finit bien une vraie fenêtre de dégâts")) lines.push("aime être accompagné par un perso qui ouvre ou sécurise d’abord le combat");
  if (roles.includes("aide l'équipe à garder un combat propre") || roles.includes("protège le bon moment pour jouer")) lines.push("aide bien une équipe agressive qui manque de tenue ou de soutien simple");
  if (roles.includes("garde la pression")) lines.push("complète mieux un plan qui veut user le combat avant le vrai tour de dégâts");
  if (roles.includes("profite d'une erreur adverse")) lines.push("fonctionne mieux avec des alliés qui forcent des erreurs de placement ou de timing");
  if (vector.control >= 0.46 && vector.conversion < 0.48) lines.push("apporte surtout l’ouverture et gagne si un autre perso termine les dégâts");
  if (vector.utility >= 0.44 && vector.survival >= 0.4) lines.push("donne de la marge à des profils plus fragiles ou plus exigeants en exécution");
  if (vector.autonomy >= 0.62 && vector.pressure >= 0.48) lines.push("se glisse assez naturellement dans des teams déjà structurées sans demander tout le plan autour de lui");
  return unique(lines).slice(0, 4);
}

function buildCompositionReading(vector, functions = [], roles = []) {
  const brings = [];
  const covers = [];
  const missing = [];
  const naturalWith = [];
  const bossComfort = [];
  const bossRisk = [];

  if (roles.includes("aide à bien démarrer le combat")) {
    brings.push("apporte surtout une bonne ouverture ou remet le combat dans le bon sens");
    naturalWith.push("devient plus naturel avec un perso qui finit vite la fenêtre déjà créée");
  }
  if (roles.includes("finit bien une vraie fenêtre de dégâts")) {
    brings.push("apporte surtout une conversion nette quand la fenêtre est enfin propre");
    naturalWith.push("devient plus naturel avec un profil qui ouvre ou protège d’abord la fenêtre");
  }
  if (roles.includes("aide l'équipe à garder un combat propre") || roles.includes("protège le bon moment pour jouer")) {
    brings.push("apporte surtout de la tenue et un soutien simple au plan de jeu");
    covers.push("couvre bien une compo agressive qui manque de tenue ou de marge défensive");
    naturalWith.push("devient plus naturel dans une compo exigeante qui a déjà ses dégâts mais manque de fiabilité du kit");
  }
  if (roles.includes("garde la pression")) {
    brings.push("apporte surtout une pression régulière qui garde le combat lisible");
    covers.push("couvre le manque de pression longue quand l’équipe ne vit que sur un seul all-in");
    naturalWith.push("complète mieux un plan qui use le combat avant la vraie conversion");
  }
  if (roles.includes("profite d'une erreur adverse")) {
    brings.push("apporte surtout une grosse réponse quand une erreur de placement ou de timing apparaît");
    naturalWith.push("fonctionne mieux avec des alliés qui forcent des fautes ou raccourcissent la fenêtre utile");
  }

  if (vector.control >= 0.46 && vector.conversion < 0.48) missing.push("laisse encore manquer un vrai convertisseur derrière l’ouverture créée");
  if (vector.conversion >= 0.54 && vector.support_dependency >= 0.56) missing.push("laisse souvent manquer un soutien simple pour rendre la conversion plus propre");
  if (vector.pressure >= 0.56 && vector.survival < 0.4) missing.push("laisse encore manquer un peu de tenue si le combat devient sale ou trop long");
  if (vector.utility >= 0.44 && vector.burst < 0.34 && vector.conversion < 0.44) missing.push("laisse souvent manquer un finisseur clair pour vraiment fermer la fenêtre");
  if (vector.survival >= 0.46 && vector.utility >= 0.4) covers.push("couvre une partie du manque de tenue quand la compo est trop fragile");
  if (vector.control >= 0.46) covers.push("couvre le manque d’ouverture ou d’interruption simple dans les combats brouillons");
  if (vector.conversion >= 0.54 && vector.burst >= 0.46) covers.push("couvre le manque de vraie conversion quand l’équipe crée déjà des fenêtres");
  if (vector.autonomy >= 0.62 && vector.pressure >= 0.48) covers.push("se glisse assez naturellement dans une compo déjà structurée sans exiger tout le plan autour de lui");

  if (vector.control >= 0.44 && vector.mobility >= 0.36) bossComfort.push("plus naturel contre les boss qui demandent de recoller vite au rythme du combat sans rester statique");
  if (vector.conversion >= 0.56 && vector.burst >= 0.44) bossComfort.push("plus naturel contre les boss à vraie fenêtre courte et punition nette");
  if (vector.pressure >= 0.58 && vector.stability >= 0.48) bossComfort.push("plus naturel contre les combats d'usure ou les combats plus longs");
  if (vector.survival >= 0.52 && vector.utility >= 0.38) bossComfort.push("plus naturel quand le fight demande de tenir une phase avant la vraie conversion");

  if (vector.mobility < 0.24 && vector.control < 0.34) bossRisk.push("plus fragile contre les boss très mobiles ou à replacement forcé");
  if (vector.setup >= 0.42 && vector.autonomy < 0.42) bossRisk.push("plus fragile quand le boss casse sans cesse le rythme du combat avant la vraie fenêtre");
  if (vector.front_dependency >= 0.6 && vector.survival < 0.42) bossRisk.push("plus fragile si le front tombe tôt ou si le boss punit vite l’avant-ligne");
  if (vector.execution_demand >= 0.66 && vector.conversion >= 0.48) bossRisk.push("plus fragile dans les fights qui punissent très fort le mauvais timing de commit");

  return {
    brings: unique(brings).slice(0, 3),
    covers: unique(covers).slice(0, 3),
    missing: unique(missing).slice(0, 3),
    naturalWith: unique(naturalWith).slice(0, 3),
    bossComfort: unique(bossComfort).slice(0, 3),
    bossRisk: unique(bossRisk).slice(0, 3),
  };
}

function buildCoverage(char = {}) {
  const pieces = [];
  if ((char.weapons || []).some((weapon) => (weapon.skills || []).length >= 3)) pieces.push("kit arme relativement détaillé");
  if ((char.weapons || []).some((weapon) => (weapon.potentials || []).length >= 3)) pieces.push("potentiels assez lisibles");
  if ((char.costumes || []).length) pieces.push("costumes déjà consolidés");
  return pieces;
}

function computeCharacterTheory(char = {}, gameplayProfile = null) {
  const profile = gameplayProfile || { tags: [], orientations: [] };
  const text = collectCharacterText(char);
  const effectDetails = detectEffectsDetailed(text);
  const families = summarizeFamilies(effectDetails);
  const vector = buildBaseVector();
  applyEffectsToVector(vector, effectDetails);
  applyTagsToVector(vector, profile.tags || []);
  applyRolesToVector(vector, char.roles || []);
  finalizeVector(vector, families);

  const functions = buildFunctionLabels(vector, families, effectDetails);
  const planRole = buildPlanRole(vector, functions);
  const composition = buildCompositionReading(vector, functions, planRole);
  return {
    effects: unique(effectDetails.map((entry) => entry.label)).slice(0, 8),
    effectDetails,
    families,
    vector,
    dominant: buildDominantLabels(vector),
    secondary: buildSecondaryLabels(vector),
    functions,
    planRole,
    planLines: buildPlanLines(vector, functions, planRole),
    planRisks: buildPlanRiskLines(vector, functions, planRole),
    synergies: buildSynergyLines(vector, functions, planRole),
    composition,
    dependencies: buildDependencyLines(vector),
    stability: buildStabilitySummary(vector),
    conversion: buildConversionSummary(vector),
    needs: buildCompatibilityLines(vector, functions),
    gives: functions.map((label) => label.charAt(0).toUpperCase() + label.slice(1)),
    coverage: buildCoverage(char),
  };
}

function computeWeaponTheory(weapon = {}, fallbackProfile = null) {
  const text = collectWeaponText(weapon);
  const effectDetails = detectEffectsDetailed(text);
  const families = summarizeFamilies(effectDetails);
  const vector = buildBaseVector();
  const tags = unique((fallbackProfile?.tags || []).concat((effectDetails || []).map((entry) => entry.label)));
  applyEffectsToVector(vector, effectDetails);
  applyTagsToVector(vector, tags);
  finalizeVector(vector, families);

  const functions = buildFunctionLabels(vector, families, effectDetails);
  const planRole = buildPlanRole(vector, functions);
  const composition = buildCompositionReading(vector, functions, planRole);
  return {
    effects: unique(effectDetails.map((entry) => entry.label)).slice(0, 6),
    effectDetails,
    families,
    vector,
    dominant: buildDominantLabels(vector).slice(0, 2),
    secondary: buildSecondaryLabels(vector).slice(0, 2),
    functions,
    planRole,
    planLines: buildPlanLines(vector, functions, planRole),
    planRisks: buildPlanRiskLines(vector, functions, planRole),
    synergies: buildSynergyLines(vector, functions, planRole),
    composition,
    stability: buildStabilitySummary(vector),
    conversion: buildConversionSummary(vector),
    dependencies: buildDependencyLines(vector),
  };
}

function subtractVectors(base = {}, target = {}) {
  const out = {};
  for (const key of Object.keys(base)) out[key] = round2((target[key] || 0) - (base[key] || 0));
  return out;
}

function buildWeaponDeltaSummary(delta = {}) {
  const positive = [];
  const negative = [];
  for (const [key, value] of Object.entries(delta)) {
    if (Math.abs(value) < 0.08) continue;
    const label = AXIS_LABELS[key] || key;
    if (value > 0) positive.push(label);
    else negative.push(label);
  }
  return {
    positive: positive.slice(0, 3),
    negative: negative.slice(0, 2),
  };
}

function buildWeaponCompatibilityLines(deltaSummary, weaponTheory, baseTheory) {
  const lines = [];
  const positive = (deltaSummary?.positive || []).map(normalize);
  const negative = (deltaSummary?.negative || []).map(normalize);
  if (positive.some((label) => label.includes("burst") || label.includes("conversion"))) lines.push("accentue une lecture plus explosive, meilleure quand la fenêtre de DPS est propre");
  if (positive.some((label) => label.includes("pression"))) lines.push("rend le perso plus confortable pour user le combat sans dépendre d’un seul gros tour");
  if (positive.some((label) => label.includes("controle") || label.includes("ouverture"))) lines.push("apporte plus de valeur pour ouvrir ou recoller au rythme du boss");
  if (positive.some((label) => label.includes("survie") || label.includes("stabilite"))) lines.push("fait moins perdre de marge défensive et pardonne mieux les erreurs pendant le combat");
  if (positive.some((label) => label.includes("utilite") || label.includes("support"))) lines.push("gagne en intérêt quand l’équipe a déjà des dégâts mais manque de soutien simple");
  if (negative.some((label) => label.includes("stabilite") || label.includes("survie"))) lines.push("devient plus exigeante si personne ne sécurise le front ou le rythme du combat");
  if (negative.some((label) => label.includes("autonomie"))) lines.push("perd un peu de confort hors plan idéal et demande une compo plus propre");
  if (!lines.length && weaponTheory.dependencies.length) lines.push(weaponTheory.dependencies[0]);
  if (!lines.length && baseTheory?.needs?.length) lines.push(baseTheory.needs[0]);
  return unique(lines).slice(0, 3);
}

const BOSS_RULES = [
  { axis: "needs_burst", weight: 0.22, patterns: ["burst", "ouverture", "noyau", "core", "shield break", "fenetre"] },
  { axis: "needs_pressure", weight: 0.2, patterns: ["pression", "usure", "constance", "regularite", "duree", "drain"] },
  { axis: "needs_control", weight: 0.22, patterns: ["interrupt", "interruption", "stun", "controle", "couper", "ouvrir"] },
  { axis: "needs_survival", weight: 0.18, patterns: ["survie", "sustain", "tenir", "punitive", "encaisser"] },
  { axis: "needs_mobility", weight: 0.22, patterns: ["placement", "angles", "distance", "mobile", "esquive", "replacement"] },
  { axis: "needs_mechanical_reading", weight: 0.24, patterns: ["lecture", "phase", "objectif", "mecanique", "rituel", "noyau", "volante", "transition"] },
  { axis: "punishes_static", weight: 0.22, patterns: ["statique", "laser", "groupee", "pack", "distance fixe"] },
  { axis: "punishes_bad_timing", weight: 0.22, patterns: ["timing", "cooldowns", "bursts", "ouverture ratee", "mauvais cycle"] },
  { axis: "punishes_bad_positioning", weight: 0.24, patterns: ["placement", "angle", "zone", "melee", "mêlée", "distance"] },
  { axis: "team_coordination_demand", weight: 0.16, patterns: ["coordination", "equipe", "joueurs", "multijoueur"] },
];

function detectBossDemandVector(reading = {}) {
  const vector = {
    needs_burst: 0,
    needs_pressure: 0,
    needs_control: 0,
    needs_survival: 0,
    needs_mobility: 0,
    needs_mechanical_reading: 0,
    punishes_static: 0,
    punishes_bad_timing: 0,
    punishes_bad_positioning: 0,
    team_coordination_demand: 0,
  };
  const lines = [...(reading.demands || []), ...(reading.pressures || []), ...(reading.warnings || [])].map(normalize).filter(Boolean);
  for (const line of lines) {
    for (const rule of BOSS_RULES) {
      const hits = rule.patterns.filter((pattern) => line.includes(pattern)).length;
      if (!hits) continue;
      vector[rule.axis] += rule.weight * Math.min(1.35, 1 + (hits - 1) * 0.15);
    }
  }
  for (const key of Object.keys(vector)) vector[key] = clamp01(vector[key]);
  return vector;
}

function buildBossDemandLabels(vector = {}) {
  const map = {
    needs_burst: "fenêtre de burst lisible",
    needs_pressure: "pression continue propre",
    needs_control: "contrôle / interruption fiable",
    needs_survival: "survie régulière",
    needs_mobility: "mobilité / replacement",
    needs_mechanical_reading: "lecture mécanique du combat",
  };
  return Object.entries(map)
    .filter(([key]) => (vector[key] || 0) >= 0.32)
    .sort((a, b) => (vector[b[0]] || 0) - (vector[a[0]] || 0))
    .slice(0, 4)
    .map(([, label]) => label);
}

function buildBossPunishmentLabels(vector = {}) {
  const map = {
    punishes_static: "punit les plans trop statiques",
    punishes_bad_timing: "punit les bursts ou cooldowns mal lancés",
    punishes_bad_positioning: "punit le mauvais placement plus que la simple lenteur",
    team_coordination_demand: "récompense la coordination plus qu’un plan solo brut",
  };
  return Object.entries(map)
    .filter(([key]) => (vector[key] || 0) >= 0.32)
    .sort((a, b) => (vector[b[0]] || 0) - (vector[a[0]] || 0))
    .slice(0, 4)
    .map(([, label]) => label);
}

function buildBossPace(vector = {}) {
  if ((vector.needs_mechanical_reading || 0) >= 0.72 && (vector.punishes_bad_positioning || 0) >= 0.48) return "combat à lecture mécanique forte, où l’erreur de placement coûte vite";
  if ((vector.needs_burst || 0) >= 0.6 && (vector.punishes_bad_timing || 0) >= 0.4) return "combat à fenêtres brèves, rentable surtout si le timing reste propre";
  if ((vector.needs_pressure || 0) >= 0.58 && (vector.needs_survival || 0) >= 0.34) return "combat d’usure, qui récompense la tenue et la pression régulière";
  if ((vector.needs_control || 0) >= 0.5) return "combat qui devient plus simple si l’équipe sait recoller au rythme du combat";
  return "rythme encore partiellement flou avec les données actuelles";
}

function buildBossUsefulProfiles(vector = {}) {
  const lines = [];
  if ((vector.needs_control || 0) >= 0.32) lines.push("persos qui ouvrent ou recalent proprement une fenêtre sans casser le combat");
  if ((vector.needs_burst || 0) >= 0.32) lines.push("persos qui finissent vite une ouverture claire plutôt que de s’étaler");
  if ((vector.needs_pressure || 0) >= 0.32) lines.push("persos capables de tenir une pression régulière sans se vider trop tôt");
  if ((vector.needs_survival || 0) >= 0.32) lines.push("persos qui ajoutent de la tenue sans étouffer complètement le plan offensif");
  if ((vector.needs_mobility || 0) >= 0.32) lines.push("persos qui gardent de la valeur malgré le replacement ou les angles imposés");
  return unique(lines).slice(0, 4);
}

function buildBossFragileProfiles(vector = {}) {
  const lines = [];
  if ((vector.punishes_static || 0) >= 0.32) lines.push("backline trop statique ou plan trop ancré dans une seule position");
  if ((vector.punishes_bad_timing || 0) >= 0.32) lines.push("perso qui vide tout hors fenêtre puis subit le reste du combat");
  if ((vector.punishes_bad_positioning || 0) >= 0.32) lines.push("perso fragile qui dépend d’un placement parfait sans vraie marge défensive");
  if ((vector.team_coordination_demand || 0) >= 0.32) lines.push("plan mono-rotation sans adaptation quand la phase force à changer de rythme");
  return unique(lines).slice(0, 4);
}

function buildBossBreakers(vector = {}) {
  const lines = [];
  if ((vector.punishes_bad_timing || 0) >= 0.46) lines.push("forcer le gros tour avant la vraie fenêtre coûte plus que retarder légèrement les dégâts");
  if ((vector.punishes_bad_positioning || 0) >= 0.5) lines.push("un mauvais placement casse le plan plus vite qu’un simple manque de dégâts");
  if ((vector.punishes_static || 0) >= 0.42) lines.push("rester trop statique transforme vite un bon profil en cible facile ou en plan mort");
  if ((vector.needs_control || 0) >= 0.44 && (vector.needs_burst || 0) >= 0.34) lines.push("sans ouverture propre, même un bon convertisseur perd beaucoup de valeur ici");
  return unique(lines).slice(0, 3);
}

function buildBossStabilizers(vector = {}) {
  const lines = [];
  if ((vector.needs_control || 0) >= 0.4) lines.push("un contrôle simple ou une interruption propre recollent vite au rythme du fight");
  if ((vector.needs_survival || 0) >= 0.38) lines.push("une marge défensive conservée pour la phase suivante sauve souvent le combat");
  if ((vector.needs_pressure || 0) >= 0.46) lines.push("une pression régulière garde plus de valeur qu’un burst jeté hors timing");
  if ((vector.needs_mobility || 0) >= 0.4) lines.push("un repositionnement propre sauve souvent plus de DPS qu’un trade forcé");
  return unique(lines).slice(0, 3);
}

function buildBossGamePlan(vector = {}) {
  const lines = [];
  if ((vector.needs_mechanical_reading || 0) >= 0.56) lines.push("**Entrée de combat** · lis d’abord la phase et les angles avant de chercher une vraie conversion.");
  if ((vector.needs_control || 0) >= 0.46) lines.push("**Début de combat** · recolle au rythme avec un contrôle simple plutôt que de forcer un gros tour à l’aveugle.");
  if ((vector.needs_burst || 0) >= 0.5) lines.push("**Gros dégâts** · garde les gros engagements pour la fenêtre claire au lieu de les étaler sur tout le combat.");
  if ((vector.needs_pressure || 0) >= 0.5) lines.push("**Tempo** · préfère une pression régulière et propre à une explosion unique mal timée.");
  if ((vector.needs_survival || 0) >= 0.42) lines.push("**Stabilisation** · garde de la marge défensive pour tenir la phase suivante sans casser tout le plan.");
  if ((vector.punishes_bad_positioning || 0) >= 0.52) lines.push("**Attention** · le placement raté coûte souvent plus cher que le manque brut de dégâts.");
  else if ((vector.punishes_bad_timing || 0) >= 0.5) lines.push("**Attention** · le mauvais timing te fait surtout perdre la bonne fenêtre, pas seulement du DPS brut.");
  return unique(lines).slice(0, 5);
}

function buildBossPrepSecure(vector = {}) {
  const lines = [];
  if ((vector.needs_mechanical_reading || 0) >= 0.5) lines.push("bien comprendre la phase ou l’objectif avant de brûler le gros tour");
  if ((vector.needs_control || 0) >= 0.42) lines.push("sécuriser une interruption simple ou remettre le combat dans le bon sens avant un gros engagement");
  if ((vector.needs_mobility || 0) >= 0.42) lines.push("sécuriser les angles et le replacement avant de jouer la vraie conversion");
  if ((vector.needs_survival || 0) >= 0.38) lines.push("sécuriser une marge défensive pour ne pas casser le combat sur la phase suivante");
  return unique(lines).slice(0, 3);
}

function buildBossPrepPreserve(vector = {}) {
  const lines = [];
  if ((vector.needs_burst || 0) >= 0.46) lines.push("conserver les commits lourds pour la vraie fenêtre au lieu de les étaler trop tôt");
  if ((vector.needs_control || 0) >= 0.42) lines.push("conserver un contrôle simple ou une option de recalage pour la phase qui déraille");
  if ((vector.needs_survival || 0) >= 0.4) lines.push("conserver un peu de tenue pour sauver la transition suivante au lieu de tout investir d’un coup");
  if ((vector.needs_pressure || 0) >= 0.46) lines.push("conserver un rythme propre plutôt qu’un all-in qui retombe à zéro après la première phase");
  return unique(lines).slice(0, 3);
}

function buildBossDangerousPlans(vector = {}) {
  const lines = [];
  if ((vector.punishes_static || 0) >= 0.4) lines.push("plan trop statique ou trop collé à une seule position");
  if ((vector.punishes_bad_timing || 0) >= 0.42) lines.push("all-in précoce ou commit lourd hors vraie fenêtre");
  if ((vector.punishes_bad_positioning || 0) >= 0.48) lines.push("plan qui accepte trop de greed sur le placement ou les angles");
  if ((vector.team_coordination_demand || 0) >= 0.34) lines.push("plan solo qui suppose qu’un seul joueur recolle tout le combat");
  return unique(lines).slice(0, 3);
}

function buildBossTeamShape(vector = {}) {
  const lines = [];
  if ((vector.needs_control || 0) >= 0.42 && (vector.needs_burst || 0) >= 0.42) lines.push("ouvre proprement puis convertit vite la vraie fenêtre");
  if ((vector.needs_pressure || 0) >= 0.44 && (vector.needs_survival || 0) >= 0.36) lines.push("tient une pression régulière sans casser la tenue du combat");
  if ((vector.needs_mobility || 0) >= 0.44) lines.push("garde de la valeur malgré les déplacements forcés ou les angles cassés");
  if ((vector.needs_mechanical_reading || 0) >= 0.5) lines.push("adapte le plan à la phase active plutôt que d’exécuter une rotation figée");
  return unique(lines).slice(0, 3);
}

export function getTheoryProfile(char = {}, gameplayProfile = null) {
  return computeCharacterTheory(char, gameplayProfile);
}

export function getWeaponCompatibility(weaponAnalysis = {}, char = {}, weapon = null) {
  const currentWeapon = weapon || weaponAnalysis?.weapon || {};
  const baseTheory = computeCharacterTheory(char, weaponAnalysis?.profile || null);
  const weaponTheory = computeWeaponTheory(currentWeapon, weaponAnalysis?.profile || weaponAnalysis);
  const delta = subtractVectors(baseTheory.vector, weaponTheory.vector);
  const deltaSummary = buildWeaponDeltaSummary(delta);
  return {
    lines: buildWeaponCompatibilityLines(deltaSummary, weaponTheory, baseTheory),
    deltaSummary,
    stability: weaponTheory.stability,
    conversion: weaponTheory.conversion,
    dominant: weaponTheory.dominant,
    functions: weaponTheory.functions,
    planRole: weaponTheory.planRole,
    planLines: weaponTheory.planLines,
    planRisks: weaponTheory.planRisks,
    synergies: weaponTheory.synergies,
    composition: weaponTheory.composition,
    effects: weaponTheory.effects,
  };
}

export function getBossTheoryReading(bossReading = {}) {
  const vector = detectBossDemandVector(bossReading);
  return {
    vector,
    demand: buildBossDemandLabels(vector),
    punishments: buildBossPunishmentLabels(vector),
    pace: buildBossPace(vector),
    usefulProfiles: buildBossUsefulProfiles(vector),
    avoid: buildBossFragileProfiles(vector),
    breakers: buildBossBreakers(vector),
    stabilizers: buildBossStabilizers(vector),
    gamePlan: buildBossGamePlan(vector),
    secureFirst: buildBossPrepSecure(vector),
    preserveForWindow: buildBossPrepPreserve(vector),
    dangerousPlans: buildBossDangerousPlans(vector),
    teamShape: buildBossTeamShape(vector),
  };
}
