import fs from "node:fs";
import path from "node:path";

export function readSchema(rootDir) {
  const schemaPath = path.join(rootDir, "data", "schema.json");
  const raw = fs.readFileSync(schemaPath, "utf8");
  return JSON.parse(raw);
}

export function ensureAllKeys(schema, payload) {
  const out = { ...schema };
  const src = payload && typeof payload === 'object' ? payload : {};
  for (const key of Object.keys(schema)) {
    const value = src[key];
    out[key] = Array.isArray(value) ? value : (value && typeof value === 'object' && !Array.isArray(schema[key]) ? value : []);
  }
  return out;
}

export function asList(value) {
  return Array.isArray(value) ? value : [];
}

function scoreValue(v) {
  if (v == null) return 0;
  if (typeof v === 'string') return Math.min(200, v.trim().length);
  if (Array.isArray(v)) return v.length * 10;
  if (typeof v === 'object') return Object.keys(v).length * 8;
  if (typeof v === 'number' || typeof v === 'boolean') return 20;
  return 1;
}

export function mergeObjectsBest(a, b, preferA = true) {
  // merge field-by-field, keeping most structured / complete
  const out = { ...(a || {}) };
  const bb = b || {};
  for (const k of Object.keys(bb)) {
    const av = out[k];
    const bv = bb[k];
    if (av == null) { out[k] = bv; continue; }
    if (bv == null) continue;

    // if both objects: shallow merge recursively
    if (typeof av === 'object' && !Array.isArray(av) && typeof bv === 'object' && !Array.isArray(bv)) {
      out[k] = mergeObjectsBest(av, bv, preferA);
      continue;
    }

    const sa = scoreValue(av);
    const sb = scoreValue(bv);
    if (sb > sa) out[k] = bv;
    else if (sb === sa && !preferA) out[k] = bv;
  }
  return out;
}

export function indexById(list, getId) {
  const map = new Map();
  for (const item of asList(list)) {
    const id = getId(item);
    if (!id) continue;
    map.set(id, item);
  }
  return map;
}

export function mergeEntityLists({ lists, getId, preferOrder }) {
  // preferOrder: array of source names in priority order (already aligned with lists)
  const maps = lists.map((l) => indexById(l.items, getId));
  const allIds = new Set();
  for (const m of maps) for (const id of m.keys()) allIds.add(id);

  const out = [];
  for (const id of allIds) {
    let merged = null;
    const sources = [];
    for (let i=0; i<maps.length; i++) {
      const item = maps[i].get(id);
      if (!item) continue;
      sources.push({ source: lists[i].source, url: item?.source_url || item?.url || null });
      merged = merged ? mergeObjectsBest(merged, item, true) : { ...item };
    }
    if (merged) {
      merged.id = merged.id || id;
      merged.sources = merged.sources || sources;
      out.push(merged);
    }
  }
  return out;
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

