import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { slugify } from '../lib/slug.mjs';

function normalize(value) {
  return slugify(value || '');
}

function uniq(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function nowIso() {
  return new Date().toISOString();
}

export function buildScienceBossPatterns({ manualDir }) {
  const file = path.join(manualDir, 'boss-patterns.json');
  const manual = readJSON(file, { version: 1, items: [] });

  const items = [];
  for (const raw of manual?.items || []) {
    if (!raw) continue;
    const pattern_id = normalize(raw.pattern_id || raw.id || raw.name);
    if (!pattern_id) continue;

    const boss_slugs = uniq((raw.boss_slugs || raw.boss_slugs_included || ['*']).map(normalize)).filter(Boolean);
    const tags = uniq((raw.tags || []).map(normalize));

    const windows = (raw.windows || []).map((w) => ({
      window_id: normalize(w.window_id || w.id || w.label),
      label: w.label || w.name || w.window_id || '',
      timing: w.timing || 'unknown',
      duration_hint: w.duration_hint || 'unknown',
      notes: w.notes || '',
      tags: uniq((w.tags || []).map(normalize)),
    })).filter((w) => w.window_id);

    const counters = (raw.counters || []).map((c) => ({
      kind: normalize(c.kind || c.id || c.label),
      label: c.label || c.kind || '',
      priority: c.priority || 'medium',
      notes: c.notes || '',
      tags: uniq((c.tags || []).map(normalize)),
    })).filter((c) => c.kind);

    const punishes = (raw.punishes || []).map((p) => ({
      kind: normalize(p.kind || p.id || p.label),
      label: p.label || p.kind || '',
      trigger: normalize(p.trigger || ''),
      notes: p.notes || '',
      tags: uniq((p.tags || []).map(normalize)),
    })).filter((p) => p.kind);

    items.push({
      pattern_id,
      name: raw.name || raw.title || pattern_id,
      boss_slugs,
      tags,
      description: raw.description || '',
      windows,
      counters,
      punishes,
      source_refs: raw.source_refs || [],
    });
  }

  return {
    version: 1,
    generated_at: nowIso(),
    items,
    index: {
      byBoss: items.reduce((acc, p) => {
        for (const boss of p.boss_slugs || []) {
          acc[boss] = acc[boss] || [];
          acc[boss].push(p.pattern_id);
        }
        return acc;
      }, {}),
      byTag: items.reduce((acc, p) => {
        for (const t of p.tags || []) {
          acc[t] = acc[t] || [];
          acc[t].push(p.pattern_id);
        }
        return acc;
      }, {}),
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const manualDir = path.join(root, 'data', 'manual');
  const compiledDir = path.join(root, 'data', 'compiled');
  const out = buildScienceBossPatterns({ manualDir });
  writeJSON(path.join(compiledDir, 'science-boss-patterns.json'), out);
  console.log(`OK: science-boss-patterns (${out.items.length})`);
}
