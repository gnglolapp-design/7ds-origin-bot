import { signalConfidenceRank, snapshotSolidnessLabel } from '../../lib/published-signals.js';
import { buildPersoEvidence, buildPersoWeaponEvidence } from './perso.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function includesAny(blob, needles = []) {
  const hay = normalize(blob);
  return needles.some((needle) => hay.includes(normalize(needle)));
}

function protoRank(list = [], protoId) {
  const snap = (list || []).find((entry) => String(entry?.protoId || '') === String(protoId || ''));
  return snap ? signalConfidenceRank(snapshotSolidnessLabel(snap)) : 0;
}

function exactContextCount(list = []) {
  return (list || []).filter((entry) => String(entry?.__selection?.label || '') === 'contexte exact').length;
}

function firstUseful(list = [], fallback = 'Non disponible pour l’instant') {
  const arr = Array.isArray(list) ? list : [list];
  const hit = arr.map((x) => String(x || '').trim()).find(Boolean);
  return hit || fallback;
}

function compactReason(list = [], fallback = 'Non disponible pour l’instant', max = 72) {
  const text = firstUseful(list, fallback).replace(/^[-•]\s*/, '').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function scoreCharacterChoice(summary, published = []) {
  const theory = summary?.theory || {};
  const blob = [
    ...(theory?.functions || []),
    ...(theory?.dominant || []),
    ...(theory?.planRole || []),
    ...(theory?.dependencies || []),
    theory?.stability,
    theory?.conversion,
  ].join(' \n ');
  const exact = exactContextCount(published) * 3;
  const base = Math.min(5, published.length) + exact;
  const damage = protoRank(published, 'WEAPON_SKILL_DELTA') * 2 + protoRank(published, 'DAMAGE_WINDOW') * 2 + protoRank(published, 'ORDER_OF_USE') + (includesAny(blob, ['gros dégâts', 'burst', 'crit', 'finir', 'fenêtre']) ? 2 : 0);
  const stable = protoRank(published, 'BOSS_PRESSURE_DELTA') * 3 + protoRank(published, 'BUFF_REAL_UPTIME') + protoRank(published, 'DEBUFF_REAL_UPTIME') + (includesAny(blob, ['simple', 'support', 'tenir', 'survie', 'stable', 'protection', 'barriere']) ? 2 : 0);
  return {
    defaultScore: base + Math.max(damage, stable) + (includesAny(blob, ['simple', 'fiable', 'stable']) ? 1 : 0),
    damageScore: base + damage,
    stableScore: base + stable,
  };
}

function scoreWeaponChoice(summary, published = []) {
  const theory = summary?.compatibilityTheory || {};
  const blob = [
    ...(theory?.functions || []),
    ...(theory?.dominant || []),
    ...(theory?.planRole || []),
    ...(theory?.lines || []),
    theory?.stability,
    theory?.conversion,
  ].join(' \n ');
  const exact = exactContextCount(published) * 3;
  const base = Math.min(5, published.length) + exact;
  const damage = protoRank(published, 'WEAPON_SKILL_DELTA') * 2 + protoRank(published, 'DAMAGE_WINDOW') * 2 + protoRank(published, 'ORDER_OF_USE') + (includesAny(blob, ['gros dégâts', 'burst', 'crit', 'finir', 'fenêtre']) ? 2 : 0);
  const stable = protoRank(published, 'BOSS_PRESSURE_DELTA') * 3 + protoRank(published, 'BUFF_REAL_UPTIME') + protoRank(published, 'DEBUFF_REAL_UPTIME') + (includesAny(blob, ['simple', 'stable', 'tenir', 'support', 'protection', 'barriere']) ? 2 : 0);
  return { defaultScore: base + Math.max(damage, stable), burstScore: base + damage, stableScore: base + stable };
}

export function buildCharacterChoiceLines(char1, left, leftPublished, char2, right, rightPublished) {
  const leftScore = scoreCharacterChoice(left, leftPublished);
  const rightScore = scoreCharacterChoice(right, rightPublished);
  const pickDefault = leftScore.defaultScore >= rightScore.defaultScore ? { char: char1, sum: left } : { char: char2, sum: right };
  const pickDamage = leftScore.damageScore >= rightScore.damageScore ? { char: char1, sum: left } : { char: char2, sum: right };
  const pickStable = leftScore.stableScore >= rightScore.stableScore ? { char: char1, sum: left } : { char: char2, sum: right };
  return [
    `**Priorité 1** · Par défaut : **${pickDefault.char.name}** — ${compactReason([pickDefault.sum.theory?.functions?.[0], pickDefault.sum.theory?.planRole?.[0], pickDefault.sum.theory?.dominant?.[0]], 'le plus simple à rentabiliser')}.`,
    `**Priorité 2** · Plus de dégâts : **${pickDamage.char.name}** — ${compactReason([pickDamage.sum.theory?.conversion, pickDamage.sum.theory?.functions?.[0]], 'le meilleur pour pousser un gros tour')}.`,
    `**Priorité 3** · Plus de stabilité : **${pickStable.char.name}** — ${compactReason([pickStable.sum.theory?.stability, pickStable.sum.theory?.dependencies?.[0]], 'le plus stable quand le combat se brouille')}.`,
  ];
}

export function buildWeaponChoiceLines(char, weapon1, left, leftPublished, weapon2, right, rightPublished) {
  const leftScore = scoreWeaponChoice(left, leftPublished);
  const rightScore = scoreWeaponChoice(right, rightPublished);
  const pickDefault = leftScore.defaultScore >= rightScore.defaultScore ? { weapon: weapon1, sum: left } : { weapon: weapon2, sum: right };
  const pickBurst = leftScore.burstScore >= rightScore.burstScore ? { weapon: weapon1, sum: left } : { weapon: weapon2, sum: right };
  const pickStable = leftScore.stableScore >= rightScore.stableScore ? { weapon: weapon1, sum: left } : { weapon: weapon2, sum: right };
  return [
    `**Priorité 1** · Par défaut : **${pickDefault.weapon.name}** — ${compactReason([pickDefault.sum.compatibilityTheory?.functions?.[0], pickDefault.sum.compatibilityTheory?.planRole?.[0]], 'la plus simple à rentabiliser')}.`,
    `**Priorité 2** · Gros tour : **${pickBurst.weapon.name}** — ${compactReason([pickBurst.sum.compatibilityTheory?.conversion, pickBurst.sum.compatibilityTheory?.dominant?.[0]], 'celle qui pousse le mieux les dégâts')}.`,
    `**Priorité 3** · Plus stable : **${pickStable.weapon.name}** — ${compactReason([pickStable.sum.compatibilityTheory?.stability, pickStable.sum.compatibilityTheory?.lines?.[0]], 'celle qui tient le mieux sous pression')}.`,
  ];
}

export function buildComparePersosEvidence(char1, leftProfile, leftTheory, char2, rightProfile, rightTheory, published = []) {
  const left = buildPersoEvidence(char1, leftProfile, leftTheory, published);
  const right = buildPersoEvidence(char2, rightProfile, rightTheory, published);
  return { left, right };
}

export function buildCompareWeaponsEvidence(char, weapon1, leftTheory, weapon2, rightTheory, published = []) {
  const left = buildPersoWeaponEvidence(char, weapon1, leftTheory, published);
  const right = buildPersoWeaponEvidence(char, weapon2, rightTheory, published);
  return { left, right };
}
