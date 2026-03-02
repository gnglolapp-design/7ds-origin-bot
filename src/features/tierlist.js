import { msg } from "../discord/responses.js";
import { getTierlist } from "../lib/kv.js";

const TIERLIST_ACCENT = 0xC99700;
const EMPTY_ACCENT = 0xED4245;
const TIERS = ["S", "A", "B", "C"];
const VIEW_LABELS = {
  general: "Général",
  boss: "Boss",
  farm: "Farm",
  support: "Support",
};

function getOptionsMap(interaction) {
  const out = {};
  for (const option of interaction?.data?.options || []) {
    out[option.name] = option.value;
  }
  return out;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function resolveView(views = {}, query) {
  if (!query) return null;
  const wanted = normalizeText(query);
  return Object.keys(views).find((key) => normalizeText(key) === wanted)
    || Object.keys(views).find((key) => normalizeText(views[key]?.label) === wanted)
    || Object.keys(views).find((key) => normalizeText(key).includes(wanted))
    || null;
}

function normalizeEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return { name: entry, note: null };
  const name = entry.name || entry.slug || null;
  if (!name) return null;
  return { name, note: entry.note || null };
}

function renderTierEntries(entries = [], limit = 10) {
  const lines = entries.map(normalizeEntry).filter(Boolean).slice(0, limit).map((entry) => entry.note ? `• **${entry.name}** — ${entry.note}` : `• **${entry.name}**`);
  return lines.length ? lines.join("\n") : "Aucun personnage configuré.";
}

function countConfigured(tiers = {}) {
  return TIERS.reduce((sum, tier) => sum + ((tiers?.[tier] || []).filter(Boolean).length), 0);
}

function tierCounterLine(tiers = {}) {
  return TIERS.map((tier) => `**${tier}** · ${(tiers?.[tier] || []).filter(Boolean).length}`).join("\n");
}

function emptyResponse(title, description) {
  return msg("", { embeds: [{ color: EMPTY_ACCENT, title, description, footer: { text: "Tierlist · configuration requise" } }], flags: 64 });
}

export async function handleTierlistCommand(env, interaction) {
  const options = getOptionsMap(interaction);
  const payload = await getTierlist(env.GAME_DATA);
  if (!payload?.views) {
    return emptyResponse("Tierlist — indisponible", "Aucune tierlist manuelle n’est actuellement chargée dans le KV. Recharge `kv-bulk.json` puis relance la commande.");
  }

  const viewKey = resolveView(payload.views, options.vue) || options.vue || payload.default_view || Object.keys(payload.views)[0];
  const view = payload.views?.[viewKey];
  if (!view) {
    return emptyResponse("Tierlist — vue introuvable", `La vue **${options.vue}** n’existe pas dans la configuration actuelle.`);
  }

  const tier = options.tier ? String(options.tier).toUpperCase() : null;
  if (tier && !TIERS.includes(tier)) {
    return emptyResponse("Tierlist — tier invalide", `Le tier **${options.tier}** n’est pas reconnu. Utilise S, A, B ou C.`);
  }

  const titleView = view.label || VIEW_LABELS[viewKey] || viewKey;
  const description = view.description || "Tierlist manuelle du serveur. Aucun classement n’est calculé automatiquement par le bot.";
  const tiers = view.tiers || {};
  const configured = countConfigured(tiers);

  const fields = [
    { name: "Résumé", value: `${configured} entrée(s) configurée(s) sur cette vue.`, inline: true },
    { name: "Répartition", value: tierCounterLine(tiers), inline: true },
  ];
  const chosen = tier ? [tier] : TIERS;
  for (const currentTier of chosen) {
    fields.push({ name: `Tier ${currentTier}`, value: renderTierEntries(tiers[currentTier] || []), inline: false });
  }

  return msg("", {
    embeds: [{
      color: TIERLIST_ACCENT,
      title: tier ? `Tierlist · ${titleView} · ${tier}` : `Tierlist · ${titleView}`,
      description,
      fields,
      footer: { text: payload.version ? `Tierlist · ${payload.version}` : "Tierlist manuelle" },
    }],
  });
}
