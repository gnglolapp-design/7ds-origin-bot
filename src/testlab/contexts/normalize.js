import {
  buildBossId,
  buildBossPhaseId,
  buildBurstEffectId,
  buildCharacterId,
  buildCombinedAttackId,
  buildCostumeId,
  buildEvadeRuleId,
  buildScenarioId,
  buildWeaponKitId,
  scienceSlug,
} from './keys.js';

const ELEMENT_ALIASES = new Map([
  ['fire', 'fire'],
  ['feu', 'fire'],
  ['cold', 'cold'],
  ['ice', 'cold'],
  ['glace', 'cold'],
  ['earth', 'earth'],
  ['terre', 'earth'],
  ['lightning', 'lightning'],
  ['thunder', 'lightning'],
  ['foudre', 'lightning'],
  ['wind', 'wind'],
  ['vent', 'wind'],
  ['physical', 'physical'],
  ['physique', 'physical'],
  ['holy', 'holy'],
  ['light', 'holy'],
  ['lumiere', 'holy'],
  ['darkness', 'darkness'],
  ['dark', 'darkness'],
  ['tenebres', 'darkness'],
]);

export function normalizeScienceText(value) {
  return String(value ?? '').trim();
}

export function normalizeElement(value) {
  const raw = scienceSlug(value);
  return ELEMENT_ALIASES.get(raw) || (raw || null);
}

export function normalizeScenario(value) {
  const raw = scienceSlug(value);
  return raw ? buildScenarioId(raw) : null;
}


export function normalizeBurstFamily(value) {
  const raw = scienceSlug(value);
  if (raw === 'special' || raw === 'normal') return raw;
  return null;
}

export function normalizeBooleanish(value) {
  if (value === true || value === false) return value;
  const raw = scienceSlug(value);
  if (!raw) return null;
  if (['1', 'true', 'yes', 'oui', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'non', 'off'].includes(raw)) return false;
  return null;
}

export function normalizeSubmissionContext(raw = {}) {
  const characterSlug = raw.character_id || raw.character || raw.perso || raw.slug || null;
  const weaponName = raw.weapon_name || raw.weapon || raw.arme || null;
  const costumeName = raw.costume_name || raw.costume || null;
  const bossSlug = raw.boss_id || raw.boss || null;
  const equippableWeaponId = raw.equippable_weapon_id || raw.weapon_id || raw.arme_equipable || raw.equipment_weapon || null;
  const character_id = characterSlug ? buildCharacterId(characterSlug) : null;
  const weapon_kit_id = character_id && weaponName
    ? buildWeaponKitId(character_id, weaponName, Number(raw.kit_index) || 1)
    : null;
  const costume_id = character_id && costumeName
    ? buildCostumeId(character_id, costumeName, Number(raw.costume_index) || 1)
    : null;

  const boss_id = bossSlug ? buildBossId(bossSlug) : null;
  const phaseRaw = raw.phase_id || raw.boss_phase_id || raw.phase || null;
  const burstEffectRaw = raw.burst_effect_id || raw.burst_effect || raw.deluge_effect || null;
  const combinedAttackRaw = raw.combined_attack_id || raw.combined_attack || raw.combined || null;
  const evadeRuleRaw = raw.evade_rule_id || raw.evade_rule || null;

  return {
    character_id,
    weapon_kit_id,
    boss_id,
    equippable_weapon_id: equippableWeaponId ? scienceSlug(equippableWeaponId) : null,
    phase_id: phaseRaw
      ? (String(phaseRaw).includes('__phase__') ? String(phaseRaw) : (boss_id ? buildBossPhaseId(boss_id, phaseRaw) : scienceSlug(phaseRaw)))
      : null,
    element_id: normalizeElement(raw.element_id || raw.element || raw.attribute),
    costume_id,
    potential_id: raw.potential_id || raw.potential || null,
    scenario_id: normalizeScenario(raw.scenario_id || raw.scenario),
    burst_effect_id: burstEffectRaw ? buildBurstEffectId(burstEffectRaw) : null,
    burst_family: normalizeBurstFamily(raw.burst_family || raw.burst_type || raw.deluge_family),
    active_burst_element_id: normalizeElement(raw.active_burst_element_id || raw.active_burst_element || raw.burst_element),
    combined_attack_id: combinedAttackRaw ? buildCombinedAttackId(combinedAttackRaw) : null,
    successful_evade: normalizeBooleanish(raw.successful_evade ?? raw.evade_success ?? raw.evaded),
    evade_rule_id: evadeRuleRaw ? buildEvadeRuleId(evadeRuleRaw) : null,
    deluge_state: scienceSlug(raw.deluge_state || raw.burst_gauge_state || raw.deluge || '') || null,
  };
}
