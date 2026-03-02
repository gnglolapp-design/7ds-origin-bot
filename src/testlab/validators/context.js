import { loadScienceBoss, loadScienceBossPhase, loadScienceBurstEffect, loadScienceCharacter, loadScienceCombinedAttack, loadScienceElements, loadScienceEquippableWeapon, loadScienceEvadeRule, loadScienceWeaponKit } from '../runtime/loaders.js';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export async function validateScienceContext(kv, context = {}) {
  const warnings = [];
  const errors = [];

  const characterId = context.character_id || context.perso || null;
  if (characterId) {
    const char = await loadScienceCharacter(kv, characterId);
    if (!char) warnings.push('character_id inconnu dans la couche science');
  }

  const kitId = context.weapon_kit_id || null;
  let kit = null;
  if (kitId) {
    kit = await loadScienceWeaponKit(kv, kitId);
    if (!kit) {
      warnings.push('weapon_kit_id inconnu dans la couche science');
    } else if (characterId && kit.character_id && normalizeText(kit.character_id) !== normalizeText(characterId)) {
      errors.push('weapon_kit_id ne correspond pas au personnage');
    }
  }

  const equippableWeaponId = context.equippable_weapon_id || null;
  if (equippableWeaponId) {
    const weapon = await loadScienceEquippableWeapon(kv, equippableWeaponId);
    if (!weapon) {
      warnings.push('equippable_weapon_id inconnu dans la couche science');
    } else if (kit?.weapon_type && weapon?.weapon_type && normalizeText(weapon.weapon_type) !== normalizeText(kit.weapon_type)) {
      warnings.push("equippable_weapon_id semble d'un type différent du weapon kit");
    }
  }

  const bossId = context.boss_id || null;
  if (bossId) {
    const boss = await loadScienceBoss(kv, bossId);
    if (!boss) warnings.push('boss_id inconnu dans la couche science');
  }

  const phaseId = context.phase_id || context.boss_phase_id || null;
  if (phaseId) {
    const phase = await loadScienceBossPhase(kv, phaseId);
    if (!phase) {
      warnings.push('phase_id inconnue dans la couche science');
    } else if (bossId && phase.boss_id && normalizeText(phase.boss_id) !== normalizeText(bossId)) {
      errors.push('phase_id ne correspond pas au boss');
    }
  }

  const elementId = context.element_id || null;
  if (elementId) {
    const elements = await loadScienceElements(kv);
    const list = Array.isArray(elements?.items) ? elements.items : (Array.isArray(elements) ? elements : []);
    const found = list.find((x) => normalizeText(x.element_id) === normalizeText(elementId));
    if (!found) warnings.push('element_id inconnu dans la couche science');
  }

  const activeBurstElementId = context.active_burst_element_id || null;
  if (activeBurstElementId) {
    const elements = await loadScienceElements(kv);
    const list = Array.isArray(elements?.items) ? elements.items : (Array.isArray(elements) ? elements : []);
    const found = list.find((x) => normalizeText(x.element_id) === normalizeText(activeBurstElementId));
    if (!found) warnings.push('active_burst_element_id inconnu dans la couche science');
  }


  const burstEffectId = context.burst_effect_id || null;
  if (burstEffectId) {
    const effect = await loadScienceBurstEffect(kv, burstEffectId);
    if (!effect) {
      warnings.push('burst_effect_id inconnu dans la couche science');
    } else {
      if (context.burst_family && normalizeText(effect.burst_family) !== normalizeText(context.burst_family)) {
        warnings.push('burst_family ne correspond pas au burst_effect_id');
      }
      if (context.active_burst_element_id && effect.element_id && normalizeText(effect.element_id) !== normalizeText(context.active_burst_element_id)) {
        warnings.push("active_burst_element_id ne correspond pas à l'effet de burst ciblé");
      }
    }
  }

  const combinedAttackId = context.combined_attack_id || null;
  if (combinedAttackId) {
    const combined = await loadScienceCombinedAttack(kv, combinedAttackId);
    if (!combined) warnings.push('combined_attack_id inconnu dans la couche science');
  }

  const evadeRuleId = context.evade_rule_id || null;
  if (evadeRuleId) {
    const evadeRule = await loadScienceEvadeRule(kv, evadeRuleId);
    if (!evadeRule) warnings.push('evade_rule_id inconnu dans la couche science');
  }

  if (context.successful_evade === true && !context.evade_rule_id) {
    warnings.push('successful_evade déclaré sans evade_rule_id');
  }

  return { errors, warnings };
}
