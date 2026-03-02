import { computeEvidenceWeight } from "../evidence/weight.js";

function nowIso() {
  return new Date().toISOString();
}

// Welford update for mean/variance
export function welfordUpdate(agg, x, w = 1) {
  const n0 = agg.n || 0;
  const n1 = n0 + w;
  const mean0 = agg.mean ?? 0;
  const delta = x - mean0;
  const mean1 = mean0 + (w * delta) / n1;
  const delta2 = x - mean1;
  const m2 = (agg.m2 ?? 0) + w * delta * delta2;

  agg.n = n1;
  agg.mean = mean1;
  agg.m2 = m2;
  agg.min = agg.min == null ? x : Math.min(agg.min, x);
  agg.max = agg.max == null ? x : Math.max(agg.max, x);
  return agg;
}

export function welfordRemove(agg, x, w = 1) {
  const n0 = agg.n || 0;
  if (n0 <= w) {
    agg.n = 0;
    agg.mean = 0;
    agg.m2 = 0;
    agg.min = null;
    agg.max = null;
    return agg;
  }
  const mean0 = agg.mean ?? 0;
  const n1 = n0 - w;
  const mean1 = ((n0 * mean0) - (w * x)) / n1;
  const m2 = (agg.m2 ?? 0) - (x - mean0) * (x - mean1) * w;
  agg.n = n1;
  agg.mean = mean1;
  agg.m2 = m2;
  return agg;
}

export async function updateAggregates(kv, protoId, metric, status, payload = {}) {
  const key = `test:agg:${protoId}`;
  const agg = (await kv.get(key, { type: "json" })) || { proto: protoId, n: 0, mean: 0, m2: 0, min: null, max: null, n_ok: 0, n_suspect: 0, updated_at: null };
  const weight = computeEvidenceWeight({ ...payload, status, metric }).raw_weight;
  if (status === "ok" && metric != null && weight > 0) {
    welfordUpdate(agg, metric, weight);
    agg.n_ok = (agg.n_ok || 0) + 1;
  } else if (status === "suspect") {
    agg.n_suspect = (agg.n_suspect || 0) + 1;
  }
  agg.updated_at = nowIso();
  await kv.put(key, JSON.stringify(agg));
  return agg;
}

export async function reverseAggregates(kv, doc) {
  const protoId = String(doc?.proto || "");
  if (!protoId) return;
  const key = `test:agg:${protoId}`;
  const agg = await kv.get(key, { type: "json" });
  if (!agg) return;
  if (doc.status === "ok" && doc.metric != null) {
    const weight = computeEvidenceWeight(doc).raw_weight;
    welfordRemove(agg, Number(doc.metric), weight > 0 ? weight : 1);
    agg.n_ok = Math.max(0, (agg.n_ok || 0) - 1);
  } else if (doc.status === "suspect") {
    agg.n_suspect = Math.max(0, (agg.n_suspect || 0) - 1);
  }
  agg.updated_at = nowIso();
  await kv.put(key, JSON.stringify(agg));
}
