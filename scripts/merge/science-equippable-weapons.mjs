import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { slugify } from '../lib/slug.mjs';

function normalizeStats(stats = {}) {
  const out = {};
  for (const [key, value] of Object.entries(stats || {})) {
    const n = Number(value);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function normalizeEffects(effects = []) {
  return (Array.isArray(effects) ? effects : [])
    .map((effect) => ({
      stat: String(effect?.stat || '').trim() || null,
      value: Number.isFinite(Number(effect?.value)) ? Number(effect.value) : null,
      duration_sec: Number.isFinite(Number(effect?.duration_sec)) ? Number(effect.duration_sec) : null,
      note: String(effect?.note || '').trim() || null,
    }))
    .filter((effect) => effect.stat);
}


function detectBurstHooks(description = '') {
  const text = String(description || '').toLowerCase();
  return {
    burst_trigger: text.includes('activating a burst') || text.includes('when a burst is activated') || text.includes('burst gauge') || text.includes('burst resistance') || text.includes('burst efficiency'),
    combined_trigger: text.includes('combined'),
    tag_trigger: text.includes('tag skill') || text.includes('tag gauge'),
    evade_trigger: text.includes('evade') || text.includes('dodg'),
    deluge_tags: [
      text.includes('burst gauge') && 'burst_gauge',
      text.includes('burst resistance') && 'burst_resistance',
      text.includes('burst efficiency') && 'burst_efficiency',
      text.includes('all elemental burst resistance') && 'all_element_burst_resistance',
    ].filter(Boolean),
  };
}

function normalizeWeaponType(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const key = slugify(raw);
  const map = new Map([
    ['dual-swords', 'dual-swords'],
    ['book', 'book'],
    ['grimoire', 'book'],
    ['cudgel', 'nunchaku'],
    ['nunchaku', 'nunchaku'],
    ['sword-and-shield', 'shield'],
    ['shield', 'shield'],
  ]);
  return map.get(key) || key;
}

function normalizeEntry(entry = {}, index = 0, sourceName = 'manual') {
  const name = String(entry?.name || entry?.weapon_name || '').trim();
  const weaponType = normalizeWeaponType(entry?.weapon_type || entry?.type);
  const weaponId = String(entry?.weapon_id || '').trim() || slugify(name || [weaponType || `slot-${index + 1}`].filter(Boolean).join(' '));
  const passiveDescription = String(entry?.passive?.description || entry?.passive_description || '').trim() || null;
  const hooks = detectBurstHooks(passiveDescription);
  return {
    weapon_id: weaponId,
    name: name || `Weapon ${index + 1}`,
    weapon_type: weaponType,
    rarity: entry?.rarity != null ? String(entry.rarity) : null,
    stats: normalizeStats(entry?.stats),
    passive: {
      trigger: String(entry?.passive?.trigger || entry?.passive_trigger || '').trim() || null,
      effects: normalizeEffects(entry?.passive?.effects || entry?.passive_effects),
      description: passiveDescription,
    },
    burst_context: {
      burst_trigger: hooks.burst_trigger,
      combined_trigger: hooks.combined_trigger,
      tag_trigger: hooks.tag_trigger,
      evade_trigger: hooks.evade_trigger,
      deluge_tags: hooks.deluge_tags,
    },
    source_url: String(entry?.source_url || '').trim() || null,
    source_refs: {
      manual: sourceName === 'manual',
      genshin: sourceName === 'genshin',
    },
  };
}

export function buildScienceEquippableWeapons({ genshin = [], manual = [] } = {}) {
  const byId = new Map();
  for (const [sourceName, list] of [['genshin', genshin], ['manual', manual]]) {
    (Array.isArray(list) ? list : []).forEach((entry, index) => {
      const item = normalizeEntry(entry, index, sourceName);
      if (!item.weapon_id) return;
      const existing = byId.get(item.weapon_id);
      byId.set(item.weapon_id, existing ? {
        ...existing,
        ...item,
        stats: Object.keys(item.stats || {}).length ? item.stats : existing.stats,
        passive: {
          trigger: item.passive?.trigger || existing.passive?.trigger || null,
          effects: Array.isArray(item.passive?.effects) && item.passive.effects.length ? item.passive.effects : (existing.passive?.effects || []),
          description: item.passive?.description || existing.passive?.description || null,
        },
        burst_context: item.burst_context || existing.burst_context || null,
        source_url: item.source_url || existing.source_url || null,
        source_refs: { ...existing.source_refs, ...item.source_refs },
      } : item);
    });
  }
  const items = [...byId.values()];
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
    coverage: {
      populated: items.length > 0,
      source: items.length ? (genshin?.length ? 'genshin+manual' : 'manual') : 'none',
      note: items.length
        ? (genshin?.length ? 'Base équipable alimentée depuis genshin.gg/7dso/weapons avec surcharge manuelle optionnelle.' : 'Base équipable alimentée depuis data/manual/equippable-weapons.json')
        : 'Aucune source équipable distincte disponible dans le repo actuel.',
    },
  };
}

export function writeScienceEquippableWeapons(root = process.cwd()) {
  const manualPath = path.join(root, 'data', 'manual', 'equippable-weapons.json');
  const payload = buildScienceEquippableWeapons({
    genshin: readJSON(path.join(root, 'data', 'raw', 'genshin.json'), {})?.weapons || [],
    manual: readJSON(manualPath, []),
  });
  writeJSON(path.join(root, 'data', 'compiled', 'science-equippable-weapons.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceEquippableWeapons();
  console.log(`OK science-equippable-weapons: ${payload.items.length}`);
}
