import path from "node:path";
import fs from "node:fs";
import { ensureDir, writeJSON, readJSON } from "./lib/fs-utils.mjs";
import { scrapeSevenOrigin } from "./sources/seven-origin.mjs";
import { scrapeGenshin } from "./sources/genshin.mjs";
import { scrapeHideout } from "./sources/hideout.mjs";

import { normalizeSourcePayload, writeNormalized } from "./db/normalize.mjs";
import { mergeAll } from "./db/merge.mjs";
import { compileAll } from "./db/compile.mjs";

const root = process.cwd();
const rawDir = path.join(root, "data", "raw");
ensureDir(rawDir);
ensureDir(path.join(root, "data", "normalized"));
ensureDir(path.join(root, "data", "merged"));
ensureDir(path.join(root, "data", "compiled"));

function writeRaw(key, payload) {
  writeJSON(path.join(rawDir, `${key}.json`), payload);
}
function readRaw(key) {
  return readJSON(path.join(rawDir, `${key}.json`), null);
}

async function scrapeWithFallback(key, scrapeFn) {
  const prev = readRaw(key);
  try {
    const fresh = await scrapeFn();
    if (fresh) {
      writeRaw(key, fresh);
      return fresh;
    }
    return prev;
  } catch (e) {
    return prev;
  }
}

async function main() {
  const hideout = await scrapeWithFallback('hideout', scrapeHideout);
  const genshin = await scrapeWithFallback('genshin', scrapeGenshin);
  const seven = await scrapeWithFallback('7dsorigin', scrapeSevenOrigin);

  // Normalize
  const normHideout = normalizeSourcePayload({ rootDir: root, sourceKey: 'hideout', payload: hideout });
  const normGenshin = normalizeSourcePayload({ rootDir: root, sourceKey: 'genshin', payload: genshin });
  const normSeven = normalizeSourcePayload({ rootDir: root, sourceKey: '7dsorigin', payload: seven });

  writeNormalized({ rootDir: root, sourceKey: 'hideout', normalized: normHideout });
  writeNormalized({ rootDir: root, sourceKey: 'genshin', normalized: normGenshin });
  writeNormalized({ rootDir: root, sourceKey: '7dsorigin', normalized: normSeven });

  // Merge best-of
  const merged = mergeAll({ rootDir: root });

  // Compile DB indexes
  compileAll({ rootDir: root, merged });

  // Minimal sync report
  const report = {
    generated_at: new Date().toISOString(),
    raw: {
      hideout: hideout ? { source: hideout.source, fetched_at: hideout.fetched_at } : null,
      genshin: genshin ? { source: genshin.source, fetched_at: genshin.fetched_at } : null,
      seven: seven ? { source: seven.source, fetched_at: seven.fetched_at } : null,
    },
    counts: Object.fromEntries(Object.entries(merged).map(([k,v]) => [k, Array.isArray(v) ? v.length : 0]))
  };
  fs.writeFileSync(path.join(root, 'data', 'compiled', 'sync-report.json'), JSON.stringify(report, null, 2));
}

await main();
