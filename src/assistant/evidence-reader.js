import {
  contextCompactSummary,
  getPublishedSignalsIndex,
  slicePublishedForBoss,
  slicePublishedForCharacter,
  slicePublishedForContext,
  slicePublishedForEquippableWeapon,
  slicePublishedForTeam,
  slicePublishedForWeapon,
  summarizeSnapshotRefs,
} from '../lib/published-signals.js';
import { buildDecisionCards } from '../testlab/publication/decision-cards.js';

function buildEvidenceCards(refs = [], limit = 6) {
  return (refs || [])
    .flatMap((ref) => {
      const cards = Array.isArray(ref?.decisionCards) && ref.decisionCards.length
        ? ref.decisionCards
        : buildDecisionCards(ref?.protoId, ref);
      return cards.map((card) => ({ ...card, protoId: String(ref?.protoId || '') }));
    })
    .slice(0, limit);
}

function buildContextSummary(refs = [], limit = 3) {
  return Array.from(new Set(
    (refs || [])
      .map((ref) => contextCompactSummary(ref?.contexts || {}))
      .filter(Boolean)
  )).slice(0, limit);
}

function packEvidence(published, refs) {
  return {
    published,
    refs,
    summary: summarizeSnapshotRefs(refs),
    contextSummary: buildContextSummary(refs),
    cards: buildEvidenceCards(refs),
  };
}

export async function readPublishedIndex(kv) {
  return await getPublishedSignalsIndex(kv);
}

export async function readEvidenceForCharacter(kv, char) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForCharacter(published, char);
  return packEvidence(published, refs);
}

export async function readEvidenceForWeapon(kv, char, weapon) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForWeapon(published, char, weapon);
  return packEvidence(published, refs);
}

export async function readEvidenceForBoss(kv, boss) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForBoss(published, boss);
  return packEvidence(published, refs);
}

export async function readEvidenceForTeam(kv, team, boss = null) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForTeam(published, team, boss);
  return packEvidence(published, refs);
}

export async function readEvidenceForEquippableWeapon(kv, weapon) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForEquippableWeapon(published, weapon);
  return packEvidence(published, refs);
}

export async function readEvidenceForContext(kv, context = {}) {
  const published = await getPublishedSignalsIndex(kv);
  const refs = slicePublishedForContext(published, context);
  return packEvidence(published, refs);
}
