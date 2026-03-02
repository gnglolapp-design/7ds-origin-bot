import { COMPONENT_IDS } from "../constants.js";
import { getCharacterIndex, getCharacter } from "../lib/kv.js";
import { analyzeCharacterProfile, analyzeWeaponIdentity } from "../lib/gameplay.js";
import { getTheoryProfile, getWeaponCompatibility } from "../lib/theorycraft.js";
import { readPublishedIndex } from "../assistant/evidence-reader.js";
import { buildPersoEvidence, buildPersoRecommendationLines, buildPersoWeaponContrastLines, buildPersoWeaponRouting } from "../assistant/recommenders/perso.js";
import { assistantDigestLines, badgeLineFromRefs, decisionFieldLines, familyInsightLines, overlayFieldLines, weaponEvidenceLines } from "../assistant/presenters/evidence.js";
import { actionRow, stringSelect, persoTabs, persoWeaponRow, persoCostumeRow } from "../lib/components.js";
import { cid } from "../lib/ids.js";
import { characterOverviewEmbeds, characterGameplayEmbeds, characterProgressionEmbeds, characterStatsEmbeds, characterSkillsEmbeds, characterPotentialsEmbeds, characterCostumesEmbeds } from "../lib/embeds.js";
import { msg, update } from "../discord/responses.js";

function short(text, max = 220) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function addPersoDecisionAdvice(embed, char, decision) {
  if (!embed || !char || (!decision?.confirmed?.length && !decision?.caution?.length && !decision?.refs?.length)) return embed;
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  const lines = decisionFieldLines(decision);
  const badgeLine = badgeLineFromRefs(decision?.refs || []);
  if (badgeLine) lines.unshift(badgeLine);
  fields.push({
    name: "🧪 Ce que les tests disent",
    value: short(lines.join("\n"), 760) || "Non disponible pour l’instant",
    inline: false,
  });
  embed.fields = fields.slice(0, 25);
  return embed;
}



function addPersoAssistantField(embed, refs = [], subject = 'ce perso') {
  if (!embed || !refs?.length) return embed;
  const lines = [
    ...familyInsightLines(refs, { limit: 3, subject }),
    ...assistantDigestLines(refs, { cardLimit: 2, contextLimit: 2, refsLimit: 3 }),
  ];
  if (!lines.length) return embed;
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  fields.push({
    name: "🧠 Lecture assistant",
    value: short(lines.join("\n"), 760) || "Non disponible pour l’instant",
    inline: false,
  });
  embed.fields = fields.slice(0, 25);
  return embed;
}

function addPersoRecommendationField(embed, char, profile, theory, published = []) {
  if (!embed || !char) return embed;
  const lines = buildPersoRecommendationLines(char, profile, theory, published);
  if (!lines.length) return embed;
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  fields.push({
    name: "✅ Priorités",
    value: short(lines.join("\n"), 760) || "Non disponible pour l’instant",
    inline: false,
  });
  embed.fields = fields.slice(0, 25);
  return embed;
}


function addPersoWeaponAssistantField(embed, char, published = []) {
  if (!embed || !char) return embed;
  const routing = buildPersoWeaponRouting(char, published);
  if (!routing?.leads?.length) return embed;
  const lines = [
    ...weaponEvidenceLines(routing.leads, { maxEntries: 3, includePressure: true }),
    ...buildPersoWeaponContrastLines(char, published),
  ];
  if (!lines.length) return embed;
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  fields.push({
    name: "🗡️ Lecture arme / kit",
    value: short(lines.join("\n"), 760) || "Non disponible pour l’instant",
    inline: false,
  });
  embed.fields = fields.slice(0, 25);
  return embed;
}


function addPersoDataAdvice(embed, char, overlay) {
  if (!embed || !char || (!overlay?.support?.length && !overlay?.caution?.length && !overlay?.refs?.length)) return embed;
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  const parts = overlayFieldLines(overlay);
  const badgeLine = badgeLineFromRefs(overlay?.refs || []);
  if (badgeLine) parts.unshift(badgeLine);
  fields.push({
    name: "📊 Appui des tests",
    value: short(parts.join("\n"), 760) || "Non disponible pour l’instant",
    inline: false,
  });
  embed.fields = fields.slice(0, 25);
  return embed;
}

function persoSubviewRow({ slug, tab, current = "0", count = 1 }) {
  if (!["overview", "gameplay"].includes(tab) || count <= 1) return null;
  const options = Array.from({ length: count }, (_, idx) => ({
    label: idx === 0 ? "Vue principale" : "Repères",
    value: String(idx),
    default: String(idx) === String(current),
    emoji: idx === 0 ? "📘" : "🧠",
  }));
  return actionRow([
    stringSelect({
      custom_id: cid("perso:subview", { slug, tab }),
      placeholder: "Choisir une vue",
      options,
    }),
  ]);
}

function persoSelectRow(index, selectedSlug = null) {
  const options = index.slice(0, 25).map((c) => ({ label: c.name, value: c.slug, default: c.slug === selectedSlug }));
  return actionRow([stringSelect({ custom_id: cid(COMPONENT_IDS.PERSO_SELECT, {}), placeholder: "Choisir un personnage", options })]);
}

function safeCostumes(char) {
  return Array.isArray(char?.costumes) ? char.costumes.filter((entry) => entry && typeof entry === "object") : [];
}

function firstWeaponWith(char, key) {
  const weapons = char?.weapons || [];
  return weapons.find((w) => (w[key] || []).length)?.name || weapons[0]?.name || null;
}

function pageCountForWeapon() {
  return 1;
}

function normalizeState(char, tab, state = {}) {
  const next = { ...state };
  next.subview = Number.isFinite(Number(next.subview)) ? Number(next.subview) : 0;
  if (tab === "skills") {
    const names = (char?.weapons || []).map((w) => w.name);
    if (!names.includes(next.weapon)) next.weapon = firstWeaponWith(char, "skills");
    const maxPage = pageCountForWeapon(char, next.weapon, "skills") - 1;
    const page = Number.isFinite(Number(next.page)) ? Number(next.page) : 0;
    next.page = Math.max(0, Math.min(maxPage, page));
  }
  if (tab === "potentiels") {
    const names = (char?.weapons || []).map((w) => w.name);
    if (!names.includes(next.weapon)) next.weapon = firstWeaponWith(char, "potentials");
    const maxPage = pageCountForWeapon(char, next.weapon, "potentiels") - 1;
    const page = Number.isFinite(Number(next.page)) ? Number(next.page) : 0;
    next.page = Math.max(0, Math.min(maxPage, page));
  }
  if (tab === "costumes") {
    const max = Math.max(0, safeCostumes(char).length - 1);
    const idx = Number.isFinite(Number(next.costumeIndex)) ? Number(next.costumeIndex) : 0;
    next.costumeIndex = Math.max(0, Math.min(max, idx));
  }
  return next;
}


function render(char, tab, state = {}, published = []) {
  if (!char) return { embeds: [{ title: "Personnage introuvable", description: "Donnée KV absente.", color: 0xED4245 }], state };
  const normalized = normalizeState(char, tab, state);
  let embeds;
  switch (tab) {
    case "gameplay": embeds = characterGameplayEmbeds(char); break;
    case "progression": embeds = characterProgressionEmbeds(char); break;
    case "stats": embeds = characterStatsEmbeds(char); break;
    case "skills": embeds = characterSkillsEmbeds(char, normalized.weapon, normalized.page); break;
    case "potentiels": embeds = characterPotentialsEmbeds(char, normalized.weapon, normalized.page); break;
    case "costumes": embeds = characterCostumesEmbeds({ ...char, costumes: safeCostumes(char) }, normalized.costumeIndex); break;
    default: embeds = characterOverviewEmbeds(char); break;
  }
  const viewIndex = Math.max(0, Math.min((embeds?.length || 1) - 1, Number(normalized.subview || 0) || 0));
  normalized.subview = viewIndex;
  const chosen = embeds[viewIndex];
  const profile = analyzeCharacterProfile(char);
  const theory = getTheoryProfile(char, profile);
  const evidence = buildPersoEvidence(char, profile, theory, published);
  const scopedPublished = evidence.refs;
  const decision = evidence.decision;
  const overlay = evidence.overlay;

  const compactAdviceTab = tab === "overview" || tab === "gameplay";
  const isPrimaryView = viewIndex === 0;

  if (compactAdviceTab) {
    addPersoRecommendationField(chosen, char, profile, theory, published);
    if (isPrimaryView) {
      addPersoWeaponAssistantField(chosen, char, published);
      addPersoDataAdvice(chosen, char, overlay);
      addPersoAssistantField(chosen, scopedPublished, `**${char?.name || 'ce perso'}**`);
    } else {
      addPersoDecisionAdvice(chosen, char, decision);
      addPersoAssistantField(chosen, decision?.refs || scopedPublished, `**${char?.name || 'ce perso'}**`);
    }
  }
  return { embeds: [chosen], state: normalized, viewCount: embeds?.length || 1 };
}

function buildComponents(index, char, tab, state, viewCount = 1) {
  const rows = [persoSelectRow(index, char.slug), ...persoTabs({ slug: char.slug, tab })];
  const subview = persoSubviewRow({ slug: char.slug, tab, current: state.subview, count: viewCount });
  if (subview) rows.push(subview);
  if (tab === "skills" && (char.weapons || []).length) rows.push(persoWeaponRow({ slug: char.slug, weapon: state.weapon, mode: "skills", weapons: char.weapons }));
  if (tab === "potentiels" && (char.weapons || []).length) rows.push(persoWeaponRow({ slug: char.slug, weapon: state.weapon, mode: "potentiels", weapons: char.weapons }));
  if (tab === "costumes" && safeCostumes(char).length) rows.push(persoCostumeRow({ slug: char.slug, index: state.costumeIndex, costumes: safeCostumes(char) }));
  return rows;
}

export async function handlePersoCommand(env) {
  const published = await readPublishedIndex(env.GAME_DATA);
  const index = await getCharacterIndex(env.GAME_DATA);
  if (!index.length) return msg("Index personnages vide. Lance le sync KV.", { flags: 64 });
  const first = index[0];
  const char = await getCharacter(env.GAME_DATA, first.slug);
  const tab = "overview";
  const payload = render(char, tab, {}, published);
  payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
  return msg("", payload);
}

export async function handlePersoComponent(env, interaction, base, params) {
  const published = await readPublishedIndex(env.GAME_DATA);
  const index = await getCharacterIndex(env.GAME_DATA);
  if (!index.length) return update({ content: "Index personnages vide.", flags: 64 });

  if (base === COMPONENT_IDS.PERSO_SELECT) {
    const slug = interaction.data.values?.[0];
    const char = await getCharacter(env.GAME_DATA, slug);
    const tab = "overview";
    const payload = render(char, tab, {}, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_TAB) {
    const slug = params.slug;
    const tab = params.tab || "overview";
    const char = await getCharacter(env.GAME_DATA, slug);
    const payload = render(char, tab, {}, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_SKILL_WEAPON) {
    const slug = params.slug;
    const char = await getCharacter(env.GAME_DATA, slug);
    const weapon = interaction.data.values?.[0];
    const tab = "skills";
    const payload = render(char, tab, { weapon, page: 0 }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_POT_WEAPON) {
    const slug = params.slug;
    const char = await getCharacter(env.GAME_DATA, slug);
    const weapon = interaction.data.values?.[0];
    const tab = "potentiels";
    const payload = render(char, tab, { weapon, page: 0 }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_SKILL_PAGE) {
    const slug = params.slug;
    const char = await getCharacter(env.GAME_DATA, slug);
    const weapon = params.weapon;
    const page = Number(params.page || 0);
    const tab = "skills";
    const payload = render(char, tab, { weapon, page }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_POT_PAGE) {
    const slug = params.slug;
    const char = await getCharacter(env.GAME_DATA, slug);
    const weapon = params.weapon;
    const page = Number(params.page || 0);
    const tab = "potentiels";
    const payload = render(char, tab, { weapon, page }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === "perso:subview") {
    const slug = params.slug;
    const tab = params.tab || "overview";
    const char = await getCharacter(env.GAME_DATA, slug);
    const subview = Number(interaction.data.values?.[0] || 0);
    const payload = render(char, tab, { subview }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  if (base === COMPONENT_IDS.PERSO_COSTUME_SELECT) {
    const slug = params.slug;
    const char = await getCharacter(env.GAME_DATA, slug);
    const costumeIndex = Number(interaction.data.values?.[0] || 0);
    const tab = "costumes";
    const payload = render(char, tab, { costumeIndex }, published);
    payload.components = buildComponents(index, char, tab, payload.state, payload.viewCount);
    return update(payload);
  }

  return update({ content: "Composant inconnu.", flags: 64 });
}
