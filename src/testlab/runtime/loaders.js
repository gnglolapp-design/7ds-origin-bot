import { KV_KEYS } from '../../constants.js';
import { kvGetJSON } from '../../lib/kv.js';

export async function loadScienceCharacterIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_CHAR_INDEX, []);
}

export async function loadScienceCharacter(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_CHAR_PREFIX}${id}`, null);
}

export async function loadScienceWeaponKitIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_KIT_INDEX, []);
}

export async function loadScienceWeaponKit(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_KIT_PREFIX}${id}`, null);
}

export async function loadScienceSkillIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_SKILL_INDEX, []);
}

export async function loadScienceSkill(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_SKILL_PREFIX}${id}`, null);
}

export async function loadScienceBossIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_BOSS_INDEX, []);
}

export async function loadScienceBoss(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_BOSS_PREFIX}${id}`, null);
}

export async function loadScienceBossPhaseIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_BOSS_PHASE_INDEX, []);
}

export async function loadScienceBossPhase(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_BOSS_PHASE_PREFIX}${id}`, null);
}

export async function loadScienceEquippableWeaponIndex(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_WEAPON_INDEX, []);
}

export async function loadScienceEquippableWeapon(kv, id) {
  return kvGetJSON(kv, `${KV_KEYS.SCI_WEAPON_PREFIX}${id}`, null);
}

export async function loadScienceElements(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_ELEMENTS, []);
}

export async function loadScienceStatuses(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_STATUSES, []);
}

export async function loadScienceScenarios(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_SCENARIOS, []);
}

export async function loadScienceBurstEffects(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_BURST_EFFECTS, []);
}

export async function loadScienceCombinedAttacks(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_COMBINED_ATTACKS, []);
}

export async function loadScienceEvadeRules(kv) {
  return kvGetJSON(kv, KV_KEYS.SCI_EVADE_RULES, []);
}

export async function loadScienceBurstEffect(kv, id) {
  const all = await loadScienceBurstEffects(kv);
  const list = Array.isArray(all?.items) ? all.items : (Array.isArray(all) ? all : []);
  return list.find((x) => String(x?.burst_effect_id || '') === String(id || '')) || null;
}

export async function loadScienceCombinedAttack(kv, id) {
  const all = await loadScienceCombinedAttacks(kv);
  const list = Array.isArray(all?.items) ? all.items : (Array.isArray(all) ? all : []);
  return list.find((x) => String(x?.combined_attack_id || '') === String(id || '')) || null;
}

export async function loadScienceEvadeRule(kv, id) {
  const all = await loadScienceEvadeRules(kv);
  const list = Array.isArray(all?.items) ? all.items : (Array.isArray(all) ? all : []);
  return list.find((x) => String(x?.evade_rule_id || '') === String(id || '')) || null;
}
