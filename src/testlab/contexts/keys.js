function normalizeText(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function scienceSlug(value = '') {
  return normalizeText(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCharacterId(slug) {
  return scienceSlug(slug);
}

export function buildWeaponKitId(characterSlug, weaponName, index = 1) {
  const charId = buildCharacterId(characterSlug);
  const weaponId = scienceSlug(weaponName || `kit-${index}`) || `kit-${index}`;
  return `${charId}__kit_${index}__${weaponId}`;
}

export function buildSkillId(characterSlug, kitIndex = 1, skillIndex = 1) {
  const charId = buildCharacterId(characterSlug);
  return `${charId}__kit_${kitIndex}__skill_${skillIndex}`;
}

export function buildCostumeId(characterSlug, costumeName, index = 1) {
  const charId = buildCharacterId(characterSlug);
  const costumeId = scienceSlug(costumeName || `costume-${index}`) || `costume-${index}`;
  return `${charId}__costume_${index}__${costumeId}`;
}

export function buildBossId(slug) {
  return scienceSlug(slug);
}

export function buildBossPhaseId(bossSlug, phaseKey) {
  const bossId = buildBossId(bossSlug);
  const phaseId = scienceSlug(phaseKey || 'phase') || 'phase';
  return `${bossId}__phase__${phaseId}`;
}

export function buildScenarioId(value) {
  return scienceSlug(value);
}

export function buildBurstEffectId(value) {
  return scienceSlug(value);
}

export function buildCombinedAttackId(value) {
  return scienceSlug(value);
}

export function buildEvadeRuleId(value) {
  return scienceSlug(value);
}
