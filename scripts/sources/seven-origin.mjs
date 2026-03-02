import { withBrowser, safeOpen } from "../lib/playwright-utils.mjs";
import {
  between,
  collectWeaponsFromLines,
  extractAttributes,
  extractMetaRarity,
  parsePotentialEntries,
  splitLines,
  uniqueNonEmpty,
  escapeRegExp,
} from "../lib/text-parse.mjs";
import { canonicalWeaponName, cleanCharacterName, normalizeNameKey, slugify } from "../lib/slug.mjs";

const BASE = "https://7dsorigin.gg";
const CHAR_LIST_URL = `${BASE}/fr/characters`;
const BOSS_LIST_URL = `${BASE}/fr/boss`;

const KIND_MAP = new Map([
  ["aventure", "Adventure Skill"],
  ["adventure", "Adventure Skill"],
  ["adventure skill", "Adventure Skill"],
  ["passif", "Passive"],
  ["passive", "Passive"],
  ["attaque normale", "Normal Attack"],
  ["normal attack", "Normal Attack"],
  ["special", "Special Attack"],
  ["spécial", "Special Attack"],
  ["attaque speciale", "Special Attack"],
  ["attaque spéciale", "Special Attack"],
  ["special attack", "Special Attack"],
  ["compétence", "Normal Skill"],
  ["competence", "Normal Skill"],
  ["normal skill", "Normal Skill"],
  ["étiquette", "Tag Skill"],
  ["etiquette", "Tag Skill"],
  ["tag skill", "Tag Skill"],
  ["ultime", "Ultimate Move"],
  ["ultimate move", "Ultimate Move"],
]);

function normalizeKind(line) {
  return KIND_MAP.get(normalizeNameKey(line || "")) || null;
}

function cleanSkillName(value) {
  return String(value || "").replace(/^['"“”]+|['"“”]+$/g, "").trim();
}

function isImageLine(line) {
  return /^Image:/i.test(String(line || ""));
}

function isWeaponHeading(line, weaponOrder) {
  return (weaponOrder || []).includes(canonicalWeaponName(line));
}

function isWeaponLikeCostumeLine(line) {
  const value = String(line || '').trim();
  if (!value) return false;
  if (/^(?:Armes du personnage|Character Weapons?)$/i.test(value)) return true;
  if (/^\d+$/i.test(value)) return true;
  const normalized = normalizeNameKey(value);
  return [
    'longsword', 'epee longue', 'épée longue',
    'dual swords', 'epees jumelles', 'épées jumelles',
    'axe', 'hache', 'shield', 'bouclier', 'lance',
    'rapiere', 'rapière', 'book', 'grimoire', 'wand', 'baguette',
    'staff', 'baton', 'bâton', 'greatsword', 'grande epee', 'grande épée',
    'gauntlets', 'gantelets', 'nunchaku', 'nunchucks', 'cudgel', 'gourdin'
  ].some((prefix) => normalized.startsWith(prefix));
}

function isValidCostumeName(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  if (isImageLine(value)) return false;
  if (/^(?:7dsorigin(?:s)?\.gg|genshin\.gg|hideoutgacha)$/i.test(value)) return false;
  if (/background|Voir|Skins similaires|all skins|Aucune arme/i.test(value)) return false;
  if (isWeaponLikeCostumeLine(value)) return false;
  if (/^(?:Tous les skins|All skins)$/i.test(value)) return false;
  if (value.length > 120) return false;
  return true;
}

function isTitleCandidate(line, weaponOrder) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (isImageLine(s)) return false;
  if (normalizeKind(s)) return false;
  if (isWeaponHeading(s, weaponOrder)) return false;
  if (/^Compétences spécifiques/i.test(s) || /^Skills specific/i.test(s)) return false;
  if (/^Améliorations spécifiques/i.test(s)) return false;
  if (/^Tier\s*\d+/i.test(s) || /^\d+$/.test(s)) return false;
  if (/^(Type|Description|Skins|Potentiels|Compétences)$/i.test(s)) return false;
  if (/^Aucune arme disponible/i.test(s)) return false;
  if (/^Tous les skins|^All skins/i.test(s)) return false;
  if (s.length > 120) return false;
  return true;
}

function parseCooldown(line) {
  const value = String(line || "").trim();
  if (!value) return { cooldown: null, rest: "" };
  let m = value.match(/^Cooldown:\s*(.+)$/i);
  if (m) return { cooldown: m[1].trim(), rest: "" };
  m = value.match(/^CD[:\s]+(.+)$/i);
  if (m) return { cooldown: m[1].trim(), rest: "" };
  m = value.match(/^(\d+\s*sec(?:onds?)?)\s*cooldown\.?\s*(.*)$/i);
  if (m) return { cooldown: m[1].trim(), rest: m[2].trim() };
  return { cooldown: null, rest: value };
}

function normalizeDescription(lines) {
  return (lines || []).join(" ").replace(/\s+/g, " ").trim();
}

function stripToSkillFlow(lines, weaponOrder) {
  const src = (lines || []).filter((line) => !isImageLine(line));
  const start = src.findIndex((line, idx) => isTitleCandidate(line, weaponOrder) && normalizeKind(src[idx + 1]));
  return start === -1 ? [] : src.slice(start);
}

function parseOriginFlatSkills(skillLines, weaponOrder) {
  const lines = stripToSkillFlow(skillLines, weaponOrder).filter((line) => !/^E$|^Q$/i.test(line));
  const entries = [];

  for (let i = 0; i < lines.length;) {
    const title = lines[i];
    const kind = normalizeKind(lines[i + 1]);
    if (!(isTitleCandidate(title, weaponOrder) && kind)) {
      i += 1;
      continue;
    }

    const name = cleanSkillName(title);
    i += 2;

    let cooldown = null;
    const desc = [];
    while (i < lines.length) {
      const line = lines[i];
      if (isTitleCandidate(line, weaponOrder) && normalizeKind(lines[i + 1])) break;
      if (isWeaponHeading(line, weaponOrder)) break;
      if (isImageLine(line) || /^E$|^Q$/i.test(line)) {
        i += 1;
        continue;
      }
      const parsed = parseCooldown(line);
      if (!cooldown && parsed.cooldown) {
        cooldown = parsed.cooldown;
        if (parsed.rest) desc.push(parsed.rest);
      } else {
        desc.push(line);
      }
      i += 1;
    }

    entries.push({
      name: name || kind,
      kind,
      cooldown,
      description: normalizeDescription(desc),
    });
  }

  return entries.filter((entry) => entry.name || entry.description);
}

function groupSequentialByWeapons(items, weaponOrder, expectedPerWeapon = 0) {
  const count = (weaponOrder || []).length;
  if (!count) return [];
  if (!Array.isArray(items) || !items.length) {
    return weaponOrder.map((weapon) => ({ weapon, items: [] }));
  }

  if (expectedPerWeapon && items.length >= expectedPerWeapon * count) {
    const grouped = [];
    for (let i = 0; i < count; i += 1) {
      grouped.push({ weapon: weaponOrder[i], items: items.slice(i * expectedPerWeapon, (i + 1) * expectedPerWeapon) });
    }
    return grouped;
  }

  if (items.length % count === 0) {
    const size = items.length / count;
    const grouped = [];
    for (let i = 0; i < count; i += 1) {
      grouped.push({ weapon: weaponOrder[i], items: items.slice(i * size, (i + 1) * size) });
    }
    return grouped;
  }

  return weaponOrder.map((weapon, index) => ({ weapon, items: index === 0 ? items : [] }));
}

function dedupeUrls(urls = []) {
  const seen = new Set();
  const out = [];
  for (const value of urls || []) {
    const url = String(value || "").split("#")[0].replace(/\/+$/, "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function mergeCostumeDetails(baseCostumes = [], detailCostumes = []) {
  const merged = [];
  const detailsByName = new Map();
  for (const item of detailCostumes || []) {
    if (!item?.name) continue;
    detailsByName.set(normalizeName(item.name), item);
  }

  const seen = new Set();
  for (const costume of baseCostumes || []) {
    const key = normalizeName(costume?.name || "");
    const detail = detailsByName.get(key) || {};
    if (key) seen.add(key);
    merged.push({
      name: costume?.name || detail?.name || null,
      description: costume?.description || detail?.description || null,
      passive: costume?.passive || detail?.passive || null,
      effect_title: costume?.effect_title || detail?.effect_title || null,
      effect: costume?.effect || detail?.effect || null,
      image: costume?.image || detail?.image || null,
      source_url: costume?.source_url || detail?.source_url || null,
    });
  }

  for (const detail of detailCostumes || []) {
    const key = normalizeName(detail?.name || "");
    if (!key || seen.has(key)) continue;
    merged.push({
      name: detail.name,
      description: detail.description || null,
      passive: detail.passive || null,
      effect_title: detail.effect_title || null,
      effect: detail.effect || null,
      image: detail.image || null,
      source_url: detail.source_url || null,
    });
  }

  return merged.filter((item) => item?.name);
}

async function extractOriginCostumesFromDom(page, slug) {
  try {
    const items = await page.evaluate((currentSlug) => {
      const text = (node) => (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
      const imgUrl = (img) => img?.getAttribute?.("src") || img?.getAttribute?.("data-src") || img?.currentSrc || img?.src || null;
      const normalize = (s) => (s || "").replace(/\s+/g, " ").trim();
      const stopRe = /character weapons?|armes du personnage|similar characters|personnages similaires/i;
      const isHeading = (node) => /^H[1-4]$/.test(node?.tagName || "");
      const headings = [...document.querySelectorAll("h1,h2,h3,h4")];
      const start = headings.find((h) => /all skins|tous les skins/i.test(text(h)));
      if (!start) return [];

      const candidates = [];
      const pushCandidate = (raw) => {
        if (!raw?.name) return;
        candidates.push({
          name: normalize(raw.name),
          description: raw.description ? normalize(raw.description) : null,
          passive: raw.passive ? normalize(raw.passive) : null,
          image: raw.image || null,
          source_url: raw.source_url || null,
        });
      };

      let node = start.nextElementSibling;
      while (node) {
        const nodeText = text(node);
        if (isHeading(node) && stopRe.test(nodeText)) break;

        const blocks = [node, ...node.querySelectorAll?.('article,li,div,a') || []];
        for (const block of blocks) {
          const blockText = text(block);
          if (!blockText || blockText.length < 3) continue;
          const heading = [...block.querySelectorAll?.('h3,h4,h5,strong,b,a,span,p') || []]
            .map((el) => text(el))
            .find((value) => value && value.length <= 120 && !/all skins|tous les skins|voir|view/i.test(value));
          const name = heading || blockText.split(/\n|\.\s+/)[0];
          const paragraphs = [...block.querySelectorAll?.('p,li,span') || []].map((el) => text(el)).filter(Boolean);
          const image = imgUrl(block.querySelector?.('img'));
          const source_url = block.closest?.('a[href]')?.href || block.querySelector?.('a[href]')?.href || null;
          if (!name) continue;
          if (source_url && source_url.includes(`/characters/${currentSlug}`) && /\/characters\/[^/]+$/i.test(source_url.replace(/\/+$/, ""))) {
            // character page self-link, not a costume detail page
          }
          pushCandidate({
            name,
            description: paragraphs.find((line) => line !== name && line.length > 15) || null,
            passive: paragraphs.find((line) => /passive|passif/i.test(line)) || null,
            image,
            source_url,
          });
        }

        node = node.nextElementSibling;
      }
      return candidates;
    }, slug);

    const cleaned = [];
    const seen = new Set();
    for (const item of Array.isArray(items) ? items : []) {
      if (!isValidCostumeName(item?.name)) continue;
      const key = normalizeName(item.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      cleaned.push(item);
    }
    return cleaned;
  } catch {
    return [];
  }
}

function collectCostumeLinks(state, slug) {
  return dedupeUrls(
    (state.links || [])
      .map((link) => link?.href || "")
      .filter((href) => href && href.includes(`/characters/${slug}`) && !/\/characters\/[^/]+$/i.test(href.replace(/\/+$/, "")))
  );
}

function parseCharacterPage(state, slug, domCostumes = []) {
  const text = state.text || "";
  const lines = splitLines(text);
  const titleName = cleanCharacterName(
    String(state.title || "")
      .replace(/\s*-\s*Seven Deadly Sins: Origin.*$/i, "")
      .replace(/\s*\|.*$/i, "")
      .trim()
  );
  const name = titleName || cleanCharacterName(slug);

  const description = between(text, /Description/i, [/\n\s*Type\s*\n/i, /\n\s*Compétences de\s+/i, /\n\s*Skills of\s+/i]);
  const typeSection = between(text, /\n\s*Type\s*\n/i, [/\n\s*Compétences de\s+/i, /\n\s*Skills of\s+/i]);
  const typeLines = splitLines(typeSection);
  const weaponsFromType = collectWeaponsFromLines(typeLines);

  const skillsSection = between(
    text,
    new RegExp(`(?:Compétences de|Skills of)\\s+${escapeRegExp(name)}`, "i"),
    [new RegExp(`(?:Potentiels de|${escapeRegExp(name)}\\s+Potential)`, "i"), /\n\s*(?:Tous les skins|All skins)\s*\n/i]
  );
  const skillLines = splitLines(skillsSection);

  const potentialsSection = between(
    text,
    new RegExp(`(?:Potentiels de|${escapeRegExp(name)}\\s+Potential)`, "i"),
    [/\n\s*(?:Tous les skins|All skins)\s*\n/i, /\n\s*Personnages similaires\s*\n/i, /\n\s*Similar characters\s*\n/i]
  );
  const potentialLines = splitLines(potentialsSection).filter((line) => !isImageLine(line));

  const costumeSection = between(
    text,
    /(?:Tous les skins|All skins)/i,
    [/\n\s*Aucune arme disponible\s*\n/i, /\n\s*(?:Armes du personnage|Character Weapons?)\s*\n/i, /\n\s*Personnages similaires\s*\n/i, /\n\s*Similar characters\s*\n/i]
  );
  const costumeNames = splitLines(costumeSection).filter((line) => isValidCostumeName(line));

  const attributes = extractAttributes(state.imgAlts);
  const rarity = extractMetaRarity(state.imgAlts);
  const costumeLinks = collectCostumeLinks(state, slug);

  const weaponsFromSkills = collectWeaponsFromLines(skillLines);
  const weaponsFromPotentials = collectWeaponsFromLines(potentialLines);
  const weaponOrder = uniqueNonEmpty([...weaponsFromType, ...weaponsFromSkills, ...weaponsFromPotentials]).map((x) => canonicalWeaponName(x));

  const flatSkills = parseOriginFlatSkills(skillLines, weaponOrder);
  const flatPotentials = parsePotentialEntries(potentialLines.join("\n"));
  const groupedSkills = groupSequentialByWeapons(flatSkills, weaponOrder, 7);
  const groupedPotentials = groupSequentialByWeapons(flatPotentials, weaponOrder, 10);

  const weapons = weaponOrder.map((weaponName) => ({
    name: canonicalWeaponName(weaponName),
    skills: groupedSkills.find((x) => x.weapon === weaponName)?.items || [],
    potentials: groupedPotentials.find((x) => x.weapon === weaponName)?.items || [],
  }));

  const baseCostumes = uniqueNonEmpty(costumeNames).map((costumeName) => ({ name: costumeName }));
  const costumes = mergeCostumeDetails(baseCostumes, domCostumes);

  return {
    slug,
    name,
    description,
    rarity,
    attribute: attributes[0] || null,
    attributes,
    images: { portrait: state.ogImage || null },
    weapons,
    costumes,
    costumeLinks,
    source_url: state.url,
  };
}

function parseCostumePage(state, fallbackName = null) {
  const lines = splitLines(state.text || "").filter((line) => !isImageLine(line));
  const name = cleanCharacterName(lines[0] || fallbackName || "");
  const description = between(state.text, /Description/i, [/\n\s*(?:Passif|Passive)\s*\n/i, /\n\s*Character\s*\n/i]);
  const passive = between(state.text, /(?:Passif|Passive)/i, [/\n\s*Voir\s+/i, /\n\s*Character\s*\n/i]);
  return {
    name,
    description,
    passive,
    image: state.ogImage || null,
    source_url: state.url,
  };
}

function parseBossPage(state, slug) {
  const lines = splitLines(state.text || "");
  const name = cleanCharacterName(lines[0] || slug);
  const description = lines[1] || state.ogDescription || "";
  const unlockRequirements = between(state.text, /Unlock Requirements/i, [/\n\s*Statistics\s*\n/i, /\n\s*Rewards\s*\n/i]);
  const statistics = between(state.text, /Statistics/i, [/\n\s*Rewards\s*\n/i]);
  const rewards = between(state.text, /Rewards/i, [/\n\s*Strategies\s*\n/i]);
  const strategies = between(state.text, /Strategies/i, [/\n\s*Back to the boss list\s*\n/i]);
  return {
    slug,
    name,
    description,
    unlock_requirements: unlockRequirements,
    stats_text: statistics,
    rewards_text: rewards,
    strategies_text: strategies,
    images: { portrait: state.ogImage || null },
    source_url: state.url,
  };
}

export async function scrapeSevenOrigin() {
  return withBrowser(async (page) => {
    const listState = await safeOpen(page, CHAR_LIST_URL, 1500);
    const characterLinks = listState.links
      .filter((link) => /\/characters\/[^/]+$/i.test(link.href))
      .filter((link) => !/\/fr\/characters$/i.test(link.href))
      .map((link) => {
        const href = link.href.replace(/\/+$/, "");
        const slug = href.split("/").pop();
        return { slug, url: href, name: link.text || slug };
      });

    const dedupCharMap = new Map();
    for (const item of characterLinks) dedupCharMap.set(item.slug, item);

    const characters = [];
    for (const item of dedupCharMap.values()) {
      const state = await safeOpen(page, item.url, 1200);
      const domCostumes = await extractOriginCostumesFromDom(page, item.slug);
      const char = parseCharacterPage(state, item.slug, domCostumes);
      const costumeDetails = [];
      for (const costumeUrl of char.costumeLinks || []) {
        const costumeState = await safeOpen(page, costumeUrl, 800);
        costumeDetails.push(parseCostumePage(costumeState));
      }
      char.costumes = mergeCostumeDetails(char.costumes, costumeDetails);
      delete char.costumeLinks;
      characters.push(char);
    }

    const bossListState = await safeOpen(page, BOSS_LIST_URL, 1200);
    const bossLinks = bossListState.links
      .filter((link) => /\/boss\/[^/]+$/i.test(link.href))
      .map((link) => {
        const href = link.href.replace(/\/+$/, "");
        const slug = href.split("/").pop();
        return { slug, url: href, name: link.text || slug };
      });
    const dedupBossMap = new Map();
    for (const item of bossLinks) dedupBossMap.set(item.slug, item);

    const bosses = [];
    for (const item of dedupBossMap.values()) {
      const state = await safeOpen(page, item.url, 1200);
      bosses.push(parseBossPage(state, item.slug));
    }

    return {
      source: "7dsorigin.gg",
      fetched_at: new Date().toISOString(),
      characters,
      bosses,
    };
  });
}

function normalizeName(value) {
  return slugify(value || "");
}
