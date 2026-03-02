import { PROTOCOLS } from '../protocols/registry.js';
import { getPublishedIndex, putPublishedIndex, publishedKey, publishedScopedKey } from './store.js';
import { buildIndexEntry, buildContextEntries } from './snapshot-builder.js';
import { buildDecisionCards } from './decision-cards.js';

function buildScopedSnapshotEmbed(protoId, title, entry, fmtDate, accent = 0xC99700) {
  const summary = Array.isArray(entry?.contexts?.summary) ? entry.contexts.summary.slice(0, 6) : [];
  const conflictShort = String(entry?.solidConflict?.short || '').trim();
  const fields = [
    { name: 'Contexte', value: String(entry?.scopeLabel || `${entry?.scopeType || 'scope'} ${entry?.scopeValue || 'all'}`), inline: false },
    { name: 'Solidité', value: String(entry?.solidness || entry?.confidence || '—'), inline: true },
    { name: 'Valides', value: String(entry?.validCount ?? 0), inline: true },
  ];
  if (summary.length) fields.push({ name: 'Résumé de contexte', value: summary.join('\n').slice(0, 1024), inline: false });
  if (conflictShort) fields.push({ name: 'Prudence', value: conflictShort, inline: false });
  return {
    color: accent,
    title: `${protoId} — Résultats validés`,
    description: `${title}\nSnapshot contextuel publié le ${fmtDate(entry?.publishedAt)}.`,
    fields: fields.slice(0, 25),
    footer: { text: `Test · snapshot contexte · ${entry?.solidness || entry?.confidence || '—'}` },
  };
}

export async function publishProtocolSnapshot(kv, protoId, actorId, deps = {}) {
  const {
    listProtocolDocs,
    resultsEmbed,
    fmtDate,
    describeProtocolContexts,
    accent = 0xC99700,
  } = deps;

  const p = PROTOCOLS[protoId];
  if (!p) return { ok: false, message: 'Protocole inconnu.' };
  if (typeof listProtocolDocs !== 'function') return { ok: false, message: 'Dépendance listProtocolDocs manquante.' };
  if (typeof resultsEmbed !== 'function') return { ok: false, message: 'Dépendance resultsEmbed manquante.' };
  if (typeof fmtDate !== 'function') return { ok: false, message: 'Dépendance fmtDate manquante.' };

  const docs = await listProtocolDocs(kv, protoId, 500);
  if (!docs.length) return { ok: false, message: 'Aucune donnée à publier pour ce protocole.' };

  const baseEntry = buildIndexEntry(protoId, p.title, Date.now(), actorId, docs, {
    describeProtocolContexts,
    isPrimary: true,
  });
  const { validCount, suspectCount, rejectedCount, confidence, contexts } = baseEntry;
  const solidity = { reason: baseEntry.solidReason, score: baseEntry.solidScore };

  const embeds = await resultsEmbed(kv, protoId);
  const base = Array.isArray(embeds) && embeds[0] ? embeds[0] : {
    color: accent,
    title: `${protoId} — Résultats validés`,
    description: p.title,
    fields: [],
  };

  const publishedAt = baseEntry.publishedAt;
  const footerText = `Test · snapshot publié · ${confidence}`;
  const embed = {
    ...base,
    title: `${protoId} — Résultats validés`,
    description: `${p.title}\nSnapshot public figé au ${fmtDate(publishedAt)}.`,
    footer: { text: footerText },
  };

  const snapshot = {
    protoId,
    title: p.title,
    publishedAt,
    publishedBy: String(actorId || 'unknown'),
    confidence,
    solidness: confidence,
    solidReason: solidity.reason,
    solidScore: solidity.score,
    solidConflict: baseEntry.solidConflict || null,
    validCount,
    suspectCount,
    rejectedCount,
    contexts,
    decisionCards: buildDecisionCards(protoId, baseEntry),
    embed,
  };

  await kv.put(publishedKey(protoId), JSON.stringify(snapshot));

  const idx = await getPublishedIndex(kv);
  const scopedEntries = buildContextEntries(protoId, p.title, publishedAt, actorId, docs, {
    describeProtocolContexts,
  });
  const scopedSnapshots = scopedEntries.map((entry) => ({
    ...entry,
    embed: buildScopedSnapshotEmbed(protoId, p.title, entry, fmtDate, accent),
    publishedKey: publishedScopedKey(protoId, entry.scopeType, entry.scopeValue),
  }));

  for (const scoped of scopedSnapshots) {
    await kv.put(scoped.publishedKey, JSON.stringify(scoped));
  }

  const next = [
    {
      ...baseEntry,
      contexts,
      publishedKey: publishedKey(protoId),
    },
    ...scopedEntries.map((entry) => ({
      ...entry,
      publishedKey: publishedScopedKey(protoId, entry.scopeType, entry.scopeValue),
    })),
    ...idx.filter((x) => String(x?.protoId || '') !== protoId),
  ];
  await putPublishedIndex(kv, next);

  return { ok: true, snapshot };
}
