const CONTEXT_FIELDS = ['character_id', 'weapon_kit_id', 'equippable_weapon_id', 'boss_id', 'phase_id', 'element_id', 'costume_id', 'potential_id', 'scenario_id', 'burst_effect_id', 'burst_family', 'active_burst_element_id', 'combined_attack_id', 'successful_evade', 'evade_rule_id', 'deluge_state'];


export function buildContextSignature(doc = {}, fields = CONTEXT_FIELDS) {
  return fields
    .map((field) => `${field}=${String(doc?.[field] || '').trim() || '-'}`)
    .join('|');
}

export function buildContextIndex(docs = [], fields = CONTEXT_FIELDS) {
  const map = new Map();
  for (const doc of docs) {
    const sig = buildContextSignature(doc, fields);
    if (!map.has(sig)) map.set(sig, []);
    map.get(sig).push(doc);
  }
  return map;
}