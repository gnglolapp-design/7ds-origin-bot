import { withBrowser, safeOpen } from "../lib/playwright-utils.mjs";
import { uniqueNonEmpty } from "../lib/text-parse.mjs";
import { canonicalWeaponName, cleanCharacterName, normalizeAttribute, normalizeNameKey } from "../lib/slug.mjs";

const BASE = "https://www.hideoutgacha.com/games/seven-deadly-sins-origin";
const HUB_URL = `${BASE}`;
const COMBAT_URL = `${BASE}/combat-guide`;


const BOSS_GUIDE_URL = `${BASE}/boss-guide`;
const BOSS_GUIDE_TABS = [
  { slug: "information", label: "Information", anchors: ["Nightmare Boss Guide", "General Information"] },
  { slug: "guardian-golem", label: "Guardian Golem", anchors: ["Guardian Golem"] },
  { slug: "drake", label: "Drake", anchors: ["Draco King Drake", "Drake"] },
  { slug: "red-demon", label: "Red Demon", anchors: ["Red Demon"] },
  { slug: "grey-demon", label: "Grey Demon", anchors: ["Grey Demon"] },
  { slug: "albion", label: "Albion", anchors: ["Albion"] },
];

async function clickBossGuideTab(page, label) {
  const attempts = [
    page.getByRole?.("button", { name: label, exact: true }),
    page.locator?.(`button:has-text("${label}")`).first(),
    page.locator?.(`[role="tab"]:has-text("${label}")`).first(),
    page.locator?.(`text="${label}"`).first(),
  ].filter(Boolean);

  for (const locator of attempts) {
    try {
      if (await locator.count()) {
        await locator.click({ timeout: 1500 });
        await page.waitForTimeout(350);
        return true;
      }
    } catch {}
  }
  return false;
}

async function extractBossGuidePanel(page, tab) {
  try {
    return await page.evaluate((tab, allLabels) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const visible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 40 && rect.height > 40;
      };
      const lines = norm(document.body.innerText).split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const labels = allLabels.map((x) => x.toLowerCase());
      let start = lines.findIndex((line) => tab.anchors.some((a) => line.toLowerCase().includes(a.toLowerCase())));
      if (start < 0) start = lines.findIndex((line) => line.toLowerCase() === tab.label.toLowerCase());
      const text = start >= 0 ? lines.slice(start).join('\n') : lines.join('\n');

      const imgs = Array.from(document.images || [])
        .filter((img) => visible(img))
        .map((img) => ({ src: img.src, area: img.naturalWidth * img.naturalHeight, w: img.naturalWidth, h: img.naturalHeight }))
        .filter((img) => img.src && img.w >= 120 && img.h >= 120)
        .sort((a, b) => b.area - a.area);

      const image = imgs.find((img) => !/logo|icon|avatar|discord|kofi/i.test(img.src))?.src || null;
      return { text, image };
    }, tab, BOSS_GUIDE_TABS.map((t) => t.label));
  } catch {
    return null;
  }
}

async function scrapeInteractiveBossGuide(page) {
  const state = await safeOpen(page, BOSS_GUIDE_URL, 1400);
  if (!state.html) {
    return { source_url: BOSS_GUIDE_URL, bosses: {} };
  }
  const bosses = {};
  for (const tab of BOSS_GUIDE_TABS) {
    await clickBossGuideTab(page, tab.label);
    const extracted = await extractBossGuidePanel(page, tab);
    bosses[tab.slug] = extracted || { text: '', image: null };
  }
  return { source_url: BOSS_GUIDE_URL, bosses };
}
const CHAR_LIST_URL = `${BASE}/characters`;

const STAT_LABELS = new Map([
  ["atk", "Attack"],
  ["def", "Defense"],
  ["hp", "Max HP"],
  ["pvpDamInc", "PvP Dmg Inc"],
  ["pvpDamDec", "PvP Dmg Dec"],
  ["accuracy", "Accuracy"],
  ["block", "Block"],
  ["critRate", "Crit Rate"],
  ["critDamRate", "Crit Damage"],
  ["critResRate", "Crit Res"],
  ["critDamResRate", "Crit Dmg Res"],
  ["blockDamResRate", "Block Dmg Res"],
  ["moveSpd", "Move Speed"],
]);

const SKILL_KIND_MAP = new Map([
  ["Passive", "Passive"],
  ["Normal Attack", "Normal Attack"],
  ["Special Attack", "Special Attack"],
  ["Normal Skill", "Normal Skill"],
  ["Attack Skill", "Tag Skill"],
  ["Tag Skill", "Tag Skill"],
  ["Ultimate Move", "Ultimate Move"],
  ["Adventure Skill", "Adventure Skill"],
]);

function parseGuideSections(text) {
  const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (/^[A-Z][A-Za-z ]+$/.test(line) && line.length <= 40) {
      if (current && current.body.trim()) sections.push(current);
      current = { title: line, body: "" };
      continue;
    }
    if (!current) continue;
    current.body += (current.body ? " " : "") + line;
  }
  if (current && current.body.trim()) sections.push(current);
  return sections;
}

function keyify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function absoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://www.hideoutgacha.com${url}`;
}

function decodeNextFlightPayload(html) {
  const decoded = [];
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g;
  for (const match of html.matchAll(regex)) {
    const raw = match[1];
    try {
      decoded.push(JSON.parse(`"${raw}"`));
    } catch {}
  }
  return decoded.join("\n");
}

function extractJsonObjectAfterMarker(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = text.indexOf("{", markerIndex + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractEmbeddedChar(html) {
  const decoded = decodeNextFlightPayload(String(html || ""));
  if (!decoded) return null;
  return extractJsonObjectAfterMarker(decoded, '"char":');
}

function formatStatValue(key, value) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (["critRate", "critDamRate", "critResRate", "critDamResRate", "blockDamResRate", "moveSpd"].includes(key)) {
    return `${(n / 100).toFixed(1)}%`;
  }
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function parseStats(stats = {}) {
  const out = {};
  for (const [key, label] of STAT_LABELS.entries()) {
    if (stats[key] == null) continue;
    out[label] = formatStatValue(key, stats[key]);
  }
  return out;
}

function normalizeSkill(skill = {}) {
  const description = String(skill.desc || "").trim();
  const cooldown = description.match(/^(\d+\s*sec)\s+cooldown\.?/i)?.[1] || null;
  const cleanDescription = description.replace(/^(\d+\s*sec)\s+cooldown\.?\s*/i, "").trim();
  return {
    name: String(skill.name || skill.type || "").trim(),
    kind: SKILL_KIND_MAP.get(String(skill.type || "").trim()) || String(skill.type || "").trim() || null,
    cooldown,
    description: cleanDescription,
    icon: absoluteUrl(skill.icon),
  };
}

function buildWeaponAliasMap(weapons = []) {
  const map = new Map();
  for (const weapon of weapons) {
    const canonical = canonicalWeaponName(weapon.name);
    if (!canonical) continue;
    map.set(normalizeNameKey(canonical), canonical);
    if (canonical === "Shield") {
      map.set(normalizeNameKey("Sword & Shield"), canonical);
      map.set(normalizeNameKey("Sword and Shield"), canonical);
      map.set(normalizeNameKey("Shield"), canonical);
    }
  }
  return map;
}

function splitPotentialByWeapon(desc, weapons) {
  const text = String(desc || "").replace(/\s+/g, " ").trim();
  if (!text) return new Map();

  const canonicalWeapons = uniqueNonEmpty((weapons || []).map((w) => canonicalWeaponName(w.name)));
  const aliasMap = buildWeaponAliasMap(weapons);
  const out = new Map(canonicalWeapons.map((name) => [name, []]));

  if (/all weapons/i.test(text) || /\(all weapons\)/i.test(text)) {
    const cleaned = text
      .replace(/\(all weapons\)/ig, "")
      .replace(/^all weapons\s*:\s*/i, "")
      .trim();
    for (const weapon of canonicalWeapons) out.get(weapon).push(cleaned || text);
    return out;
  }

  const matches = [...text.matchAll(/([A-Za-z& ]+(?:\/[A-Za-z& ]+)*)\s*:\s*/g)];
  const valid = matches
    .map((m) => {
      const raw = m[1];
      const parts = raw.split("/").map((x) => aliasMap.get(normalizeNameKey(x.trim()))).filter(Boolean);
      if (!parts.length) return null;
      return { index: m.index, weapons: [...new Set(parts)], end: m.index + m[0].length };
    })
    .filter(Boolean);

  if (!valid.length) {
    for (const weapon of canonicalWeapons) out.get(weapon).push(text);
    return out;
  }

  for (let i = 0; i < valid.length; i += 1) {
    const current = valid[i];
    const nextIndex = i + 1 < valid.length ? valid[i + 1].index : text.length;
    const clause = text.slice(current.end, nextIndex).trim().replace(/^[-–—\s]+/, "").replace(/[\s.]+$/, "").trim();
    if (!clause) continue;
    for (const weapon of current.weapons) out.get(weapon)?.push(clause);
  }

  return out;
}

function parsePotentials(potentials = [], weapons = []) {
  const byWeapon = new Map((weapons || []).map((w) => [canonicalWeaponName(w.name), []]));
  for (const item of potentials || []) {
    const tier = Number(item?.tier || 0);
    const text = String(item?.desc || "").trim();
    if (!tier || !text) continue;
    const perWeapon = splitPotentialByWeapon(text, weapons);
    for (const [weapon, items] of perWeapon.entries()) {
      const joined = items.join(" ").trim();
      if (!joined) continue;
      byWeapon.get(weapon)?.push({ tier, text: joined, items: [joined] });
    }
  }
  return byWeapon;
}

export function parseHideoutCharacterFromHtml(state, slug) {
  const char = extractEmbeddedChar(String(state.html || ""));
  if (!char) return null;

  const baseWeapons = (char.weapons || [])
    .map((weapon) => ({
      name: canonicalWeaponName(weapon.weaponType || weapon.name),
      attribute: normalizeAttribute(weapon.element),
      skills: (weapon.skills || []).map(normalizeSkill).filter((skill) => skill.name || skill.description),
      potentials: [],
    }))
    .filter((weapon) => weapon.name);

  const potentialsByWeapon = parsePotentials(char.potentials || [], baseWeapons);
  const weapons = baseWeapons.map((weapon) => ({
    ...weapon,
    potentials: potentialsByWeapon.get(weapon.name) || [],
  }));

  return {
    slug,
    name: cleanCharacterName(char.name || slug),
    overview: String(char.overview || "").trim(),
    stats: parseStats(char.stats || {}),
    roles: uniqueNonEmpty([String(char.role || "").trim()]),
    weapons,
    images: {
      portrait: absoluteUrl(char.portraitBig || char.portrait) || state.ogImage || null,
      portrait_big: absoluteUrl(char.portraitBig) || null,
    },
    source_url: state.url,
  };
}

export async function scrapeHideout(slugs = []) {
  return withBrowser(async (page) => {
    const list = await safeOpen(page, CHAR_LIST_URL, 2200);
    const charLinks = (list.links || [])
      .filter((l) => /\/games\/seven-deadly-sins-origin\/characters\//i.test(l.href))
      .map((l) => l.href.replace(/\/+$/, ""));

    const linkByKey = new Map();
    for (const url of charLinks) {
      const rawSlug = url.split("/").pop();
      linkByKey.set(keyify(rawSlug), { slug: rawSlug, url });
    }

    const characters = [];
    for (const slug of slugs) {
      const candidate = linkByKey.get(keyify(slug)) || linkByKey.get(keyify(slug).replace(/build$/i, ""));
      const url = candidate?.url || `${BASE}/characters/${slug}`;
      const state = await safeOpen(page, url, 1800);
      if (!state.html) continue;
      const parsed = parseHideoutCharacterFromHtml(state, slug);
      if (!parsed) continue;
      parsed.source_url = state.url;
      characters.push(parsed);
    }

    const hub = await safeOpen(page, HUB_URL, 1200);
    const combat = await safeOpen(page, COMBAT_URL, 1200);
    const interactiveBossGuide = await scrapeInteractiveBossGuide(page);

    return {
      source: "hideoutgacha.com",
      fetched_at: new Date().toISOString(),
      characters,
      boss_guide: {
        hub_overview: hub.text || "",
        combat_guide: combat.text || "",
        combat_sections: parseGuideSections(combat.text || ""),
        bosses: interactiveBossGuide.bosses || {},
        source_urls: [HUB_URL, COMBAT_URL, interactiveBossGuide.source_url].filter(Boolean),
      },
    };
  });
}
