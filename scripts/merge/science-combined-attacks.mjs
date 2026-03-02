import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';

const DEFAULT_ITEMS = [
  {
    combined_attack_id: 'system__combined_attack__generic',
    actor_ids: [],
    triggers_burst: true,
    burst_element_behavior: 'immediate_trigger',
    notes: 'Combined Attack is treated as a first-class combat event and immediately triggers a Burst system interaction.',
    source_refs: { manual: true, dev_note: true },
  },
  {
    combined_attack_id: 'system__combined_attack__varied_pool',
    actor_ids: [],
    triggers_burst: true,
    burst_element_behavior: 'composition_dependent',
    notes: 'Available Combined Attacks and their pairings are expected to expand over time; the schema must support multiple actor combinations.',
    source_refs: { manual: true, dev_note: true },
  },
];

function normalizeActorIds(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function normalizeItem(entry = {}, index = 0) {
  return {
    combined_attack_id: String(entry.combined_attack_id || '').trim() || `combined_attack_${index + 1}`,
    actor_ids: normalizeActorIds(entry.actor_ids),
    triggers_burst: entry.triggers_burst !== false,
    burst_element_behavior: String(entry.burst_element_behavior || '').trim() || null,
    notes: entry.notes != null ? String(entry.notes).trim() : null,
    source_refs: {
      manual: entry?.source_refs?.manual !== false,
      dev_note: entry?.source_refs?.dev_note !== false,
    },
  };
}

export function buildScienceCombinedAttacks({ manual = [] } = {}) {
  const list = Array.isArray(manual) && manual.length ? manual : DEFAULT_ITEMS;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items: list.map(normalizeItem),
  };
}

export function writeScienceCombinedAttacks(root = process.cwd()) {
  const manualPath = path.join(root, 'data', 'manual', 'combined-attacks.json');
  const payload = buildScienceCombinedAttacks({ manual: readJSON(manualPath, []) });
  writeJSON(path.join(root, 'data', 'compiled', 'science-combined-attacks.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceCombinedAttacks();
  console.log(`OK science-combined-attacks: ${payload.items.length}`);
}
