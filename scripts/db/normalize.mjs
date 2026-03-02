import path from "node:path";
import { readSchema, ensureAllKeys, asList, writeJson } from "./canonical.mjs";

function nowIso() { return new Date().toISOString(); }

function normalizeCharacter(char, source) {
  if (!char) return null;
  const id = char.slug || char.id || char.key || null;
  if (!id) return null;
  return {
    id,
    name: char.name || null,
    rarity: char.rarity || null,
    element: char.attribute || char.element || null,
    roles: asList(char.roles),
    stats: char.stats || char.base_stats || null,
    images: char.images || { portrait: char.portrait || char.image || null },
    weapons: asList(char.weapons),
    costumes: asList(char.costumes),
    potentials: asList(char.potentials),
    source,
    source_url: char.source_url || char.url || null,
    raw: undefined,
  };
}

function normalizeWeapon(w, source) {
  if (!w) return null;
  const id = w.slug || w.id || w.name || null;
  if (!id) return null;
  return {
    id,
    name: w.name || null,
    rarity: w.rarity || null,
    type: w.type || w.weapon_type || null,
    stats: w.stats || null,
    effect: w.effect || w.description || null,
    images: w.images || { icon: w.icon || w.image || null },
    source,
    source_url: w.source_url || w.url || null,
  };
}

function normalizeBoss(b, source) {
  if (!b) return null;
  const id = b.slug || b.id || b.name || null;
  if (!id) return null;
  return {
    id,
    name: b.name || null,
    stats: b.stats || null,
    description: b.description || null,
    images: b.images || { portrait: b.portrait || b.image || null },
    rewards: asList(b.rewards),
    strategy: b.strategy || b.guide || null,
    source,
    source_url: b.source_url || b.url || null,
  };
}

function explodeCostumes(characters, source) {
  const out = [];
  for (const c of asList(characters)) {
    for (const costume of asList(c.costumes)) {
      if (!costume?.name) continue;
      const id = `${c.id}::${costume.name}`;
      out.push({
        id,
        character_id: c.id,
        name: costume.name,
        effect_title: costume.effect_title || null,
        effect: costume.effect || null,
        image: costume.image || null,
        source,
        source_url: costume.source_url || c.source_url || null,
      });
    }
  }
  return out;
}

function explodeCharacterWeapons(characters, source) {
  const out = [];
  for (const c of asList(characters)) {
    for (const w of asList(c.weapons)) {
      const weaponId = w?.slug || w?.id || w?.name || null;
      if (!weaponId) continue;
      out.push({
        id: `${c.id}::${weaponId}`,
        character_id: c.id,
        name: w.name || null,
        type: w.attribute || w.type || null,
        rarity: w.rarity || null,
        skills: asList(w.skills),
        potentials: asList(w.potentials),
        image: w.image || w.icon || null,
        source,
        source_url: w.source_url || c.source_url || null,
      });
    }
  }
  return out;
}

function emptyCollections(schema) {
  const out = {};
  for (const k of Object.keys(schema)) out[k] = Array.isArray(schema[k]) ? [] : schema[k];
  return out;
}

export function normalizeSourcePayload({ rootDir, sourceKey, payload }) {
  const schema = readSchema(rootDir);
  const base = emptyCollections(schema);

  const source = payload?.source || sourceKey;
  const fetched_at = payload?.fetched_at || nowIso();

  const characters = asList(payload?.characters).map((c) => normalizeCharacter(c, source)).filter(Boolean);
  const bosses = asList(payload?.bosses).map((b) => normalizeBoss(b, source)).filter(Boolean);
  const weapons = asList(payload?.weapons).map((w) => normalizeWeapon(w, source)).filter(Boolean);

  base.characters = characters;
  base.bosses = bosses;
  base.weapons = weapons;

  base.costumes = explodeCostumes(characters, source);
  base.character_weapons = explodeCharacterWeapons(characters, source);

  // Pass-through for any extra categories already present in payload
  for (const key of Object.keys(schema)) {
    if (key in base) continue;
    if (Array.isArray(payload?.[key])) base[key] = payload[key];
  }

  const normalized = ensureAllKeys(schema, base);
  normalized._meta = { source, fetched_at, source_key: sourceKey };
  return normalized;
}

export function writeNormalized({ rootDir, sourceKey, normalized }) {
  const outDir = path.join(rootDir, "data", "normalized", sourceKey);
  for (const [key, value] of Object.entries(normalized)) {
    if (key === '_meta') continue;
    writeJson(path.join(outDir, `${key}.json`), value);
  }
  writeJson(path.join(outDir, `_meta.json`), normalized._meta);
}

