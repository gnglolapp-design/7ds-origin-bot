import { inferRoles, uniqueNonEmpty } from "../lib/text-parse.mjs";
import { cleanCharacterName, normalizeAttribute, normalizeNameKey } from "../lib/slug.mjs";

function bySlug(items = []) {
  return new Map(items.map((item) => [item.slug, item]));
}

function choose(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    return value;
  }
  return null;
}

function looksSuspiciousSkillName(name = "", kind = "") {
  const value = String(name || "").trim();
  const type = String(kind || "").trim();
  if (!value) return true;
  if (/^['"“”].+['"“”]$/.test(value)) return true;
  if (/^(Passive|Normal Attack|Special Attack|Normal Skill|Tag Skill|Ultimate Move|Adventure Skill)$/i.test(value) && /^Passive$/i.test(type)) return true;
  if (/^(Inflicts|Inflige|Additionally|Augmente|Increases|Decreases|Consumes|Restores)\b/i.test(value)) return true;
  return false;
}

function skillArrayScore(values = []) {
  if (!Array.isArray(values) || !values.length) return 0;
  const kinds = new Set();
  let score = 0;
  let iconCount = 0;
  for (const item of values) {
    const name = String(item?.name || "").trim();
    const kind = String(item?.kind || "").trim();
    const description = String(item?.description || "").trim();
    if (kind) kinds.add(kind);
    if (name) score += 15;
    if (kind) score += 25;
    if (description) score += Math.min(description.length, 160);
    if (item?.cooldown) score += 10;
    if (name && kind && name !== kind) score += 15;
    if (item?.icon) {
      iconCount += 1;
      score += 45;
    }
    if (looksSuspiciousSkillName(name, kind)) score -= 70;
    if (name === kind && kind !== "Normal Attack" && kind !== "Special Attack") score -= 25;
  }
  if (values.length === 1 && String(values[0]?.description || "").length > 350) score -= 250;
  if (values.length < 4) score -= 60;
  if (iconCount) score += 60;
  score += kinds.size * 35;
  return score;
}

function potentialArrayScore(values = []) {
  if (!Array.isArray(values) || !values.length) return 0;
  const tiers = new Set();
  let score = 0;
  for (const item of values) {
    const tier = Number(item?.tier || 0);
    if (tier) tiers.add(tier);
    score += 30 + Math.min(String(item?.text || "").length, 120);
  }
  score += tiers.size * 20;
  return score;
}

function chooseBestSkills(...arrays) {
  let best = [];
  let bestScore = 0;
  for (const array of arrays) {
    const score = skillArrayScore(array);
    if (score > bestScore) {
      best = array;
      bestScore = score;
    }
  }
  return Array.isArray(best) ? best : [];
}

function chooseBestPotentials(...arrays) {
  let best = [];
  let bestScore = 0;
  for (const array of arrays) {
    const score = potentialArrayScore(array);
    if (score > bestScore) {
      best = array;
      bestScore = score;
    }
  }
  return Array.isArray(best) ? best : [];
}


function looksLikeEffectSentence(value = "") {
  const line = String(value || "").trim();
  if (!line) return false;
  if (line.length < 40) return false;
  return /(increases|decreases|restores|cooldown|damage|chance|max hp|when in combat|enemy|hero|crit|critical|barrier|attack by|defense by|augmente|diminue|inflige|dégâts|barriere|barrière|attaque|défense|combat)/i.test(line);
}

function isLikelyEnglishCostumeName(value = "") {
  const line = normalizeNameKey(value);
  if (!line) return false;
  const words = [
    'the', 'of', 'and', 'holy', 'knight', 'guardian', 'casual', 'outing', 'family', 'time', 'young',
    'friendly', 'apprentice', 'royal', 'butler', 'employee', 'light', 'flame', 'trail', 'shadow',
    'walk', 'instinct', 'runaway', 'moment', 'secretive', 'traveler', 'trace', 'memories', 'simple',
    'honor', 'dignity', 'trusted', 'grandmaster', 'returned', 'demon', 'day', 'cheerful', 'saint',
    'one', 'only', 'storms', 'lightning', 'explosions'
  ];
  return words.some((word) => new RegExp(`(^|\s)${word}(\s|$)`, 'i').test(line)) || /'s/.test(value);
}

function isLikelyFrenchCostumeName(value = "") {
  const raw = String(value || "");
  const line = normalizeNameKey(raw);
  if (!line) return false;
  if (/[àâäçéèêëîïôöùûüÿœ]/i.test(raw)) return true;
  const words = [
    'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'chevalier', 'chevaliere', 'sacre', 'saint',
    'sortie', 'famille', 'temps', 'gardien', 'gardienne', 'royal', 'flamme', 'trace', 'souvenirs',
    'ombre', 'detente', 'moment', 'dignite', 'defense', 'foudre', 'prometteur', 'tempetes', 'jeune',
    'unique', 'seul', 'revenue', 'reporte', 'voyageuse', 'visiere', 'etoile', 'jour', 'beau', 'mur',
    'fer', 'forteresse', 'princesse'
  ];
  return words.some((word) => new RegExp(`(^|\s)${word}(\s|$)`, 'i').test(line));
}

function pickPreferredCostumeName(primaryName, secondaryName) {
  const a = String(primaryName || '').trim();
  const b = String(secondaryName || '').trim();
  if (!a) return b || null;
  if (!b) return a || null;
  const aFr = isLikelyFrenchCostumeName(a);
  const bFr = isLikelyFrenchCostumeName(b);
  const aEn = isLikelyEnglishCostumeName(a);
  const bEn = isLikelyEnglishCostumeName(b);
  if (aFr && bEn) return a;
  if (bFr && aEn) return b;
  if (a.length <= b.length) return a;
  return b;
}

function mergeCostumeEntry(primary = {}, secondary = {}) {
  return {
    name: pickPreferredCostumeName(primary.name, secondary.name),
    description: primary.description || secondary.description || null,
    passive: primary.passive || secondary.passive || null,
    effect_title: primary.effect_title || secondary.effect_title || null,
    effect: primary.effect || secondary.effect || null,
    image: primary.image || secondary.image || null,
    source_url: primary.source_url || secondary.source_url || null,
  };
}

function sanitizeCostumeList(list = []) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && (item.name || item.effect || item.effect_title || item.image))
    .filter((item) => item?.name ? !looksLikeEffectSentence(item.name) : true);
}

function shouldSuppressLocalizedLeftovers(originList = [], leftovers = []) {
  if (!originList.length || !leftovers.length) return false;
  const englishCount = leftovers.filter((item) => isLikelyEnglishCostumeName(item?.name)).length;
  const originFrenchCount = originList.filter((item) => isLikelyFrenchCostumeName(item?.name)).length;
  return leftovers.length >= Math.max(2, Math.floor(originList.length * 0.6)) && englishCount >= Math.max(2, Math.floor(leftovers.length * 0.6)) && originFrenchCount >= Math.max(2, Math.floor(originList.length * 0.5));
}

function mergeWeapons(originWeapons = [], genshinWeapons = [], hideoutWeapons = []) {
  const order = [];
  const seen = new Set();

  for (const list of [originWeapons, hideoutWeapons, genshinWeapons]) {
    for (const weapon of list || []) {
      if (!weapon?.name || seen.has(weapon.name)) continue;
      seen.add(weapon.name);
      order.push(weapon.name);
    }
  }

  return order.map((name) => {
    const fromOrigin = originWeapons.find((x) => x.name === name) || {};
    const fromGenshin = genshinWeapons.find((x) => x.name === name) || {};
    const fromHideout = hideoutWeapons.find((x) => x.name === name) || {};
    const hideoutSkillScore = skillArrayScore(fromHideout.skills);
    const originSkillScore = skillArrayScore(fromOrigin.skills);
    const genshinSkillScore = skillArrayScore(fromGenshin.skills);
    const skills = hideoutSkillScore >= Math.max(originSkillScore, genshinSkillScore) * 0.85 && hideoutSkillScore > 0
      ? (Array.isArray(fromHideout.skills) ? fromHideout.skills : [])
      : chooseBestSkills(fromHideout.skills, fromOrigin.skills, fromGenshin.skills);

    return {
      name,
      attribute: choose(
        normalizeAttribute(fromHideout.attribute),
        normalizeAttribute(fromOrigin.attribute),
        normalizeAttribute(fromGenshin.attribute)
      ),
      skills,
      potentials: chooseBestPotentials(fromHideout.potentials, fromOrigin.potentials, fromGenshin.potentials),
    };
  });
}

function mergeCostumes(originCostumes = [], genshinCostumes = []) {
  const originList = sanitizeCostumeList(originCostumes).filter((x) => x?.name);
  const genshinList = sanitizeCostumeList(genshinCostumes);
  const merged = [];
  const seen = new Set();
  const consumedGenshinIndexes = new Set();

  const genshinByName = new Map();
  genshinList.forEach((costume, index) => {
    if (!costume?.name) return;
    genshinByName.set(normalizeNameKey(costume.name), { costume, index });
  });

  for (let index = 0; index < originList.length; index += 1) {
    const origin = originList[index] || {};
    const key = normalizeNameKey(origin.name || "");
    const byName = genshinByName.get(key) || null;
    const byIndex = genshinList[index] || null;
    const picked = byName?.costume || byIndex || {};

    if (byName?.index != null) consumedGenshinIndexes.add(byName.index);
    else if (byIndex) consumedGenshinIndexes.add(index);

    if (key) seen.add(key);
    merged.push({ ...mergeCostumeEntry(origin, picked), name: origin.name || picked.name || null });
  }

  const leftovers = [];
  genshinList.forEach((costume, index) => {
    const key = normalizeNameKey(costume.name || "");
    if (consumedGenshinIndexes.has(index)) return;
    if (key && seen.has(key)) return;
    leftovers.push({ costume, index, key });
  });

  if (!shouldSuppressLocalizedLeftovers(originList, leftovers.map((entry) => entry.costume))) {
    leftovers.forEach(({ costume, key }) => {
      if (key) seen.add(key);
      merged.push(mergeCostumeEntry(costume, {}));
    });
  }

  const deduped = [];
  const byKey = new Map();
  for (const costume of merged) {
    const key = normalizeNameKey(costume?.name || '');
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, deduped.length);
      deduped.push(costume);
      continue;
    }
    const idx = byKey.get(key);
    deduped[idx] = mergeCostumeEntry(deduped[idx], costume);
  }

  return deduped;
}

function prettyName(...values) {
  for (const value of values) {
    const cleaned = cleanCharacterName(value || "");
    if (cleaned) return cleaned;
  }
  return null;
}

export function mergeCharacters({ origin, genshin, hideout }) {
  const originMap = bySlug(origin?.characters || []);
  const genshinMap = bySlug(genshin?.characters || []);
  const hideoutMap = bySlug(hideout?.characters || []);
  const slugs = uniqueNonEmpty([...originMap.keys(), ...genshinMap.keys(), ...hideoutMap.keys()]);

  return slugs
    .map((slug) => {
      const o = originMap.get(slug) || {};
      const g = genshinMap.get(slug) || {};
      const h = hideoutMap.get(slug) || {};

      const weapons = mergeWeapons(o.weapons || [], g.weapons || [], h.weapons || []);
      const attributes = uniqueNonEmpty([
        ...(o.attributes || []).map((x) => normalizeAttribute(x)).filter(Boolean),
        ...weapons.map((w) => normalizeAttribute(w.attribute)).filter(Boolean),
      ]);
      const roles = uniqueNonEmpty([...(o.roles || []), ...(g.roles || []), ...(h.roles || []), ...inferRoles(o.description, g.description, h.overview)]);

      return {
        slug,
        name: prettyName(o.name, g.name, h.name, slug) || slug,
        description: choose(o.description, g.description, h.overview, "") || "",
        rarity: choose(o.rarity, g.rarity),
        attribute: choose(normalizeAttribute(o.attribute), attributes[0], null),
        attributes,
        roles,
        images: {
          portrait: choose(o.images?.portrait, g.images?.portrait, h.images?.portrait, null),
        },
        stats: choose(h.stats, o.stats, g.stats, {}) || {},
        weapons,
        costumes: mergeCostumes(o.costumes || [], g.costumes || []),
        prefarm: { items: [], notes: null, source: null },
        upgrade: { items: [], notes: null, source: null },
        farm_sources: [],
        materials: [],
        sources: {
          seven_origin: o.source_url || null,
          genshin: g.source_url || null,
          hideout: h.source_url || null,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
