import { PROTOCOLS } from "../protocols/registry.js";
import { resultsSolidness } from "../evidence/solidness.js";
import { describeProtocolContexts } from "../publication/context-describer.js";
import {
  stddevFromValues,
  quantile,
  detectOutliersIQR,
  confidence95,
  formatMetric,
  histogramLine,
  analyzeBreakpoints,
  buildZoneField,
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
} from "./results-analytics.js";

export function protocolEmbedList(disabledSet, lockedSet, { accent = 0xC99700 } = {}) {
  const fields = Object.values(PROTOCOLS).map((p) => {
    const disabled = disabledSet.has(p.id);
    return {
      name: `${disabled ? "⛔" : "🧪"} ${p.id} — ${p.title}`,
      value: `${p.what}\n• N min: **${p.min_n}**\n• Statut: **${disabled ? "désactivé" : "actif"}**`,
    };
  });
  return [{
    color: accent,
    title: "Tests — Protocoles disponibles",
    description: "Option A (strict). Chaque protocole impose des champs obligatoires et un N minimum.",
    fields,
    footer: { text: "Test · /test demarrer protocole:ID" },
  }];
}

export function starterEmbed(protoId, disabledSet, { accent = 0xC99700, error = 0xED4245 } = {}) {
  const p = PROTOCOLS[protoId];
  if (!p) return [ { color: error, title: "Protocole introuvable", description: "ID inconnu.", footer: { text: "Test" } } ];
  if (disabledSet.has(protoId)) {
    return [{ color: error, title: `${protoId} — indisponible`, description: "Ce protocole est désactivé pour l'instant.", footer: { text: "Test" } }];
  }
  const lines = p.fields.map(([k, d]) => `• **${k}** — ${d}`).join("\n");
  return [{
    color: accent,
    title: `${protoId} — ${p.title}`,
    description: `${p.what}\n\n**Champs obligatoires**\n${lines}\n\n**N minimum**: ${p.min_n}`,
    footer: { text: "Test · /test soumettre_<proto>" },
  }];
}

export async function listProtocolDocs(kv, protoId, limit = 500) {
  const prefix = `test:sub:${protoId}:`;
  const docs = [];
  let cursor = undefined;
  while (docs.length < limit) {
    const page = await kv.list({ prefix, cursor, limit: Math.min(100, limit - docs.length) });
    for (const key of (page.keys || [])) {
      const doc = await kv.get(key.name, { type: "json" });
      if (doc && !doc.deleted) docs.push(doc);
      if (docs.length >= limit) break;
    }
    if (!page.list_complete && page.cursor) cursor = page.cursor;
    else break;
  }
  return docs.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
}

export async function resultsEmbed(kv, protoId, { fmtDate = ((ts) => { try { return new Date(Number(ts)).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }); } catch { return String(ts); } }), accent = 0xC99700, error = 0xED4245 } = {}) {
  const p = PROTOCOLS[protoId];
  if (!p) return [{ color: error, title: "Protocole introuvable", description: "ID inconnu.", footer: { text: "Test" } }];

  const docs = await listProtocolDocs(kv, protoId, 500);
  if (!docs.length) {
    return [{
      color: accent,
      title: `${protoId} — Résultats`,
      description: "Aucune donnée enregistrée pour le moment.",
      footer: { text: "Test" },
    }];
  }

  const validDocs = docs.filter((d) => d.status === "ok" && d.metric != null);
  const suspectDocs = docs.filter((d) => d.status === "suspect");
  const rejectedStored = docs.filter((d) => d.status === "reject");
  const metrics = validDocs.map((d) => Number(d.metric)).filter((x) => Number.isFinite(x));
  const sortedMetrics = [...metrics].sort((a, b) => a - b);
  const mean = metrics.length ? metrics.reduce((a, b) => a + b, 0) / metrics.length : null;
  const sd = stddevFromValues(metrics);
  const ci = confidence95(metrics);
  const outliers = detectOutliersIQR(metrics);
  const q1 = sortedMetrics.length ? quantile(sortedMetrics, 0.25) : null;
  const median = sortedMetrics.length ? quantile(sortedMetrics, 0.5) : null;
  const q3 = sortedMetrics.length ? quantile(sortedMetrics, 0.75) : null;
  const solidity = resultsSolidness(docs);
  const contextMeta = describeProtocolContexts(protoId, docs);

  const fields = [
    {
      name: "Solidité",
      value: `**${solidity.label}**
${solidity.reason}`.slice(0, 1024),
      inline: true,
    },
    {
      name: "Soumissions",
      value: `✅ valides: **${validDocs.length}**
⚠️ suspectes: **${suspectDocs.length}**
❌ rejetées: **${rejectedStored.length}**`,
      inline: true,
    },
    {
      name: "Couverture",
      value: `Dernière MAJ: **${docs.length ? fmtDate(docs[docs.length - 1].ts) : "—"}**
Échantillon lu: **${docs.length}**`,
      inline: true,
    },
  ];

  if (contextMeta.summary?.length) {
    fields.push({
      name: "Contexte lu",
      value: contextMeta.summary.join("\n").slice(0, 1024),
      inline: false,
    });
  }

  if (metrics.length) {
    fields.push({
      name: "Lecture pondérée",
      value: `Moyenne pondérée **${formatMetric(protoId, solidity.weightedMean)}**
Poids utile **${solidity.weightedN.toFixed(2)}**
Outliers vus **${solidity.outlierCount}**`,
      inline: true,
    });
    fields.push({
      name: "Métrique centrale",
      value: `Moyenne valide **${formatMetric(protoId, mean)}**
Médiane valide **${formatMetric(protoId, median)}**
Min/Max **${formatMetric(protoId, sortedMetrics[0])} → ${formatMetric(protoId, sortedMetrics[sortedMetrics.length - 1])}**`,
      inline: true,
    });
    fields.push({
      name: "Dispersion",
      value: `Écart-type **${sd == null ? "—" : formatMetric(protoId, sd)}**
Écart pondéré **${solidity.weightedStddev == null ? "—" : formatMetric(protoId, solidity.weightedStddev)}**
Q1/Q3 **${formatMetric(protoId, q1)} / ${formatMetric(protoId, q3)}**`,
      inline: true,
    });
    if (ci) {
      fields.push({
        name: "IC 95%",
        value: `**${formatMetric(protoId, ci.low)} → ${formatMetric(protoId, ci.high)}**
N valide **${ci.n}**`,
        inline: true,
      });
    }
    fields.push({ name: "Distribution", value: histogramLine(metrics, protoId) });
  }

  const trend = buildTrendField(protoId, docs);
  if (trend) fields.push(trend);

  if (protoId === "BUFF_STACKING") {
    const stacking = buildBuffStackingField(docs);
    if (stacking) fields.push(stacking);
  }

  if (protoId === "STATUS_PROC_RATE") {
    const procField = buildStatusProcField(docs);
    if (procField) fields.push(procField);
  }

  if (protoId === "SCALING_ATK" || protoId === "SCALING_DEF") {
    const pts = validDocs.map((d) => ({
      x: Number(protoId === "SCALING_ATK" ? d.atk : d.def),
      y: Number(protoId === "SCALING_ATK" ? d.dmg : d.dmg_taken),
    })).filter((p) => p.x > 0 && p.y > 0);
    const bp = analyzeBreakpoints(pts, protoId === "SCALING_ATK" ? "atk" : "def");
    fields.push({ name: "Caps / breakpoints", value: `${bp.summary}
${bp.details}`.slice(0, 1024) });
    const zoneField = buildZoneField(protoId, bp);
    if (zoneField) fields.push(zoneField);
    if (bp.dataNeed) fields.push({ name: "Données à ajouter", value: bp.dataNeed.slice(0, 1024) });
  }


  if (protoId === "MULTI_HIT_SNAPSHOT") {
    const field = buildMultiHitSnapshotField(docs);
    if (field) fields.push(field);
  }

  if (protoId === "COOLDOWN_REAL") {
    const field = buildCooldownField(docs);
    if (field) fields.push(field);
  }

  if (protoId === "BUFF_UPTIME") {
    const field = buildBuffUptimeField(docs);
    if (field) fields.push(field);
  }

  if (protoId === "INTERACTION_AB") {
    const field = buildInteractionABField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "WEAPON_SKILL_DELTA") {
    const field = buildWeaponSkillDeltaField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "ORDER_OF_USE") {
    const field = buildOrderOfUseField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "DAMAGE_WINDOW") {
    const field = buildDamageWindowField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "TAG_SWAP_IMPACT") {
    const field = buildTagSwapImpactField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "TAG_TO_BURST_CHAIN") {
    const field = buildTagSwapImpactField(docs);
    if (field) fields.push({ ...field, name: "Chaînes tag → Burst" });
  }
  if (protoId === "TAG_WINDOW_GAIN") {
    const field = buildDamageWindowField(docs);
    if (field) fields.push({ ...field, name: "Fenêtres tag préparées" });
  }
  if (protoId === "COSTUME_IMPACT") {
    const field = buildCostumeImpactField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "POTENTIAL_IMPACT") {
    const field = buildPotentialImpactField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "BUFF_REAL_UPTIME") {
    const field = buildRealUptimeField(docs, "buff");
    if (field) fields.push(field);
  }
  if (protoId === "DEBUFF_REAL_UPTIME") {
    const field = buildRealUptimeField(docs, "debuff");
    if (field) fields.push(field);
  }
  if (protoId === "STAT_PRIORITY_DELTA") {
    const field = buildStatPriorityField(docs);
    if (field) fields.push(field);
  }
  if (protoId === "BOSS_PRESSURE_DELTA") {
    const field = buildBossPressureField(docs);
    if (field) fields.push(field);
  }

  const readableSummary = [];
  if (solidity.label === "Confirmé") readableSummary.push("• Ce qu'on sait : la tendance tient bien et les résultats se répètent assez proprement.");
  else if (solidity.label === "Probable") readableSummary.push("• Ce qu'on sait : la tendance existe déjà, mais il faut encore un peu plus de volume pour conseiller fort.");
  else readableSummary.push("• Ce qu'on sait : il y a encore trop peu de données propres pour trancher fermement.");
  if (suspectDocs.length) readableSummary.push(`• Ce qu'on soupçonne : ${suspectDocs.length} essai(s) restent à relire avec prudence.`);
  if (validDocs.length < Math.max(12, p.min_n || 0)) readableSummary.push(`• À retester : vise au moins **${Math.max(12, p.min_n || 0)}** mesures valides pour stabiliser ce protocole.`);
  if (readableSummary.length) fields.push({ name: "Lecture simple", value: readableSummary.join("\n").slice(0, 1024), inline: false });

  const suspectInfo = suspectDocs.slice(-3).map((d) => {
    const why = Array.isArray(d.warnings) && d.warnings.length ? d.warnings.join(", ") : "raison non précisée";
    return `• \`${d.id}\` — ${why}`;
  }).join("\n");
  if (suspectInfo) fields.push({ name: "Derniers suspects", value: suspectInfo.slice(0, 1024) });

  return [{
    color: accent,
    title: `${protoId} — Résultats avancés`,
    description: `${p.title}
${p.what}`,
    fields: fields.slice(0, 25),
    footer: { text: `Test · ${solidity.label}` },
  }];
}
