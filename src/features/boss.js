import { msg, update } from "../discord/responses.js";
import { actionRow, button, stringSelect } from "../lib/components.js";
import { getBoss, getBossIndex, getScienceBoss, getScienceBossPhase, getScienceBossPhaseIndex } from "../lib/kv.js";
import { analyzeBossCombatReading, describeBossCompleteness } from "../lib/gameplay.js";
import { getBossTheoryReading } from "../lib/theorycraft.js";
import { explainBossTheory } from "../lib/assistant.js";
import { readPublishedIndex } from "../assistant/evidence-reader.js";
import { assistantDigestLines, badgeLineFromRefs, decisionFieldLines, mergeUniqueProtoRefs, overlayFieldLines } from "../assistant/presenters/evidence.js";
import { addBossScienceActionField } from "../assistant/presenters/boss.js";
import { buildBossEvidence } from "../assistant/recommenders/boss.js";
import { buildBossPhaseDecisionLines, buildBossPhaseField, buildBossScienceActionLines, buildBossScienceField, buildBossWindowField } from "../lib/science-boss.js";


function trimBossEmbedPayload(result) {
  if (!result || !Array.isArray(result.embeds)) return result;
  const embeds = result.embeds.map((e, idx) => {
    const copy = { ...e };
    if (typeof copy.description === "string" && copy.description.length > 700) {
      copy.description = copy.description.slice(0, 697) + "...";
    }
    if (Array.isArray(copy.fields)) {
      copy.fields = copy.fields.map((f) => ({
        ...f,
        value: typeof f?.value === "string" && f.value.length > 420 ? f.value.slice(0, 417) + "..." : f?.value,
      }));
    }
    if (idx === 0 && result.embeds.length > 1) {
      copy.footer = copy.footer || {};
      const base = copy.footer.text ? `${copy.footer.text} • ` : "";
      copy.footer.text = `${base}${footerLine("vue compacte", `1/${result.embeds.length}`)}`;
    }
    return copy;
  });
  return { ...result, embeds: embeds.length ? [embeds[0]] : embeds };
}


const BOSS_PICK_ID = "boss:pick";
const BOSS_SECTION_ID = "boss:section";
const BOSS_PAGE_ID = "boss:page";
const BOSS_ACCENT = 0xe53935;
const BOSS_INFORMATION_ACCENT = 0x5865f2;

function footerLine(view, extra = null) {
  return ["Boss", view, extra].filter(Boolean).join(" · ");
}

const SECTION_EMOJIS = {
  overview: "📘",
  multiplayer: "👥",
  ai: "🧠",
  "blue-outline": "🔵",
  "damage-plan": "⚔️",
  core: "⚙️",
  strategy: "🗺️",
  summoning: "🕯️",
  abilities: "✨",
  flow: "🔁",
  ground: "🪨",
  flight: "🪽",
  enrage: "🔥",
  phase1: "1️⃣",
  climb: "🧗",
  "later-phases": "2️⃣",
  approach: "🎯",
};

const BOSS_EMOJIS = {
  information: "ℹ️",
  "guardian-golem": "🪨",
  drake: "🐉",
  "red-demon": "😈",
  "grey-demon": "👹",
  albion: "🏛️",
};

const BOSS_COLORS = {
  information: BOSS_INFORMATION_ACCENT,
  "guardian-golem": 0xd97706,
  drake: 0xb91c1c,
  "red-demon": 0xdc2626,
  "grey-demon": 0x94a3b8,
  albion: 0xeab308,
};

const STATIC_BOSS_INDEX = [
  { slug: "information", name: "Information", description: "Vue d’ensemble des mécaniques communes", order: 0 },
  { slug: "guardian-golem", name: "Guardian Golem", description: "Boss tanky à interruptions et stagger", order: 1 },
  { slug: "drake", name: "Drake", description: "Boss mobile avec pression constante", order: 2 },
  { slug: "red-demon", name: "Red Demon", description: "Invocation rituelle et fenêtres de burst", order: 3 },
  { slug: "grey-demon", name: "Grey Demon", description: "Phase volante et ultime d’enrage", order: 4 },
  { slug: "albion", name: "Albion", description: "Combat multi-phases le plus complexe", order: 5 },
];

function safeBossIndex(index) {
  return Array.isArray(index) && index.length ? index : STATIC_BOSS_INDEX;
}

function bossColor(slug) {
  return BOSS_COLORS[slug] || BOSS_ACCENT;
}

function clean(value) {
  return String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function truncate(value, limit = 1024) {
  const text = clean(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function compactList(items = []) {
  return items.map((item) => `• ${item}`).join("\n");
}

function bossSelectRow(index, selected = null) {
  const source = safeBossIndex(index);
  const options = source.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, 25).map((boss) => ({
    label: boss.name,
    value: boss.slug,
    description: boss.description?.slice(0, 100) || undefined,
    emoji: BOSS_EMOJIS[boss.slug],
    default: boss.slug === selected,
  }));
  return actionRow([stringSelect({ custom_id: BOSS_PICK_ID, placeholder: "Choisir Information ou un boss", options })]);
}

function sectionSelectRow(boss, selectedKey) {
  const sections = boss?.guide?.sections || [];
  if (sections.length <= 1) return null;
  return actionRow([
    stringSelect({
      custom_id: `${BOSS_SECTION_ID}:${boss.slug}`,
      placeholder: "Choisir une section du guide",
      options: sections.map((section) => ({ label: section.label, value: section.key, emoji: SECTION_EMOJIS[section.key], default: section.key === selectedKey })),
    }),
  ]);
}

function pageRow(boss, sectionKey, page, total) {
  if (!total || total <= 1) return null;
  return actionRow([
    button({ custom_id: `${BOSS_PAGE_ID}:${boss.slug}:${sectionKey}:${Math.max(0, page - 1)}`, label: "Précédent", style: 2, disabled: page <= 0, emoji: { name: "◀️" } }),
    button({ custom_id: `${BOSS_PAGE_ID}:${boss.slug}:${sectionKey}:${page}`, label: `${page + 1}/${total}`, style: 1, disabled: true }),
    button({ custom_id: `${BOSS_PAGE_ID}:${boss.slug}:${sectionKey}:${Math.min(total - 1, page + 1)}`, label: "Suivant", style: 2, disabled: page >= total - 1, emoji: { name: "▶️" } }),
  ]);
}


function bossModeRow(boss, sectionKey, page, mode = "guide") {
  if (!boss || boss.slug === "information") return null;
  return actionRow([
    stringSelect({
      custom_id: `boss:mode:${boss.slug}:${sectionKey}:${page}`,
      placeholder: "Choisir une vue",
      options: [
        { label: "Guide", value: "guide", default: mode === "guide", emoji: "📘" },
        { label: "Conseils", value: "analysis", default: mode === "analysis", emoji: "🧠" },
      ],
    }),
  ]);
}

function buildIntroEmbed(index) {
  const ordered = safeBossIndex(index).slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return {
    color: BOSS_ACCENT,
    author: { name: "Guide boss · Seven Deadly Sins: Origin" },
    title: "Boss — Hub de sélection",
    description: "Choisis **Information** pour les règles communes ou ouvre directement une fiche boss détaillée. Chaque vue met à jour le même embed au lieu d’empiler plusieurs cartes.",
    fields: [
      { name: "Sélections disponibles", value: ordered.map((boss) => `${BOSS_EMOJIS[boss.slug] || "•"} **${boss.name}** — ${boss.description}`).join("\n"), inline: false },
      { name: "Navigation", value: "1. Choisis un boss dans le menu.\n2. Change ensuite de section via le second sélecteur.\n3. Si une section est longue, utilise les boutons de page.", inline: false },
    ],
    footer: { text: footerLine("hub", "navigation compacte") },
  };
}

function splitDescription(text, limit = 1500) {
  const value = clean(text);
  if (!value) return ["Aucun détail disponible."];
  if (value.length <= limit) return [value];
  const parts = [];
  let remaining = value;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n\n", limit);
    if (cut < 600) cut = remaining.lastIndexOf("\n", limit);
    if (cut < 350) cut = limit;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function buildInfoEmbed(index, infoBoss = null, selectedKey = null) {
  const rawSections = Array.isArray(infoBoss?.guide?.sections) ? infoBoss.guide.sections : [];
  const sections = rawSections.map((section, idx) => ({
    key: section?.key || `section-${idx + 1}`,
    label: clean(section?.label || section?.title || `Section ${idx + 1}`),
    title: clean(section?.title || section?.label || `Section ${idx + 1}`),
    subtitle: clean(section?.subtitle),
    paragraphs: Array.isArray(section?.paragraphs) ? section.paragraphs.map((v) => clean(v)).filter(Boolean) : [],
    items: Array.isArray(section?.items) ? section.items.map((item) => clean(item?.name || item?.title || item?.label || item?.slug || item)).filter(Boolean) : [],
  })).filter((section) => section.title || section.subtitle || section.paragraphs.length || section.items.length);

  const selected = sections.find((section) => section.key === selectedKey) || sections[0] || null;
  const names = (index || STATIC_BOSS_INDEX)
    .filter((item) => item?.slug && item.slug !== "information")
    .map((item) => `• ${item.name || item.slug}`)
    .join("\n");

  return {
    color: BOSS_INFORMATION_ACCENT,
    author: { name: "ℹ️ Boss · Information générale" },
    title: selected?.title || "Vue d’ensemble des boss",
    description: selected
      ? truncate([selected.subtitle, ...selected.paragraphs].filter(Boolean).join("\n\n"), 4096)
      : "Informations générales indisponibles dans le guide détaillé. Les fiches boss individuelles restent accessibles depuis le sélecteur.",
    fields: [
      ...(selected?.items?.length ? [{ name: "Points clés", value: truncate(compactList(selected.items), 1024), inline: false }] : []),
      { name: "Sections disponibles", value: sections.map((section) => `• ${section.title}`).join("\n") || "Non disponible pour l’instant", inline: true },
      { name: "Boss couverts", value: names || "Non disponible pour l’instant", inline: true },
    ],
    footer: { text: selected ? footerLine("information", selected.label) : footerLine("information", "vue compacte") },
  };
}

function buildBossGuideEmbed(boss, sectionKey, pageIndex = 0, science = null) {
  const sections = boss?.guide?.sections || [];
  const section = sections.find((entry) => entry.key === sectionKey) || sections[0];
  const image = section?.image || boss?.images?.portrait;
  const reading = analyzeBossCombatReading(boss);
  const theory = getBossTheoryReading(reading);
  const completeness = describeBossCompleteness(boss);
  const explanation = explainBossTheory(boss, reading, theory, completeness);
  const chunks = [];
  for (const paragraph of section?.paragraphs || []) chunks.push(paragraph);
  if (section?.body) chunks.push(section.body);
  if (section?.callout) chunks.push(`**${section.callout.title}**\n${section.callout.text}`);
  if ((section?.bullets || []).length) chunks.push(compactList(section.bullets));
  const pages = splitDescription(chunks.join("\n\n"));
  const page = Math.max(0, Math.min(pages.length - 1, Number(pageIndex) || 0));
  const selectedSectionKey = section?.key || sectionKey || "overview";

const embed = {
  color: bossColor(boss.slug),
  author: { name: `${BOSS_EMOJIS[boss.slug] || "📖"} ${boss.name}`, ...(image ? { icon_url: image } : {}) },
  title: `${SECTION_EMOJIS[selectedSectionKey] || "📘"} ${section?.label || boss.name} · conseils`,
  description: clean(section?.subtitle || boss?.guide?.subtitle || boss?.description || "Conseils de combat simples."),
  fields: [
    { name: "Ce que le boss demande", value: theory.demand.length ? theory.demand.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
    { name: "✅ Ce qu'il faut faire", value: theory.gamePlan?.length ? theory.gamePlan.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
    { name: "🎯 Ce qu'il faut garder", value: theory.demand.length ? theory.demand.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
    { name: "Erreurs à éviter", value: theory.punishments.length ? theory.punishments.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
    { name: "Persos utiles", value: theory.usefulProfiles.length ? theory.usefulProfiles.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: false },
    { name: "3) ⚠️ Prudence", value: explanation.confidence || "Analyse encore prudente.", inline: false },
  ],
  footer: { text: footerLine(boss.name, "conseils") },
};
  if (image) embed.thumbnail = { url: image };
  const phaseField = buildBossPhaseField(science?.boss || null, science?.phases || [], selectedSectionKey);
  const windowField = buildBossWindowField(science?.boss || null, science?.phases || [], selectedSectionKey);
  const scienceField = buildBossScienceField(science?.boss || null, science?.phases || [], selectedSectionKey);
  if (phaseField) embed.fields = [...embed.fields, phaseField].slice(0, 25);
  if (windowField) embed.fields = [...embed.fields, windowField].slice(0, 25);
  if (scienceField) embed.fields = [...embed.fields, scienceField].slice(0, 25);
  return { embed, page, total: pages.length, sectionKey: selectedSectionKey };
}

async function resolveBossOrNull(kv, slug) {
  if (!slug) return null;
  const boss = await getBoss(kv, slug);
  return boss?.guide ? boss : null;
}

async function resolveBossScience(kv, slug) {
  if (!kv || !slug) return { boss: null, phases: [] };
  const scienceBoss = await getScienceBoss(kv, slug);
  const phaseIndex = await getScienceBossPhaseIndex(kv);
  const phaseRows = Array.isArray(phaseIndex) ? phaseIndex.filter((entry) => String(entry?.boss_id || '') === String(slug || '')) : [];
  const phases = [];
  for (const row of phaseRows) {
    const full = await getScienceBossPhase(kv, row?.phase_id);
    if (full) phases.push(full);
  }
  return { boss: scienceBoss, phases };
}

function buildBossAnalysisEmbed(boss, sectionKey, pageIndex = 0, published = [], science = null) {
  const built = buildBossGuideEmbed(boss, sectionKey, pageIndex, science);
  const section = (boss?.guide?.sections || []).find((entry) => entry.key === built.sectionKey) || boss?.guide?.sections?.[0];
  const reading = analyzeBossCombatReading(boss);
  const theory = getBossTheoryReading(reading);
  const completeness = describeBossCompleteness(boss);
  const explanation = explainBossTheory(boss, reading, theory, completeness);
  const image = section?.image || boss?.images?.portrait;
  const evidence = buildBossEvidence(boss, theory, published);
  const overlay = evidence.overlay;
  const decision = evidence.decision;
  const selectedSectionKey = built.sectionKey;
  const embed = {
    color: bossColor(boss.slug),
    author: { name: `${BOSS_EMOJIS[boss.slug] || "📖"} ${boss.name}`, ...(image ? { icon_url: image } : {}) },
    title: `${SECTION_EMOJIS[selectedSectionKey] || "📘"} ${section?.label || boss.name} · conseils`,
    description: clean(section?.subtitle || boss?.guide?.subtitle || boss?.description || "Conseils de combat simples."),
    fields: [
      { name: "Ce que le boss demande", value: theory.demand.length ? theory.demand.slice(0, 2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
      { name: "✅ Ce qu'il faut faire", value: theory.gamePlan?.length ? theory.gamePlan.slice(0,2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
      { name: "🎯 Ce qu'il faut garder", value: theory.demand.length ? theory.demand.slice(0,2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
      { name: "Erreurs à éviter", value: theory.punishments.length ? theory.punishments.slice(0,2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: true },
      { name: "Persos utiles", value: theory.usefulProfiles.length ? theory.usefulProfiles.slice(0,2).map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant", inline: false },
      { name: "3) ⚠️ Prudence", value: explanation.confidence || "Analyse encore prudente.", inline: false },
    ],
    footer: { text: footerLine(boss.name, "conseils") },
  };
  if (image) embed.thumbnail = { url: image };
  const phaseField = buildBossPhaseField(science?.boss || null, science?.phases || [], selectedSectionKey);
  const windowField = buildBossWindowField(science?.boss || null, science?.phases || [], selectedSectionKey);
  const scienceField = buildBossScienceField(science?.boss || null, science?.phases || [], selectedSectionKey);
  if (phaseField) embed.fields = [...embed.fields, phaseField].slice(0, 25);
  if (windowField) embed.fields = [...embed.fields, windowField].slice(0, 25);
  if (scienceField) embed.fields = [...embed.fields, scienceField].slice(0, 25);
  addBossRecommendationField(embed, theory, decision, overlay, science, selectedSectionKey);
  addBossScienceActionField(embed, { actionLines: buildBossScienceActionLines(science?.boss || null, science?.phases || [], selectedSectionKey) });
  addBossDecisionField(embed, decision);
  addBossDataField(embed, overlay);
  addBossAssistantField(embed, mergeUniqueProtoRefs(decision?.refs || [], overlay?.refs || []));
  return { embed, sectionKey: built.sectionKey, page: built.page, total: built.total };
}




function addBossAssistantField(embed, refs = []) {
  if (!embed || !refs?.length) return embed;
  const lines = assistantDigestLines(refs, { cardLimit: 2, contextLimit: 2, refsLimit: 3 });
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name: "4) 🧠 Lecture assistant", value: truncate(lines.join("\n"), 760), inline: false });
  return embed;
}

function addBossDataField(embed, overlay) {
  if (!embed || (!overlay?.support?.length && !overlay?.caution?.length && !overlay?.refs?.length)) return embed;
  const lines = overlayFieldLines(overlay);
  const badgeLine = badgeLineFromRefs(overlay?.refs || []);
  if (badgeLine) lines.unshift(badgeLine);
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  {
    const fields = embed.fields;
    const topCount = fields.findIndex((f) => !/^1\)/.test(String(f?.name || "")));
    const insertAt = topCount === -1 ? fields.length : topCount;
    fields.splice(insertAt, 0, { name: "2) 📊 Pourquoi ça tient", value: truncate(lines.join("\n"), 760), inline: false });
  }
  return embed;
}


function addBossDecisionField(embed, decision) {
  if (!embed || (!decision?.confirmed?.length && !decision?.caution?.length && !decision?.refs?.length)) return embed;
  const lines = decisionFieldLines(decision);
  const badgeLine = badgeLineFromRefs(decision?.refs || []);
  if (badgeLine) lines.unshift(badgeLine);
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name: "3) 🧪 Repères de test", value: truncate(lines.join("\n"), 760), inline: false });
  return embed;
}


function buildBossRecommendationLines(theory, decision, overlay, science = null, sectionKey = null) {
  const lines = [];
  if (theory?.usefulProfiles?.[0]) lines.push(`**Priorité 1** · Setup : ${theory.usefulProfiles[0]}.`);
  else if (theory?.teamShape?.[0]) lines.push(`**Priorité 1** · Setup : ${theory.teamShape[0]}.`);
  if (theory?.demand?.[0]) lines.push(`**Priorité 2** · Garde : ${theory.demand[0]}.`);
  if (decision?.confirmed?.some((x) => /boss pressure/i.test(String(x)))) lines.push("**Priorité 3** · Si le rythme casse, garde un plan simple.");
  else if (decision?.caution?.some((x) => /boss pressure/i.test(String(x)))) lines.push("**Priorité 3** · Si le rythme casse, reste prudent : rien n'est encore tranché.");
  else if (theory?.punishments?.[0]) lines.push(`**Priorité 3** · Évite : ${theory.punishments[0]}.`);
  const phaseDecisions = buildBossPhaseDecisionLines(science?.boss || null, science?.phases || [], sectionKey, 2);
  const scienceActions = buildBossScienceActionLines(science?.boss || null, science?.phases || [], sectionKey, 2);
  if (phaseDecisions[0]) lines.push(`**Priorité science** · ${phaseDecisions[0]}`);
  else if (scienceActions[0]) lines.push(`**Priorité science** · ${scienceActions[0]}`);
  if (!lines.length && overlay?.support?.[0]) lines.push(`**Priorité 1** · Repère : ${overlay.support[0]}`);
  return lines.slice(0, 3);
}


function addBossRecommendationField(embed, theory, decision, overlay, science = null, sectionKey = null) {
  if (!embed) return embed;
  const lines = buildBossRecommendationLines(theory, decision, overlay, science, sectionKey);
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.unshift({ name: "1) ✅ À faire d'abord", value: truncate(lines.join("\n"), 760), inline: false });
  return embed;
}
function renderBossUnavailable(index, slug) {
  return {
    embeds: [{ color: 0xed4245, title: "Boss — données indisponibles", description: `Le sélecteur /boss est disponible, mais les données détaillées pour **${slug}** ne peuvent pas être chargées pour le moment. Vérifie le binding KV \`GAME_DATA\` puis redéploie.`, footer: { text: footerLine("indisponible") } }],
    components: [bossSelectRow(index, slug)],
  };
}

async function buildBossGuideResponse(index, boss, sectionKey, pageIndex = 0, isUpdate = false, mode = "guide", published = [], science = null) {
  const built = mode === "analysis" ? buildBossAnalysisEmbed(boss, sectionKey, pageIndex, published, science) : buildBossGuideEmbed(boss, sectionKey, pageIndex, science);
  const components = [bossSelectRow(index, boss?.slug)];
  const sectionRow = sectionSelectRow(boss, built.sectionKey);
  if (sectionRow) components.push(sectionRow);
  const modeRow = bossModeRow(boss, built.sectionKey, built.page, mode);
  if (modeRow) components.push(modeRow);
  const pager = pageRow(boss, built.sectionKey, built.page, built.total);
  if (pager && mode === "guide") components.push(pager);
  const payload = { embeds: [built.embed], components };
  return isUpdate ? update(payload) : msg("", payload);
}

function renderBossError(index) {
  return {
    embeds: [{ color: 0xed4245, title: "Boss — erreur interne", description: "La vue /boss a rencontré une erreur interne. Réessaie après redéploiement.", footer: { text: footerLine("erreur") } }],
    components: [bossSelectRow(index)],
  };
}

export async function handleBossCommand(env) {
  try {
    const index = env?.GAME_DATA ? await getBossIndex(env.GAME_DATA) : null;
    return msg("", { embeds: [buildIntroEmbed(index || STATIC_BOSS_INDEX)], components: [bossSelectRow(index || STATIC_BOSS_INDEX)] });
  } catch (error) {
    console.error("boss command failed", error);
    return msg("", { embeds: [buildIntroEmbed(STATIC_BOSS_INDEX)], components: [bossSelectRow(STATIC_BOSS_INDEX)] });
  }
}

export async function handleBossComponent(env, interaction, customId) {
  let index = null;

  try {
    index = env?.GAME_DATA ? await getBossIndex(env.GAME_DATA) : null;
    const published = env?.GAME_DATA ? await readPublishedIndex(env.GAME_DATA) : [];

    if (customId === BOSS_PICK_ID) {
      const slug = interaction.data.values?.[0] || "information";
      if (slug === "information") {
        const infoBoss = env?.GAME_DATA ? await resolveBossOrNull(env.GAME_DATA, "information") : null;
        const selectedKey = infoBoss?.guide?.sections?.[0]?.key || null;
        const rows = [bossSelectRow(index || STATIC_BOSS_INDEX, "information")];
        const infoSectionRow = sectionSelectRow(infoBoss, selectedKey);
        if (infoSectionRow) rows.push(infoSectionRow);
        return update({ content: "", embeds: [buildInfoEmbed(index || STATIC_BOSS_INDEX, infoBoss, selectedKey)], components: rows });
      }
      if (!env?.GAME_DATA) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const boss = await resolveBossOrNull(env.GAME_DATA, slug);
      if (!boss) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const science = await resolveBossScience(env.GAME_DATA, boss.slug);
      return await buildBossGuideResponse(index || STATIC_BOSS_INDEX, boss, boss.guide.sections?.[0]?.key, 0, true, "guide", published, science);
    }

    if (customId.startsWith(`${BOSS_SECTION_ID}:`)) {
      const slug = customId.slice(`${BOSS_SECTION_ID}:`.length);
      if (!env?.GAME_DATA) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const boss = await resolveBossOrNull(env.GAME_DATA, slug);
      if (!boss) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const sectionKey = interaction.data.values?.[0] || boss.guide.sections?.[0]?.key;
      if (slug === "information") {
        const rows = [bossSelectRow(index || STATIC_BOSS_INDEX, "information")];
        const infoSectionRow = sectionSelectRow(boss, sectionKey);
        if (infoSectionRow) rows.push(infoSectionRow);
        return update({ content: "", embeds: [buildInfoEmbed(index || STATIC_BOSS_INDEX, boss, sectionKey)], components: rows });
      }
      const science = await resolveBossScience(env.GAME_DATA, boss.slug);
      return await buildBossGuideResponse(index || STATIC_BOSS_INDEX, boss, sectionKey, 0, true, "guide", published, science);
    }

    if (customId.startsWith("boss:mode:")) {
      const [, , slug, sectionKey, pageRaw] = customId.split(":");
      if (!env?.GAME_DATA) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const boss = await resolveBossOrNull(env.GAME_DATA, slug);
      if (!boss) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const mode = interaction.data.values?.[0] || "guide";
      const science = await resolveBossScience(env.GAME_DATA, boss.slug);
      return await buildBossGuideResponse(index || STATIC_BOSS_INDEX, boss, sectionKey, Number(pageRaw || 0), true, mode, published, science);
    }

    if (customId.startsWith(`${BOSS_PAGE_ID}:`)) {
      const [, , slug, sectionKey, pageRaw] = customId.split(":");
      if (!env?.GAME_DATA) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const boss = await resolveBossOrNull(env.GAME_DATA, slug);
      if (!boss) return update(renderBossUnavailable(index || STATIC_BOSS_INDEX, slug));
      const science = await resolveBossScience(env.GAME_DATA, boss.slug);
      return await buildBossGuideResponse(index || STATIC_BOSS_INDEX, boss, sectionKey, Number(pageRaw || 0), true, "guide", published, science);
    }
  } catch (error) {
    console.error("boss component failed", error);
    return update(renderBossError(index || STATIC_BOSS_INDEX));
  }

  return update({ content: "Composant boss inconnu.", flags: 64 });
}
