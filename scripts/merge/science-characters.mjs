import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { slugify, normalizeAttribute } from '../lib/slug.mjs';

function normalizeElementId(value) {
  const normalized = String(normalizeAttribute(value) || '').trim().toLowerCase();
  return normalized || null;
}

function uniqueList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function isPlaceholderCostumeName(value = '') {
  const line = String(value || '').trim().toLowerCase();
  return line.includes('aucun skin disponible') || line.includes('seront bientôt ajoutés') || line.includes('seront bientot ajoutes');
}

function buildWeaponKitId(characterSlug, weaponName, index = 1) {
  return `${slugify(characterSlug)}__kit_${index}__${slugify(weaponName || `kit-${index}`) || `kit-${index}`}`;
}

function buildCostumeId(characterSlug, costumeName, index = 1) {
  return `${slugify(characterSlug)}__costume_${index}__${slugify(costumeName || `costume-${index}`) || `costume-${index}`}`;
}

export function buildScienceCharacters({ characters = [], rawSources = {} } = {}) {
  const genshinSlugs = new Set((rawSources.genshin?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const hideoutSlugs = new Set((rawSources.hideout?.characters || []).map((entry) => entry?.slug).filter(Boolean));
  const originSlugs = new Set((rawSources.origin?.characters || []).map((entry) => entry?.slug).filter(Boolean));

  const items = (characters || []).map((character) => {
    const slug = character?.slug || slugify(character?.name || 'unknown');
    const weapon_kit_ids = (Array.isArray(character?.weapons) ? character.weapons : []).map((weapon, index) =>
      buildWeaponKitId(slug, weapon?.name, index + 1),
    );
    const costume_ids = (Array.isArray(character?.costumes) ? character.costumes : [])
      .filter((costume) => !isPlaceholderCostumeName(costume?.name))
      .map((costume, index) => buildCostumeId(slug, costume?.name, index + 1));
    const elements = uniqueList([
      normalizeElementId(character?.attribute),
      ...((Array.isArray(character?.attributes) ? character.attributes : []).map(normalizeElementId)),
      ...((Array.isArray(character?.weapons) ? character.weapons : []).map((weapon) => normalizeElementId(weapon?.attribute))),
    ]);

    return {
      character_id: slugify(slug),
      slug,
      name: character?.name || slug,
      rarity: character?.rarity || null,
      roles: Array.isArray(character?.roles) ? character.roles.filter(Boolean) : [],
      elements,
      weapon_kit_ids,
      costume_ids,
      source_refs: {
        genshin: genshinSlugs.has(slug),
        hideout: hideoutSlugs.has(slug),
        seven_origin: originSlugs.has(slug),
      },
      science: {
        high_value_protocols: [],
        needs_more_testing: [],
      },
    };
  });

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceCharacters(root = process.cwd()) {
  const compiledPath = path.join(root, 'data', 'compiled', 'characters.json');
  const rawDir = path.join(root, 'data', 'raw');
  const characters = readJSON(compiledPath, []);
  const payload = buildScienceCharacters({
    characters,
    rawSources: {
      genshin: readJSON(path.join(rawDir, 'genshin.json'), {}),
      hideout: readJSON(path.join(rawDir, 'hideout.json'), {}),
      origin: readJSON(path.join(rawDir, '7dsorigin.json'), {}),
    },
  });
  writeJSON(path.join(root, 'data', 'compiled', 'science-characters.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceCharacters();
  console.log(`OK science-characters: ${payload.items.length}`);
}
