import { computeEvidenceWeight, statusWeight } from './weight.js';
import { summarizeEvidenceConflicts } from './conflicts.js';

function clamp01(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function weightedMean(values = [], weights = []) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const x = Number(values[i]);
    const w = Number(weights[i]);
    if (!Number.isFinite(x) || !Number.isFinite(w) || w <= 0) continue;
    num += x * w;
    den += w;
  }
  return den > 0 ? num / den : null;
}

function weightedStddev(values = [], weights = []) {
  const mean = weightedMean(values, weights);
  if (mean == null) return null;
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const x = Number(values[i]);
    const w = Number(weights[i]);
    if (!Number.isFinite(x) || !Number.isFinite(w) || w <= 0) continue;
    num += w * ((x - mean) ** 2);
    den += w;
  }
  return den > 0 ? Math.sqrt(num / den) : null;
}

function weightedCount(weights = []) {
  return weights.reduce((sum, w) => sum + (Number.isFinite(Number(w)) && Number(w) > 0 ? Number(w) : 0), 0);
}

function detectOutliersIQR(values = []) {
  const xs = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (xs.length < 4) return { count: 0, lower: null, upper: null };
  const q1 = xs[Math.floor((xs.length - 1) * 0.25)];
  const q3 = xs[Math.floor((xs.length - 1) * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - (1.5 * iqr);
  const upper = q3 + (1.5 * iqr);
  const count = xs.filter((x) => x < lower || x > upper).length;
  return { count, lower, upper };
}

export function resultsSolidness(docs = []) {
  const validDocs = docs.filter((d) => d.status === 'ok' && d.metric != null);
  const suspectDocs = docs.filter((d) => d.status === 'suspect' && d.metric != null);
  const rejectedDocs = docs.filter((d) => d.status === 'reject');
  const weightedDocs = docs.filter((d) => d.metric != null && statusWeight(d.status) > 0);
  const values = weightedDocs.map((d) => Number(d.metric)).filter((x) => Number.isFinite(x));
  const weights = weightedDocs.map((d) => computeEvidenceWeight(d, d?.context || {}, weightedDocs).raw_weight);

  const mean = weightedMean(values, weights);
  const sd = weightedStddev(values, weights);
  const outliers = detectOutliersIQR(validDocs.map((d) => Number(d.metric)).filter((x) => Number.isFinite(x)));
  const validCount = validDocs.length;
  const suspectCount = suspectDocs.length;
  const rejectedCount = rejectedDocs.length;
  const total = docs.length || 1;
  const suspectRatio = suspectCount / total;
  const rejectedRatio = rejectedCount / total;
  const outlierRatio = validCount ? (outliers.count / validCount) : 1;
  const cv = mean != null && sd != null && Math.abs(mean) > 1e-9 ? Math.abs(sd / mean) : 1;
  const sampleScore = clamp01(weightedCount(weights) / 20);
  const consistencyScore = cv <= 0.08 ? 1 : cv <= 0.18 ? 0.82 : cv <= 0.30 ? 0.58 : cv <= 0.45 ? 0.35 : 0.15;
  const cleanliness = clamp01(1 - (suspectRatio * 0.8) - (rejectedRatio * 0.25) - (outlierRatio * 0.45));
  const conflict = summarizeEvidenceConflicts(weightedDocs);
  const conflictPenalty = conflict.level === 'high' ? 0.18 : conflict.level === 'medium' ? 0.08 : 0;
  const score = clamp01((sampleScore * 0.5) + (consistencyScore * 0.3) + (cleanliness * 0.2) - conflictPenalty);

  let label = 'Encore trop flou';
  let reason = 'pas assez de résultats propres pour conseiller fort';
  if (validCount >= 12 && score >= 0.72) {
    label = 'Confirmé';
    reason = suspectRatio > 0.2
      ? 'résultats assez solides malgré quelques essais plus fragiles'
      : 'résultats répétés et assez cohérents';
  } else if (validCount >= 5 && score >= 0.42) {
    label = 'Probable';
    reason = validCount < 12
      ? 'la tendance se tient mais la base reste encore légère'
      : 'la tendance existe mais il reste encore un peu de dispersion';
  } else {
    if (validCount < 5) reason = 'pas assez de résultats valides';
    else if (suspectRatio > 0.35) reason = 'beaucoup d\'essais restent suspects';
    else if (outlierRatio > 0.25) reason = 'les écarts restent encore irréguliers';
    else reason = 'les résultats sont encore trop dispersés';
  }

  if (conflict.short && label !== 'Confirmé') {
    reason = `${reason} ; ${conflict.short}`;
  }

  return {
    label,
    reason,
    score,
    weightedMean: mean,
    weightedStddev: sd,
    weightedN: weightedCount(weights),
    validCount,
    suspectCount,
    rejectedCount,
    outlierCount: outliers.count,
    conflict,
  };
}
