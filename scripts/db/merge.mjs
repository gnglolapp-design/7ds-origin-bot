import path from "node:path";
import fs from "node:fs";
import { readSchema, asList, mergeEntityLists, writeJson } from "./canonical.mjs";

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadNormalized(rootDir, sourceKey, key) {
  const p = path.join(rootDir, 'data', 'normalized', sourceKey, `${key}.json`);
  return readJson(p) || [];
}

function getIdDefault(x) {
  return x?.id || x?.slug || x?.key || x?.name || null;
}

const PRIORITIES = {
  characters: ["genshin", "7dsorigin", "hideout"],
  character_weapons: ["genshin", "7dsorigin", "hideout"],
  weapons: ["genshin", "7dsorigin", "hideout"],
  bosses: ["hideout", "7dsorigin", "genshin"],
  boss_rewards: ["hideout", "7dsorigin", "genshin"],
  boss_strategy: ["hideout", "7dsorigin", "genshin"],
  interactive_map: ["genshin", "7dsorigin", "hideout"],
banners: null,
};

export function mergeAll({ rootDir }) {
  const schema = readSchema(rootDir);
  const sources = ["hideout", "genshin", "7dsorigin"];

  const merged = {};

  for (const key of Object.keys(schema)) {
    const prio = PRIORITIES[key] || ["7dsorigin", "genshin", "hideout"];
    const lists = prio.map((s) => ({ source: s, items: loadNormalized(rootDir, s, key) }));

    // For pure collections with no ids, just concatenate with source annotation.
    if (["general"].includes(key)) {
      merged[key] = lists.flatMap((x) => asList(x.items));
      continue;
    }

    merged[key] = mergeEntityLists({
      lists,
      getId: getIdDefault,
      preferOrder: prio,
    });
  }

  // write merged per key
  const outDir = path.join(rootDir, 'data', 'merged');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [k, v] of Object.entries(merged)) {
    writeJson(path.join(outDir, `${k}.json`), v);
  }

  return merged;
}

