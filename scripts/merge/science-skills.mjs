import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { normalizeAttribute, slugify } from '../lib/slug.mjs';

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
  const raw = String(value || '').trim();
  const text = raw.toLowerCase();
  if (text.includes('tag')) return 'tag_skill';
  if (text.includes('combined') || text.includes('combo')) return 'combined_skill';
  if (text.includes('ultimate')) return 'ultimate';
  if (text.includes('passive')) return 'passive';
  if (text.includes('adventure')) return 'adventure';
  if (text.includes('special attack')) return 'special_attack';
  if (text.includes('normal attack')) return 'normal_attack';
  return 'skill';
}


function detectBurstMetadata({ kind_id, element_id, description, triggers }) {
  const text = String(description || '').toLowerCase();
  const burst_family = ['holy', 'physical', 'darkness'].includes(element_id) ? 'special' : (element_id ? 'normal' : null);
  let burst_effect_id = null;
  if (triggers?.burst && element_id) {
    burst_effect_id = `burst_${burst_family || 'normal'}_${element_id}`;
  }
  const deluge_tags = [];
  if (text.includes('burst gauge')) deluge_tags.push('burst_gauge');
  if (text.includes('burst efficiency')) deluge_tags.push('burst_efficiency');
  if (text.includes('burst resistance')) deluge_tags.push('burst_resistance');
  if (text.includes('freeze')) deluge_tags.push('freeze_interaction');
  if (text.includes('tag gauge')) deluge_tags.push('tag_gauge');
  return {
    burst_family,
    burst_effect_id,
    deluge_tags,
  };
}

function detectEvadeHooks(description) {
  const text = String(description || '').toLowerCase();
  return {
    successful_evade_bonus: text.includes('evade') || text.includes('dodg'),
    evade_rule_ids: (text.includes('evade') || text.includes('dodg')) ? ['evade__successful__generic_bonus'] : [],
  };
}

function buildTriggers(skill = {}) {
  const text = `${skill?.name || ''} ${skill?.kind_raw || ''} ${skill?.description || ''}`.toLowerCase();
  return {
    burst: text.includes('burst'),
    tag: text.includes('tag'),
    combined: text.includes('combined') || text.includes('combo'),
    cooldown: text.includes('cooldown'),
    low_hp: text.includes('hp') && (text.includes('low') || text.includes('fewer') || text.includes('below')),
  };
}

export function buildScienceSkills({ characters = [], rawSources = {} } = {}) {
  const genshinSlugs = new Set((rawSources.genshin?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const hideoutSlugs = new Set((rawSources.hideout?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const originSlugs = new Set((rawSources.origin?.characters || []).map((entry) => entry?.slug).filter(Boolean));

  const items = [];
  for (const character of characters || []) {
    const slug = character?.slug || slugify(character?.name || 'unknown');
    const weapons = Array.isArray(character?.weapons) ? character.weapons : [];
    weapons.forEach((weapon, index) => {
      const weapon_kit_id = buildWeaponKitId(slug, weapon?.name, index + 1);
      const defaultElement = normalizeElementId(weapon?.attribute) || normalizeElementId(character?.attribute);
      const skills = Array.isArray(weapon?.skills) ? weapon.skills : [];
      skills.forEach((skill, skillIndex) => {
        const skill_id = buildSkillId(slug, index + 1, skillIndex + 1);
        const kind_id = normalizeSkillKind(skill?.kind);
        const triggers = buildTriggers({
          name: skill?.name,
          kind_raw: skill?.kind,
          description: skill?.description,
        });
        const burstMeta = detectBurstMetadata({
          kind_id,
          element_id: defaultElement,
          description: skill?.description,
          triggers,
        });
        const evadeHooks = detectEvadeHooks(skill?.description);
        const item = {
          skill_id,
          character_id: slugify(slug),
          weapon_kit_id,
          kit_index: index + 1,
          skill_index: skillIndex + 1,
          name: skill?.name || `Skill ${skillIndex + 1}`,
          kind_raw: skill?.kind || null,
          kind_id,
          cooldown: skill?.cooldown || null,
          description: skill?.description || null,
          icon: skill?.icon || null,
          element_id: defaultElement,
          burst_family: burstMeta.burst_family,
          burst_effect_id: burstMeta.burst_effect_id,
          deluge_tags: burstMeta.deluge_tags,
          combined_attack_id: kind_id === 'combined_skill' ? 'system__combined_attack__generic' : null,
          successful_evade_bonus: evadeHooks.successful_evade_bonus,
          evade_rule_ids: evadeHooks.evade_rule_ids,
          triggers,
          tags: [kind_id, ...burstMeta.deluge_tags].filter(Boolean),
          source_refs: {
            genshin: genshinSlugs.has(slug),
            hideout: hideoutSlugs.has(slug),
            seven_origin: originSlugs.has(slug),
          },
        };
        items.push(item);
      });
    });
  }

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceSkills(root = process.cwd()) {
  const compiledPath = path.join(root, 'data', 'compiled', 'characters.json');
  const rawDir = path.join(root, 'data', 'raw');
  const characters = readJSON(compiledPath, []);
  const payload = buildScienceSkills({
    characters,
    rawSources: {
      genshin: readJSON(path.join(rawDir, 'genshin.json'), {}),
      hideout: readJSON(path.join(rawDir, 'hideout.json'), {}),
      origin: readJSON(path.join(rawDir, '7dsorigin.json'), {}),
    },
  });
  writeJSON(path.join(root, 'data', 'compiled', 'science-skills.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceSkills();
  console.log(`OK science-skills: ${payload.items.length}`);
}
