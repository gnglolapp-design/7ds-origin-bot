import { withBrowser, safeOpen } from "../lib/playwright-utils.mjs";
import {
  between,
  parsePotentialEntries,
  parseSkillEntries,
  splitLines,
  escapeRegExp,
} from "../lib/text-parse.mjs";
import { canonicalWeaponName, cleanCharacterName, normalizeNameKey } from "../lib/slug.mjs";

const BASE = "https://genshin.gg/7dso";
const LIST_URL = `${BASE}/`;
const WEAPONS_URL = `${BASE}/weapons/`;

const INVALID_COSTUME_PREFIXES = [
  'longsword', 'dual swords', 'axe', 'shield', 'lance', 'rapier', 'book', 'wand', 'staff', 'greatsword', 'gauntlets', 'nunchaku',
  'epee longue', 'épée longue', 'epees jumelles', 'épées jumelles', 'bouclier', 'rapiere', 'rapière', 'grimoire', 'baguette', 'baton', 'bâton', 'grande epee', 'grande épée', 'gantelets'
];

function isValidCostumeName(value) {
  const line = String(value || '').trim();
  if (!line) return false;
  if (/^(?:Costumes?|Character Weapons?|Armes du personnage)$/i.test(line)) return false;
  if (/^\d+$/i.test(line)) return false;
  if (/^(?:7dsorigin(?:s)?\.gg|genshin\.gg|hideoutgacha)$/i.test(line)) return false;
  const normalized = normalizeNameKey(line);
  if (INVALID_COSTUME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  if (["7dsorigin.gg", "7dsorigins.gg", "genshin.gg", "hideoutgacha"].some((token) => normalized.includes(token))) return false;
  return true;
}

function looksLikeEffectText(value) {
  const line = String(value || "").trim();
  if (!line) return false;
  if (line.length < 20) return false;
  return /%|sec\b|cooldown|damage|restores|increases|decreases|chance|max hp|attack|gauge|duration|barrier|enemy|hero/i.test(line);
}

async function extractCostumesFromDom(page) {
  try {
    const costumes = await page.evaluate(() => {
      const text = (node) => (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
      const normalize = (s) => (s || "").trim();
      const isHeading = (node, levels) => node && levels.includes(node.tagName);
      const imgUrl = (img) => img?.getAttribute?.("src") || img?.getAttribute?.("data-src") || img?.currentSrc || img?.src || null;
      const firstLink = (node) => node?.closest?.('a[href]') || node?.querySelector?.('a[href]') || null;
      const headings = [...document.querySelectorAll("h1,h2,h3,h4")];
      const costumesHeading = headings.find((h) => /costumes/i.test(text(h)));
      if (!costumesHeading) return [];

      const out = [];
      let node = costumesHeading.nextElementSibling;
      while (node) {
        const nodeText = text(node);
        if (isHeading(node, ["H2", "H3"]) && /skills|potential|character weapons?/i.test(nodeText)) break;
        if (isHeading(node, ["H4"])) {
          const block = {
            name: normalize(nodeText),
            description: null,
            effect_title: null,
            effect: null,
            image: null,
            source_url: null,
          };

          const nameNode = node;
          const localImage = nameNode.parentElement?.querySelector?.('img') || nameNode.nextElementSibling?.querySelector?.('img') || null;
          const link = firstLink(nameNode.parentElement) || firstLink(nameNode.nextElementSibling);
          block.image = imgUrl(localImage);
          block.source_url = link?.href || null;

          const body = [];
          let sib = node.nextElementSibling;
          while (sib) {
            const sibText = text(sib);
            if (isHeading(sib, ["H2", "H3"]) && /skills|potential|character weapons?/i.test(sibText)) break;
            if (isHeading(sib, ["H4"])) break;
            if (sibText && !/^Image:/i.test(sibText)) body.push(sibText);
            if (!block.image) {
              const sibImg = sib.querySelector?.('img') || null;
              block.image = imgUrl(sibImg) || block.image;
            }
            if (!block.source_url) {
              const sibLink = firstLink(sib);
              block.source_url = sibLink?.href || block.source_url;
            }
            sib = sib.nextElementSibling;
          }

          if (body.length >= 2) {
            block.effect_title = body[0] || null;
            block.effect = body.slice(1).join(" ") || null;
          } else if (body.length === 1) {
            if (body[0].length > 80 || /%|sec\b|cooldown|damage|restores|increases|decreases|chance/i.test(body[0])) {
              block.effect = body[0];
            } else {
              block.effect_title = body[0];
            }
          }

          if (block.name) out.push(block);
        }
        node = node.nextElementSibling;
      }
      return out;
    });
    return Array.isArray(costumes) ? costumes : [];
  } catch {
    return [];
  }
}

function parseCostumesFromText(costumesText) {
  const lines = splitLines(costumesText).filter((line) => !/^Costumes$/i.test(line) && isValidCostumeName(line));
  const costumes = [];
  let i = 0;
  while (i < lines.length) {
    const name = lines[i];
    if (!name || /skills|potential/i.test(name)) break;

    const next = lines[i + 1] || "";
    const next2 = lines[i + 2] || "";

    if (next && next2 && !looksLikeEffectText(next) && looksLikeEffectText(next2)) {
      costumes.push({ name, effect_title: next || null, effect: next2 || null });
      i += 3;
      continue;
    }

    if (next && looksLikeEffectText(next)) {
      costumes.push({ name, effect_title: null, effect: next });
      i += 2;
      continue;
    }

    costumes.push({ name, effect_title: null, effect: null });
    i += 1;
  }
  return costumes;
}

function scoreCostumes(costumes = []) {
  if (!Array.isArray(costumes) || !costumes.length) return 0;
  let score = costumes.length * 10;
  for (const item of costumes) {
    if (item?.effect) score += 25;
    if (item?.effect_title) score += 15;
    if (item?.image) score += 20;
    if (String(item?.name || '').length > 60) score -= 20;
  }
  return score;
}

function mergeCostumeLists(domCostumes = [], textCostumes = []) {
  const byName = new Map();
  const sanitizedDom = (Array.isArray(domCostumes) ? domCostumes : []).map((costume, idx) => {
    const fallback = textCostumes[idx] || null;
    if (isValidCostumeName(costume?.name)) return costume;
    if (fallback?.name && (costume?.image || costume?.source_url)) {
      return {
        ...costume,
        name: fallback.name,
        description: costume?.description || fallback.description || null,
        effect_title: costume?.effect_title || fallback.effect_title || null,
        effect: costume?.effect || fallback.effect || null,
      };
    }
    return costume;
  });
  const push = (costume, source = "unknown") => {
    if (!costume?.name || !isValidCostumeName(costume.name)) return;
    const key = normalizeNameKey(costume.name);
    const existing = byName.get(key) || { name: costume.name };
    byName.set(key, {
      name: existing.name || costume.name,
      description: existing.description || costume.description || null,
      effect_title: existing.effect_title || costume.effect_title || null,
      effect: existing.effect || costume.effect || null,
      image: existing.image || costume.image || null,
      source_url: existing.source_url || costume.source_url || null,
      _from_dom: existing._from_dom || source === "dom",
    });
  };

  for (const costume of sanitizedDom) push(costume, "dom");
  for (const costume of textCostumes) push(costume, "text");

  const merged = [...byName.values()].map(({ _from_dom, ...rest }) => rest);
  if (scoreCostumes(merged) === 0 && scoreCostumes(textCostumes) > 0) return textCostumes;
  return merged;
}



const EQUIPPABLE_WEAPON_TYPES = ["Axe", "Dual Swords", "Gauntlets", "Greatsword", "Book", "Lance", "Longsword", "Nunchaku", "Rapier", "Staff", "Shield", "Wand"];
const EQUIPPABLE_WEAPON_TYPE_SET = new Set(EQUIPPABLE_WEAPON_TYPES.map((x) => normalizeNameKey(x)));

function normalizeEquippableWeaponType(name, typeLine) {
  const fromName = canonicalWeaponName(String(name || '').split(/\s+/).slice(-2).join(' '));
  if (fromName && normalizeNameKey(fromName) !== normalizeNameKey(name || '')) return fromName;
  const rawType = canonicalWeaponName(typeLine || '');
  if (normalizeNameKey(rawType) === 'cudgel' && /nunchaku/i.test(String(name || ''))) return 'Nunchaku';
  if (normalizeNameKey(rawType) === 'shield' && /sword and shield/i.test(String(name || ''))) return 'Shield';
  return rawType || null;
}

function normalizeEquippableStatKey(value) {
  const raw = normalizeNameKey(value || '');
  if (!raw) return null;
  const map = new Map([
    ['equipment attack', 'equipment_attack'],
    ['crit damage', 'crit_damage'],
    ['crit rate', 'crit_rate'],
    ['healing efficiency', 'healing_efficiency'],
    ['attack increase', 'attack_increase'],
    ['accuracy', 'accuracy'],
  ]);
  return map.get(raw) || raw.replace(/\s+/g, '_');
}

function parseNumericValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const clean = raw.replace(/,/g, '').replace(/%/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function inferPassiveTrigger(description) {
  const text = String(description || '').toLowerCase();
  if (!text) return null;
  if (text.includes('activating a burst') || text.includes('burst activates') || text.includes('fire burst activates')) return 'burst_activate';
  if (text.includes('using the tag skill')) return 'tag_skill_use';
  if (text.includes('using the ultimate move')) return 'ultimate_use';
  if (text.includes('using a skill')) return 'skill_use';
  if (text.includes('back attacks')) return 'back_attack';
  if (text.includes('critical hits have') || text.includes('attack results in a critical hit')) return 'critical_hit';
  if (text.includes('hitting an enemy')) return 'on_hit';
  return null;
}

function parseGenshinWeaponsText(text) {
  const lines = splitLines(text).map((line) => line.trim()).filter(Boolean);
  const items = [];
  let i = 0;
  while (i < lines.length) {
    const current = lines[i];
    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const next3 = lines[i + 3] || '';
    if (EQUIPPABLE_WEAPON_TYPE_SET.has(normalizeNameKey(next)) && !/^equipment attack$/i.test(current) && !/^seven deadly sins: origin weapons list$/i.test(current)) {
      const name = current;
      const weapon_type = normalizeEquippableWeaponType(name, next);
      const descriptionParts = [];
      let j = i + 2;
      while (j < lines.length && !/^equipment attack$/i.test(lines[j])) {
        descriptionParts.push(lines[j]);
        j += 1;
      }
      if (j >= lines.length) { i += 1; continue; }
      const attackValue = parseNumericValue(lines[j + 1]);
      const substatName = lines[j + 2] || null;
      const substatValue = parseNumericValue(lines[j + 3]);
      const stats = {};
      if (attackValue != null) stats.equipment_attack = attackValue;
      const statKey = normalizeEquippableStatKey(substatName);
      if (statKey && substatValue != null) stats[statKey] = substatValue;
      items.push({
        name,
        weapon_type,
        passive_description: descriptionParts.join(' ').trim() || null,
        passive_trigger: inferPassiveTrigger(descriptionParts.join(' ').trim()),
        stats,
        source_url: WEAPONS_URL,
      });
      i = j + 4;
      continue;
    }
    i += 1;
  }
  const dedup = new Map();
  for (const item of items) {
    const key = normalizeNameKey(item.name);
    if (!key) continue;
    if (!dedup.has(key)) dedup.set(key, item);
  }
  return [...dedup.values()];
}

function parseGenshinCharacter(state, slug, domCostumes = []) {
  const text = state.text || "";
  const lines = splitLines(text);
  const heading = lines.find((line) => /Build\s*\|/i.test(line));
  const name = cleanCharacterName(heading ? heading.replace(/\s*Build.*$/i, "").trim() : slug);

  const description = between(
    text,
    new RegExp(`${escapeRegExp(name)}\\s+Build`, "i"),
    [/\n\s*Costumes\s+Skills\s+Potential\s*\n/i, /\n\s*Costumes\s*\n/i]
  );

  const costumesText = between(
    text,
    new RegExp(`${escapeRegExp(name)}\\s+Costumes`, "i"),
    [new RegExp(`(?:${escapeRegExp(name)}|${escapeRegExp(name.replace(/\s+/g, "_"))})\\s+.+?\\s+Skills`, "i"), /GENSHIN\.GG is not affiliated/i]
  );

  const sections = [];
  const sectionHeader = /(?:Dual Swords|Lance|Rapier|Book|Wand|Axe|Shield|Gauntlets|Cudgel|Staff|Greatsword|Longsword|Nunchaku)\b\s+(Skills|Potential)\b/i;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(sectionHeader);
    if (!match) continue;
    const weaponMatch = lines[i].match(/(Dual Swords|Lance|Rapier|Book|Wand|Axe|Shield|Gauntlets|Cudgel|Staff|Greatsword|Longsword|Nunchaku)\b/i);
    const weapon = canonicalWeaponName(weaponMatch ? weaponMatch[1] : "");
    const type = match[1].toLowerCase() === "skills" ? "skills" : "potentials";
    const start = i + 1;
    let end = lines.length;
    for (let j = start; j < lines.length; j += 1) {
      if (sectionHeader.test(lines[j]) || /GENSHIN\.GG is not affiliated/i.test(lines[j])) {
        end = j;
        break;
      }
    }
    sections.push({ type, weapon, body: lines.slice(start, end).join("\n") });
  }
  const weaponsMap = new Map();
  for (const section of sections) {
    const current = weaponsMap.get(section.weapon) || { name: section.weapon, skills: [], potentials: [] };
    if (section.type === "skills") current.skills = parseSkillEntries(section.body);
    if (section.type === "potentials") current.potentials = parsePotentialEntries(section.body);
    weaponsMap.set(section.weapon, current);
  }

  const textCostumes = parseCostumesFromText(costumesText);
  const costumes = mergeCostumeLists(domCostumes, textCostumes);

  return {
    slug,
    name,
    description,
    costumes_text: costumesText,
    costumes,
    images: { portrait: state.ogImage || null },
    weapons: [...weaponsMap.values()],
    source_url: state.url,
  };
}

export async function scrapeGenshin() {
  return withBrowser(async (page) => {
    const listState = await safeOpen(page, LIST_URL, 2500);
    const links = listState.links
      .filter((link) => /\/7dso\/characters\/[^/]+\/?$/i.test(link.href))
      .map((link) => {
        const href = link.href.replace(/\/+$/, "");
        const slug = href.split("/").pop();
        return { slug, url: href };
      });

    const dedup = new Map();
    for (const item of links) dedup.set(item.slug, item);

    const characters = [];
    for (const item of dedup.values()) {
      const state = await safeOpen(page, item.url, 2200);
      const domCostumes = await extractCostumesFromDom(page);
      characters.push(parseGenshinCharacter(state, item.slug, domCostumes));
    }

    const weaponsState = await safeOpen(page, WEAPONS_URL, 2200);
    const weapons = parseGenshinWeaponsText(weaponsState.text || "");

    return {
      source: "genshin.gg/7dso",
      fetched_at: new Date().toISOString(),
      characters,
      weapons,
    };
  });
}
