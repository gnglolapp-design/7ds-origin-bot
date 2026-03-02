import { canonicalWeaponName, normalizeAttribute, normalizeNameKey } from "./slug.mjs";

export const KNOWN_WEAPONS = [
  "Dual Swords",
  "Lance",
  "Rapier",
  "Book",
  "Wand",
  "Axe",
  "Shield",
  "Gauntlets",
  "Cudgel",
  "Staff",
  "Greatsword",
  "Longsword",
  "Nunchaku",
];

export const KNOWN_SKILL_KINDS = [
  "Adventure Skill",
  "Passive",
  "Normal Attack",
  "Special Attack",
  "Normal Skill",
  "Tag Skill",
  "Ultimate Move",
  "Attack Skill",
];

const SKILL_KIND_CANON = new Map([
  ["aventure", "Adventure Skill"],
  ["adventure skill", "Adventure Skill"],
  ["passif", "Passive"],
  ["passive", "Passive"],
  ["attaque normale", "Normal Attack"],
  ["normal attack", "Normal Attack"],
  ["special", "Special Attack"],
  ["spécial", "Special Attack"],
  ["special attack", "Special Attack"],
  ["attaque speciale", "Special Attack"],
  ["compétence", "Normal Skill"],
  ["competence", "Normal Skill"],
  ["normal skill", "Normal Skill"],
  ["étiquette", "Tag Skill"],
  ["etiquette", "Tag Skill"],
  ["tag skill", "Tag Skill"],
  ["attack skill", "Tag Skill"],
  ["attaque d'etiquette", "Tag Skill"],
  ["attack", "Tag Skill"],
  ["ultime", "Ultimate Move"],
  ["ultimate move", "Ultimate Move"],
]);

const ROLE_PATTERNS = [
  [/\bdps\b/i, "DPS"],
  [/\bheal(?:er)?\b|\bsoin\b|\bhealer\b/i, "Heal"],
  [/\bbuff(?:er)?\b|\bally support\b|\baugmente\b/i, "Buffer"],
  [/\bdebuff(?:er)?\b|\bdecrease\b|\breduit\b|\bdiminue\b/i, "Debuffer"],
  [/\btank\b|\bdefense\b|\bbarrier\b|\bbouclier\b/i, "Défense"],
];

export function splitLines(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function uniqueNonEmpty(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const value = String(item ?? "").trim();
    if (!value) continue;
    const key = normalizeNameKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function between(text, startPattern, endPatterns = []) {
  const src = String(text ?? "");
  const start = src.search(startPattern);
  if (start === -1) return "";
  let slice = src.slice(start);
  const startMatch = slice.match(startPattern);
  if (startMatch) slice = slice.slice(startMatch.index + startMatch[0].length);
  let endIndex = slice.length;
  for (const pattern of endPatterns) {
    const idx = slice.search(pattern);
    if (idx !== -1) endIndex = Math.min(endIndex, idx);
  }
  return slice.slice(0, endIndex).trim();
}

export function collectWeaponsFromLines(lines) {
  return uniqueNonEmpty(
    (lines || [])
      .map((line) => canonicalWeaponName(line))
      .filter((line) => KNOWN_WEAPONS.includes(line))
  );
}

export function collectWeaponsFromText(text) {
  return collectWeaponsFromLines(splitLines(text));
}

function normalizeKind(value) {
  return SKILL_KIND_CANON.get(normalizeNameKey(value)) || null;
}

function looksLikeHitLine(value) {
  const line = String(value || "").trim();
  return /^(?:\d+(?:st|nd|rd|th)|\d+(?:er|e|ème|eme))\s*(?:hit|coup)\s*:/i.test(line) || /^\d+%$/.test(line);
}

function looksLikeLabel(value) {
  return /^(?:E|Q)$/i.test(String(value || "").trim());
}

function looksLikeDescriptionLine(value) {
  const line = String(value || "").trim();
  if (!line) return false;
  return /^(?:inflicts?|inflige|additionally|augmente|increases|decreases|restores|grants?|consumes|taunts?|binds?|deals?|applies?|reflects?|changes?)/i.test(line);
}

function isLikelyName(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  if (normalizeKind(value)) return false;
  if (KNOWN_WEAPONS.includes(canonicalWeaponName(value))) return false;
  if (/^Cooldown:/i.test(value)) return false;
  if (/^\d+\s*sec(?:onds?)?\s*cooldown\.?$/i.test(value)) return false;
  if (/^Tier\s*\d+/i.test(value) || /^\d+$/.test(value)) return false;
  if (/^(Skills?|Potential|Potentials?)$/i.test(value)) return false;
  if (looksLikeHitLine(value)) return false;
  if (looksLikeLabel(value)) return false;
  if (looksLikeDescriptionLine(value)) return false;
  if (value.length > 90) return false;
  return true;
}

function splitEmbeddedSkillKinds(lines) {
  const out = [];
  const pattern = /(Adventure Skill|Passive|Normal Attack|Special Attack|Normal Skill|Tag Skill|Ultimate Move)$/i;
  for (const raw of lines || []) {
    const line = String(raw || "").trim();
    if (!line) continue;
    const match = line.match(pattern);
    if (match && line.toLowerCase() !== match[1].toLowerCase()) {
      const idx = line.toLowerCase().lastIndexOf(match[1].toLowerCase());
      const left = line.slice(0, idx).trim();
      const right = line.slice(idx).trim();
      if (left) out.push(left);
      if (right) out.push(right);
      continue;
    }
    out.push(line);
  }
  return out;
}

function normalizeDescription(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanupSkillEntries(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i += 1) {
    const current = { ...entries[i] };
    const next = entries[i + 1] ? { ...entries[i + 1] } : null;

    if (
      current.kind === "Adventure Skill" &&
      current.description &&
      /^['"“”].+['"“”]$/.test(current.description) &&
      next &&
      next.kind === "Passive"
    ) {
      next.name = current.description.replace(/^['"“”]+|['"“”]+$/g, "");
      entries[i + 1] = next;
      current.description = "";
    }

    if (current.name === current.kind && current.kind === "Adventure Skill" && !current.description) {
      continue;
    }

    if (!current.name && current.kind) current.name = current.kind;
    current.description = normalizeDescription(current.description);

    if (current.name && current.name === current.kind && current.description) {
      const firstSentence = current.description.split(/(?<=[.!?])\s+/)[0] || "";
      if (isLikelyName(firstSentence) && !looksLikeDescriptionLine(firstSentence)) {
        current.name = firstSentence;
        current.description = normalizeDescription(current.description.slice(firstSentence.length).trim());
      }
    }

    if (/^(?:Passive|Normal Attack|Special Attack|Normal Skill|Tag Skill|Ultimate Move|Adventure Skill)$/i.test(String(current.name || "")) && !current.description) {
      continue;
    }

    if (!current.name && !current.description) continue;
    out.push(current);
  }

  return out.filter((entry) => entry.name || entry.description);
}

function parseCooldownFromLine(line) {
  const value = String(line || "").trim();
  if (!value) return { cooldown: null, rest: "" };
  let m = value.match(/^Cooldown:\s*(.+)$/i);
  if (m) return { cooldown: m[1].trim(), rest: "" };
  m = value.match(/^(\d+\s*sec(?:onds?)?)\s*cooldown\.?\s*(.*)$/i);
  if (m) return { cooldown: m[1].trim(), rest: m[2].trim() };
  m = value.match(/^CD[:\s]+(.+)$/i);
  if (m) return { cooldown: m[1].trim(), rest: "" };
  return { cooldown: null, rest: value };
}

export function parseSkillCardTexts(cardTexts = []) {
  const entries = [];
  for (const cardText of cardTexts || []) {
    const rawLines = splitEmbeddedSkillKinds(splitLines(cardText));
    if (!rawLines.length) continue;

    const kindIndex = rawLines.findIndex((line) => normalizeKind(line));
    if (kindIndex === -1) continue;

    const kind = normalizeKind(rawLines[kindIndex]);
    let name = null;
    if (kindIndex > 0 && isLikelyName(rawLines[kindIndex - 1])) {
      name = rawLines[kindIndex - 1];
    } else if (rawLines[kindIndex + 1] && isLikelyName(rawLines[kindIndex + 1])) {
      name = rawLines[kindIndex + 1];
    }

    let bodyStart = kindIndex + 1;
    if (name && rawLines[kindIndex + 1] === name) bodyStart = kindIndex + 2;

    if (!name && rawLines[kindIndex + 1] && /^['"“”].+['"“”]$/.test(rawLines[kindIndex + 1])) {
      name = rawLines[kindIndex + 1].replace(/^['"“”]+|['"“”]+$/g, "");
      bodyStart = kindIndex + 2;
    }
    const descLines = rawLines.slice(bodyStart).filter((line) => line !== name && !normalizeKind(line));

    let cooldown = null;
    const desc = [];
    for (const line of descLines) {
      const parsed = parseCooldownFromLine(line);
      if (!cooldown && parsed.cooldown) {
        cooldown = parsed.cooldown;
        if (parsed.rest) desc.push(parsed.rest);
        continue;
      }
      desc.push(line);
    }

    const description = normalizeDescription(desc.join(" "));
    const finalName = !name && looksLikeDescriptionLine(kind) ? null : (name || kind);

    entries.push({
      name: finalName || kind,
      kind,
      cooldown,
      description,
    });
  }
  return cleanupSkillEntries(entries);
}

export function parseSkillEntries(sectionText) {
  const lines = splitEmbeddedSkillKinds(splitLines(sectionText).filter((line) => !/^Image:/i.test(line)));
  const entries = [];

  let i = 0;
  while (i < lines.length) {
    let name = null;
    let kind = null;
    let cooldown = null;

    if (isLikelyName(lines[i]) && normalizeKind(lines[i + 1])) {
      name = lines[i];
      kind = normalizeKind(lines[i + 1]);
      i += 2;
    } else if (normalizeKind(lines[i])) {
      kind = normalizeKind(lines[i]);
      name = kind;
      if (lines[i + 1] && isLikelyName(lines[i + 1])) {
        name = lines[i + 1];
        i += 2;
      } else {
        i += 1;
      }
    } else {
      i += 1;
      continue;
    }

    const desc = [];
    while (i < lines.length) {
      const line = lines[i];
      if (normalizeKind(line)) break;
      if (isLikelyName(line) && normalizeKind(lines[i + 1])) break;
      if (KNOWN_WEAPONS.includes(canonicalWeaponName(line))) break;
      if (looksLikeLabel(line)) {
        i += 1;
        continue;
      }
      const parsed = parseCooldownFromLine(line);
      if (!cooldown && parsed.cooldown) {
        cooldown = parsed.cooldown;
        if (parsed.rest) desc.push(parsed.rest);
        i += 1;
        continue;
      }
      desc.push(line);
      i += 1;
    }

    entries.push({
      name,
      kind,
      cooldown,
      description: normalizeDescription(desc.join(" ")),
    });
  }

  return cleanupSkillEntries(entries);
}

export function chunkSequential(list, chunkCount) {
  if (!Array.isArray(list) || !list.length || !chunkCount) return [];
  if (list.length % chunkCount !== 0) return [];
  const size = list.length / chunkCount;
  const out = [];
  for (let i = 0; i < chunkCount; i += 1) {
    out.push(list.slice(i * size, (i + 1) * size));
  }
  return out;
}

export function parsePotentialEntries(sectionText) {
  const lines = splitLines(sectionText).filter((line) => !["Tier", "Bonus"].includes(line));
  const entries = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let tier = null;
    if (/^Tier\s*\d+$/i.test(line)) {
      tier = Number(line.match(/(\d+)/)?.[1] || 0);
    } else if (/^\d+$/.test(line)) {
      tier = Number(line);
    }
    if (!tier) continue;

    const body = [];
    let j = i + 1;
    while (j < lines.length && !/^Tier\s*\d+$/i.test(lines[j]) && !/^\d+$/.test(lines[j])) {
      body.push(lines[j]);
      j += 1;
    }

    entries.push({
      tier,
      text: body.join(" ").trim(),
      items: body.length ? [body.join(" ").trim()] : [],
    });

    i = j - 1;
  }

  return entries;
}

export function extractMetaRarity(imgAlts = []) {
  for (const alt of imgAlts) {
    const m = String(alt).match(/rarity\s*(\d+)/i);
    if (m) return `${m[1]}★`;
  }
  return null;
}

export function extractAttributes(imgAlts = []) {
  const ATTRS = new Set([
    "ice",
    "cold",
    "fire",
    "wind",
    "earth",
    "thunder",
    "holy",
    "dark",
    "physics",
    "physical",
    "lightning",
  ]);
  const out = [];
  for (const alt of imgAlts) {
    const key = normalizeNameKey(alt);
    if (ATTRS.has(key)) out.push(normalizeAttribute(alt));
  }
  return uniqueNonEmpty(out);
}

export function inferRoles(...texts) {
  const joined = texts.filter(Boolean).join(" \n ");
  const found = [];
  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(joined)) found.push(role);
  }
  return uniqueNonEmpty(found);
}

export function parseStatsPairs(lines) {
  const stats = {};
  for (let i = 0; i < lines.length - 1; i += 2) {
    const key = lines[i];
    const value = lines[i + 1];
    if (!key || !value) continue;
    stats[key] = value.replace(/,/g, " ");
  }
  return stats;
}

export function sliceLines(lines, startMatcher, endMatchers = []) {
  const startIndex = lines.findIndex((line) => startMatcher.test(line));
  if (startIndex === -1) return [];
  let endIndex = lines.length;
  for (const matcher of endMatchers) {
    const idx = lines.findIndex((line, i) => i > startIndex && matcher.test(line));
    if (idx !== -1) endIndex = Math.min(endIndex, idx);
  }
  return lines.slice(startIndex + 1, endIndex);
}

function looksLikeEffectText(value) {
  const line = String(value || "").trim();
  if (!line) return false;
  if (line.length < 20) return false;
  return /%|sec\b|cooldown|damage|restores|increases|decreases|chance|enemy|hero|attack|hp|gauge|duration|barrier/i.test(line);
}

function looksLikeCostumeName(value) {
  const line = String(value || "").trim();
  if (!line) return false;
  if (KNOWN_WEAPONS.includes(canonicalWeaponName(line))) return false;
  if (/Skills|Potential/i.test(line)) return false;
  return line.length <= 50;
}

export function parseGenshinCostumes(costumesText) {
  const lines = splitLines(costumesText);
  const costumes = [];
  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    if (!looksLikeCostumeName(name)) {
      i += 1;
      continue;
    }
    if (/Skills|Potential/i.test(name)) break;

    const next = lines[i + 1] || null;
    const next2 = lines[i + 2] || null;

    if (next && next2 && looksLikeCostumeName(next) && looksLikeEffectText(next2)) {
      costumes.push({ name, effect_title: null, effect: null });
      i += 1;
      continue;
    }

    if (next && next2 && !looksLikeCostumeName(next2) && looksLikeEffectText(next2)) {
      costumes.push({ name, effect_title: next, effect: next2 });
      i += 3;
      continue;
    }

    if (next && next2 && looksLikeCostumeName(next) && looksLikeEffectText(lines[i + 3] || "")) {
      costumes.push({ name, effect_title: null, effect: null });
      i += 1;
      continue;
    }

    costumes.push({ name, effect_title: null, effect: null });
    i += 1;
  }
  return costumes;
}
