import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { slugify, normalizeAttribute } from '../lib/slug.mjs';

function normalizeElementId(value) {
  const normalized = String(normalizeAttribute(value) || '').trim().toLowerCase();
  return normalized || null;
}

function buildWeaponKitId(characterSlug, weaponName, index = 1) {
  return `${slugify(characterSlug)}__kit_${index}__${slugify(weaponName || `kit-${index}`) || `kit-${index}`}`;
}

function buildSkillId(characterSlug, kitIndex = 1, skillIndex = 1) {
  return `${slugify(characterSlug)}__kit_${kitIndex}__skill_${skillIndex}`;
}

function normalizeSkillKind(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('tag')) return 'tag_skill';
  if (raw.includes('combined') || raw.includes('combo')) return 'combined_skill';
  if (raw.includes('ultimate')) return 'ultimate';
  if (raw.includes('passive')) return 'passive';
  if (raw.includes('adventure')) return 'adventure';
  if (raw.includes('special attack')) return 'special_attack';
  if (raw.includes('normal attack')) return 'normal_attack';
  return 'skill';
}

function detectHooks(skills = []) {
  const burst_hooks = [];
  const tag_hooks = [];
  const combined_hooks = [];
  const ultimate_skill_ids = [];
  const tag_skill_ids = [];
  const combined_skill_ids = [];
  const passive_skill_ids = [];
  const primary_skill_ids = [];
  for (const skill of skills) {
    const text = `${skill?.name || ''} ${skill?.kind || ''} ${skill?.description || ''}`.toLowerCase();
    if (text.includes('burst')) burst_hooks.push(skill.skill_id);
    if (text.includes('tag')) tag_hooks.push(skill.skill_id);
    if (text.includes('combined') || text.includes('combo')) combined_hooks.push(skill.skill_id);
    if (skill.kind_id === 'tag_skill') tag_skill_ids.push(skill.skill_id);
    if (skill.kind_id === 'combined_skill') combined_skill_ids.push(skill.skill_id);
    if (skill.kind_id === 'ultimate') ultimate_skill_ids.push(skill.skill_id);
    if (skill.kind_id === 'passive') passive_skill_ids.push(skill.skill_id);
    if (['skill','normal_attack','special_attack'].includes(skill.kind_id)) primary_skill_ids.push(skill.skill_id);
  }
  return { burst_hooks, tag_hooks, combined_hooks, tag_skill_ids, combined_skill_ids, ultimate_skill_ids, passive_skill_ids, primary_skill_ids };
}

export function buildScienceWeaponKits({ characters = [], rawSources = {} } = {}) {
  const genshinSlugs = new Set((rawSources.genshin?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const hideoutSlugs = new Set((rawSources.hideout?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const originSlugs = new Set((rawSources.origin?.characters || []).map((entry) => entry?.slug).filter(Boolean));

  const items = [];
  for (const character of characters || []) {
    const slug = character?.slug || slugify(character?.name || 'unknown');
    const weapons = Array.isArray(character?.weapons) ? character.weapons : [];
    weapons.forEach((weapon, index) => {
      const weapon_kit_id = buildWeaponKitId(slug, weapon?.name, index + 1);
      const normalizedSkills = (Array.isArray(weapon?.skills) ? weapon.skills : []).map((skill, skillIndex) => ({
        skill_id: buildSkillId(slug, index + 1, skillIndex + 1),
        name: skill?.name || `Skill ${skillIndex + 1}`,
        kind: skill?.kind || null,
        kind_id: normalizeSkillKind(skill?.kind),
        cooldown: skill?.cooldown || null,
        description: skill?.description || null,
        icon: skill?.icon || null,
      }));
      const hooks = detectHooks(normalizedSkills);
      items.push({
        weapon_kit_id,
        character_id: slugify(slug),
        kit_index: index + 1,
        name: weapon?.name || `Kit ${index + 1}`,
        weapon_type: weapon?.name || null,
        element: normalizeElementId(weapon?.attribute) || normalizeElementId(character?.attribute),
        skill_ids: normalizedSkills.map((skill) => skill.skill_id),
        primary_skill_ids: hooks.primary_skill_ids,
        tag_skill_ids: hooks.tag_skill_ids,
        combined_skill_ids: hooks.combined_skill_ids,
        ultimate_skill_ids: hooks.ultimate_skill_ids,
        passive_skill_ids: hooks.passive_skill_ids,
        skills: normalizedSkills,
        potentials: Array.isArray(weapon?.potentials) ? weapon.potentials : [],
        burst_hooks: hooks.burst_hooks,
        tag_hooks: hooks.tag_hooks,
        combined_hooks: hooks.combined_hooks,
        source_refs: {
          genshin: genshinSlugs.has(slug),
          hideout: hideoutSlugs.has(slug),
          seven_origin: originSlugs.has(slug),
        },
      });
    });
  }

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceWeaponKits(root = process.cwd()) {
  const compiledPath = path.join(root, 'data', 'compiled', 'characters.json');
  const rawDir = path.join(root, 'data', 'raw');
  const characters = readJSON(compiledPath, []);
  const payload = buildScienceWeaponKits({
    characters,
    rawSources: {
      genshin: readJSON(path.join(rawDir, 'genshin.json'), {}),
      hideout: readJSON(path.join(rawDir, 'hideout.json'), {}),
      origin: readJSON(path.join(rawDir, '7dsorigin.json'), {}),
    },
  });
  writeJSON(path.join(root, 'data', 'compiled', 'science-weapon-kits.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceWeaponKits();
  console.log(`OK science-weapon-kits: ${payload.items.length}`);
}
