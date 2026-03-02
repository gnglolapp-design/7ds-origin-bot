import { KV_KEYS } from "../constants.js";

export async function kvGetJSON(kv, key, fallback = null) {
  if (!kv || !key) return fallback;
  try {
    const v = await kv.get(key, { type: 'json' });
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getCharacterIndex(kv) { return kvGetJSON(kv, KV_KEYS.CHAR_INDEX, []); }
export async function getBossIndex(kv) { return kvGetJSON(kv, KV_KEYS.BOSS_INDEX, []); }
export async function getCharacter(kv, slug) { return kvGetJSON(kv, KV_KEYS.CHAR_PREFIX + slug, null); }
export async function getBoss(kv, slug) { return kvGetJSON(kv, KV_KEYS.BOSS_PREFIX + slug, null); }
export async function getBaseMeta(kv) { return kvGetJSON(kv, KV_KEYS.BASE_META, null); }
export async function getScienceCharacterIndex(kv) { return kvGetJSON(kv, KV_KEYS.SCI_CHAR_INDEX, []); }
export async function getScienceBossIndex(kv) { return kvGetJSON(kv, KV_KEYS.SCI_BOSS_INDEX, []); }
export async function getScienceBossPhaseIndex(kv) { return kvGetJSON(kv, KV_KEYS.SCI_BOSS_PHASE_INDEX, []); }
export async function getScienceWeaponKitIndex(kv) { return kvGetJSON(kv, KV_KEYS.SCI_KIT_INDEX, []); }
export async function getScienceCharacter(kv, id) { return kvGetJSON(kv, KV_KEYS.SCI_CHAR_PREFIX + id, null); }
export async function getScienceBoss(kv, id) { return kvGetJSON(kv, KV_KEYS.SCI_BOSS_PREFIX + id, null); }
export async function getScienceBossPhase(kv, id) { return kvGetJSON(kv, KV_KEYS.SCI_BOSS_PHASE_PREFIX + id, null); }
export async function getScienceWeaponKit(kv, id) { return kvGetJSON(kv, KV_KEYS.SCI_KIT_PREFIX + id, null); }
export async function getScienceElements(kv) { return kvGetJSON(kv, KV_KEYS.SCI_ELEMENTS, []); }
export async function getScienceStatuses(kv) { return kvGetJSON(kv, KV_KEYS.SCI_STATUSES, []); }

export async function getNouveautes(kv) { return kvGetJSON(kv, KV_KEYS.NOUVEAUTES, null); }
export async function getSourceReport(kv) { return kvGetJSON(kv, KV_KEYS.SOURCE_REPORT, null); }
export async function getMediaReport(kv) { return kvGetJSON(kv, KV_KEYS.MEDIA_REPORT, null); }
export async function getSyncReport(kv) { return kvGetJSON(kv, KV_KEYS.SYNC_REPORT, null); }
export async function getBotStatsLive(kv) { return kvGetJSON(kv, KV_KEYS.BOT_STATS, null); }
export async function getTierlistSeed(kv) { return kvGetJSON(kv, KV_KEYS.TIERLIST, null); }
export async function getTierlistLive(kv) { return kvGetJSON(kv, KV_KEYS.TIERLIST_LIVE, null); }
export async function getTierlist(kv) {
  const live = await getTierlistLive(kv);
  if (live?.views) return live;
  return kvGetJSON(kv, KV_KEYS.TIERLIST, null);
}
export async function putTierlistLive(kv, payload) {
  if (!kv) throw new Error("KV indisponible");
  await kv.put(KV_KEYS.TIERLIST_LIVE, JSON.stringify(payload));
  return payload;
}

export async function getKVJson(env, key, fallback = null) {
  return kvGetJSON(env?.GAME_DATA, key, fallback);
}
