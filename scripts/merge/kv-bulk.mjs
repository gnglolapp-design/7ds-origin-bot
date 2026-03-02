export function buildKvBulk(characters, bosses, meta = null, tierlist = null, nouveautes = null, extra = {}) {
  const entries = [];
  entries.push({
    key: 'index:characters',
    value: JSON.stringify(characters.map((c) => ({ name: c.name, slug: c.slug }))),
  });
  entries.push({
    key: 'index:bosses',
    value: JSON.stringify(bosses.map((b) => ({ name: b.name, slug: b.slug }))),
  });
  if (meta) {
    entries.push({ key: 'meta:base', value: JSON.stringify(meta) });
  }
  if (tierlist) {
    entries.push({ key: 'meta:tierlist', value: JSON.stringify(tierlist) });
  }
  if (nouveautes) {
    entries.push({ key: 'meta:nouveautes', value: JSON.stringify(nouveautes) });
  }
  if (extra?.sourceReport) {
    entries.push({ key: 'meta:source-report', value: JSON.stringify(extra.sourceReport) });
  }
  if (extra?.mediaReport) {
    entries.push({ key: 'meta:media-report', value: JSON.stringify(extra.mediaReport) });
  }
  if (extra?.syncReport) {
    entries.push({ key: 'meta:sync-report', value: JSON.stringify(extra.syncReport) });
  }

  for (const character of characters) {
    entries.push({ key: `char:${character.slug}`, value: JSON.stringify(character) });
  }
  for (const boss of bosses) {
    entries.push({ key: `boss:${boss.slug}`, value: JSON.stringify(boss) });
  }

  const scienceCharacters = extra?.science?.characters?.items || [];
  const scienceWeaponKits = extra?.science?.weaponKits?.items || [];
  const scienceBosses = extra?.science?.bosses?.items || [];
  const scienceBossPhases = extra?.science?.bossPhases?.items || [];
  const scienceSkills = extra?.science?.skills?.items || [];
  const scienceEquippableWeapons = extra?.science?.equippableWeapons?.items || [];
  const scienceElements = extra?.science?.elements?.items || [];
  const scienceStatuses = extra?.science?.statuses?.items || [];
  const scienceScenarios = extra?.science?.scenarios?.items || [];
  const scienceBurstEffects = extra?.science?.burstEffects?.items || [];
  const scienceCombinedAttacks = extra?.science?.combinedAttacks?.items || [];
  const scienceEvadeRules = extra?.science?.evadeRules?.items || [];

  if (scienceCharacters.length) {
    entries.push({
      key: 'science:index:characters',
      value: JSON.stringify(scienceCharacters.map((item) => ({ character_id: item.character_id, slug: item.slug, name: item.name }))),
    });
    for (const item of scienceCharacters) {
      entries.push({ key: `science:char:${item.character_id}`, value: JSON.stringify(item) });
    }
  }

  if (scienceWeaponKits.length) {
    entries.push({
      key: 'science:index:weapon-kits',
      value: JSON.stringify(scienceWeaponKits.map((item) => ({
        weapon_kit_id: item.weapon_kit_id,
        character_id: item.character_id,
        kit_index: item.kit_index,
        name: item.name,
      }))),
    });
    for (const item of scienceWeaponKits) {
      entries.push({ key: `science:kit:${item.weapon_kit_id}`, value: JSON.stringify(item) });
    }
  }

  if (scienceSkills.length) {
    entries.push({
      key: 'science:index:skills',
      value: JSON.stringify(scienceSkills.map((item) => ({
        skill_id: item.skill_id,
        character_id: item.character_id,
        weapon_kit_id: item.weapon_kit_id,
        name: item.name,
        kind_id: item.kind_id,
      }))),
    });
    for (const item of scienceSkills) {
      entries.push({ key: `science:skill:${item.skill_id}`, value: JSON.stringify(item) });
    }
  }

  if (scienceBosses.length) {
    entries.push({
      key: 'science:index:bosses',
      value: JSON.stringify(scienceBosses.map((item) => ({ boss_id: item.boss_id, slug: item.slug, name: item.name }))),
    });
    for (const item of scienceBosses) {
      entries.push({ key: `science:boss:${item.boss_id}`, value: JSON.stringify(item) });
    }
  }

  if (scienceBossPhases.length) {
    entries.push({
      key: 'science:index:boss-phases',
      value: JSON.stringify(scienceBossPhases.map((item) => ({
        phase_id: item.phase_id,
        boss_id: item.boss_id,
        phase_key: item.phase_key,
        name: item.name,
      }))),
    });
    for (const item of scienceBossPhases) {
      entries.push({ key: `science:boss-phase:${item.phase_id}`, value: JSON.stringify(item) });
    }
  }

  if (scienceEquippableWeapons.length) {
    entries.push({
      key: 'science:index:equippable-weapons',
      value: JSON.stringify(scienceEquippableWeapons.map((item) => ({
        weapon_id: item.weapon_id,
        name: item.name,
        weapon_type: item.weapon_type,
      }))),
    });
    for (const item of scienceEquippableWeapons) {
      entries.push({ key: `science:weapon:${item.weapon_id}`, value: JSON.stringify(item) });
    }
  }

  entries.push({ key: 'science:meta:elements', value: JSON.stringify(scienceElements) });
  entries.push({ key: 'science:meta:statuses', value: JSON.stringify(scienceStatuses) });
  entries.push({ key: 'science:meta:scenarios', value: JSON.stringify(scienceScenarios) });
  entries.push({ key: 'science:meta:burst-effects', value: JSON.stringify(scienceBurstEffects) });
  entries.push({ key: 'science:meta:combined-attacks', value: JSON.stringify(scienceCombinedAttacks) });
  entries.push({ key: 'science:meta:evade-rules', value: JSON.stringify(scienceEvadeRules) });

  return entries;
}
