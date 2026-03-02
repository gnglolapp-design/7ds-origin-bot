import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';

const DEFAULT_ITEMS = [
  {
    evade_rule_id: 'evade__successful__generic_bonus',
    trigger_type: 'successful_evade',
    successful_evade_bonus_type: 'hero_type_conditional_bonus',
    applies_to_hero_family: 'all',
    timing_notes: 'Upon successfully evading a powerful enemy attack, additional effects may trigger depending on hero type.',
    source_refs: { manual: true, dev_note: true },
  },
  {
    evade_rule_id: 'evade__responsiveness__fast_chain',
    trigger_type: 'post_evade_command_window',
    successful_evade_bonus_type: 'immediate_followup_window',
    applies_to_hero_family: 'all',
    timing_notes: 'Animations and transition rules are shortened so players can chain into the next action more quickly after evasive input.',
    source_refs: { manual: true, dev_note: true },
  },
];

function normalizeItem(entry = {}, index = 0) {
  return {
    evade_rule_id: String(entry.evade_rule_id || '').trim() || `evade_rule_${index + 1}`,
    trigger_type: String(entry.trigger_type || '').trim() || null,
    successful_evade_bonus_type: String(entry.successful_evade_bonus_type || '').trim() || null,
    applies_to_hero_family: String(entry.applies_to_hero_family || '').trim() || 'all',
    timing_notes: entry.timing_notes != null ? String(entry.timing_notes).trim() : null,
    source_refs: {
      manual: entry?.source_refs?.manual !== false,
      dev_note: entry?.source_refs?.dev_note !== false,
    },
  };
}

export function buildScienceEvadeRules({ manual = [] } = {}) {
  const list = Array.isArray(manual) && manual.length ? manual : DEFAULT_ITEMS;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items: list.map(normalizeItem),
  };
}

export function writeScienceEvadeRules(root = process.cwd()) {
  const manualPath = path.join(root, 'data', 'manual', 'evade-rules.json');
  const payload = buildScienceEvadeRules({ manual: readJSON(manualPath, []) });
  writeJSON(path.join(root, 'data', 'compiled', 'science-evade-rules.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceEvadeRules();
  console.log(`OK science-evade-rules: ${payload.items.length}`);
}
