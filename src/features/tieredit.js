import { ADMIN_ROLE_ID } from "../constants.js";
import { msg } from "../discord/responses.js";
import { loadAllCharacters, normalizeText, resolveCharacter } from "../lib/catalog.js";
import { getTierlist, putTierlistLive } from "../lib/kv.js";

const TIERLIST_ACCENT = 0xC99700;
const ERROR_ACCENT = 0xED4245;
const TIERS = ["S", "A", "B", "C"];

function getOptionsMap(interaction) {
  const out = {};
  for (const option of interaction?.data?.options || []) {
    out[option.name] = option.value;
  }
  return out;
}

function deny(description) {
  return msg("", {
    embeds: [{
      color: ERROR_ACCENT,
      title: "Tieredit — accès refusé",
      description,
      footer: { text: "Tieredit · rôle requis" },
    }],
    flags: 64,
  });
}

function fail(title, description) {
  return msg("", {
    embeds: [{
      color: ERROR_ACCENT,
      title,
      description,
      footer: { text: "Tieredit · paramètres invalides" },
    }],
    flags: 64,
  });
}

function ok(title, description, fields = [], footer = "Tieredit · modification appliquée") {
  return msg("", {
    embeds: [{
      color: TIERLIST_ACCENT,
      title,
      description,
      fields,
      footer: { text: footer },
    }],
    flags: 64,
  });
}

function ensureAccess(interaction) {
  const roles = interaction?.member?.roles || [];
  return Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID);
}

function clone(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function resolveViewKey(views = {}, query) {
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

function renderTier(entries = []) {
  const lines = entries.map(normalizeEntry).filter(Boolean).map((entry) => entry.note ? `• **${entry.name}** — ${entry.note}` : `• **${entry.name}**`);
  return lines.length ? lines.join("\n") : "Aucun personnage configuré.";
}

function removeFromAllTiers(view, name) {
  for (const tier of TIERS) {
    const list = (view?.tiers?.[tier] || []).map(normalizeEntry).filter(Boolean);
    view.tiers[tier] = list.filter((entry) => normalizeText(entry.name) !== normalizeText(name));
  }
}

function findEntry(view, name) {
  for (const tier of TIERS) {
    const list = (view?.tiers?.[tier] || []).map(normalizeEntry).filter(Boolean);
    const entry = list.find((item) => normalizeText(item.name) === normalizeText(name));
    if (entry) return { tier, entry };
  }
  return null;
}

function ensureViewTiers(view) {
  view.tiers ||= {};
  for (const tier of TIERS) {
    if (!Array.isArray(view.tiers[tier])) view.tiers[tier] = [];
  }
}

function normalizeTier(value) {
  const tier = String(value || "").toUpperCase().trim();
  return TIERS.includes(tier) ? tier : null;
}

export async function handleTiereditCommand(env, interaction) {
  if (!ensureAccess(interaction)) {
    return deny(`Cette commande est réservée au rôle staff autorisé (**${ADMIN_ROLE_ID}**).`);
  }

  const options = getOptionsMap(interaction);
  const action = normalizeText(options.action);
  if (!action) return fail("Tieredit — action manquante", "Choisis une action : ajouter, retirer, deplacer, noter, vider ou afficher.");

  const payload = clone(await getTierlist(env.GAME_DATA));
  if (!payload?.views) {
    return fail("Tieredit — tierlist absente", "Aucune tierlist n’est chargée dans le KV pour le moment.");
  }

  const viewKey = resolveViewKey(payload.views, options.vue) || options.vue || payload.default_view || Object.keys(payload.views)[0];
  const view = payload.views?.[viewKey];
  if (!view) return fail("Tieredit — vue introuvable", `La vue **${options.vue}** n’existe pas.`);
  ensureViewTiers(view);

  const tier = normalizeTier(options.tier);
  const characters = await loadAllCharacters(env.GAME_DATA);
  const resolvedCharacter = options.perso ? resolveCharacter(characters, options.perso) : null;
  const targetName = resolvedCharacter?.name || options.perso || null;
  const existing = targetName ? findEntry(view, targetName) : null;

  if (action === "afficher") {
    return ok(
      `Tieredit · ${view.label || viewKey}`,
      view.description || "Vue manuelle du serveur.",
      TIERS.map((currentTier) => ({ name: `Tier ${currentTier}`, value: renderTier(view.tiers[currentTier]), inline: false })),
      payload.version ? `Tieredit · ${payload.version}` : "Tieredit · vue courante"
    );
  }

  if (action === "vider") {
    if (!tier) return fail("Tieredit — tier requis", "`vider` demande un `tier` valide (S, A, B ou C).");
    view.tiers[tier] = [];
    payload.version = "v43-live";
    payload.updated_at = new Date().toISOString();
    await putTierlistLive(env.GAME_DATA, payload);
    return ok(`Tieredit · ${view.label || viewKey} · ${tier}`, "Le tier a été vidé.", [
      { name: `Tier ${tier}`, value: renderTier(view.tiers[tier]), inline: false },
    ]);
  }

  if (!targetName) {
    return fail("Tieredit — personnage manquant", "Cette action demande un `perso` valide.");
  }

  if (["ajouter", "deplacer"].includes(action)) {
    if (!tier) return fail("Tieredit — tier requis", "`ajouter` et `deplacer` demandent un `tier` valide (S, A, B ou C).");
    removeFromAllTiers(view, targetName);
    view.tiers[tier].push({ name: targetName, note: existing?.entry?.note || null });
    payload.version = "v43-live";
    payload.updated_at = new Date().toISOString();
    await putTierlistLive(env.GAME_DATA, payload);
    return ok(
      `Tieredit · ${view.label || viewKey}`,
      `**${targetName}** est maintenant dans le tier **${tier}**.`,
      [{ name: `Tier ${tier}`, value: renderTier(view.tiers[tier]), inline: false }]
    );
  }

  if (action === "retirer") {
    removeFromAllTiers(view, targetName);
    payload.version = "v43-live";
    payload.updated_at = new Date().toISOString();
    await putTierlistLive(env.GAME_DATA, payload);
    return ok(
      `Tieredit · ${view.label || viewKey}`,
      `**${targetName}** a été retiré de la vue.`,
      TIERS.map((currentTier) => ({ name: `Tier ${currentTier}`, value: renderTier(view.tiers[currentTier]), inline: false }))
    );
  }

  if (action === "noter") {
    if (!existing) {
      return fail("Tieredit — entrée absente", `**${targetName}** n’est pas encore placé dans la vue **${view.label || viewKey}**.`);
    }
    const noteValue = String(options.note || "").trim();
    const nextNote = !noteValue || ["-", "aucune", "none", "clear"].includes(normalizeText(noteValue)) ? null : noteValue;
    view.tiers[existing.tier] = (view.tiers[existing.tier] || []).map((entry) => {
      const normalized = normalizeEntry(entry);
      if (!normalized) return entry;
      if (normalizeText(normalized.name) !== normalizeText(targetName)) return normalized;
      return { ...normalized, note: nextNote };
    });
    payload.version = "v43-live";
    payload.updated_at = new Date().toISOString();
    await putTierlistLive(env.GAME_DATA, payload);
    return ok(
      `Tieredit · ${view.label || viewKey}`,
      nextNote
        ? `Note mise à jour pour **${targetName}** dans le tier **${existing.tier}**.`
        : `Note supprimée pour **${targetName}** dans le tier **${existing.tier}**.`,
      [{ name: `Tier ${existing.tier}`, value: renderTier(view.tiers[existing.tier]), inline: false }]
    );
  }

  return fail("Tieredit — action inconnue", "Actions acceptées : ajouter, retirer, deplacer, noter, vider, afficher.");
}
