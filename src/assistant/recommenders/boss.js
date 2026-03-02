import {
  getBossDecisionOverlay,
  getBossSignalOverlay,
  slicePublishedForBoss,
  summarizeSnapshotRefs,
} from '../../lib/published-signals.js';

export function buildBossEvidence(boss, theory, published = []) {
  const refs = slicePublishedForBoss(published, boss);
  return {
    refs,
    summary: summarizeSnapshotRefs(refs),
    overlay: getBossSignalOverlay(theory, refs),
    decision: getBossDecisionOverlay(theory, refs),
  };
}
