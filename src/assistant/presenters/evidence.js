import { contextCompactSummary, summarizeSnapshotRefs, signalConfidenceRank, snapshotSolidnessLabel } from '../../lib/published-signals.js';
import { buildDecisionCards } from '../../testlab/publication/decision-cards.js';

export function mergeUniqueProtoRefs(...lists) {
  const refs = lists.flatMap((list) => Array.isArray(list) ? list : []);
  return Array.from(new Map(refs.map((x) => [String(x?.snapshotId || x?.protoId || ''), x])).values()).filter(Boolean);
}

export function protoFamilyLabel(protoId) {
  const id = String(protoId || '').toUpperCase();
  if (!id) return null;
  if (id.includes('BURST')) return 'Burst';
  if (id.includes('TAG')) return 'Tag';
  if (id.includes('COMBINED')) return 'Combined';
  if (id.includes('EVADE')) return 'Esquive';
  if (id.includes('STATUS')) return 'Statuts';
  if (id.includes('ELEMENT')) return 'Élément';
  if (id.includes('BOSS') || id.includes('PHASE')) return 'Boss/phase';
  if (id.includes('WINDOW') || id.includes('ORDER') || id.includes('COOLDOWN')) return 'Timing';
  if (id.includes('UPTIME')) return 'Tenue';
  if (id.includes('RES_SHRED')) return 'Baisses de rés';
  if (id.includes('STAT') || id.includes('SCALING') || id.includes('DAMAGE')) return 'Dégâts';
  if (id.includes('POTENTIAL')) return 'Potentiel';
  if (id.includes('COSTUME')) return 'Costume';
  return null;
}

export function protocolOverlayLines(refs = [], limit = 4) {
  const uniq = mergeUniqueProtoRefs(refs);
  if (!uniq.length) return [];
  const counts = new Map();
  for (const ref of uniq) {
    const family = protoFamilyLabel(ref?.protoId);
    if (!family) continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, limit);
  if (!ranked.length) return [];
  return [`• Axes couverts : ${ranked.map(([family, count]) => `**${family}**×${count}`).join(' · ')}`];
}



export function familyCountMap(refs = []) {
  const counts = new Map();
  for (const ref of mergeUniqueProtoRefs(refs)) {
    const family = protoFamilyLabel(ref?.protoId);
    if (!family) continue;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  return counts;
}

function hasFamily(counts, family) {
  return (counts.get(family) || 0) > 0;
}

function dominantFamilyCallout(counts, subject = 'ce setup') {
  if (hasFamily(counts, 'Burst') && hasFamily(counts, 'Timing')) {
    return `${subject} prend surtout de la valeur sur la vraie fenêtre de dégâts.`;
  }
  if (hasFamily(counts, 'Tag') || hasFamily(counts, 'Combined')) {
    return `${subject} vaut surtout par le relais, la préparation et le bon enchaînement.`;
  }
  if (hasFamily(counts, 'Boss/phase') || hasFamily(counts, 'Esquive')) {
    return `${subject} garde surtout sa valeur si le plan reste propre sous pression.`;
  }
  if (hasFamily(counts, 'Élément') || hasFamily(counts, 'Statuts')) {
    return `${subject} profite surtout du bon matchup, des stacks ou du contrôle.`;
  }
  if (hasFamily(counts, 'Dégâts') || hasFamily(counts, 'Potentiel') || hasFamily(counts, 'Costume')) {
    return `${subject} gagne surtout via le rendement brut et les bons investissements.`;
  }
  return `${subject} repose encore sur une matière publiée assez générale.`;
}

export function familyLeadSummary(refs = [], subject = 'ce setup') {
  return dominantFamilyCallout(familyCountMap(refs), subject);
}

export function weaponPressureSummary(refs = [], subject = 'ce kit') {
  const counts = familyCountMap(refs);
  if (!counts.size) return `${subject} garde encore une lecture trop générale sous pression.`;
  const boss = counts.get('Boss/phase') || 0;
  const evade = counts.get('Esquive') || 0;
  const timing = counts.get('Timing') || 0;
  const burst = counts.get('Burst') || 0;
  if (boss + evade >= 2 && timing >= 1) return `${subject} garde mieux sa valeur quand le boss casse le rythme, puis repart sur la bonne micro-fenêtre.`;
  if (boss + evade >= 2) return `${subject} tient mieux sous pression et perd moins de valeur quand le combat devient sale.`;
  if (burst >= 1 && timing >= 1) return `${subject} vaut surtout si la vraie fenêtre reste propre et bien hold.`;
  if (timing >= 1) return `${subject} demande surtout une ouverture plus propre que les autres kits.`;
  return `${subject} garde encore une lecture assez générale sous pression.`;
}

export function weaponEvidenceLines(entries = [], options = {}) {
  const { maxEntries = 3, includePressure = true } = options;
  const lines = [];
  const seen = new Set();
  for (const entry of entries || []) {
    const weaponName = String(entry?.weapon?.name || '').trim();
    if (!weaponName || seen.has(weaponName)) continue;
    seen.add(weaponName);
    const refs = entry?.scoped || entry?.refs || [];
    const counts = familyCountMap(refs);
    const axes = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, 2)
      .map(([family, count]) => `**${family}**×${count}`)
      .join(' · ');
    const badges = refsMetaBadges(refs).slice(0, 2).join(' · ');
    const role = String(entry?.roleLabel || 'Kit').trim();
    const summary = familyLeadSummary(refs, `**${weaponName}**`);
    const pressure = includePressure ? weaponPressureSummary(refs, `**${weaponName}**`) : '';
    const extra = [axes ? `axes ${axes}` : '', badges || ''].filter(Boolean).join(' · ');
    lines.push(`• ${role} : ${summary}${pressure ? ` ${pressure}` : ''}${extra ? ` (${extra})` : ''}`);
    if (lines.length >= maxEntries) break;
  }
  return lines;
}

export function familyInsightLines(refs = [], options = {}) {
  const { limit = 3, subject = 'ce setup' } = options;
  const counts = familyCountMap(refs);
  if (!counts.size) return [];
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  const lines = [];
  const top = ranked.slice(0, limit).map(([family, count]) => `**${family}**×${count}`);
  if (top.length) lines.push(`• Axes qui ressortent : ${top.join(' · ')}`);
  const callout = dominantFamilyCallout(counts, subject);
  if (callout) lines.push(`• Lecture dominante : ${callout}`);
  const secondary = [];
  if (hasFamily(counts, 'Boss/phase') && hasFamily(counts, 'Burst')) secondary.push('le timing Burst dépend beaucoup de la phase.');
  if (hasFamily(counts, 'Tag') && hasFamily(counts, 'Combined')) secondary.push('les relais et paires méritent d’être gardés jusqu’au bon tour.');
  if (hasFamily(counts, 'Élément') && hasFamily(counts, 'Statuts')) secondary.push('la vraie valeur vient aussi de la tenue des effets.');
  if (hasFamily(counts, 'Esquive') && hasFamily(counts, 'Boss/phase')) secondary.push('une erreur de pattern ou d’esquive fait vite chuter la valeur réelle.');
  if (secondary.length) lines.push(`• À retenir : ${secondary[0]}`);
  return lines;
}

export function refsLine(refs = [], label = 'Tests utiles', limit = 3) {
  const uniq = mergeUniqueProtoRefs(refs);
  if (!uniq.length) return '';
  return `• ${label} : ${summarizeSnapshotRefs(uniq).slice(0, limit).join(', ')}`;
}

export function overlayFieldLines(overlay, options = {}) {
  const {
    supportLimit = 2,
    cautionFallback = true,
    refsLabel = 'Tests utiles',
    refsLimit = 3,
  } = options;
  const lines = [];
  if (overlay?.support?.length) lines.push(...overlay.support.slice(0, supportLimit).map((x) => `• ${x}`));
  if (!overlay?.support?.length && cautionFallback && overlay?.caution?.length) lines.push(`• ${overlay.caution[0]}`);
  const refLine = refsLine(overlay?.refs || [], refsLabel, refsLimit);
  if (refLine) lines.push(refLine);
  return lines;
}

export function decisionFieldLines(decision, options = {}) {
  const {
    confirmedLimit = 2,
    cautionFallback = true,
    refsLabel = 'Protocoles utiles',
    refsLimit = 3,
  } = options;
  const lines = [];
  if (decision?.confirmed?.length) lines.push(...decision.confirmed.slice(0, confirmedLimit).map((x) => `• ${x}`));
  else if (cautionFallback && decision?.caution?.length) lines.push(`• ${decision.caution[0]}`);
  const refLine = refsLine(decision?.refs || [], refsLabel, refsLimit);
  if (refLine) lines.push(refLine);
  return lines;
}


export function refsMetaBadges(refs = []) {
  const uniq = mergeUniqueProtoRefs(refs);
  if (!uniq.length) return [];

  const confRank = uniq.reduce((best, ref) => Math.max(best, signalConfidenceRank(snapshotSolidnessLabel(ref))), 0);
  const scopeRank = uniq.reduce((best, ref) => {
    const label = String(ref?.__selection?.label || '').toLowerCase();
    if (label.includes('exact')) return Math.max(best, 3);
    if (label.includes('proche')) return Math.max(best, 2);
    if (label.includes('global')) return Math.max(best, 1);
    return best;
  }, 0);
  const coverageRank = uniq.reduce((best, ref) => {
    const label = String(ref?.__selection?.coverage || '').toLowerCase();
    if (label.includes('bonne')) return Math.max(best, 3);
    if (label.includes('moyenne')) return Math.max(best, 2);
    if (label.includes('frag')) return Math.max(best, 1);
    return best;
  }, 0);

  const conf = confRank >= 3 ? 'Confiance forte' : confRank >= 2 ? 'Confiance moyenne' : 'Confiance limitée';
  const scope = scopeRank >= 3 ? 'Contexte exact' : scopeRank >= 2 ? 'Contexte proche' : scopeRank >= 1 ? 'Repère global' : '';
  const coverage = coverageRank >= 3 ? 'Bonne couverture' : coverageRank >= 2 ? 'Couverture moyenne' : coverageRank >= 1 ? 'Données fragiles' : '';

  return [conf, scope, coverage].filter(Boolean);
}

export function badgeLineFromRefs(refs = []) {
  const badges = refsMetaBadges(refs);
  if (!badges.length) return '';
  return `• ${badges.join(' · ')}`;
}


function uniqueEvidenceCards(refs = [], limit = 2) {
  const seen = new Set();
  const cards = [];
  for (const ref of refs || []) {
    const raw = Array.isArray(ref?.decisionCards) && ref.decisionCards.length
      ? ref.decisionCards
      : buildDecisionCards(ref?.protoId, ref);
    for (const card of raw) {
      const summary = String(card?.summary || '').trim();
      if (!summary) continue;
      const key = `${String(card?.kind || '')}::${summary}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ ...card, summary });
      if (cards.length >= limit) return cards;
    }
  }
  return cards;
}

function uniqueContextSummaries(refs = [], limit = 2) {
  return Array.from(new Set(
    (refs || [])
      .map((ref) => contextCompactSummary(ref?.contexts || {}))
      .filter(Boolean)
  )).slice(0, limit);
}

export function assistantDigestLines(refs = [], options = {}) {
  const {
    cardLimit = 2,
    contextLimit = 2,
    refsLimit = 3,
    includeBadges = true,
    includeFamilyInsight = true,
  } = options;
  const uniq = mergeUniqueProtoRefs(refs);
  if (!uniq.length) return [];
  const lines = [];
  if (includeBadges) {
    const badgeLine = badgeLineFromRefs(uniq);
    if (badgeLine) lines.push(badgeLine);
  }
  lines.push(...protocolOverlayLines(uniq, 4));
  if (includeFamilyInsight) lines.push(...familyInsightLines(uniq, { limit: 2 }));
  const contexts = uniqueContextSummaries(uniq, contextLimit);
  if (contexts.length) lines.push(`• Contexte retenu : ${contexts.join(' · ')}`);
  for (const card of uniqueEvidenceCards(uniq, cardLimit)) {
    lines.push(`• ${card.summary}`);
  }
  const refLine = refsLine(uniq, 'Snapshots utiles', refsLimit);
  if (refLine) lines.push(refLine);
  return lines;
}
