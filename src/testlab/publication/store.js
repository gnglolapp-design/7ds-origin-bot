import { KV_KEYS } from '../../constants.js';

export async function getPublishedIndex(kv) {
  const raw = await kv.get(KV_KEYS.TEST_PUBLISHED_INDEX, { type: 'json' });
  return Array.isArray(raw) ? raw : [];
}

export async function putPublishedIndex(kv, arr) {
  await kv.put(KV_KEYS.TEST_PUBLISHED_INDEX, JSON.stringify(Array.isArray(arr) ? arr.slice(0, 300) : []));
}

export function publishedKey(protoId) {
  return `test:published:${String(protoId || '')}`;
}

export function publishedScopedKey(protoId, scopeType, scopeValue) {
  return `test:published:${String(protoId || '')}:${String(scopeType || 'global')}:${encodeURIComponent(String(scopeValue || 'all'))}`;
}
