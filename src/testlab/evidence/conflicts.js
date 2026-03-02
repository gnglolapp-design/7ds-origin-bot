const CONTEXT_FIELDS = [
  'perso',
  'boss',
  'arme',
  'arme_a',
  'arme_b',
  'equippable_weapon_id',
  'skill',
  'costume',
  'potential',
  'element',
  'element_id',
  'scenario',
  'scenario_id',
  'phase',
  'phase_id',
  'burst_state',
  'burst_effect_id',
  'burst_family',
  'active_burst_element_id',
  'combined_attack_id',
  'successful_evade',
  'evade_rule_id',
  'deluge_state',
];

function uniq(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
}

function collectDistinctValues(docs = [], field) {
  const values = [];
  for (const doc of docs) {
    const raw = doc?.[field];
    const xs = Array.isArray(raw) ? raw : [raw];
    for (const item of xs) {
      const v = normalize(item);
      if (v) values.push(v);
    }
  }
  return uniq(values);
}

export function summarizeEvidenceConflicts(docs = []) {
  const weighted = docs.filter((d) => d?.metric != null && String(d?.status || '').toLowerCase() !== 'reject');
  if (!weighted.length) {
    return {
      level: 'none',
      short: null,
      reasons: [],
      contextFields: [],
      contextSamples: {},
    };
  }

  const contextFields = [];
  const contextSamples = {};
  for (const field of CONTEXT_FIELDS) {
    const values = collectDistinctValues(weighted, field);
    if (values.length > 1) {
      contextFields.push(field);
      contextSamples[field] = values.slice(0, 4);
    }
  }

  const metrics = weighted.map((d) => Number(d.metric)).filter(Number.isFinite);
  const mean = metrics.length ? metrics.reduce((a, b) => a + b, 0) / metrics.length : null;
  const variance = mean == null || metrics.length < 2
    ? 0
    : metrics.reduce((sum, x) => sum + ((x - mean) ** 2), 0) / metrics.length;
  const cv = mean != null && Math.abs(mean) > 1e-9 ? Math.sqrt(variance) / Math.abs(mean) : 0;

  const reasons = [];
  if (contextFields.length) reasons.push('les contextes mélangés restent différents');
  if (cv >= 0.22) reasons.push('les métriques restent assez dispersées');

  const suspectCount = weighted.filter((d) => String(d?.status || '').toLowerCase() === 'suspect').length;
  if (suspectCount / weighted.length >= 0.25) reasons.push('une part non négligeable des essais reste suspecte');

  let level = 'none';
  if (reasons.length >= 2 || contextFields.length >= 2 || cv >= 0.35) level = 'medium';
  if (reasons.length >= 3 || contextFields.length >= 4 || cv >= 0.5) level = 'high';

  const short = level === 'high'
    ? 'contexte encore très mélangé'
    : level === 'medium'
      ? 'contexte encore partagé'
      : null;

  return {
    level,
    short,
    reasons,
    contextFields,
    contextSamples,
    coeffVar: cv,
  };
}
