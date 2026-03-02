import { msg } from "../discord/responses.js";
import { loadAllCharacters, filterCharacters } from "../lib/catalog.js";
import { analyzeCharacterProfile } from "../lib/gameplay.js";
import { chunk } from "../lib/utils.js";

const LIST_ACCENT = 0xC99700;
const ATTRIBUTE_ICONS = {
  Fire: "🔥",
  Thunder: "⚡",
  Darkness: "🌑",
  Holy: "✨",
  Wind: "🍃",
  Earth: "🪨",
  Physical: "⚔️",
  Cold: "❄️",
};

function getOptionsMap(interaction) {
  const out = {};
  for (const option of interaction?.data?.options || []) {
    out[option.name] = option.value;
  }
  return out;
}

function filterSummary(filters = {}) {
  const parts = [];
  if (filters.attribute) parts.push(`**Attribut** · ${filters.attribute}`);
  if (filters.role) parts.push(`**Rôle** · ${filters.role}`);
  if (filters.weapon) parts.push(`**Arme** · ${filters.weapon}`);
  if (filters.rarity) parts.push(`**Rareté** · ${filters.rarity}`);
  if (filters.tag) parts.push(`**Tag gameplay** · ${filters.tag}`);
  return parts.length ? parts.join("\n") : "Aucun filtre appliqué. Affichage du roster complet.";
}

function characterLine(char) {
  const roles = (char.roles || []).filter(Boolean).join(", ") || "—";
  const weapons = (char.weapons || []).map((weapon) => weapon.name).filter(Boolean);
  const weaponLabel = weapons.length ? weapons.slice(0, 2).join(" / ") : "Aucune arme";
  const attr = char.attribute ? `${ATTRIBUTE_ICONS[char.attribute] || "•"} ${char.attribute}` : "—";
  const profile = analyzeCharacterProfile(char);
  const tags = profile.tags.length ? ` • ${profile.tags.slice(0, 3).join(" · ")}` : "";
  return `• **${char.name}** — ${char.rarity || "?"} • ${attr} • ${roles} • ${weaponLabel}${tags}`;
}

export async function handleListeCommand(env, interaction) {
  const options = getOptionsMap(interaction);
  const characters = await loadAllCharacters(env.GAME_DATA);
  const filters = {
    attribute: options.attribut || options.attribute || null,
    role: options.role || null,
    weapon: options.arme || options.weapon || null,
    rarity: options.rarete || options.rarity || null,
    tag: options.tag || null,
  };

  const filtered = filterCharacters(characters, filters).sort((a, b) => a.name.localeCompare(b.name));

  if (!filtered.length) {
    return msg("", {
      embeds: [{
        color: 0xED4245,
        title: "Liste — aucun résultat",
        description: "Aucun personnage ne correspond aux filtres demandés.",
        fields: [{ name: "Filtres", value: filterSummary(filters), inline: false }],
        footer: { text: "Liste · ajuste les filtres puis relance la commande" },
      }],
    });
  }

  const pages = chunk(filtered, 12);
  const embeds = pages.slice(0, 10).map((page, index) => ({
    color: LIST_ACCENT,
    title: `Liste personnages${pages.length > 1 ? ` · ${index + 1}/${pages.length}` : ""}`,
    description: page.map(characterLine).join("\n"),
    fields: index === 0 ? [
      { name: "Filtres", value: filterSummary(filters), inline: false },
      { name: "Résultat", value: `${filtered.length} personnage(s) trouvé(s)`, inline: true },
      { name: "Navigation utile", value: "Utilise ensuite `/perso` pour ouvrir une fiche complète ou `/compare-persos` / `/compare-armes` pour un face-à-face lisible.", inline: false },
    ] : undefined,
    footer: { text: `Liste · ${filtered.length} résultat(s)` },
  }));

  return msg("", { embeds });
}
