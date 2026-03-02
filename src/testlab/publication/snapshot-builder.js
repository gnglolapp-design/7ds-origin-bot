import { PROTOCOLS } from '../protocols/registry.js';
import { summarizeProtocolDocs } from '../aggregator/aggregate.js';
import { groupDocsByContext } from '../aggregator/cohorts.js';

export function publishConfidenceLabel(validCount, docs = []) {
  const { solidity } = summarizeProtocolDocs(
    docs.length ? docs : Array.from({ length: Number(validCount || 0) }, () => ({ status: 'ok', metric: 1 })),
  );
  return solidity.label;
}

export function buildIndexEntry(protoId, title, publishedAt, actorId, docs, options = {}) {
  const { describeProtocolContexts = () => ({}) } = options;
  const { validCount, suspectCount, rejectedCount, solidity } = summarizeProtocolDocs(docs);
  const confidence = publishConfidenceLabel(validCount, docs);
  const contexts = describeProtocolContexts(protoId, docs);

  return {
    snapshotId: `${protoId}:${options.scopeType || 'global'}:${options.scopeValue || 'all'}:${publishedAt}`,
    protoId,
    title,
    publishedAt,
    publishedBy: String(actorId || 'unknown'),
    confidence,
    solidness: confidence,
    solidReason: solidity.reason,
    solidScore: solidity.score,
    solidConflict: solidity.conflict || null,
    validCount,
    suspectCount,
    rejectedCount,
    contexts,
    scopeType: options.scopeType || 'global',
    scopeValue: options.scopeValue || 'all',
    scopeLabel: options.scopeLabel || null,
    isPrimary: Boolean(options.isPrimary),
  };
}

export function buildContextEntries(protoId, title, publishedAt, actorId, docs = [], options = {}) {
  const { describeProtocolContexts = () => ({}) } = options;
  const out = [];
  const minContextDocs = Math.max(3, Math.ceil((PROTOCOLS?.[protoId]?.min_n || 10) / 4));

  const pushEntries = (scopeType, fieldNames, labelPrefix) => {
    for (const [value, subset] of groupDocsByContext(docs, fieldNames).entries()) {
      const valid = subset.filter((d) => d.status === 'ok' && d.metric != null).length;
      if (valid < minContextDocs) continue;
      out.push(buildIndexEntry(protoId, title, publishedAt, actorId, subset, {
        describeProtocolContexts,
        scopeType,
        scopeValue: value,
        scopeLabel: `${labelPrefix} ${value}`,
        isPrimary: false,
      }));
    }
  };

  pushEntries('character', ['perso'], 'perso');
  pushEntries('weapon', ['arme', 'arme_a', 'arme_b', 'weapon_kit_id'], 'arme');
  pushEntries('equippable_weapon', ['equippable_weapon_id'], 'équipable');
  pushEntries('boss', ['boss', 'boss_id'], 'boss');
  pushEntries('phase', ['phase_id'], 'phase');
  pushEntries('element', ['element_id', 'active_burst_element_id'], 'élément');
  pushEntries('scenario', ['scenario_id'], 'scénario');
  pushEntries('burst', ['burst_effect_id', 'burst_family', 'deluge_state'], 'burst');
  pushEntries('combined', ['combined_attack_id'], 'combined');
  pushEntries('evade', ['evade_rule_id', 'successful_evade'], 'esquive');
  pushEntries('costume', ['costume'], 'costume');
  pushEntries('potential', ['potential'], 'potentiel');
  return out;
}
