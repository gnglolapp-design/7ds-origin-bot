import { KV_KEYS } from "../constants.js";
import { kvGetJSON } from "./kv.js";

function nowIso() {
  return new Date().toISOString();
}

function safeBucket(value) {
  return value && typeof value === "object" ? value : {};
}

function increment(map, key, amount = 1) {
  if (!key) return map;
  map[key] = Number(map[key] || 0) + amount;
  return map;
}

export async function getBotStats(kv) {
  return kvGetJSON(kv, KV_KEYS.BOT_STATS, {
    version: "v46-live",
    created_at: nowIso(),
    updated_at: nowIso(),
    totals: { interactions: 0, commands: 0, component_views: 0 },
    commands: {},
    entities: { characters: {}, bosses: {} },
  });
}

export async function putBotStats(kv, payload) {
  if (!kv) return payload;
  await kv.put(KV_KEYS.BOT_STATS, JSON.stringify(payload));
  return payload;
}

export async function trackCommandUsage(kv, commandName) {
  if (!kv || !commandName) return null;
  const stats = await getBotStats(kv);
  stats.version ||= "v46-live";
  stats.created_at ||= nowIso();
  stats.updated_at = nowIso();
  stats.totals = {
    interactions: Number(stats?.totals?.interactions || 0) + 1,
    commands: Number(stats?.totals?.commands || 0) + 1,
    component_views: Number(stats?.totals?.component_views || 0),
  };
  stats.commands = safeBucket(stats.commands);
  increment(stats.commands, commandName);
  return putBotStats(kv, stats);
}

export async function trackEntityView(kv, type, slug) {
  if (!kv || !slug) return null;
  const stats = await getBotStats(kv);
  stats.version ||= "v46-live";
  stats.created_at ||= nowIso();
  stats.updated_at = nowIso();
  stats.totals = {
    interactions: Number(stats?.totals?.interactions || 0) + 1,
    commands: Number(stats?.totals?.commands || 0),
    component_views: Number(stats?.totals?.component_views || 0) + 1,
  };
  stats.entities ||= { characters: {}, bosses: {} };
  stats.entities.characters = safeBucket(stats.entities.characters);
  stats.entities.bosses = safeBucket(stats.entities.bosses);
  if (type === "character") increment(stats.entities.characters, slug);
  if (type === "boss") increment(stats.entities.bosses, slug);
  return putBotStats(kv, stats);
}
