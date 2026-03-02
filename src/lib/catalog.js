import { getCharacterIndex, getCharacter } from "./kv.js";
import { analyzeCharacterProfile } from "./gameplay.js";
import { withProgressionShape } from "./progression.js";

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function includesNormalized(haystack, needle) {
  const base = normalizeText(haystack);
  const query = normalizeText(needle);
  if (!query) return true;
  return base.includes(query);
}

export async function loadAllCharacters(kv) {
  const index = await getCharacterIndex(kv);
  const characters = await Promise.all(index.map((entry) => getCharacter(kv, entry.slug)));
  return characters.filter(Boolean).map((char) => withProgressionShape(char));
}

export function uniqueAttributes(characters = []) {
  return [...new Set(characters.map((char) => char?.attribute).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function uniqueRoles(characters = []) {
  return [...new Set(characters.flatMap((char) => char?.roles || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function uniqueRarities(characters = []) {
  return [...new Set(characters.map((char) => char?.rarity).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function uniqueWeapons(characters = []) {
  return [...new Set(characters.flatMap((char) => (char?.weapons || []).map((weapon) => weapon?.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function uniqueGameplayTags(characters = []) {
  return [...new Set(characters.flatMap((char) => analyzeCharacterProfile(char).tags || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function filterCharacters(characters = [], filters = {}) {
  const attribute = normalizeText(filters.attribute);
  const role = normalizeText(filters.role);
  const weapon = normalizeText(filters.weapon);
  const rarity = normalizeText(filters.rarity);
  const tag = normalizeText(filters.tag);

  return characters.filter((char) => {
    if (attribute && normalizeText(char?.attribute) !== attribute) return false;
    if (role && !(char?.roles || []).some((entry) => normalizeText(entry) === role)) return false;
    if (weapon && !(char?.weapons || []).some((entry) => normalizeText(entry?.name) === weapon)) return false;
    if (rarity && normalizeText(char?.rarity) !== rarity) return false;
    if (tag) {
      const tags = (analyzeCharacterProfile(char).tags || []).map((entry) => normalizeText(entry));
      if (!tags.includes(tag)) return false;
    }
    return true;
  });
}

export function resolveCharacter(characters = [], query) {
  if (!query) return null;
  const wanted = normalizeText(query);
  return characters.find((char) => normalizeText(char?.slug) === wanted)
    || characters.find((char) => normalizeText(char?.name) === wanted)
    || characters.find((char) => includesNormalized(char?.name, query));
}

export function resolveWeapon(char, query) {
  if (!char || !query) return null;
  const wanted = normalizeText(query);
  return (char.weapons || []).find((weapon) => normalizeText(weapon?.name) === wanted)
    || (char.weapons || []).find((weapon) => includesNormalized(weapon?.name, query))
    || null;
}

export function buildChoiceList(values = [], query = "", mapper = null) {
  const source = Array.isArray(values) ? values : [];
  const normalizedQuery = normalizeText(query);
  const projected = source
    .map((value) => mapper ? mapper(value) : ({ name: String(value), value: String(value) }))
    .filter((entry) => includesNormalized(entry.name, query))
    .sort((a, b) => {
      const aName = normalizeText(a.name);
      const bName = normalizeText(b.name);
      const aStarts = normalizedQuery ? aName.startsWith(normalizedQuery) : true;
      const bStarts = normalizedQuery ? bName.startsWith(normalizedQuery) : true;
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      const aIdx = normalizedQuery ? aName.indexOf(normalizedQuery) : 0;
      const bIdx = normalizedQuery ? bName.indexOf(normalizedQuery) : 0;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 25);
  return projected;
}
