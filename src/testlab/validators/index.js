import { requiredText } from './common.js';
import { validateScienceContext } from './context.js';
import { validateProtocolSpecific, protocolSuspectWarnings } from './protocol-specific.js';
import { PROTOCOLS } from '../protocols/registry.js';

export async function validateSubmission(kv, protoId, data) {
  const p = PROTOCOLS[protoId];
  if (!p) return { status: 'reject', errors: ['Protocole inconnu'], warnings: [] };

  const errs = [];
  errs.push(requiredText('perso', data.perso) || '');
  errs.push(...validateProtocolSpecific(protoId, data));

  const contextCheck = await validateScienceContext(kv, {
    character_id: data.character_id || data.perso || null,
    weapon_kit_id: data.weapon_kit_id || null,
    equippable_weapon_id: data.equippable_weapon_id || null,
    boss_id: data.boss_id || data.boss || null,
    phase_id: data.phase_id || data.boss_phase_id || null,
    element_id: data.element_id || null,
    scenario_id: data.scenario_id || null,
    burst_effect_id: data.burst_effect_id || null,
    burst_family: data.burst_family || null,
    active_burst_element_id: data.active_burst_element_id || null,
    combined_attack_id: data.combined_attack_id || null,
    successful_evade: data.successful_evade ?? null,
    evade_rule_id: data.evade_rule_id || null,
    deluge_state: data.deluge_state || null,
  });
  errs.push(...(contextCheck.errors || []));

  const cleaned = errs.filter(Boolean);
  if (cleaned.length) return { status: 'reject', errors: cleaned, warnings: contextCheck.warnings || [] };

  const minN = p.min_n || 1;
  let observedN = null;
  if (data.n != null) observedN = Number(data.n);
  if (data.attempts != null) observedN = Number(data.attempts);
  if (observedN != null && observedN < minN) {
    return { status: 'reject', errors: [`N trop faible (min ${minN})`], warnings: contextCheck.warnings || [] };
  }

  const suspect = protocolSuspectWarnings(protoId, data);
  return {
    status: suspect.status,
    errors: [],
    warnings: [...(contextCheck.warnings || []), ...(suspect.warnings || [])],
  };
}
