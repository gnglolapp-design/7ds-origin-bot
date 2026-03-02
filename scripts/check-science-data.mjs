import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON } from './lib/fs-utils.mjs';

function fail(message) {
  throw new Error(message);
}

export function checkScienceData(root = process.cwd()) {
  const compiledDir = path.join(root, 'data', 'compiled');
  const scienceCharacters = readJSON(path.join(compiledDir, 'science-characters.json'), null);
  const scienceWeaponKits = readJSON(path.join(compiledDir, 'science-weapon-kits.json'), null);
  const scienceSkills = readJSON(path.join(compiledDir, 'science-skills.json'), null);
  const scienceBosses = readJSON(path.join(compiledDir, 'science-bosses.json'), null);
  const scienceBossPhases = readJSON(path.join(compiledDir, 'science-boss-phases.json'), null);
  const scienceEquippableWeapons = readJSON(path.join(compiledDir, 'science-equippable-weapons.json'), null);
  const scienceElements = readJSON(path.join(compiledDir, 'science-elements.json'), null);
  const scienceStatuses = readJSON(path.join(compiledDir, 'science-statuses.json'), null);
  const scienceScenarios = readJSON(path.join(compiledDir, 'science-scenarios.json'), null);
  const scienceBurstEffects = readJSON(path.join(compiledDir, 'science-burst-effects.json'), null);
  const scienceCombinedAttacks = readJSON(path.join(compiledDir, 'science-combined-attacks.json'), null);
  const scienceEvadeRules = readJSON(path.join(compiledDir, 'science-evade-rules.json'), null);

  if (!scienceCharacters?.items?.length) fail('science-characters.json vide ou absent');
  if (!scienceWeaponKits?.items?.length) fail('science-weapon-kits.json vide ou absent');
  if (!scienceSkills?.items?.length) fail('science-skills.json vide ou absent');
  if (!scienceBosses?.items?.length) fail('science-bosses.json vide ou absent');
  if (!Array.isArray(scienceBossPhases?.items)) fail('science-boss-phases.json absent ou invalide');
  if (!Array.isArray(scienceEquippableWeapons?.items)) fail('science-equippable-weapons.json absent ou invalide');
  if (!scienceElements?.items?.length) fail('science-elements.json vide ou absent');
  if (!Array.isArray(scienceStatuses?.items)) fail('science-statuses.json absent ou invalide');
  if (!scienceScenarios?.items?.length) fail('science-scenarios.json vide ou absent');
  if (!scienceBurstEffects?.items?.length) fail('science-burst-effects.json vide ou absent');
  if (!Array.isArray(scienceCombinedAttacks?.items)) fail('science-combined-attacks.json absent ou invalide');
  if (!Array.isArray(scienceEvadeRules?.items)) fail('science-evade-rules.json absent ou invalide');

  const characterIds = new Set();
  for (const item of scienceCharacters.items) {
    if (!item?.character_id) fail('character_id manquant dans science-characters');
    if (characterIds.has(item.character_id)) fail(`character_id dupliqué: ${item.character_id}`);
    characterIds.add(item.character_id);
  }

  const weaponKitIds = new Set();
  for (const item of scienceWeaponKits.items) {
    if (!item?.weapon_kit_id) fail('weapon_kit_id manquant dans science-weapon-kits');
    if (weaponKitIds.has(item.weapon_kit_id)) fail(`weapon_kit_id dupliqué: ${item.weapon_kit_id}`);
    weaponKitIds.add(item.weapon_kit_id);
    if (!item?.character_id || !characterIds.has(item.character_id)) {
      fail(`weapon kit orphelin: ${item?.weapon_kit_id}`);
    }
  }

  for (const character of scienceCharacters.items) {
    for (const weaponKitId of character.weapon_kit_ids || []) {
      if (!weaponKitIds.has(weaponKitId)) {
        fail(`weapon_kit_id absent depuis science-characters: ${weaponKitId}`);
      }
    }
  }

  const skillIds = new Set();
  for (const item of scienceSkills.items) {
    if (!item?.skill_id) fail('skill_id manquant dans science-skills');
    if (skillIds.has(item.skill_id)) fail(`skill_id dupliqué: ${item.skill_id}`);
    skillIds.add(item.skill_id);
    if (!item?.weapon_kit_id || !weaponKitIds.has(item.weapon_kit_id)) fail(`skill orpheline: ${item?.skill_id}`);
    if (!item?.character_id || !characterIds.has(item.character_id)) fail(`skill sans character valide: ${item?.skill_id}`);
  }

  for (const kit of scienceWeaponKits.items) {
    for (const skillId of (kit.skill_ids || [])) {
      if (!skillIds.has(skillId)) fail(`skill_id absent depuis science-weapon-kits: ${skillId}`);
    }
  }

  const bossPhaseIds = new Set();
  for (const item of scienceBossPhases.items) {
    if (!item?.phase_id) fail('phase_id manquant dans science-boss-phases');
    if (bossPhaseIds.has(item.phase_id)) fail(`phase_id dupliqué: ${item.phase_id}`);
    bossPhaseIds.add(item.phase_id);
  }

  const equippableWeaponIds = new Set();
  for (const item of scienceEquippableWeapons.items) {
    if (!item?.weapon_id) fail('weapon_id manquant dans science-equippable-weapons');
    if (equippableWeaponIds.has(item.weapon_id)) fail(`weapon_id dupliqué: ${item.weapon_id}`);
    equippableWeaponIds.add(item.weapon_id);
  }


  const burstEffectIds = new Set();
  for (const item of scienceBurstEffects.items) {
    if (!item?.burst_effect_id) fail('burst_effect_id manquant dans science-burst-effects');
    if (burstEffectIds.has(item.burst_effect_id)) fail(`burst_effect_id dupliqué: ${item.burst_effect_id}`);
    burstEffectIds.add(item.burst_effect_id);
  }

  const combinedAttackIds = new Set();
  for (const item of scienceCombinedAttacks.items) {
    if (!item?.combined_attack_id) fail('combined_attack_id manquant dans science-combined-attacks');
    if (combinedAttackIds.has(item.combined_attack_id)) fail(`combined_attack_id dupliqué: ${item.combined_attack_id}`);
    combinedAttackIds.add(item.combined_attack_id);
  }

  const evadeRuleIds = new Set();
  for (const item of scienceEvadeRules.items) {
    if (!item?.evade_rule_id) fail('evade_rule_id manquant dans science-evade-rules');
    if (evadeRuleIds.has(item.evade_rule_id)) fail(`evade_rule_id dupliqué: ${item.evade_rule_id}`);
    evadeRuleIds.add(item.evade_rule_id);
  }
  const bossIds = new Set();
  for (const item of scienceBosses.items) {
    if (!item?.boss_id) fail('boss_id manquant dans science-bosses');
    if (bossIds.has(item.boss_id)) fail(`boss_id dupliqué: ${item.boss_id}`);
    bossIds.add(item.boss_id);
    for (const phaseId of (item.phase_ids || [])) {
      if (!bossPhaseIds.has(phaseId)) fail(`phase_id absente depuis science-bosses: ${phaseId}`);
    }
  }

  for (const phase of scienceBossPhases.items) {
    if (!phase?.boss_id || !bossIds.has(phase.boss_id)) fail(`phase orpheline: ${phase?.phase_id}`);
  }

  return {
    ok: true,
    summary: {
      characters: scienceCharacters.items.length,
      weapon_kits: scienceWeaponKits.items.length,
      skills: scienceSkills.items.length,
      bosses: scienceBosses.items.length,
      boss_phases: scienceBossPhases.items.length,
      equippable_weapons: scienceEquippableWeapons.items.length,
      elements: scienceElements.items.length,
      statuses: scienceStatuses.items.length,
      scenarios: scienceScenarios.items.length,
      burst_effects: scienceBurstEffects.items.length,
      combined_attacks: scienceCombinedAttacks.items.length,
      evade_rules: scienceEvadeRules.items.length,
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = checkScienceData();
  console.log(`OK science-check: ${JSON.stringify(result.summary)}`);
}
