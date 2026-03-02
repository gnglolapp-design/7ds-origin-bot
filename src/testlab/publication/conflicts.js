export function publishedSolidnessRank(entry) {
  const x = String(entry?.solidness || entry?.confidence || '').toLowerCase();
  if (x.includes('confirm')) return 3;
  if (x.includes('probable') || x.includes('moyenne') || x.includes('medium')) return 2;
  return 1;
}

export function publishedFocusLabel(entry) {
  const kind = String(entry?.scopeType || 'global').toLowerCase();
  if (kind === 'weapon') return `la même arme${entry?.scopeValue ? ` (${entry.scopeValue})` : ''}`;
  if (kind === 'boss') return `le même boss${entry?.scopeValue ? ` (${entry.scopeValue})` : ''}`;
  if (kind === 'character') return `le même perso${entry?.scopeValue ? ` (${entry.scopeValue})` : ''}`;
  if (kind === 'costume') return `le même costume${entry?.scopeValue ? ` (${entry.scopeValue})` : ''}`;
  if (kind === 'potential') return `le même potentiel${entry?.scopeValue ? ` (${entry.scopeValue})` : ''}`;
  return 'le même contexte';
}

export function publishedConflictSummary(entries = []) {
  const scoped = (entries || []).filter((x) => !x?.isPrimary);
  if (scoped.length < 2) return null;
  const solidKinds = Array.from(new Set(scoped.map((x) => publishedSolidnessRank(x))));
  const scopeKinds = Array.from(new Set(scoped.map((x) => String(x?.scopeType || 'global').toLowerCase()).filter(Boolean)));
  const fragile = scoped.some((x) => Number(x?.validCount || 0) < 8 || publishedSolidnessRank(x) <= 1);
  const reasons = [];
  if (solidKinds.length > 1) reasons.push('la solidité varie selon le contexte publié');
  if (scopeKinds.length > 1) reasons.push('plusieurs contextes différents donnent encore des lectures différentes');
  if (fragile) reasons.push('une partie de la couverture reste fragile');
  if (!reasons.length) return null;

  const best = [...scoped].sort((a, b) => {
    if (publishedSolidnessRank(b) !== publishedSolidnessRank(a)) return publishedSolidnessRank(b) - publishedSolidnessRank(a);
    if (Number(b?.validCount || 0) !== Number(a?.validCount || 0)) return Number(b?.validCount || 0) - Number(a?.validCount || 0);
    return Number(b?.publishedAt || 0) - Number(a?.publishedAt || 0);
  })[0];

  const label = String(best?.scopeLabel || best?.scopeType || 'ce contexte');
  const leaning = best?.scopeLabel
    ? `Ça penche plutôt vers ${label}.`
    : 'Ça penche plutôt vers le résultat le plus solide disponible.';
  const retest = `À retester surtout sur ${publishedFocusLabel(best)}.`;
  const provisional = best?.scopeLabel
    ? `En attendant, garde ${label} comme repère provisoire.`
    : 'En attendant, garde le résultat le plus solide disponible comme repère provisoire.';

  return {
    short: 'résultat encore partagé',
    reason: reasons[0],
    reasons,
    leaning,
    retest,
    provisional,
  };
}
