import { msg, update } from "../discord/responses.js";
import { loadAllCharacters, resolveCharacter, resolveWeapon } from "../lib/catalog.js";
import { analyzeCharacterProfile, analyzeWeaponIdentity } from "../lib/gameplay.js";
import { getTheoryProfile, getWeaponCompatibility } from "../lib/theorycraft.js";
import { explainComparePair, explainWeaponTheory } from "../lib/assistant.js";
import { actionRow, stringSelect } from "../lib/components.js";
import { cid } from "../lib/ids.js";
import { readPublishedIndex } from "../assistant/evidence-reader.js";
import { mergeUniqueProtoRefs } from "../assistant/presenters/evidence.js";
import { addCompareAssistantField, addCompareContrastField, addCompareDataField, addCompareDecisionField } from "../assistant/presenters/compare.js";
import { buildCharacterChoiceLines, buildComparePersosEvidence, buildCompareWeaponsEvidence, buildWeaponChoiceLines } from "../assistant/recommenders/compare.js";



const COMPARE_ACCENT = 0x5865F2;

function footerLine(scope, view, page, total = 2) {
  return `${scope} · ${view} · vue ${page}/${total}`;
}

function safeUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) ? value : null;
}

function short(text, max = 280) {
  const s = String(text || "—").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function firstUseful(list = [], fallback = "Non disponible pour l’instant") {
  const arr = Array.isArray(list) ? list : [list];
  const hit = arr.map((x) => String(x || "").trim()).find(Boolean);
  return hit || fallback;
}

function compactReason(list = [], fallback = "Non disponible pour l’instant", max = 72) {
  const text = firstUseful(list, fallback).replace(/^[-•]\s*/, "").trim();
  return short(text.replace(/\.+$/g, ""), max);
}

function compareCharacterAdvice(char1, left, char2, right) {
  return [
    `**Prends ${char1.name}** si tu veux surtout ${firstUseful([left.theory?.functions?.[0], left.theory?.dominant?.[0], left.theory?.planRole?.[0]], "son point fort principal")}.`,
    `**Prends ${char2.name}** si tu veux surtout ${firstUseful([right.theory?.functions?.[0], right.theory?.dominant?.[0], right.theory?.planRole?.[0]], "son point fort principal")}.`,
    left.theory?.dependencies?.[0] ? `**À prévoir pour ${char1.name}** · ${left.theory.dependencies[0]}` : null,
    right.theory?.dependencies?.[0] ? `**À prévoir pour ${char2.name}** · ${right.theory.dependencies[0]}` : null,
  ].filter(Boolean).join("\n");
}

function compareWeaponAdvice(char, weapon1, left, weapon2, right) {
  return [
    `**Prends ${weapon1.name}** si tu veux surtout ${firstUseful([left.compatibilityTheory?.functions?.[0], left.compatibilityTheory?.dominant?.[0], left.compatibilityTheory?.planRole?.[0]], "ce qu’elle apporte le mieux")}.`,
    `**Prends ${weapon2.name}** si tu veux surtout ${firstUseful([right.compatibilityTheory?.functions?.[0], right.compatibilityTheory?.dominant?.[0], right.compatibilityTheory?.planRole?.[0]], "ce qu’elle apporte le mieux")}.`,
    left.compatibilityTheory?.deltaSummary?.negative?.[0] ? `**Ce que ${weapon1.name} fait perdre** · ${left.compatibilityTheory.deltaSummary.negative[0]}` : null,
    right.compatibilityTheory?.deltaSummary?.negative?.[0] ? `**Ce que ${weapon2.name} fait perdre** · ${right.compatibilityTheory.deltaSummary.negative[0]}` : null,
  ].filter(Boolean).join("\n");
}



function addRecommendationField(embed, name, lines = []) {
  if (!embed) return embed;
  const arr = Array.isArray(lines) ? lines.filter(Boolean) : [String(lines || "").trim()].filter(Boolean);
  if (!arr.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name, value: short(arr.join("\n"), 1000), inline: false });
  return embed;
}





function getOptionsMap(interaction) {
  const out = {};
  for (const option of interaction?.data?.options || []) out[option.name] = option.value;
  return out;
}

function statValue(char, key) {
  return char?.stats?.[key] ?? "—";
}

function invalidPayload(title, description) {
  return msg("", {
    embeds: [{
      color: 0xED4245,
      title,
      description,
      footer: { text: "Compare · paramètres incomplets" },
    }],
    flags: 64,
  });
}

function buildCharacterSummary(char) {
  const roles = (char.roles || []).join(", ") || "—";
  const weapons = (char.weapons || []).map((weapon) => weapon.name).join(", ") || "—";
  const profile = analyzeCharacterProfile(char);
  const theory = getTheoryProfile(char, profile);
  return {
    theory,
    portrait: char?.images?.portrait || null,
    basics: [
      `**Rareté** · ${char.rarity || "—"}`,
      `**Attribut** · ${char.attribute || "—"}`,
      `**Rôles** · ${roles}`,
      `**Armes** · ${weapons}`,
      `**Costumes** · ${(char.costumes || []).length}`,
    ].join("\n"),
    stats: `**ATK** · ${statValue(char, "Attack")}\n**DEF** · ${statValue(char, "Defense")}\n**HP** · ${statValue(char, "Max HP")}`,
    reading: [
      theory.dominant.length ? theory.dominant.join("\n") : ((profile.orientations || []).slice(0, 3).join("\n") || "Non disponible pour l’instant"),
      theory.functions?.[0] ? `**Point fort** · ${theory.functions[0]}` : null,
    ].filter(Boolean).join("\n\n"),
    structure: [
      `**Fiabilité du kit** · ${theory.stability || "Non disponible pour l’instant"}`,
      `**Gros dégâts au bon moment** · ${theory.conversion || "Non disponible pour l’instant"}`,
      theory.planRole?.[0] ? `**Façon de jouer** · ${theory.planRole[0]}` : null,
      theory.secondary?.[0] ? `**Autre rôle utile** · ${theory.secondary[0]}` : null,
      theory.dependencies?.[0] ? `**Besoin principal** · ${theory.dependencies[0]}` : null,
    ].filter(Boolean).join("\n"),
    effects: (theory.effects || []).slice(0, 5).join(" · ") || "Non disponible pour l’instant",
    gameplan: (theory.planLines || []).slice(0, 2).join("\n") || "Non disponible pour l’instant",
  };
}

function buildWeaponSummary(char, weapon) {
  const skills = (weapon.skills || []).map((skill) => skill?.name).filter(Boolean);
  const potentials = (weapon.potentials || []).map((tier) => tier?.tier).filter(Boolean);
  const analysis = analyzeWeaponIdentity(weapon);
  const compatibility = getWeaponCompatibility(analysis, char, weapon);
  const deltaPlus = compatibility?.deltaSummary?.positive?.join(" · ") || "Non disponible pour l’instant";
  const deltaMinus = compatibility?.deltaSummary?.negative?.join(" · ") || "Aucune vraie perte repérée";
  const explanation = explainWeaponTheory(char, weapon, compatibility);
  return {
    compatibilityTheory: compatibility,
    explanation,
    portrait: (weapon.skills || []).find((skill) => skill?.icon)?.icon || char?.images?.portrait || null,
    basics: [
      `**Attribut** · ${weapon.attribute || "—"}`,
      `**Skills** · ${skills.length}`,
      `**Potentiels** · ${potentials.length}`,
    ].join("\n"),
    reading: [
      compatibility?.dominant?.length ? compatibility.dominant.join("\n") : (analysis.summary || "Non disponible pour l’instant"),
      compatibility?.functions?.[0] ? `**Point fort** · ${compatibility.functions[0]}` : null,
    ].filter(Boolean).join("\n\n"),
    markers: [
      `**Renforce surtout** · ${deltaPlus}`,
      `**Fait un peu perdre** · ${deltaMinus}`,
    ].join("\n"),
    structure: [
      `**Fiabilité du kit** · ${compatibility?.stability || "Non disponible pour l’instant"}`,
      `**Gros dégâts au bon moment** · ${compatibility?.conversion || "Non disponible pour l’instant"}`,
      compatibility?.planRole?.[0] ? `**Façon de jouer** · ${compatibility.planRole[0]}` : null,
    ].filter(Boolean).join("\n"),
    compatibility: compatibility?.lines?.join(" · ") || "Non disponible pour l’instant",
    gameplan: compatibility?.planLines?.slice(0, 2).join("\n") || "Non disponible pour l’instant",
  };
}

function compareViewRow(kind, state, current) {
  const options = [
    { label: "Résumé", value: "summary", default: current === "summary", emoji: "📘" },
    { label: "Détails", value: "detail", default: current === "detail", emoji: "📌" },
  ];
  return actionRow([
    stringSelect({
      custom_id: cid(`compare:${kind}`, state),
      placeholder: "Choisir une vue",
      options,
    }),
  ]);
}

function buildComparePersosPayload(char1, char2, view = "summary", published = []) {
  const left = buildCharacterSummary(char1);
  const right = buildCharacterSummary(char2);
  const explanation = explainComparePair(left.theory, right.theory, "perso");
  const leftProfile = analyzeCharacterProfile(char1);
  const rightProfile = analyzeCharacterProfile(char2);
  const evidence = buildComparePersosEvidence(char1, leftProfile, left.theory, char2, rightProfile, right.theory, published);
  const leftPublished = evidence.left.refs;
  const rightPublished = evidence.right.refs;
  const leftOverlay = evidence.left.overlay;
  const rightOverlay = evidence.right.overlay;
  const leftDecision = evidence.left.decision;
  const rightDecision = evidence.right.decision;
  const summary = {
    color: COMPARE_ACCENT,
    title: `Compare persos · ${char1.name} vs ${char2.name}`,
    description: "Vue rapide : rôle, stats clés, identité et verdict simple.",
    fields: [
      { name: `🧩 ${char1.name}`, value: `${left.basics}\n\n${left.stats}`, inline: true },
      { name: `🧩 ${char2.name}`, value: `${right.basics}\n\n${right.stats}`, inline: true },
      { name: "⚖️ Verdict rapide", value: `**Pourquoi**\n${short(explanation.reasons, 500)}\n\n**À surveiller**\n${short(explanation.cautions, 400)}`, inline: false },
            { name: `🎯 ${char1.name} — points forts`, value: short(left.reading, 500), inline: true },
      { name: `🎯 ${char2.name} — points forts`, value: short(right.reading, 500), inline: true },
    ],
    footer: { text: footerLine("Compare persos", "résumé", 1) },
  };
  const leftPortrait = safeUrl(left.portrait);
  const rightPortrait = safeUrl(right.portrait);
  if (leftPortrait) summary.thumbnail = { url: leftPortrait };
  if (rightPortrait && rightPortrait !== leftPortrait) summary.image = { url: rightPortrait };

  const detail = {
    color: COMPARE_ACCENT,
    title: `Compare persos · détails utiles`,
    description: "Vue détaillée : fiabilité, façon de jouer et repères utiles.",
    fields: [
      { name: `📌 ${char1.name} — repères`, value: short(left.structure, 700), inline: true },
      { name: `📌 ${char2.name} — repères`, value: short(right.structure, 700), inline: true },
      { name: `🕹️ ${char1.name} — comment le jouer`, value: short(left.gameplan, 700), inline: true },
      { name: `🕹️ ${char2.name} — comment le jouer`, value: short(right.gameplan, 700), inline: true },
      { name: "✨ Effets repérés", value: `**${char1.name}** · ${short(left.effects, 350)}\n**${char2.name}** · ${short(right.effects, 350)}`, inline: false },
          ],
    footer: { text: footerLine("Compare persos", "détails", 2) },
  };
  addRecommendationField(summary, "✅ Priorités de choix", buildCharacterChoiceLines(char1, left, leftPublished, char2, right, rightPublished));
  addCompareDataField(summary, leftOverlay, rightOverlay);
  addCompareDecisionField(detail, char1.name, char2.name, leftDecision, rightDecision);
  addCompareDataField(detail, leftOverlay, rightOverlay);
  addCompareContrastField(detail, char1.name, char2.name, leftDecision, rightDecision);
  addCompareAssistantField(summary, mergeUniqueProtoRefs(leftPublished, rightPublished), { includeBadges: false });
  addCompareAssistantField(detail, mergeUniqueProtoRefs(leftDecision?.refs || [], rightDecision?.refs || [], leftOverlay?.refs || [], rightOverlay?.refs || []));
  const embed = view === "detail" ? detail : summary;
  return {
    embeds: [embed],
    components: [compareViewRow("persos", { p1: char1.slug || char1.name, p2: char2.slug || char2.name }, view)],
    flags: 64,
  };
}

function buildCompareArmesPayload(char, weapon1, weapon2, view = "summary", published = []) {
  const left = buildWeaponSummary(char, weapon1);
  const right = buildWeaponSummary(char, weapon2);
  const explanation = explainComparePair(left.compatibilityTheory, right.compatibilityTheory, "arme");
  const evidence = buildCompareWeaponsEvidence(char, weapon1, left.compatibilityTheory, weapon2, right.compatibilityTheory, published);
  const leftPublished = evidence.left.refs;
  const rightPublished = evidence.right.refs;
  const leftOverlay = evidence.left.overlay;
  const rightOverlay = evidence.right.overlay;
  const leftDecision = evidence.left.decision;
  const rightDecision = evidence.right.decision;
  const summary = {
    color: COMPARE_ACCENT,
    title: `Compare armes · ${char.name}`,
    description: "Vue rapide : différences de rôle, identité et impact visible.",
    fields: [
      { name: `⚔️ ${weapon1.name}`, value: `${left.basics}\n\n${short(left.reading, 420)}`, inline: true },
      { name: `⚔️ ${weapon2.name}`, value: `${right.basics}\n\n${short(right.reading, 420)}`, inline: true },
      { name: "⚖️ Verdict rapide", value: `**Pourquoi**\n${short(explanation.reasons, 500)}\n\n**À surveiller**\n${short(explanation.cautions, 400)}`, inline: false },
            { name: `📌 ${weapon1.name} — ce qu'elle renforce`, value: short(left.markers, 500), inline: true },
      { name: `📌 ${weapon2.name} — ce qu'elle renforce`, value: short(right.markers, 500), inline: true },
    ],
    footer: { text: footerLine("Compare armes", "résumé", 1) },
  };
  const leftPortrait = safeUrl(left.portrait);
  const rightPortrait = safeUrl(right.portrait);
  if (leftPortrait) summary.thumbnail = { url: leftPortrait };
  if (rightPortrait && rightPortrait !== leftPortrait) summary.image = { url: rightPortrait };

  const detail = {
    color: COMPARE_ACCENT,
    title: `Compare armes · détails utiles`,
    description: "Vue détaillée : fiabilité, compatibilité et façon de jouer.",
    fields: [
      { name: `📌 ${weapon1.name} — repères`, value: short(left.structure, 700), inline: true },
      { name: `📌 ${weapon2.name} — repères`, value: short(right.structure, 700), inline: true },
      { name: `🕹️ ${weapon1.name} — comment ça se joue`, value: short(left.gameplan, 700), inline: true },
      { name: `🕹️ ${weapon2.name} — comment ça se joue`, value: short(right.gameplan, 700), inline: true },
      { name: "🔗 Avec quelle équipe ça marche bien", value: `**${weapon1.name}** · ${short(left.compatibility, 320)}\n**${weapon2.name}** · ${short(right.compatibility, 320)}`, inline: false },
          ],
    footer: { text: footerLine("Compare armes", "détails", 2) },
  };
  addRecommendationField(summary, "✅ Priorités de choix", buildWeaponChoiceLines(char, weapon1, left, leftPublished, weapon2, right, rightPublished));
  addCompareDataField(summary, leftOverlay, rightOverlay);
  addCompareDecisionField(detail, weapon1.name, weapon2.name, leftDecision, rightDecision);
  addCompareDataField(detail, leftOverlay, rightOverlay);
  addCompareContrastField(detail, weapon1.name, weapon2.name, leftDecision, rightDecision);
  addCompareAssistantField(summary, mergeUniqueProtoRefs(leftPublished, rightPublished), { includeBadges: false });
  addCompareAssistantField(detail, mergeUniqueProtoRefs(leftDecision?.refs || [], rightDecision?.refs || [], leftOverlay?.refs || [], rightOverlay?.refs || []));
  const embed = view === "detail" ? detail : summary;
  return {
    embeds: [embed],
    components: [compareViewRow("armes", { p: char.slug || char.name, w1: weapon1.name, w2: weapon2.name }, view)],
    flags: 64,
  };
}
async function runComparePersos(env, perso1, perso2, view = "summary") {
  const characters = await loadAllCharacters(env.GAME_DATA);
  if (!perso1 || !perso2) {
    return invalidPayload(
      "Compare persos — paramètres incomplets",
      "Utilise `perso1` et `perso2` pour comparer deux personnages."
    );
  }

  const char1 = resolveCharacter(characters, perso1);
  const char2 = resolveCharacter(characters, perso2);
  if (!char1 || !char2) {
    return invalidPayload(
      "Compare persos — personnage introuvable",
      `Impossible de trouver **${perso1}** et/ou **${perso2}** dans la base.`
    );
  }
  const published = await readPublishedIndex(env.GAME_DATA);
  return msg("", buildComparePersosPayload(char1, char2, view, published));
}

async function runCompareArmes(env, perso, arme1, arme2, view = "summary") {
  const characters = await loadAllCharacters(env.GAME_DATA);
  if (!perso || !arme1 || !arme2) {
    return invalidPayload(
      "Compare armes — paramètres incomplets",
      "Utilise `perso`, `arme1` et `arme2` pour comparer deux armes d’un même personnage."
    );
  }

  const char = resolveCharacter(characters, perso);
  if (!char) {
    return invalidPayload("Compare armes — personnage introuvable", `Impossible de trouver **${perso}** dans la base.`);
  }

  const weapon1 = resolveWeapon(char, arme1);
  const weapon2 = resolveWeapon(char, arme2);
  if (!weapon1 || !weapon2) {
    return invalidPayload(
      "Compare armes — arme introuvable",
      `Impossible de trouver **${arme1}** et/ou **${arme2}** pour **${char.name}**.`
    );
  }
  const published = await readPublishedIndex(env.GAME_DATA);
  return msg("", buildCompareArmesPayload(char, weapon1, weapon2, view, published));
}

export async function handleComparePersosCommand(env, interaction) {
  const options = getOptionsMap(interaction);
  return runComparePersos(env, options.perso1, options.perso2);
}

export async function handleCompareArmesCommand(env, interaction) {
  const options = getOptionsMap(interaction);
  return runCompareArmes(env, options.perso, options.arme1, options.arme2);
}

export async function handleCompareCommand(env, interaction) {
  const options = getOptionsMap(interaction);
  const mode = options.mode || ((options.perso || options.arme1 || options.arme2) ? "arme" : "perso");
  if (mode === "arme") return runCompareArmes(env, options.perso, options.arme1, options.arme2);
  return runComparePersos(env, options.perso1, options.perso2);
}

export async function handleCompareComponent(env, interaction, base, params) {
  const view = interaction?.data?.values?.[0] || "summary";
  if (base === "compare:persos") {
    const characters = await loadAllCharacters(env.GAME_DATA);
    const char1 = resolveCharacter(characters, params.p1);
    const char2 = resolveCharacter(characters, params.p2);
    if (!char1 || !char2) return update({ content: "Comparaison introuvable.", flags: 64 });
    const published = await readPublishedIndex(env.GAME_DATA);
    return update({ content: "", ...buildComparePersosPayload(char1, char2, view, published) });
  }
  if (base === "compare:armes") {
    const characters = await loadAllCharacters(env.GAME_DATA);
    const char = resolveCharacter(characters, params.p);
    if (!char) return update({ content: "Comparaison introuvable.", flags: 64 });
    const weapon1 = resolveWeapon(char, params.w1);
    const weapon2 = resolveWeapon(char, params.w2);
    if (!weapon1 || !weapon2) return update({ content: "Comparaison introuvable.", flags: 64 });
    const published = await readPublishedIndex(env.GAME_DATA);
    return update({ content: "", ...buildCompareArmesPayload(char, weapon1, weapon2, view, published) });
  }
  return update({ content: "Composant de comparaison inconnu.", flags: 64 });
}
