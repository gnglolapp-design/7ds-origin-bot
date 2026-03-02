import { PROTOCOLS } from "../protocols/registry.js";
import { publishedConflictSummary } from "./conflicts.js";

const FAMILY_MAP = new Map([
  ["SCALING_ATK", "Mécaniques"],
  ["SCALING_DEF", "Mécaniques"],
  ["CRIT_RATE_REAL", "Mécaniques"],
  ["CRIT_DMG_REAL", "Mécaniques"],
  ["BUFF_STACKING", "Mécaniques"],
  ["STATUS_PROC_RATE", "Mécaniques"],
  ["MULTI_HIT_SNAPSHOT", "Mécaniques"],
  ["COOLDOWN_REAL", "Mécaniques"],
  ["BUFF_UPTIME", "Mécaniques"],
  ["INTERACTION_AB", "Mécaniques"],
  ["WEAPON_SKILL_DELTA", "Kits / armes"],
  ["ORDER_OF_USE", "Kits / armes"],
  ["DAMAGE_WINDOW", "Kits / armes"],
  ["TAG_SWAP_IMPACT", "Kits / armes"],
  ["COSTUME_IMPACT", "Progression"],
  ["POTENTIAL_IMPACT", "Progression"],
  ["BUFF_REAL_UPTIME", "Progression"],
  ["DEBUFF_REAL_UPTIME", "Progression"],
  ["STAT_PRIORITY_DELTA", "Progression"],
  ["BOSS_PRESSURE_DELTA", "Boss"],
  ["ELEMENT_MATCHUP_DELTA", "Éléments / Burst"],
  ["BURST_STATE_DELTA", "Éléments / Burst"],
  ["BURST_TRIGGER_WEAPON_DELTA", "Éléments / Burst"],
  ["ELEMENTAL_STATUS_UPTIME", "Éléments / Burst"],
  ["RES_SHRED_DELTA", "Éléments / Burst"],
  ["TAG_TO_BURST_CHAIN", "Éléments / Burst"],
  ["TAG_WINDOW_GAIN", "Éléments / Burst"],
  ["COMBINED_SKILL_DELTA", "Éléments / Burst"],
  ["SUCCESSFUL_EVADE_BONUS_DELTA", "Éléments / Burst"],
  ["PHASE_SPECIFIC_WINDOW_DELTA", "Boss"],
  ["BOSS_INTERRUPT_PENALTY", "Boss"],
  ["BOSS_PATTERN_RECOVERY_DELTA", "Boss"],
  ["BURST_WINDOW_HOLD_VALUE", "Éléments / Burst"],
]);

export function protocolFamilyLabel(protoId) {
  return FAMILY_MAP.get(String(protoId || "").toUpperCase()) || "Autres";
}

export function summarizeScopeLabels(entries = [], max = 4) {
  const labels = Array.from(new Set(entries.map((x) => String(x?.scopeLabel || "").trim()).filter(Boolean)));
  if (!labels.length) return null;
  const head = labels.slice(0, max);
  return {
    labels,
    bullet: head.map((x) => `• ${x}`).join("\n") + (labels.length > head.length ? `\n• +${labels.length - head.length} autres` : ""),
    compact: `${head.map((x) => `**${x}**`).join(" · ")}${labels.length > head.length ? ` +${labels.length - head.length}` : ""}`,
  };
}

export function buildPublishedProtocolList(index = [], fmtDate) {
  const grouped = Array.from(index.reduce((map, item) => {
    const protoId = String(item?.protoId || "?");
    if (!map.has(protoId)) map.set(protoId, []);
    map.get(protoId).push(item);
    return map;
  }, new Map()).entries());

  grouped.sort((a, b) => {
    const aDate = Math.max(...a[1].map((x) => Number(x?.publishedAt || 0)), 0);
    const bDate = Math.max(...b[1].map((x) => Number(x?.publishedAt || 0)), 0);
    return bDate - aDate;
  });

  return grouped.slice(0, 15).map(([protoId, entries]) => {
    const primary = entries.find((x) => x?.isPrimary) || entries.slice().sort((a, b) => Number(b?.publishedAt || 0) - Number(a?.publishedAt || 0))[0];
    const scoped = entries.filter((x) => !x?.isPrimary);
    const family = protocolFamilyLabel(protoId);
    const title = String(primary?.title || PROTOCOLS?.[protoId]?.title || protoId);
    const conflict = publishedConflictSummary(entries);
    const scopeSummary = summarizeScopeLabels(scoped, 3);
    return {
      protoId,
      family,
      title,
      publishedAt: primary?.publishedAt || null,
      solidness: primary?.solidness || primary?.confidence || "—",
      solidConflict: primary?.solidConflict || null,
      validCount: Number(primary?.validCount ?? 0),
      contextCount: scoped.length,
      scopeSummary,
      conflictShort: conflict?.short || null,
      line:
        `• **${protoId}** · ${family} — ${title}\n` +
        `  publié **${fmtDate(primary?.publishedAt)}** · solidité **${primary?.solidness || primary?.confidence || "—"}** · ✅ **${primary?.validCount ?? 0}**` +
        `${scoped.length ? ` · contextes **${scoped.length}**` : ""}` +
        `${conflict?.short ? ` · ${conflict.short}` : ""}` +
        `${scopeSummary?.compact ? `\n  contextes : ${scopeSummary.compact}` : ""}`
    };
  });
}

export function buildPublishedSnapshotSummary(protoId, snap, protoEntries = []) {
  const contextEntries = protoEntries.filter((x) => !x?.isPrimary);
  const scopeSummary = summarizeScopeLabels(contextEntries, 6);
  const conflict = publishedConflictSummary(protoEntries);
  const family = protocolFamilyLabel(protoId);
  return {
    family,
    contextEntries,
    scopeSummary,
    conflict,
    protocolTitle: String(PROTOCOLS?.[protoId]?.title || snap?.title || protoId),
  };
}

export function normalizePublishedValue(x) {
  return String(x || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function signalConfidenceRank(label) {
  const x = String(label || "").toLowerCase();
  if (x.includes("confirm")) return 3;
  if (x.includes("probable") || x.includes("moyenne") || x.includes("medium")) return 2;
  if (x.includes("flou") || x.includes("faible") || x.includes("low") || x.includes("limit")) return 1;
  if (x.includes("bonne") || x.includes("forte") || x.includes("high")) return 3;
  return 0;
}

export function snapshotSolidnessLabel(snap) {
  return String(snap?.solidness || snap?.confidence || "Encore trop flou");
}

export function signalMap(list = []) {
  return Object.fromEntries((list || []).map((x) => [String(x?.protoId || ""), x]));
}

export function snapshotContexts(snap) {
  return snap?.contexts && typeof snap.contexts === "object" ? snap.contexts : {};
}

function compactList(list = [], limit = 2) {
  const arr = Array.from(new Set((list || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!arr.length) return "";
  const head = arr.slice(0, limit).join(", ");
  return arr.length > limit ? `${head} +${arr.length - limit}` : head;
}

export function contextCompactSummary(contexts = {}) {
  const bits = [];
  if (contexts.characters?.length) bits.push(`perso ${compactList(contexts.characters, 1)}`);
  if (contexts.weaponNames?.length) bits.push(`arme ${compactList(contexts.weaponNames, 1)}`);
  if ((contexts.equippableWeapons || contexts.equippable_weapon_ids)?.length) bits.push(`équipable ${compactList(contexts.equippableWeapons || contexts.equippable_weapon_ids, 1)}`);
  if (contexts.bosses?.length) bits.push(`boss ${compactList(contexts.bosses, 1)}`);
  if ((contexts.phases || contexts.phaseIds)?.length) bits.push(`phase ${compactList(contexts.phases || contexts.phaseIds, 1)}`);
  if ((contexts.elements || contexts.elementIds)?.length) bits.push(`élément ${compactList(contexts.elements || contexts.elementIds, 1)}`);
  if ((contexts.scenarios || contexts.scenarioIds)?.length) bits.push(`scénario ${compactList(contexts.scenarios || contexts.scenarioIds, 1)}`);
  if ((contexts.burstEffects || contexts.burst_effect_ids)?.length) bits.push(`burst ${compactList(contexts.burstEffects || contexts.burst_effect_ids, 1)}`);
  if ((contexts.burstFamilies || contexts.burst_families)?.length) bits.push(`famille ${compactList(contexts.burstFamilies || contexts.burst_families, 1)}`);
  if ((contexts.combinedAttacks || contexts.combined_attack_ids)?.length) bits.push(`combined ${compactList(contexts.combinedAttacks || contexts.combined_attack_ids, 1)}`);
  if ((contexts.evadeRules || contexts.evade_rule_ids)?.length) bits.push(`esquive ${compactList(contexts.evadeRules || contexts.evade_rule_ids, 1)}`);
  if ((contexts.delugeStates || contexts.deluge_states)?.length) bits.push(`déluge ${compactList(contexts.delugeStates || contexts.deluge_states, 1)}`);
  if (contexts.costumes?.length) bits.push(`costume ${compactList(contexts.costumes, 1)}`);
  if (contexts.potentials?.length) bits.push(`potentiel ${compactList(contexts.potentials, 1)}`);
  if (contexts.buffs?.length) bits.push(`buff ${compactList(contexts.buffs, 1)}`);
  if (contexts.debuffs?.length) bits.push(`debuff ${compactList(contexts.debuffs, 1)}`);
  if (contexts.stats?.length) bits.push(`stats ${compactList(contexts.stats, 1)}`);
  return bits.slice(0, 3).join(" · ");
}

function setFrom(values = []) {
  return new Set((values || []).map((x) => normalizePublishedValue(x)).filter(Boolean));
}

function characterKeys(char) {
  return Array.from(new Set([
    char?.slug,
    char?.name,
    ...(Array.isArray(char?.aliases) ? char.aliases : []),
  ].map((x) => normalizePublishedValue(x)).filter(Boolean)));
}

function weaponKeys(weapon) {
  return Array.from(new Set([
    weapon?.name,
    weapon?.slug,
    weapon?.id,
    weapon?.key,
    weapon?.type,
  ].map((x) => normalizePublishedValue(x)).filter(Boolean)));
}

function bossKeys(boss) {
  return Array.from(new Set([
    boss?.slug,
    boss?.name,
    boss,
  ].map((x) => normalizePublishedValue(x)).filter(Boolean)));
}

function equippableWeaponKeys(weapon) {
  return Array.from(new Set([
    weapon?.weapon_id,
    weapon?.id,
    weapon?.slug,
    weapon?.name,
    weapon?.key,
    weapon,
  ].map((x) => normalizePublishedValue(x)).filter(Boolean)));
}

function valueKeys(value, extra = []) {
  return Array.from(new Set([
    value?.id,
    value?.slug,
    value?.name,
    value?.key,
    value,
    ...extra,
  ].map((x) => normalizePublishedValue(x)).filter(Boolean)));
}

function snapshotMatchesCharacter(snap, char) {
  const ctx = snapshotContexts(snap);
  const chars = setFrom(ctx.characters);
  const weapons = setFrom(ctx.weapons);
  const keys = characterKeys(char);
  if (!keys.length) return false;
  if (keys.some((k) => chars.has(k))) return true;
  return keys.some((k) => Array.from(weapons).some((entry) => entry.startsWith(`${k}:`)));
}

function snapshotMatchesWeapon(snap, char, weapon) {
  const ctx = snapshotContexts(snap);
  const weaponNames = setFrom(ctx.weaponNames);
  const weapons = setFrom(ctx.weapons);
  const cKeys = characterKeys(char);
  const wKeys = weaponKeys(weapon);
  if (!wKeys.length) return false;
  const directWeapon = wKeys.some((k) => weaponNames.has(k));
  const directPair = cKeys.some((ck) => wKeys.some((wk) => weapons.has(`${ck}:${wk}`)));
  return directWeapon || directPair;
}

function snapshotMatchesBoss(snap, boss) {
  const ctx = snapshotContexts(snap);
  const bosses = setFrom(ctx.bosses);
  const keys = bossKeys(boss);
  return keys.some((k) => bosses.has(k));
}

function snapshotMatchesEquippableWeapon(snap, weapon) {
  const ctx = snapshotContexts(snap);
  const weapons = setFrom(ctx.equippableWeapons || ctx.equippable_weapon_ids || []);
  const keys = equippableWeaponKeys(weapon);
  return keys.some((k) => weapons.has(k));
}

function snapshotMatchesElement(snap, element) {
  const ctx = snapshotContexts(snap);
  const elements = setFrom(ctx.elements || ctx.elementIds || []);
  const keys = valueKeys(element);
  return keys.some((k) => elements.has(k));
}

function snapshotMatchesPhase(snap, phase) {
  const ctx = snapshotContexts(snap);
  const phases = setFrom(ctx.phases || ctx.phaseIds || []);
  const keys = valueKeys(phase, [phase?.phase_id, phase?.boss_phase_id]);
  return keys.some((k) => phases.has(k));
}

function snapshotMatchesScenario(snap, scenario) {
  const ctx = snapshotContexts(snap);
  const scenarios = setFrom(ctx.scenarios || ctx.scenarioIds || []);
  const keys = valueKeys(scenario, [scenario?.scenario_id]);
  return keys.some((k) => scenarios.has(k));
}


function snapshotMatchesBurstEffect(snap, burstEffect) {
  const ctx = snapshotContexts(snap);
  const effects = setFrom(ctx.burstEffects || ctx.burst_effect_ids || []);
  const keys = valueKeys(burstEffect, [burstEffect?.burst_effect_id]);
  return keys.some((k) => effects.has(k));
}

function snapshotMatchesCombinedAttack(snap, combinedAttack) {
  const ctx = snapshotContexts(snap);
  const values = setFrom(ctx.combinedAttacks || ctx.combined_attack_ids || []);
  const keys = valueKeys(combinedAttack, [combinedAttack?.combined_attack_id]);
  return keys.some((k) => values.has(k));
}

function snapshotMatchesEvadeRule(snap, evadeRule) {
  const ctx = snapshotContexts(snap);
  const values = setFrom(ctx.evadeRules || ctx.evade_rule_ids || []);
  const keys = valueKeys(evadeRule, [evadeRule?.evade_rule_id]);
  return keys.some((k) => values.has(k));
}

export function snapshotCoverageLabel(snap) {
  const valid = Number(snap?.validCount || 0);
  const suspect = Number(snap?.suspectCount || 0);
  const rejected = Number(snap?.rejectedCount || 0);
  if (valid >= 18 && suspect <= Math.max(3, Math.floor(valid * 0.4)) && rejected <= Math.max(3, valid)) return "bonne couverture";
  if (valid >= 8) return "couverture moyenne";
  return "données fragiles";
}

export function snapshotCoverageRank(snap) {
  const label = snapshotCoverageLabel(snap);
  if (label === "bonne couverture") return 3;
  if (label === "couverture moyenne") return 2;
  return 1;
}

function contextScopeKind(snap) {
  const explicit = String(snap?.scopeType || "").toLowerCase();
  if (explicit) return explicit;
  const ctx = snapshotContexts(snap);
  if (ctx.bosses?.length) return "boss";
  if (ctx.weaponNames?.length) return "weapon";
  if (ctx.characters?.length) return "character";
  return "global";
}

function matchForCharacter(snap, char) {
  const ctx = snapshotContexts(snap);
  if (snapshotMatchesCharacter(snap, char)) return { tier: 3, score: 120 + (ctx.weaponNames?.length ? 2 : 0), label: "contexte exact", reason: "retenu car le snapshot cible ce perso" };
  if ((ctx.scopes || []).includes("perso") || (ctx.scopes || []).includes("arme")) return { tier: 2, score: 60, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte perso / arme proche" };
  return { tier: 1, score: 10, label: "fallback global", reason: "retenu faute de snapshot plus précis pour ce perso" };
}

function matchForWeapon(snap, char, weapon) {
  const ctx = snapshotContexts(snap);
  if (snapshotMatchesWeapon(snap, char, weapon)) return { tier: 3, score: 140, label: "contexte exact", reason: "retenu car le snapshot cible cette arme" };
  if (snapshotMatchesCharacter(snap, char)) return { tier: 2, score: 90, label: "contexte proche", reason: "retenu car le snapshot cible le bon perso mais pas exactement la même arme" };
  if ((ctx.scopes || []).includes("arme") || (ctx.scopes || []).includes("perso")) return { tier: 2, score: 70, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte arme / perso proche" };
  return { tier: 1, score: 10, label: "fallback global", reason: "retenu faute de snapshot précis pour cette arme" };
}

function matchForBoss(snap, boss) {
  const ctx = snapshotContexts(snap);
  if (snapshotMatchesBoss(snap, boss)) return { tier: 3, score: 140, label: "contexte exact", reason: "retenu car le snapshot cible ce boss" };
  if ((ctx.scopes || []).includes("boss")) return { tier: 2, score: 80, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte boss proche" };
  return { tier: 1, score: 10, label: "fallback global", reason: "retenu faute de snapshot précis pour ce boss" };
}

function matchForTeam(snap, team, boss = null) {
  const picks = Array.isArray(team?.picks) ? team.picks : [];
  const charHits = picks.reduce((sum, pick) => sum + (snapshotMatchesCharacter(snap, pick) ? 1 : 0), 0);
  const bossHit = boss && snapshotMatchesBoss(snap, boss);
  if (bossHit && charHits >= 2) return { tier: 3, score: 150 + charHits * 5, label: "contexte exact", reason: "retenu car le snapshot recoupe le boss et plusieurs persos de la compo" };
  if (charHits >= 2 || bossHit) return { tier: 2, score: 90 + charHits * 4, label: "contexte proche", reason: "retenu car le snapshot recoupe une partie utile de la compo" };
  if (charHits >= 1) return { tier: 2, score: 70 + charHits * 4, label: "contexte proche", reason: "retenu car le snapshot recoupe au moins un perso important de la compo" };
  return { tier: 1, score: 10, label: "fallback global", reason: "retenu faute de snapshot précis pour cette compo" };
}

function matchForContext(snap, context = {}) {
  const scores = [];
  if (context?.character && snapshotMatchesCharacter(snap, context.character)) scores.push({ tier: 3, score: 120, label: "contexte exact", reason: "retenu car le snapshot cible le bon perso" });
  if (context?.weapon && snapshotMatchesWeapon(snap, context.character || {}, context.weapon)) scores.push({ tier: 3, score: 140, label: "contexte exact", reason: "retenu car le snapshot cible la bonne arme de kit" });
  if (context?.equippableWeapon && snapshotMatchesEquippableWeapon(snap, context.equippableWeapon)) scores.push({ tier: 3, score: 145, label: "contexte exact", reason: "retenu car le snapshot cible la bonne arme équipable" });
  if (context?.boss && snapshotMatchesBoss(snap, context.boss)) scores.push({ tier: 3, score: 135, label: "contexte exact", reason: "retenu car le snapshot cible le bon boss" });
  if (context?.phase && snapshotMatchesPhase(snap, context.phase)) scores.push({ tier: 3, score: 132, label: "contexte exact", reason: "retenu car le snapshot cible la bonne phase" });
  if (context?.element && snapshotMatchesElement(snap, context.element)) scores.push({ tier: 3, score: 128, label: "contexte exact", reason: "retenu car le snapshot cible le bon élément" });
  if (context?.scenario && snapshotMatchesScenario(snap, context.scenario)) scores.push({ tier: 3, score: 126, label: "contexte exact", reason: "retenu car le snapshot cible le bon scénario" });
  if (context?.burstEffect && snapshotMatchesBurstEffect(snap, context.burstEffect)) scores.push({ tier: 3, score: 130, label: "contexte exact", reason: "retenu car le snapshot cible le bon effet de Burst" });
  if (context?.combinedAttack && snapshotMatchesCombinedAttack(snap, context.combinedAttack)) scores.push({ tier: 3, score: 124, label: "contexte exact", reason: "retenu car le snapshot cible la bonne Combined Attack" });
  if (context?.evadeRule && snapshotMatchesEvadeRule(snap, context.evadeRule)) scores.push({ tier: 3, score: 122, label: "contexte exact", reason: "retenu car le snapshot cible la bonne règle d'esquive" });

  if (scores.length) {
    return scores.sort((a, b) => b.score - a.score)[0];
  }

  const ctx = snapshotContexts(snap);
  if (context?.character && snapshotMatchesCharacter(snap, context.character)) return { tier: 2, score: 85, label: "contexte proche", reason: "retenu car le snapshot cible au moins le bon perso" };
  if (context?.boss && (ctx.scopes || []).includes("boss")) return { tier: 2, score: 75, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte boss proche" };
  if (context?.weapon || context?.equippableWeapon) {
    if ((ctx.scopes || []).includes("arme") || (ctx.scopes || []).includes("weapon") || (ctx.scopes || []).includes("perso")) {
      return { tier: 2, score: 72, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte arme / perso proche" };
    }
  }
  if (context?.phase || context?.scenario || context?.element || context?.burstEffect || context?.combinedAttack || context?.evadeRule) {
    if ((ctx.scopes || []).includes("boss") || (ctx.scopes || []).includes("element") || (ctx.scopes || []).includes("scenario") || (ctx.scopes || []).includes("burst") || (ctx.scopes || []).includes("combined") || (ctx.scopes || []).includes("evade")) {
      return { tier: 2, score: 68, label: "contexte proche", reason: "retenu car le snapshot reste dans un contexte de combat proche" };
    }
  }
  return { tier: 1, score: 10, label: "fallback global", reason: "retenu faute de snapshot précis pour ce contexte" };
}

function sortSnapshots(list = []) {
  return [...list].sort((a, b) => {
    const rankDiff = signalConfidenceRank(snapshotSolidnessLabel(b)) - signalConfidenceRank(snapshotSolidnessLabel(a));
    if (rankDiff) return rankDiff;
    const coverageDiff = snapshotCoverageRank(b) - snapshotCoverageRank(a);
    if (coverageDiff) return coverageDiff;
    return Number(b?.publishedAt || 0) - Number(a?.publishedAt || 0);
  });
}

function conflictFocusLabel(snap) {
  const ctx = snapshotContexts(snap);
  return contextCompactSummary(ctx) || String(snap?.scopeLabel || snap?.scopeType || "ce contexte");
}

function selectionConflict(assessed = [], best) {
  if (!best || assessed.length <= 1) return null;
  const peers = assessed.filter((entry) => entry !== best && Math.abs((entry.match?.score || 0) - (best.match?.score || 0)) <= 25).slice(0, 3);
  if (!peers.length) return null;

  const bestRank = signalConfidenceRank(snapshotSolidnessLabel(best.snap));
  const peerRanks = peers.map((entry) => signalConfidenceRank(snapshotSolidnessLabel(entry.snap)));
  const disagreeing = peerRanks.some((rank) => Math.abs(rank - bestRank) >= 1);
  const bestCtx = contextCompactSummary(snapshotContexts(best.snap));
  const variedCtx = peers.some((entry) => contextCompactSummary(snapshotContexts(entry.snap)) !== bestCtx);
  const fragileCoverage = [best, ...peers].some((entry) => snapshotCoverageRank(entry.snap) <= 1);
  const lightVolume = [best, ...peers].some((entry) => Number(entry.snap?.validCount || 0) < 8);

  const reasons = [];
  if (disagreeing) reasons.push("les snapshots du même niveau ne racontent pas exactement la même chose");
  if (variedCtx) reasons.push("les essais viennent encore de contextes proches mais pas identiques");
  if (fragileCoverage) reasons.push("une partie de la couverture reste fragile");
  if (lightVolume) reasons.push("le volume reste encore un peu court pour trancher fort");
  if (!reasons.length) return null;

  let leaning = "Ça penche plutôt vers le résultat retenu, mais l'écart reste faible.";
  const bestCoverage = snapshotCoverageRank(best.snap);
  const peerCoverage = Math.max(0, ...peers.map((entry) => snapshotCoverageRank(entry.snap)));
  const peerConf = Math.max(0, ...peerRanks);
  if ((best.match?.tier || 0) >= 3) leaning = "Ça penche plutôt vers le résultat du bon contexte.";
  else if (bestRank > peerConf) leaning = "Ça penche plutôt vers le résultat le plus solide disponible.";
  else if (bestCoverage > peerCoverage) leaning = "Ça penche plutôt vers le résultat qui a la meilleure couverture.";

  const retest = `À retester surtout sur ${conflictFocusLabel(best.snap)}.`;
  const provisional = (best.match?.tier || 0) >= 3
    ? "En attendant, garde le résultat du bon contexte comme repère provisoire."
    : "En attendant, garde le résultat le plus solide disponible comme repère provisoire.";

  return {
    short: "résultat encore partagé",
    reason: reasons[0],
    reasons,
    leaning,
    retest,
    provisional,
  };
}

function annotateSelection(snap, match, conflict = null) {
  return {
    ...snap,
    __selection: {
      tier: match?.tier || 0,
      label: match?.label || "fallback global",
      reason: match?.reason || "retenu par défaut",
      coverage: snapshotCoverageLabel(snap),
      conflict,
      scope: contextScopeKind(snap),
    },
  };
}

function selectBestPerProto(published = [], matcher) {
  const groups = new Map();
  for (const snap of published || []) {
    const proto = String(snap?.protoId || "");
    if (!proto) continue;
    if (!groups.has(proto)) groups.set(proto, []);
    groups.get(proto).push(snap);
  }

  const chosen = [];
  for (const snaps of groups.values()) {
    const assessed = snaps.map((snap) => ({
      snap,
      match: matcher(snap),
      confRank: signalConfidenceRank(snapshotSolidnessLabel(snap)),
      coverageRank: snapshotCoverageRank(snap),
      publishedAt: Number(snap?.publishedAt || 0),
    })).sort((a, b) => {
      if ((b.match?.tier || 0) !== (a.match?.tier || 0)) return (b.match?.tier || 0) - (a.match?.tier || 0);
      if ((b.match?.score || 0) !== (a.match?.score || 0)) return (b.match?.score || 0) - (a.match?.score || 0);
      if (b.confRank !== a.confRank) return b.confRank - a.confRank;
      if (b.coverageRank !== a.coverageRank) return b.coverageRank - a.coverageRank;
      return b.publishedAt - a.publishedAt;
    });

    if (!assessed.length) continue;
    const best = assessed[0];
    const conflict = selectionConflict(assessed, best);
    chosen.push(annotateSelection(best.snap, best.match, conflict));
  }

  return sortSnapshots(chosen);
}

export function slicePublishedForCharacter(published = [], char) {
  return selectBestPerProto(published, (snap) => matchForCharacter(snap, char));
}

export function slicePublishedForWeapon(published = [], char, weapon) {
  return selectBestPerProto(published, (snap) => matchForWeapon(snap, char, weapon));
}

export function slicePublishedForBoss(published = [], boss) {
  return selectBestPerProto(published, (snap) => matchForBoss(snap, boss));
}

export function slicePublishedForTeam(published = [], team, boss = null) {
  return selectBestPerProto(published, (snap) => matchForTeam(snap, team, boss));
}

export function slicePublishedForEquippableWeapon(published = [], weapon) {
  return selectBestPerProto(published, (snap) => matchForContext(snap, { equippableWeapon: weapon }));
}

export function slicePublishedForContext(published = [], context = {}) {
  return selectBestPerProto(published, (snap) => matchForContext(snap, context));
}

export function summarizeSnapshotRefs(list = []) {
  return (list || []).map((x) => {
    const proto = String(x?.protoId || "?");
    const conf = snapshotSolidnessLabel(x);
    const valid = x?.validCount ?? 0;
    const selection = x?.__selection || {};
    const bits = [conf, `${valid} valides`];
    if (selection.label) bits.push(selection.label.replace(/^fallback /, "global "));
    if (selection.coverage) bits.push(selection.coverage);
    if (selection.conflict) bits.push(selection.conflict?.short || "résultat encore partagé");
    return `${proto} (${bits.join(" · ")})`;
  });
}
