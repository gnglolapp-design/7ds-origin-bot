function stddevFromValues(values) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((a, x) => a + ((x - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(v);
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] != null ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function detectOutliersIQR(values) {
  if (!Array.isArray(values) || values.length < 4) return { count: 0, lower: null, upper: null, values: [] };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const outs = sorted.filter((x) => x < lower || x > upper);
  return { count: outs.length, lower, upper, values: outs };
}

function histogram(values, bins = 6) {
  if (!Array.isArray(values) || !values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min, max, bins: [{ from: min, to: max, count: values.length }] };
  const width = (max - min) / bins;
  const arr = Array.from({ length: bins }, (_, i) => ({
    from: min + i * width,
    to: i === bins - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    arr[idx].count += 1;
  }
  return { min, max, bins: arr };
}

function formatMetric(protoId, value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const x = Number(value);
  if (protoId === "CRIT_RATE_REAL" || protoId === "STATUS_PROC_RATE" || protoId === "BUFF_UPTIME" || protoId === "BUFF_REAL_UPTIME" || protoId === "DEBUFF_REAL_UPTIME") return `${(x * 100).toFixed(2)}%`;
  if (["CRIT_DMG_REAL", "BUFF_STACKING", "WEAPON_SKILL_DELTA", "ORDER_OF_USE", "DAMAGE_WINDOW", "TAG_SWAP_IMPACT", "TAG_TO_BURST_CHAIN", "TAG_WINDOW_GAIN", "COSTUME_IMPACT", "POTENTIAL_IMPACT", "STAT_PRIORITY_DELTA", "BOSS_PRESSURE_DELTA", "BURST_TRIGGER_WEAPON_DELTA", "BURST_WINDOW_HOLD_VALUE", "COMBINED_SKILL_DELTA", "SUCCESSFUL_EVADE_BONUS_DELTA", "BOSS_PATTERN_RECOVERY_DELTA", "PHASE_SPECIFIC_WINDOW_DELTA", "BOSS_INTERRUPT_PENALTY", "RES_SHRED_DELTA", "ELEMENT_MATCHUP_DELTA", "BURST_STATE_DELTA"].includes(protoId)) return `${x.toFixed(3)}x`;
  return x.toFixed(4);
}

function histogramLine(values, protoId) {
  const hist = histogram(values, 6);
  if (!hist) return "—";
  const chars = "▁▂▃▄▅▆▇█";
  const maxCount = Math.max(...hist.bins.map((b) => b.count), 1);
  const spark = hist.bins.map((b) => chars[Math.round(((chars.length - 1) * b.count) / maxCount)]).join("");
  return `${spark} (${formatMetric(protoId, hist.min)} → ${formatMetric(protoId, hist.max)})`;
}

function linearRegression(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const xs = points.map((p) => Number(p.x));
  const ys = points.map((p) => Number(p.y));
  const n = points.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let ssXX = 0;
  let ssXY = 0;
  let ssYY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }
  if (!ssXX || !ssYY) return null;
  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = Math.max(0, Math.min(1, (ssXY * ssXY) / (ssXX * ssYY)));
  return { slope, intercept, r2, n };
}

function confidence95(values) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = stddevFromValues(values);
  const margin = 1.96 * sd / Math.sqrt(values.length);
  return { mean, low: mean - margin, high: mean + margin, sd, n: values.length };
}


function bucketizeByOrder(points, bucketCount) {
  if (!Array.isArray(points) || !points.length) return [];
  const sorted = [...points].sort((a, b) => Number(a.x) - Number(b.x));
  const size = Math.max(1, Math.ceil(sorted.length / bucketCount));
  const buckets = [];
  for (let i = 0; i < sorted.length; i += size) {
    const chunk = sorted.slice(i, i + size);
    if (!chunk.length) continue;
    const xs = chunk.map((p) => Number(p.x)).filter(Number.isFinite);
    const ys = chunk.map((p) => Number(p.y)).filter(Number.isFinite);
    if (!xs.length || !ys.length) continue;
    buckets.push({
      points: chunk,
      from: Math.min(...xs),
      to: Math.max(...xs),
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
      n: chunk.length,
    });
  }
  return buckets;
}

function largestGap(values) {
  const arr = [...new Set(values.filter(Number.isFinite).map(Number))].sort((a, b) => a - b);
  if (arr.length < 2) return null;
  let best = null;
  for (let i = 1; i < arr.length; i += 1) {
    const gap = arr[i] - arr[i - 1];
    if (!best || gap > best.gap) best = { from: arr[i - 1], to: arr[i], gap };
  }
  return best;
}

function formatRangeNumber(x) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  const n = Number(x);
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(2);
}

function analyzeBreakpoints(points, mode = 'atk') {
  const clean = (Array.isArray(points) ? points : [])
    .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x);

  const distinctX = [...new Set(clean.map((p) => p.x))];
  if (clean.length < 6 || distinctX.length < 4) {
    return {
      signal: 'weak',
      summary: 'Signal trop faible pour lire un breakpoint propre.',
      details: `Mesures valides: **${clean.length}** · valeurs distinctes: **${distinctX.length}**`,
      dataNeed: null,
      buckets: [],
    };
  }

  const bucketCount = Math.max(3, Math.min(5, Math.floor(clean.length / 2), distinctX.length));
  const buckets = bucketizeByOrder(clean, bucketCount);
  if (buckets.length < 3) {
    return {
      signal: 'weak',
      summary: 'Pas assez de zones distinctes pour comparer les pentes.',
      details: `Zones construites: **${buckets.length}**`,
      dataNeed: null,
      buckets,
    };
  }

  const slopes = [];
  for (let i = 1; i < buckets.length; i += 1) {
    const prev = buckets[i - 1];
    const curr = buckets[i];
    const dx = curr.x - prev.x;
    if (!dx) continue;
    const slope = (curr.y - prev.y) / dx;
    slopes.push({
      index: i - 1,
      slope,
      from: prev,
      to: curr,
      boundary: (prev.to + curr.from) / 2,
    });
  }

  if (slopes.length < 2) {
    return {
      signal: 'weak',
      summary: 'Signal trop court pour comparer deux pentes.',
      details: `Transitions lues: **${slopes.length}**`,
      dataNeed: largestGap(clean.map((p) => p.x)),
      buckets,
    };
  }

  const changes = [];
  for (let i = 1; i < slopes.length; i += 1) {
    const a = slopes[i - 1].slope;
    const b = slopes[i].slope;
    const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
    const rel = Math.abs(b - a) / denom;
    changes.push({ i, rel, before: slopes[i - 1], after: slopes[i] });
  }
  changes.sort((a, b) => b.rel - a.rel);
  const top = changes[0];
  const gap = largestGap(clean.map((p) => p.x));
  const absBefore = Math.abs(top.before.slope);
  const absAfter = Math.abs(top.after.slope);

  let kind = 'shift';
  if (mode === 'atk') {
    if (absAfter < absBefore * 0.75) kind = 'softcap';
    else if (absAfter > absBefore * 1.35) kind = 'acceleration';
  } else if (mode === 'def') {
    if (top.before.slope < 0 && top.after.slope < 0 && absAfter < absBefore * 0.75) kind = 'diminishing';
    else if (top.before.slope < 0 && top.after.slope < 0 && absAfter > absBefore * 1.35) kind = 'stronger';
    else if (Math.sign(top.before.slope) !== Math.sign(top.after.slope)) kind = 'unstable';
  }

  const strongSignal = top.rel >= 0.35;
  let summary = 'Pas de breakpoint suffisamment net détecté.';
  if (strongSignal) {
    if (mode === 'atk') {
      if (kind === 'softcap') summary = `Possible breakpoint vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} ATK** (pente qui s'écrase).`;
      else if (kind === 'acceleration') summary = `Possible rupture vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} ATK** (hausse de pente / anomalie).`;
      else summary = `Changement de pente détecté vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} ATK**.`;
    } else {
      if (kind === 'diminishing') summary = `Possible rendement décroissant vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} DEF**.`;
      else if (kind === 'stronger') summary = `Réduction qui se renforce vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} DEF**.`;
      else if (kind === 'unstable') summary = `Signal instable autour de **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} DEF**.`;
      else summary = `Changement de pente détecté vers **${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.from.to)} DEF**.`;
    }
  }

  const stableLeft = `${formatRangeNumber(top.before.from.from)}–${formatRangeNumber(top.before.to.to)}`;
  const stableRight = `${formatRangeNumber(top.after.from.from)}–${formatRangeNumber(top.after.to.to)}`;
  let details = `Avant: pente **${top.before.slope.toFixed(4)}** sur **${stableLeft}**
Après: pente **${top.after.slope.toFixed(4)}** sur **${stableRight}**
Variation relative **${(top.rel * 100).toFixed(0)}%**`;

  let dataNeed = null;
  if (gap && gap.gap > 0) {
    dataNeed = `Mesures à ajouter entre **${formatRangeNumber(gap.from)}** et **${formatRangeNumber(gap.to)}**${mode === 'atk' ? ' ATK' : ' DEF'}.`;
  }
  if (strongSignal) {
    const from = Math.min(top.before.to.to, top.after.from.from);
    const to = Math.max(top.before.to.to, top.after.from.from);
    dataNeed = `Sécuriser la zone **${formatRangeNumber(from)}–${formatRangeNumber(to)}**${mode === 'atk' ? ' ATK' : ' DEF'} avec plus de mesures.`;
  }

  return {
    signal: strongSignal ? 'candidate' : 'flat',
    summary,
    details,
    dataNeed,
    buckets,
    top,
    kind,
  };
}

function buildZoneField(protoId, analysis) {
  if (!analysis?.buckets?.length) return null;
  const lines = analysis.buckets.slice(0, 5).map((bucket) => {
    const metric = protoId === 'SCALING_ATK' || protoId === 'SCALING_DEF' ? `${bucket.y.toFixed(1)}` : formatMetric(protoId, bucket.y);
    return `• **${formatRangeNumber(bucket.from)}–${formatRangeNumber(bucket.to)}** → moyenne **${metric}** (n=${bucket.n})`;
  });
  return { name: 'Résultats par zones', value: lines.join('\n').slice(0, 1024) };
}


function meanOf(arr) {
  const xs = (Array.isArray(arr) ? arr : []).map(Number).filter(Number.isFinite);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function wilsonInterval(successes, total, z = 1.96) {
  const s = Number(successes);
  const n = Number(total);
  if (!Number.isFinite(s) || !Number.isFinite(n) || n <= 0) return null;
  const p = s / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { p, low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

function buildBuffStackingField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;

  const addErrs = [];
  const multErrs = [];
  const deltaSigns = [];
  const nVals = [];

  for (const d of rows) {
    const base = Number(d.base_dmg);
    const b1 = Number(d.buff1_dmg);
    const b2 = Number(d.buff2_dmg);
    const n = Number(d.n);
    if (!(base > 0 && b1 > 0 && b2 > 0)) continue;
    const gain1 = b1 - base;
    const gain2 = b2 - b1;
    const addPred = base + 2 * gain1;
    const multPred = base * Math.pow(b1 / base, 2);
    addErrs.push(Math.abs(b2 - addPred) / Math.max(1, Math.abs(b2)));
    multErrs.push(Math.abs(b2 - multPred) / Math.max(1, Math.abs(b2)));
    deltaSigns.push(gain2 - gain1);
    if (Number.isFinite(n) && n > 0) nVals.push(n);
  }

  if (!addErrs.length || !multErrs.length) return null;

  const addMean = meanOf(addErrs);
  const multMean = meanOf(multErrs);
  const deltaMean = meanOf(deltaSigns);
  const gap = Math.abs(addMean - multMean);

  let cls = "Mixte / ambigu";
  if (addMean + 0.03 < multMean) cls = "Additif probable";
  else if (multMean + 0.03 < addMean) cls = "Multiplicatif probable";

  let signal = "faible";
  if (gap >= 0.08) signal = "bon";
  else if (gap >= 0.04) signal = "moyen";

  let inc = "Second gain proche du premier.";
  if (Number.isFinite(deltaMean)) {
    if (deltaMean > 0) inc = "Second gain supérieur au premier.";
    else if (deltaMean < 0) inc = "Second gain inférieur au premier.";
  }

  const minN = nVals.length ? Math.min(...nVals) : null;
  const reliability = minN == null ? signal : (minN < 10 ? "faible" : minN < 20 ? `moyenne (${signal})` : signal);

  return {
    name: "Stacking",
    value: [
      `Classification: **${cls}**`,
      `Écart additif: **${(addMean * 100).toFixed(1)}%**`,
      `Écart multiplicatif: **${(multMean * 100).toFixed(1)}%**`,
      inc,
      `Fiabilité: **${reliability}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildStatusProcField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;

  let attempts = 0;
  let procs = 0;
  const localRates = [];
  for (const d of rows) {
    const a = Number(d.attempts);
    const p = Number(d.procs);
    if (!(a > 0) || !(p >= 0) || p > a) continue;
    attempts += a;
    procs += p;
    localRates.push(p / a);
  }
  if (!(attempts > 0)) return null;

  const w = wilsonInterval(procs, attempts);
  const meanRate = meanOf(localRates);
  let spread = 0;
  if (localRates.length >= 2 && Number.isFinite(meanRate)) {
    spread = Math.sqrt(localRates.map((x) => (x - meanRate) ** 2).reduce((a, b) => a + b, 0) / (localRates.length - 1));
  }

  const spreadText = spread >= 0.15 ? "dispersion élevée" : spread >= 0.08 ? "dispersion modérée" : "dispersion faible";
  const reliability = attempts < 30 ? "faible" : attempts < 100 ? "moyenne" : "bonne";

  return {
    name: "Proc Rate",
    value: [
      `Taux réel observé: **${(w.p * 100).toFixed(2)}%**`,
      `IC 95%: **${(w.low * 100).toFixed(2)}% – ${(w.high * 100).toFixed(2)}%**`,
      `Mesures agrégées: **${procs}/${attempts}**`,
      `Signal: **${spreadText}**`,
      `Fiabilité: **${reliability}**`,
    ].join("\n").slice(0, 1024),
  };
}


function buildMultiHitSnapshotField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.after_dmg) / Math.max(1, Number(d.before_dmg))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  const deltaPct = (mean - 1) * 100;
  let cls = "Ambigu";
  if (Math.abs(deltaPct) <= 5) cls = "Snapshot probable";
  else if (Math.abs(deltaPct) >= 12) cls = "Recalcul probable";
  const reliability = ratios.length >= 20 ? "bonne" : ratios.length >= 10 ? "moyenne" : "faible";
  return {
    name: "Multi-hit / snapshot",
    value: [
      `Classification: **${cls}**`,
      `Ratio après/avant: **${mean.toFixed(3)}x**`,
      `Écart moyen: **${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%**`,
      `Fiabilité: **${reliability}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildCooldownField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.observed_cd) / Math.max(0.1, Number(d.shown_cd))).filter(Number.isFinite);
  const mean = meanOf(ratios);
  if (!Number.isFinite(mean)) return null;
  let cls = "Cooldown conforme";
  if (mean < 0.95) cls = "Cooldown réel plus court";
  else if (mean > 1.05) cls = "Cooldown réel plus long";
  const drift = (mean - 1) * 100;
  return {
    name: "Cooldown réel",
    value: [
      `Classification: **${cls}**`,
      `Ratio observé/affiché: **${mean.toFixed(3)}x**`,
      `Dérive moyenne: **${drift >= 0 ? '+' : ''}${drift.toFixed(1)}%**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildBuffUptimeField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const observedRates = rows.map((d) => Number(d.observed_active) / Math.max(0.1, Number(d.cycle_duration))).filter(Number.isFinite);
  const expectedRates = rows.map((d) => Number(d.expected_duration) / Math.max(0.1, Number(d.cycle_duration))).filter(Number.isFinite);
  const obs = meanOf(observedRates);
  const exp = meanOf(expectedRates);
  if (!Number.isFinite(obs)) return null;
  const gap = Number.isFinite(exp) ? (obs - exp) * 100 : null;
  let cls = "Uptime faible";
  if (obs >= 0.7) cls = "Uptime élevé";
  else if (obs >= 0.4) cls = "Uptime moyen";
  return {
    name: "Uptime buff/debuff",
    value: [
      `Lecture: **${cls}**`,
      `Uptime observé: **${(obs * 100).toFixed(1)}%**`,
      Number.isFinite(exp) ? `Uptime théorique: **${(exp * 100).toFixed(1)}%**` : null,
      gap == null ? null : `Écart observé/théorique: **${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pts**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].filter(Boolean).join("\n").slice(0, 1024),
  };
}

function buildInteractionABField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const addErrs = [];
  const multErrs = [];
  for (const d of rows) {
    const base = Number(d.base_dmg);
    const a = Number(d.a_dmg);
    const b = Number(d.b_dmg);
    const ab = Number(d.ab_dmg);
    if (!(base > 0 && a > 0 && b > 0 && ab > 0)) continue;
    const addPred = a + b - base;
    const multPred = base * (a / base) * (b / base);
    addErrs.push(Math.abs(ab - addPred) / Math.max(1, Math.abs(ab)));
    multErrs.push(Math.abs(ab - multPred) / Math.max(1, Math.abs(ab)));
  }
  if (!addErrs.length || !multErrs.length) return null;
  const addMean = meanOf(addErrs);
  const multMean = meanOf(multErrs);
  let cls = "Mixte / ambigu";
  if (addMean + 0.03 < multMean) cls = "Additif probable";
  else if (multMean + 0.03 < addMean) cls = "Multiplicatif probable";
  else if (Math.min(addMean, multMean) > 0.15) cls = "Interaction non propre";
  return {
    name: "Interaction A + B",
    value: [
      `Classification: **${cls}**`,
      `Écart additif: **${(addMean * 100).toFixed(1)}%**`,
      `Écart multiplicatif: **${(multMean * 100).toFixed(1)}%**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildWeaponSkillDeltaField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_b) / Math.max(1, Number(d.dmg_a))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  const avgA = meanOf(rows.map((d) => Number(d.dmg_a)).filter(Number.isFinite));
  const avgB = meanOf(rows.map((d) => Number(d.dmg_b)).filter(Number.isFinite));
  let cls = "Impact faible entre les deux armes";
  if (mean >= 1.12) cls = "Arme B apporte un vrai gain";
  else if (mean >= 1.04) cls = "Arme B un peu devant";
  else if (mean <= 0.88) cls = "Arme A garde un vrai avantage";
  else if (mean <= 0.96) cls = "Arme A un peu devant";
  return {
    name: "Impact arme → skill",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen B/A: **${mean.toFixed(3)}x**`,
      Number.isFinite(avgA) ? `Dégâts moyens arme A: **${avgA.toFixed(1)}**` : null,
      Number.isFinite(avgB) ? `Dégâts moyens arme B: **${avgB.toFixed(1)}**` : null,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].filter(Boolean).join("\n").slice(0, 1024),
  };
}

function buildOrderOfUseField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_test) / Math.max(1, Number(d.dmg_ref))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = "L'ordre change peu le résultat";
  if (mean >= 1.12) cls = "L'ordre testé apporte un vrai gain";
  else if (mean >= 1.04) cls = "L'ordre testé aide un peu";
  else if (mean <= 0.88) cls = "L'ordre de référence garde un vrai avantage";
  else if (mean <= 0.96) cls = "L'ordre de référence reste un peu meilleur";
  return {
    name: "Impact de l'ordre",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen test/référence: **${mean.toFixed(3)}x**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildDamageWindowField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_window) / Math.max(1, Number(d.dmg_early))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = "Garder l'action change peu le résultat";
  if (mean >= 1.15) cls = "Garder l'action pour le bon moment vaut vraiment le coup";
  else if (mean >= 1.05) cls = "Attendre le bon moment aide un peu";
  return {
    name: "Fenêtre de dégâts",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen bon moment/trop tôt: **${mean.toFixed(3)}x**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildTagSwapImpactField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_tag) / Math.max(1, Number(d.dmg_base))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = "Le tag / swap change peu le résultat";
  if (mean >= 1.15) cls = "Le tag / swap apporte un vrai gain";
  else if (mean >= 1.05) cls = "Le tag / swap aide un peu";
  return {
    name: "Impact tag / swap",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen avec/sans: **${mean.toFixed(3)}x**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildCostumeImpactField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.costume_value) / Math.max(0.1, Number(d.base_value))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  const kinds = new Set(rows.map((d) => String(d.impact_type || '—')));
  let cls = "Le costume change peu le résultat";
  if (mean >= 1.12) cls = "Le costume apporte un vrai gain";
  else if (mean >= 1.04) cls = "Le costume aide un peu";
  else if (mean <= 0.88) cls = "Le costume fait perdre un peu de valeur";
  return {
    name: "Impact costume",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen avec/sans: **${mean.toFixed(3)}x**`,
      `Types suivis: **${kinds.size}**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildPotentialImpactField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.potential_value) / Math.max(0.1, Number(d.base_value))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  const kinds = new Set(rows.map((d) => String(d.impact_type || '—')));
  let cls = "Le potentiel change peu le résultat";
  if (mean >= 1.12) cls = "Le potentiel apporte un vrai gain";
  else if (mean >= 1.04) cls = "Le potentiel aide un peu";
  else if (mean <= 0.88) cls = "Le potentiel fait perdre un peu de valeur";
  return {
    name: "Impact potentiel",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen avec/sans: **${mean.toFixed(3)}x**`,
      `Types suivis: **${kinds.size}**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildRealUptimeField(docs, kind = "buff") {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.observed_active) / Math.max(0.1, Number(d.cycle_duration))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = `Le ${kind} tient mal en vrai combat`;
  if (mean >= 0.75) cls = `Le ${kind} tient bien en vrai combat`;
  else if (mean >= 0.5) cls = `Le ${kind} tient correctement si le combat reste propre`;
  const names = new Set(rows.map((d) => String((kind === 'debuff' ? d.debuff : d.buff) || '—')));
  return {
    name: `Uptime réel ${kind}`,
    value: [
      `Lecture: **${cls}**`,
      `Uptime moyen: **${(mean * 100).toFixed(1)}%**`,
      `${kind === 'debuff' ? 'Debuffs' : 'Buffs'} suivis: **${names.size}**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildStatPriorityField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_test) / Math.max(0.1, Number(d.dmg_ref))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = "Les deux axes de stats sont proches";
  if (mean >= 1.10) cls = "L'axe testé rapporte vraiment plus";
  else if (mean >= 1.03) cls = "L'axe testé passe un peu devant";
  else if (mean <= 0.90) cls = "L'axe de référence garde un vrai avantage";
  else if (mean <= 0.97) cls = "L'axe de référence reste un peu meilleur";
  return {
    name: "Priorité de stats",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen test/référence: **${mean.toFixed(3)}x**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildBossPressureField(docs) {
  const rows = (Array.isArray(docs) ? docs : []).filter((d) => d && d.status === "ok");
  if (!rows.length) return null;
  const ratios = rows.map((d) => Number(d.dmg_pressure) / Math.max(0.1, Number(d.dmg_clean))).filter(Number.isFinite);
  if (!ratios.length) return null;
  const mean = meanOf(ratios);
  let cls = "Le setup garde bien sa valeur sous pression boss";
  if (mean < 0.75) cls = "Le setup perd beaucoup de valeur sous pression boss";
  else if (mean < 0.9) cls = "Le setup perd un peu de valeur sous pression boss";
  const bosses = new Set(rows.map((d) => String(d.boss || '—')));
  return {
    name: "Pression boss",
    value: [
      `Lecture: **${cls}**`,
      `Ratio moyen pression/propre: **${mean.toFixed(3)}x**`,
      `Boss lus: **${bosses.size}**`,
      `Fiabilité: **${rows.length >= 20 ? 'bonne' : rows.length >= 10 ? 'moyenne' : 'faible'}**`,
    ].join("\n").slice(0, 1024),
  };
}

function buildTrendField(protoId, docs) {
  if (!docs.length) return null;
  if (protoId === "SCALING_ATK") {
    const pts = docs.filter((d) => d.status === "ok").map((d) => ({ x: Number(d.atk), y: Number(d.dmg) })).filter((p) => p.x > 0 && p.y > 0);
    const reg = linearRegression(pts);
    if (!reg) return null;
    const quality = reg.r2 >= 0.9 ? "très propre" : reg.r2 >= 0.7 ? "plutôt propre" : "bruitée";
    return { name: "Tendance scaling", value: `dmg ≈ **${reg.slope.toFixed(3)} × ATK + ${reg.intercept.toFixed(1)}**
R² **${reg.r2.toFixed(3)}** · qualité **${quality}**` };
  }
  if (protoId === "SCALING_DEF") {
    const pts = docs.filter((d) => d.status === "ok").map((d) => ({ x: Number(d.def), y: Number(d.dmg_taken) })).filter((p) => p.x > 0 && p.y > 0);
    const reg = linearRegression(pts);
    if (!reg) return null;
    const direction = reg.slope < 0 ? "réduction nette" : "proxy encore ambigu";
    return { name: "Tendance DEF", value: `dmg subis ≈ **${reg.slope.toFixed(3)} × DEF + ${reg.intercept.toFixed(1)}**
R² **${reg.r2.toFixed(3)}** · **${direction}**` };
  }
  if (protoId === "CRIT_RATE_REAL") {
    const rows = docs.filter((d) => d.status === "ok").map((d) => ({ shown: Number(d.crit_rate_shown), observed: Number(d.crits) / Math.max(1, Number(d.attempts)) * 100 })).filter((r) => Number.isFinite(r.shown) && Number.isFinite(r.observed));
    if (!rows.length) return null;
    const avgShown = rows.reduce((a, r) => a + r.shown, 0) / rows.length;
    const avgObs = rows.reduce((a, r) => a + r.observed, 0) / rows.length;
    const mae = rows.reduce((a, r) => a + Math.abs(r.observed - r.shown), 0) / rows.length;
    return { name: "Lecture critique", value: `Affiché moyen **${avgShown.toFixed(2)}%**
Observé moyen **${avgObs.toFixed(2)}%**
Écart moyen **${mae.toFixed(2)} pts**` };
  }
  if (protoId === "CRIT_DMG_REAL") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const avgNonCrit = valid.reduce((a, d) => a + Number(d.dmg_noncrit || 0), 0) / valid.length;
    const avgCrit = valid.reduce((a, d) => a + Number(d.dmg_crit || 0), 0) / valid.length;
    return { name: "Lecture critique", value: `Non-crit moyen **${avgNonCrit.toFixed(1)}**
Crit moyen **${avgCrit.toFixed(1)}**
Ratio moyen **${formatMetric(protoId, avgCrit / Math.max(1, avgNonCrit))}**` };
  }
  if (protoId === "MULTI_HIT_SNAPSHOT") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const avgSplit = valid.reduce((a, d) => a + Number(d.split_hit || 0), 0) / valid.length;
    const avgHits = valid.reduce((a, d) => a + Number(d.total_hits || 0), 0) / valid.length;
    return { name: "Fenêtre testée", value: `Changement moyen vers le hit **${avgSplit.toFixed(1)}** / **${avgHits.toFixed(1)}**` };
  }
  if (protoId === "COOLDOWN_REAL") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const avgShown = valid.reduce((a, d) => a + Number(d.shown_cd || 0), 0) / valid.length;
    const avgObs = valid.reduce((a, d) => a + Number(d.observed_cd || 0), 0) / valid.length;
    return { name: "Fenêtre de cooldown", value: `Affiché moyen **${avgShown.toFixed(2)}s**
Observé moyen **${avgObs.toFixed(2)}s**` };
  }
  if (protoId === "BUFF_UPTIME") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const avgCycle = valid.reduce((a, d) => a + Number(d.cycle_duration || 0), 0) / valid.length;
    return { name: "Cycle observé", value: `Cycle moyen **${avgCycle.toFixed(2)}s**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "INTERACTION_AB") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    return { name: "Interactions lues", value: `Mesures valides **${valid.length}**
Lecture sur base/A/B/A+B` };
  }
  if (protoId === "WEAPON_SKILL_DELTA") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const pairs = new Set(valid.map((d) => `${String(d.arme_a || 'A')} → ${String(d.arme_b || 'B')}`));
    const skills = new Set(valid.map((d) => String(d.skill || '—')));
    return { name: "Comparaisons lues", value: `Paires d'armes **${pairs.size}**
Skills / actions **${skills.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "ORDER_OF_USE") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const refs = new Set(valid.map((d) => String(d.order_ref || '—')));
    const tests = new Set(valid.map((d) => String(d.order_test || '—')));
    return { name: "Ordres lus", value: `Ordres de référence **${refs.size}**
Ordres testés **${tests.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "DAMAGE_WINDOW") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const actions = new Set(valid.map((d) => String(d.action || '—')));
    return { name: "Fenêtres lues", value: `Actions testées **${actions.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "TAG_SWAP_IMPACT") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const triggers = new Set(valid.map((d) => String(d.trigger || '—')));
    return { name: "Déclencheurs lus", value: `Tag / swap testés **${triggers.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "TAG_TO_BURST_CHAIN") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const triggers = new Set(valid.map((d) => String(d.trigger || '—')));
    const bursts = new Set(valid.map((d) => String(d.burst_effect_id || d.burst_family || '—')));
    return { name: "Chaînes lues", value: `Entrées / relais **${triggers.size}**
Lectures Burst **${bursts.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "TAG_WINDOW_GAIN") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const actions = new Set(valid.map((d) => String(d.action || '—')));
    return { name: "Fenêtres tag lues", value: `Actions testées **${actions.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "COSTUME_IMPACT") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const costumes = new Set(valid.map((d) => String(d.costume || '—')));
    const kinds = new Set(valid.map((d) => String(d.impact_type || '—')));
    return { name: "Costumes lus", value: `Costumes testés **${costumes.size}**
Types suivis **${kinds.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "POTENTIAL_IMPACT") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const potentials = new Set(valid.map((d) => String(d.potential || '—')));
    const kinds = new Set(valid.map((d) => String(d.impact_type || '—')));
    return { name: "Potentiels lus", value: `Potentiels testés **${potentials.size}**
Types suivis **${kinds.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "BUFF_REAL_UPTIME" || protoId === "DEBUFF_REAL_UPTIME") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const names = new Set(valid.map((d) => String((protoId === 'DEBUFF_REAL_UPTIME' ? d.debuff : d.buff) || '—')));
    const avgCycle = valid.reduce((a, d) => a + Number(d.cycle_duration || 0), 0) / valid.length;
    return { name: protoId === 'DEBUFF_REAL_UPTIME' ? "Debuffs lus" : "Buffs lus", value: `${protoId === 'DEBUFF_REAL_UPTIME' ? 'Debuffs' : 'Buffs'} testés **${names.size}**
Cycle moyen **${avgCycle.toFixed(2)}s**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "STAT_PRIORITY_DELTA") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const refs = new Set(valid.map((d) => String(d.stat_ref || '—')));
    const tests = new Set(valid.map((d) => String(d.stat_test || '—')));
    return { name: "Axes de stats lus", value: `Axes de référence **${refs.size}**
Axes testés **${tests.size}**
Mesures valides **${valid.length}**` };
  }
  if (protoId === "BOSS_PRESSURE_DELTA") {
    const valid = docs.filter((d) => d.status === "ok");
    if (!valid.length) return null;
    const bosses = new Set(valid.map((d) => String(d.boss || '—')));
    const setups = new Set(valid.map((d) => String(d.setup || '—')));
    return { name: "Pressions lues", value: `Boss testés **${bosses.size}**
Setups testés **${setups.size}**
Mesures valides **${valid.length}**` };
  }
  return null;
}

export {
  stddevFromValues,
  quantile,
  detectOutliersIQR,
  histogram,
  formatMetric,
  histogramLine,
  linearRegression,
  confidence95,
  bucketizeByOrder,
  largestGap,
  formatRangeNumber,
  analyzeBreakpoints,
  buildZoneField,
  meanOf,
  wilsonInterval,
  buildBuffStackingField,
  buildStatusProcField,
  buildMultiHitSnapshotField,
  buildCooldownField,
  buildBuffUptimeField,
  buildInteractionABField,
  buildWeaponSkillDeltaField,
  buildOrderOfUseField,
  buildDamageWindowField,
  buildTagSwapImpactField,
  buildCostumeImpactField,
  buildPotentialImpactField,
  buildRealUptimeField,
  buildStatPriorityField,
  buildBossPressureField,
  buildTrendField,
};
