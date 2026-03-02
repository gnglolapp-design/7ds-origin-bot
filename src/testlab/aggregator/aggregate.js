import { resultsSolidness } from '../evidence/solidness.js';

export function summarizeProtocolDocs(docs = []) {
  const validCount = docs.filter((d) => d.status === 'ok' && d.metric != null).length;
  const suspectCount = docs.filter((d) => d.status === 'suspect').length;
  const rejectedCount = docs.filter((d) => d.status === 'reject').length;
  const solidity = resultsSolidness(docs);

  return {
    validCount,
    suspectCount,
    rejectedCount,
    solidity,
    conflict: solidity?.conflict || null,
  };
}
