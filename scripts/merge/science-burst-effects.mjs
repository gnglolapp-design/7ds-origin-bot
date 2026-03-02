import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';

const DEFAULT_EFFECTS = [
  {
    burst_effect_id: 'burst_normal_earth',
    burst_family: 'normal',
    element_id: 'earth',
    common_effect: 'When attacking with any Element, increases the damage taken by the target affected by the activated Burst.',
    unique_effect: 'Creates a barrier upon activation, and the barrier is strengthened when attacking enemies affected by the Burst.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: null,
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_normal_lightning',
    burst_family: 'normal',
    element_id: 'lightning',
    common_effect: 'When attacking with any Element, increases the damage taken by the target affected by the activated Burst.',
    unique_effect: 'After the Burst occurs, taking damage causes additional damage to the target and nearby enemies.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: null,
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_normal_wind',
    burst_family: 'normal',
    element_id: 'wind',
    common_effect: 'When attacking with any Element, increases the damage taken by the target affected by the activated Burst.',
    unique_effect: 'When the Burst occurs, a wind field forms around the target, pulling in nearby monsters.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: null,
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_normal_fire',
    burst_family: 'normal',
    element_id: 'fire',
    common_effect: 'When attacking with any Element, increases the damage taken by the target affected by the activated Burst.',
    unique_effect: 'After the Burst occurs, taking damage triggers an explosion on the target, dealing additional damage.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: null,
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_normal_cold',
    burst_family: 'normal',
    element_id: 'cold',
    common_effect: 'When attacking with any Element, increases the damage taken by the target affected by the activated Burst.',
    unique_effect: 'When the Burst occurs, applies a Cold stack to the target. Attacks with the Cold Element add stacks, and upon reaching the maximum stack, the target becomes Frozen.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: null,
    freeze_stack_rule: 'cold_stack_to_freeze',
    burst_resistance_interaction: 'cold_burst_resistance',
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_special_darkness',
    burst_family: 'special',
    element_id: 'darkness',
    common_effect: null,
    unique_effect: 'When the Burst occurs, converts any active Normal Elemental Burst into a Darkness Elemental Burst and extends its duration.',
    converts_active_burst: true,
    extends_duration: true,
    gauge_feed_target: null,
    freeze_stack_rule: null,
    burst_resistance_interaction: 'darkness_burst_resistance',
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_special_holy',
    burst_family: 'special',
    element_id: 'holy',
    common_effect: null,
    unique_effect: 'Does not trigger a Burst, but increases the Burst Gauge of the most recently accumulated Element.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: 'most_recent_element',
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
  {
    burst_effect_id: 'burst_special_physical',
    burst_family: 'special',
    element_id: 'physical',
    common_effect: null,
    unique_effect: 'Does not trigger a Burst, but increases the Burst Gauge of the most recently accumulated Element.',
    converts_active_burst: false,
    extends_duration: false,
    gauge_feed_target: 'most_recent_element',
    freeze_stack_rule: null,
    burst_resistance_interaction: null,
    source_refs: { manual: true, dev_note: true },
  },
];

function normalizeItem(entry = {}, index = 0) {
  return {
    burst_effect_id: String(entry.burst_effect_id || '').trim() || `burst_effect_${index + 1}`,
    burst_family: entry.burst_family === 'special' ? 'special' : 'normal',
    element_id: String(entry.element_id || '').trim() || null,
    common_effect: entry.common_effect != null ? String(entry.common_effect).trim() : null,
    unique_effect: entry.unique_effect != null ? String(entry.unique_effect).trim() : null,
    converts_active_burst: Boolean(entry.converts_active_burst),
    extends_duration: Boolean(entry.extends_duration),
    gauge_feed_target: entry.gauge_feed_target != null ? String(entry.gauge_feed_target).trim() : null,
    freeze_stack_rule: entry.freeze_stack_rule != null ? String(entry.freeze_stack_rule).trim() : null,
    burst_resistance_interaction: entry.burst_resistance_interaction != null ? String(entry.burst_resistance_interaction).trim() : null,
    source_refs: {
      manual: entry?.source_refs?.manual !== false,
      dev_note: entry?.source_refs?.dev_note !== false,
    },
  };
}

export function buildScienceBurstEffects({ manual = [] } = {}) {
  const list = Array.isArray(manual) && manual.length ? manual : DEFAULT_EFFECTS;
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items: list.map(normalizeItem),
  };
}

export function writeScienceBurstEffects(root = process.cwd()) {
  const manualPath = path.join(root, 'data', 'manual', 'burst-effects.json');
  const payload = buildScienceBurstEffects({ manual: readJSON(manualPath, []) });
  writeJSON(path.join(root, 'data', 'compiled', 'science-burst-effects.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceBurstEffects();
  console.log(`OK science-burst-effects: ${payload.items.length}`);
}
