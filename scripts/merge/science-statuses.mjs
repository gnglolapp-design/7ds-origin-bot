import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';

const STATUS_DEFS = [
  { status_id: 'stun', label: 'Stun', aliases: ['stun'], category: 'debuff' },
  { status_id: 'freeze', label: 'Freeze', aliases: ['freeze', 'frozen'], category: 'debuff' },
  { status_id: 'chill', label: 'Chill', aliases: ['chill'], category: 'debuff' },
  { status_id: 'frostbite', label: 'Frostbite', aliases: ['frostbite'], category: 'debuff' },
  { status_id: 'shock', label: 'Shock', aliases: ['shock', 'shocked'], category: 'debuff' },
  { status_id: 'paralyze', label: 'Paralyze', aliases: ['paralyze', 'paralyzed'], category: 'debuff' },
  { status_id: 'taunt', label: 'Taunt', aliases: ['taunt', 'taunts'], category: 'debuff' },
  { status_id: 'barrier', label: 'Barrier', aliases: ['barrier'], category: 'buff' },
  { status_id: 'shield', label: 'Shield', aliases: ['shield'], category: 'buff' },
  { status_id: 'bleed', label: 'Bleed', aliases: ['bleed'], category: 'debuff' },
  { status_id: 'poison', label: 'Poison', aliases: ['poison'], category: 'debuff' },
  { status_id: 'burn', label: 'Burn', aliases: ['burn', 'hellfire'], category: 'debuff' },
  { status_id: 'regen', label: 'Regen', aliases: ['regen', 'restores hp', 'restores 5% max hp'], category: 'buff' },
  { status_id: 'breaker', label: 'Breaker', aliases: ['breaker'], category: 'debuff' },
  { status_id: 'punishment', label: 'Punishment', aliases: ['punishment'], category: 'debuff' },
  { status_id: 'stigmata', label: 'Stigmata', aliases: ['stigmata'], category: 'debuff' },
  { status_id: 'stealth', label: 'Stealth', aliases: ['stealth'], category: 'buff' },
  { status_id: 'invincible', label: 'Invincible', aliases: ['invincible', 'invincibility'], category: 'buff' },
  { status_id: 'weaken', label: 'Weaken', aliases: ['weaken'], category: 'debuff' },
  { status_id: 'silence', label: 'Silence', aliases: ['silence'], category: 'debuff' },
];

export function buildScienceStatuses({ characters = [] } = {}) {
  const byId = new Map(STATUS_DEFS.map((def) => [def.status_id, { ...def, occurrences: 0, sample_character_ids: [] }]));

  for (const character of characters || []) {
    const charId = character?.slug || null;
    for (const weapon of character?.weapons || []) {
      for (const skill of weapon?.skills || []) {
        const text = `${skill?.name || ''} ${skill?.kind || ''} ${skill?.description || ''}`.toLowerCase();
        for (const def of STATUS_DEFS) {
          if (def.aliases.some((alias) => text.includes(alias.toLowerCase()))) {
            const entry = byId.get(def.status_id);
            entry.occurrences += 1;
            if (charId && !entry.sample_character_ids.includes(charId) && entry.sample_character_ids.length < 8) {
              entry.sample_character_ids.push(charId);
            }
          }
        }
      }
    }
  }

  const items = [...byId.values()]
    .filter((entry) => entry.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences || a.label.localeCompare(b.label));

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceStatuses(root = process.cwd()) {
  const characters = readJSON(path.join(root, 'data', 'compiled', 'characters.json'), []);
  const payload = buildScienceStatuses({ characters });
  writeJSON(path.join(root, 'data', 'compiled', 'science-statuses.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceStatuses();
  console.log(`OK science-statuses: ${payload.items.length}`);
}
