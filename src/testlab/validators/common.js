export function validateNumber(name, v, { min = -Infinity, max = Infinity } = {}) {
  if (v == null || Number.isNaN(Number(v))) return `${name} manquant`;
  const x = Number(v);
  if (x < min) return `${name} trop bas`;
  if (x > max) return `${name} trop haut`;
  return null;
}

export function validateInt(name, v, { min = -Infinity, max = Infinity } = {}) {
  if (v == null || Number.isNaN(Number(v))) return `${name} manquant`;
  const x = Number(v);
  if (!Number.isInteger(x)) return `${name} doit être un entier`;
  if (x < min) return `${name} trop bas`;
  if (x > max) return `${name} trop haut`;
  return null;
}

export function requiredText(name, v, { maxLen = 100 } = {}) {
  if (!v || !String(v).trim()) return `${name} manquant`;
  if (String(v).length > maxLen) return `${name} trop long`;
  return null;
}
