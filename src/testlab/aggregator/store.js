import { KV_KEYS } from '../../constants.js';

export function protocolSubmissionKey(protoId, id) {
  return `${KV_KEYS.TEST_PREFIX}${String(protoId || '')}:${String(id || '')}`;
}

export async function putSubmission(kv, protoId, id, payload) {
  await kv.put(protocolSubmissionKey(protoId, id), JSON.stringify(payload || {}));
}

export async function getSubmission(kv, protoId, id) {
  return kv.get(protocolSubmissionKey(protoId, id), { type: 'json' });
}
