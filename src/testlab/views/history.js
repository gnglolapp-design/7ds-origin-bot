const ACCENT = 0xC99700;
const ERROR = 0xED4245;

function qualityLabel(status) {
  if (status === "ok") return "Valide";
  if (status === "suspect") return "Douteux";
  return "Rejeté";
}

export function fmtDate(ts) {
  try {
    return new Date(Number(ts)).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  } catch {
    return String(ts);
  }
}

export async function buildHistory(kv, userId, page = 0, protoFilter = null) {
  const idxKey = `test:user:${userId}:idx`;
  const raw = await kv.get(idxKey, { type: "json" });
  const arr0 = Array.isArray(raw) ? raw : [];
  const visible = arr0.filter((x) => !x.deleted);
  const arr = protoFilter ? visible.filter((x) => String(x.proto) === String(protoFilter)) : visible;

  if (!arr.length) {
    return {
      embeds: [{
        color: ACCENT,
        title: "Mes tests — Historique",
        description: protoFilter ? `Aucune soumission pour **${protoFilter}** (depuis l'activation de l'historique).` : "Aucune soumission enregistrée (depuis l'activation de l'historique).",
        footer: { text: "Test · privé" },
      }],
      components: [],
    };
  }

  const per = 5;
  const maxPage = Math.max(0, Math.ceil(arr.length / per) - 1);
  const p = Math.min(Math.max(0, Number(page) || 0), maxPage);
  const slice = arr.slice(p * per, p * per + per);

  const lines = slice.map((s) => {
    const status = qualityLabel(s.status === "ok" ? "ok" : (s.status === "suspect" ? "suspect" : "reject"));
    return `• **${s.proto}** · ${status} · score **${s.score ?? "?"}** · id \`${s.id}\` · ${fmtDate(s.ts)}`;
  });

  const embeds = [{
    color: ACCENT,
    title: "Mes tests — Historique",
    description: lines.join("\n"),
    footer: { text: `Page ${p + 1}/${maxPage + 1} · ${arr.length} entrée(s)` },
  }];

  const base = "test:hist";
  const protoParam = protoFilter ? String(protoFilter) : "";
  const prevId = `${base}?u=${encodeURIComponent(userId)}&p=${p - 1}&proto=${encodeURIComponent(protoParam)}`;
  const nextId = `${base}?u=${encodeURIComponent(userId)}&p=${p + 1}&proto=${encodeURIComponent(protoParam)}`;

  const components = [{
    type: 1,
    components: [
      { type: 2, style: 2, label: "◀ Précédent", custom_id: prevId, disabled: p <= 0 },
      { type: 2, style: 2, label: "Suivant ▶", custom_id: nextId, disabled: p >= maxPage },
    ],
  }];

  return { embeds, components };
}

export async function buildDetailEmbed(kv, submissionId, requesterId, requesterIsAdmin) {
  const id = String(submissionId || "").trim();
  if (!id) return { color: ERROR, title: "ID manquant", description: "Utilise `/test detail submission:<id>`.", footer: { text: "Test" } };

  let key = await kv.get(`test:subid:${id}`);
  if (!key && id.startsWith("test:sub:")) key = id;

  if (!key) {
    return { color: ERROR, title: "Soumission introuvable", description: "ID inconnu.", footer: { text: "Test" } };
  }

  const doc = await kv.get(key, { type: "json" });
  if (!doc) {
    return { color: ERROR, title: "Soumission introuvable", description: "Entrée KV absente.", footer: { text: "Test" } };
  }

  const authorId = String(doc.userId || "");
  if (!requesterIsAdmin && authorId !== String(requesterId)) {
    return { color: ERROR, title: "Accès refusé", description: "Cette soumission est privée.", footer: { text: "Test · privé" } };
  }

  const fields = [
    { name: "Protocole", value: String(doc.proto || "?"), inline: true },
    { name: "Statut", value: qualityLabel(doc.status), inline: true },
    { name: "Score", value: String(doc.qualityScore ?? "?"), inline: true },
    ...(doc.deleted ? [{ name: "Suppression", value: `Oui · ${fmtDate(doc.deleted_at || doc.ts)}`, inline: true }] : []),
    { name: "ID", value: `\`${String(doc.id || id)}\``, inline: true },
    { name: "Date", value: fmtDate(doc.ts), inline: true },
  ];

  const warnings = Array.isArray(doc.warnings) ? doc.warnings : [];
  if (warnings.length) fields.push({ name: "Avertissements", value: warnings.map((w) => `• ${w}`).join("\n") });

  const hidden = new Set(["proto", "ts", "userId", "id", "qualityScore", "status", "warnings", "metric"]);
  const entries = Object.entries(doc).filter(([k]) => !hidden.has(k));
  const paramLines = entries.map(([k, v]) => `• **${k}**: ${String(v)}`).slice(0, 25);
  fields.push({ name: "Données", value: paramLines.length ? paramLines.join("\n") : "—" });

  if (doc.metric != null) fields.push({ name: "Métrique", value: String(doc.metric), inline: true });

  return {
    color: ACCENT,
    title: "Test — Détail soumission",
    fields,
    footer: { text: "Test · privé" },
  };
}
