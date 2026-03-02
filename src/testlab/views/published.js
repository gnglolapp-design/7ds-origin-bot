import { getPublishedIndex, publishedKey } from '../publication/store.js';
import { buildPublishedProtocolList, buildPublishedSnapshotSummary } from '../publication/read-model.js';
import { compactPublishedContext } from '../publication/context-describer.js';

const ACCENT = 0xC99700;
const ERROR = 0xED4245;

export async function buildPublishedIndexEmbeds(kv, fmtDate, protoFilter = null, scopeFilter = null) {
  const index = await getPublishedIndex(kv);
  let rows = Array.isArray(index) ? [...index] : [];
  if (protoFilter) rows = rows.filter((x) => String(x?.protoId || '') === String(protoFilter));
  if (scopeFilter) rows = rows.filter((x) => String(x?.scopeType || 'global') === String(scopeFilter));
  rows.sort((a, b) => Number(b?.publishedAt || 0) - Number(a?.publishedAt || 0));

  if (!rows.length) {
    return [{
      color: ACCENT,
      title: 'Snapshots publiés',
      description: 'Aucun snapshot publié pour ce filtre.',
      footer: { text: 'Test · admin · snapshots' },
    }];
  }

  const pageSize = 8;
  const embeds = [];
  for (let i = 0; i < rows.length; i += pageSize) {
    const slice = rows.slice(i, i + pageSize);
    embeds.push({
      color: ACCENT,
      title: 'Snapshots publiés',
      description: slice.map((entry) => {
        const id = String(entry?.snapshotId || `${entry?.protoId || '?'}:${entry?.scopeType || 'global'}:${entry?.scopeValue || 'all'}`);
        const scope = String(entry?.scopeType || 'global');
        const context = compactPublishedContext(entry);
        const confidence = String(entry?.solidness || entry?.confidence || '—');
        const valid = Number(entry?.validCount || 0);
        return [
          `**${id}**`,
          `• protocole: **${String(entry?.protoId || '?')}**`,
          `• portée: **${scope}**`,
          `• solidité: **${confidence}** · valides: **${valid}**`,
          `• contexte: ${context}`,
          `• publié: ${fmtDate(entry?.publishedAt)}`,
        ].join('\n');
      }).join('\n\n').slice(0, 4000),
      footer: { text: `Test · admin · snapshots · vue ${Math.floor(i / pageSize) + 1}/${Math.max(1, Math.ceil(rows.length / pageSize))}` },
    });
  }
  return embeds;
}

export async function buildPublishedSnapshotDetailEmbed(kv, fmtDate, snapshotId) {
  const wanted = String(snapshotId || '').trim();
  if (!wanted) {
    return {
      color: ERROR,
      title: 'Snapshot publié introuvable',
      description: 'ID de snapshot manquant.',
      footer: { text: 'Test · admin · snapshots' },
    };
  }

  const index = await getPublishedIndex(kv);
  const entry = (Array.isArray(index) ? index : []).find((x) => String(x?.snapshotId || '') === wanted)
    || (Array.isArray(index) ? index : []).find((x) => String(x?.protoId || '') === wanted && String(x?.scopeType || 'global') === 'global');

  if (!entry) {
    return {
      color: ERROR,
      title: 'Snapshot publié introuvable',
      description: `Aucun snapshot publié trouvé pour **${wanted}**.`,
      footer: { text: 'Test · admin · snapshots' },
    };
  }

  const raw = await kv.get(String(entry?.publishedKey || publishedKey(entry?.protoId)), { type: 'json' });
  const snap = raw && typeof raw === 'object' ? raw : null;
  const embed = snap?.embed && typeof snap.embed === 'object' ? { ...snap.embed } : {
    color: ACCENT,
    title: `${String(entry?.protoId || '?')} — Snapshot publié`,
    description: String(entry?.scopeLabel || entry?.title || 'Snapshot publié'),
    fields: [],
  };

  const summary = compactPublishedContext(entry);
  const extraFields = [
    { name: 'Snapshot ID', value: String(entry?.snapshotId || wanted).slice(0, 1024), inline: false },
    { name: 'Portée', value: `**${String(entry?.scopeType || 'global')}**\n${summary}`.slice(0, 1024), inline: true },
    { name: 'Preuve', value: `**${String(entry?.solidness || entry?.confidence || '—')}**\nValides **${Number(entry?.validCount || 0)}**`.slice(0, 1024), inline: true },
    { name: 'Publication', value: `Publié le **${fmtDate(entry?.publishedAt)}**\nPar **${String(entry?.publishedBy || 'unknown')}**`.slice(0, 1024), inline: true },
  ];

  const merged = Array.isArray(embed.fields) ? [...embed.fields] : [];
  for (const field of extraFields) {
    if (merged.length >= 25) break;
    merged.push(field);
  }

  return {
    ...embed,
    fields: merged.slice(0, 25),
    footer: { text: `Test · admin · snapshot · ${String(entry?.solidness || entry?.confidence || '—')}` },
  };
}

export async function buildPublishedListEmbeds(kv, fmtDate) {
  const idx = await getPublishedIndex(kv);
  if (!idx.length) {
    return [{
      color: ACCENT,
      title: 'Tests — Résultats validés',
      description: 'Aucun snapshot publié pour le moment.',
      footer: { text: 'Test · public' },
    }];
  }

  const rows = buildPublishedProtocolList(idx, fmtDate);
  const lines = rows.map((row) => row.line);

  return [{
    color: ACCENT,
    title: 'Tests — Résultats validés',
    description: lines.join('\n'),
    footer: { text: 'Test · public · /test valide protocole:ID' },
  }];
}

export async function buildPublishedEmbed(kv, fmtDate, protoId, protocols) {
  const p = protocols[protoId];
  if (!p) {
    return [{ color: ERROR, title: 'Protocole introuvable', description: 'ID inconnu.', footer: { text: 'Test' } }];
  }
  const snap = await kv.get(publishedKey(protoId), { type: 'json' });
  if (!snap || !snap.embed) {
    return [{
      color: ACCENT,
      title: `${protoId} — Résultats validés`,
      description: 'Aucun snapshot publié pour ce protocole.',
      footer: { text: 'Test · public' },
    }];
  }
  const idx = await getPublishedIndex(kv);
  const protoEntries = idx.filter((x) => String(x?.protoId || '') === protoId);
  const { family, contextEntries, scopeSummary, conflict, protocolTitle } = buildPublishedSnapshotSummary(protoId, snap, protoEntries);
  const contextCount = contextEntries.length;
  const embed = { ...snap.embed };
  if (!embed.title || String(embed.title).trim() === protoId) {
    embed.title = `${protoId} — ${protocolTitle}`;
  }
  const existingFields = Array.isArray(embed.fields) ? embed.fields.slice(0, 21) : [];
  existingFields.unshift({
    name: 'Snapshot',
    value: `Famille **${family}**\nPublié **${fmtDate(snap.publishedAt)}**\nSolidité **${snap.solidness || snap.confidence || '—'}**\n${snap.solidReason ? `${snap.solidReason}\n` : ''}✅ **${snap.validCount ?? 0}** · ⚠️ **${snap.suspectCount ?? 0}** · ❌ **${snap.rejectedCount ?? 0}**${contextCount ? `\nContextes publiés **${contextCount}**` : ''}`,
    inline: true,
  });
  if (scopeSummary?.bullet) {
    existingFields.unshift({ name: 'Contextes publiés', value: scopeSummary.bullet.slice(0, 1024), inline: false });
  }
  if (Array.isArray(snap?.contexts?.summary) && snap.contexts.summary.length) {
    existingFields.unshift({ name: 'Contexte principal', value: snap.contexts.summary.slice(0, 5).join('\n').slice(0, 1024), inline: false });
  }
  if (conflict) {
    existingFields.unshift({
      name: 'Lecture prudente',
      value: `• ${conflict.short} : ${conflict.reason}.\n• ${conflict.leaning}\n• ${conflict.retest}\n• ${conflict.provisional}`.slice(0, 1024),
      inline: false,
    });
  }
  embed.fields = existingFields.slice(0, 25);
  embed.footer = { text: `Test · public · ${snap.solidness || snap.confidence || '—'}` };
  return [embed];
}
