
function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeBlock(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      items: list(value.items),
      notes: typeof value.notes === "string" ? value.notes : null,
      source: typeof value.source === "string" ? value.source : null,
    };
  }
  return { items: [], notes: null, source: null };
}

export function withProgressionShape(char = {}) {
  return {
    ...char,
    prefarm: normalizeBlock(char.prefarm),
    upgrade: normalizeBlock(char.upgrade),
    farm_sources: list(char.farm_sources),
    materials: list(char.materials),
  };
}

export function hasPrefarmData(char = {}) {
  const block = normalizeBlock(char.prefarm);
  return block.items.length > 0 || Boolean(block.notes);
}

export function hasUpgradeData(char = {}) {
  const block = normalizeBlock(char.upgrade);
  return block.items.length > 0 || Boolean(block.notes);
}

export function hasFarmSourceData(char = {}) {
  return list(char.farm_sources).length > 0;
}

export function hasMaterialData(char = {}) {
  return list(char.materials).length > 0;
}

export function describeProgressionAvailability(char = {}) {
  return [
    hasPrefarmData(char) ? "Pré-farm · OK" : "Pré-farm · Non disponible pour l’instant",
    hasUpgradeData(char) ? "Amélioration · OK" : "Amélioration · Non disponible pour l’instant",
    hasFarmSourceData(char) ? `Sources de farm · ${list(char.farm_sources).length}` : "Sources de farm · Non disponible pour l’instant",
    hasMaterialData(char) ? `Matériaux · ${list(char.materials).length}` : "Matériaux · Non disponible pour l’instant",
  ];
}

export function summarizeProgressionBlock(char = {}) {
  const lines = [];
  const prefarm = normalizeBlock(char.prefarm);
  const upgrade = normalizeBlock(char.upgrade);
  lines.push(hasPrefarmData(char)
    ? `**Pré-farm** · ${prefarm.items.slice(0, 4).join(" · ") || prefarm.notes || "OK"}`
    : "**Pré-farm** · Non disponible pour l’instant");
  lines.push(hasUpgradeData(char)
    ? `**Amélioration** · ${upgrade.items.slice(0, 4).join(" · ") || upgrade.notes || "OK"}`
    : "**Amélioration** · Non disponible pour l’instant");
  lines.push(hasFarmSourceData(char)
    ? `**Sources de farm** · ${list(char.farm_sources).slice(0, 4).join(" · ")}`
    : "**Sources de farm** · Non disponible pour l’instant");
  lines.push(hasMaterialData(char)
    ? `**Matériaux** · ${list(char.materials).slice(0, 4).join(" · ")}`
    : "**Matériaux** · Non disponible pour l’instant");
  return lines;
}

export function countFutureCoverage(characters = []) {
  const chars = Array.isArray(characters) ? characters.map(withProgressionShape) : [];
  return {
    prefarm: chars.filter(hasPrefarmData).length,
    upgrade: chars.filter(hasUpgradeData).length,
    farm_sources: chars.filter(hasFarmSourceData).length,
    materials: chars.filter(hasMaterialData).length,
  };
}
