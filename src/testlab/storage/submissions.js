import { reverseAggregates } from "./aggregates.js";

export async function storeSubmission(kv, protoId, userId, payload, qualityScore) {
  const ts = Date.now();
  const id = ts.toString(36);
  const key = `test:sub:${protoId}:${id}`;
  const doc = { ...payload, proto: protoId, ts, userId, id, qualityScore: Number(qualityScore ?? 0), deleted: false };
  await kv.put(key, JSON.stringify(doc));
  await kv.put(`test:subid:${id}`, key);

  const idxKey = `test:user:${userId}:idx`;
  const existing = await kv.get(idxKey, { type: "json" });
  const arr = Array.isArray(existing) ? existing : [];
  arr.unshift({ id, proto: protoId, ts, status: doc.status, score: doc.qualityScore });
  await kv.put(idxKey, JSON.stringify(arr.slice(0, 200)));

  return { key, id };
}

export async function removeIndexEntry(kv, userId, submissionId) {
  const idxKey = `test:user:${userId}:idx`;
  const raw = await kv.get(idxKey, { type: "json" });
  const arr = Array.isArray(raw) ? raw : [];
  const next = arr.map((x) => String(x.id) === String(submissionId) ? { ...x, deleted: true } : x);
  await kv.put(idxKey, JSON.stringify(next));
}

export async function deleteSubmission(kv, submissionId, actorId, actorIsAdmin) {
  const id = String(submissionId || "").trim();
  if (!id) return { ok: false, message: "ID manquant." };
  let key = await kv.get(`test:subid:${id}`);
  if (!key && id.startsWith("test:sub:")) key = id;
  if (!key) return { ok: false, message: "Soumission introuvable." };
  const doc = await kv.get(key, { type: "json" });
  if (!doc) return { ok: false, message: "Soumission introuvable." };
  if (doc.deleted) return { ok: false, message: "Cette soumission est déjà supprimée." };
  const authorId = String(doc.userId || "");
  if (!actorIsAdmin && authorId !== String(actorId)) return { ok: false, message: "Cette soumission est privée." };
  doc.deleted = true;
  doc.deleted_at = Date.now();
  doc.deleted_by = String(actorId || "unknown");
  await kv.put(key, JSON.stringify(doc));
  await removeIndexEntry(kv, authorId, doc.id || id);
  await reverseAggregates(kv, doc);
  return { ok: true, doc };
}
