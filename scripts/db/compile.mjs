import path from "node:path";
import fs from "node:fs";
import { writeJson, asList } from "./canonical.mjs";

function safeText(s) { return String(s || '').toLowerCase(); }

export function compileAll({ rootDir, merged }) {
  const compiledDir = path.join(rootDir, 'data', 'compiled');
  fs.mkdirSync(compiledDir, { recursive: true });

  const index = {
    generated_at: new Date().toISOString(),
    counts: {},
    entities: {
      characters: asList(merged.characters).map((c) => ({ id: c.id, name: c.name, rarity: c.rarity, element: c.element, image: c?.images?.portrait || null })),
      bosses: asList(merged.bosses).map((b) => ({ id: b.id, name: b.name, image: b?.images?.portrait || null })),
      weapons: asList(merged.weapons).map((w) => ({ id: w.id, name: w.name, rarity: w.rarity, type: w.type, icon: w?.images?.icon || null })),
      costumes: asList(merged.costumes).map((x) => ({ id: x.id, name: x.name, character_id: x.character_id, image: x.image || null })),
    },
    search: {
      characters: {},
      bosses: {},
      weapons: {},
    }
  };

  for (const [k, v] of Object.entries(merged)) index.counts[k] = asList(v).length;

  for (const c of asList(index.entities.characters)) index.search.characters[safeText(c.name)] = c.id;
  for (const b of asList(index.entities.bosses)) index.search.bosses[safeText(b.name)] = b.id;
  for (const w of asList(index.entities.weapons)) index.search.weapons[safeText(w.name)] = w.id;

  writeJson(path.join(compiledDir, 'index.json'), index);

  // entities files (for bot)
  const entitiesDir = path.join(compiledDir, 'entities');
  fs.mkdirSync(entitiesDir, { recursive: true });
  for (const [k, v] of Object.entries(merged)) {
    writeJson(path.join(entitiesDir, `${k}.json`), v);
  }

  return index;
}

