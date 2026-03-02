import { resolveCharacterCostumes } from "./gameplay.js";
import { cid } from "./ids.js";
import { COMPONENT_IDS, TABS } from "../constants.js";

export function actionRow(components){ return { type: 1, components }; }
function normalizeEmoji(emoji) {
  if (!emoji) return undefined;
  return typeof emoji === "string" ? { name: emoji } : emoji;
}

export function stringSelect({ custom_id, placeholder, options, min_values=1, max_values=1, disabled=false }) {
  const normalized = (options || []).slice(0,25).map(opt => opt?.emoji ? { ...opt, emoji: normalizeEmoji(opt.emoji) } : opt);
  return { type: 3, custom_id, placeholder, min_values, max_values, options: normalized, disabled };
}
export function button({ custom_id, label, style=1, disabled=false, emoji=null }) {
  return { type: 2, custom_id, label, style, disabled, ...(emoji ? { emoji: normalizeEmoji(emoji) } : {}) };
}

const TAB_LABELS = {
  overview: "Aperçu",
  gameplay: "Gameplay",
  progression: "Progression",
  stats: "Stats",
  skills: "Skills",
  potentiels: "Potentiels",
  costumes: "Costumes",
};

const TAB_EMOJIS = {
  overview: { name: "📘" },
  gameplay: { name: "🧠" },
  progression: { name: "📦" },
  stats: { name: "📊" },
  skills: { name: "⚔️" },
  potentiels: { name: "✨" },
  costumes: { name: "👘" },
};

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

export function persoTabs({ slug, tab }) {
  return chunk(TABS, 5).map((group) => actionRow(group.map((t) => button({
    custom_id: cid(COMPONENT_IDS.PERSO_TAB, { slug, tab: t }),
    label: TAB_LABELS[t] || t,
    style: (t === tab) ? 3 : 2,
    emoji: TAB_EMOJIS[t] || null,
  }))));
}

export function persoWeaponRow({ slug, weapon, mode, weapons=[] }) {
  const base = mode === "potentiels" ? COMPONENT_IDS.PERSO_POT_WEAPON : COMPONENT_IDS.PERSO_SKILL_WEAPON;
  const options = weapons.slice(0,25).map(w => ({
    label: w.name,
    description: [w.attribute, `${(w.skills || []).length} skills`, `${(w.potentials || []).length} tiers`].filter(Boolean).join(" • ").slice(0,100),
    value: w.name,
    default: w.name === weapon,
  }));
  return actionRow([
    stringSelect({
      custom_id: cid(base, { slug }),
      placeholder: mode === "potentiels" ? "Choisir l'arme à afficher pour les potentiels" : "Choisir l'arme à afficher pour les skills",
      options,
    })
  ]);
}

export function persoCostumeRow({ slug, index=0, costumes=[] }) {
  const safeCostumes = resolveCharacterCostumes({ costumes });
  const options = safeCostumes.slice(0,25).map((c, idx) => ({
    label: String(c.name || `Costume ${idx+1}`).slice(0,100),
    description: c.effect_title ? String(c.effect_title).replace(/\s+/g, ' ').slice(0,100) : undefined,
    value: String(idx),
    default: idx === index,
  }));
  return actionRow([
    stringSelect({
      custom_id: cid(COMPONENT_IDS.PERSO_COSTUME_SELECT, { slug }),
      placeholder: "Choisir le costume à afficher",
      options,
    })
  ]);
}

export function persoPageRow({ slug, weapon, mode, page=0, total=1 }) {
  if (!total || total <= 1) return null;
  const base = mode === "potentiels" ? COMPONENT_IDS.PERSO_POT_PAGE : COMPONENT_IDS.PERSO_SKILL_PAGE;
  return actionRow([
    button({
      custom_id: cid(base, { slug, weapon, page: Math.max(0, page - 1) }),
      label: "Précédent",
      style: 2,
      disabled: page <= 0,
      emoji: { name: "◀️" },
    }),
    button({
      custom_id: cid(base, { slug, weapon, page: page }),
      label: `${page + 1}/${total}`,
      style: 1,
      disabled: true,
    }),
    button({
      custom_id: cid(base, { slug, weapon, page: Math.min(total - 1, page + 1) }),
      label: "Suivant",
      style: 2,
      disabled: page >= total - 1,
      emoji: { name: "▶️" },
    }),
  ]);
}
