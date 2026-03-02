export function mean(values = []) {
  const xs = values.map(Number).filter(Number.isFinite);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(values = []) {
  const xs = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

export function variance(values = []) {
  const xs = values.map(Number).filter(Number.isFinite);
  if (xs.length < 2) return null;
  const m = mean(xs);
  return xs.reduce((acc, x) => acc + ((x - m) ** 2), 0) / (xs.length - 1);
}

export function stddev(values = []) {
  const v = variance(values);
  return v == null ? null : Math.sqrt(v);
}

export function minmax(values = []) {
  const xs = values.map(Number).filter(Number.isFinite);
  if (!xs.length) return { min: null, max: null };
  return { min: Math.min(...xs), max: Math.max(...xs) };
}
