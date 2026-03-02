import { msg } from "../discord/responses.js";
import { getUserProfile, putUserProfile, getCharacter } from "../lib/kv.js";

const COLOR = 0xC99700;

function numOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseCostumes(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function profileSummaryEmbed(profile, memberLabel) {
  const chars = profile?.characters || {};
  const owned = Object.values(chars).filter((c) => c?.owned).length;
  const total = Object.keys(chars).length;
  const lines = Object.entries(chars)
    .slice(0, 20)
    .map(([slug, c]) => `• **${slug}** — ${c?.owned ? "✅" : "❌"} potentiel: ${c?.potential ?? "-"}`);

  return {
    title: `Profil — ${memberLabel}`,
    color: COLOR,
    description: `Personnages suivis: **${total}** • possédés: **${owned}**`,
    fields: [
      { name: "📌 Aperçu", value: lines.join("\n") || "(Aucun personnage renseigné)", inline: false },
    ],
  };
}

function profileCharacterEmbed(profile, charSlug, charName = null) {
  const entry = profile?.characters?.[charSlug] || null;
  if (!entry) {
    return {
      title: `Profil — ${charName || charSlug}`,
      color: COLOR,
      description: "Ce personnage n'est pas renseigné dans ce profil.",
    };
  }
  const stats = entry.stats || {};
  const statLines = Object.entries(stats)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `**${k}**: ${v}`)
    .slice(0, 12);
  const costumes = Array.isArray(entry.costumes) ? entry.costumes : [];

  return {
    title: `Profil — ${charName || charSlug}`,
    color: COLOR,
    fields: [
      { name: "✅ Possédé", value: entry.owned ? "Oui" : "Non", inline: true },
      { name: "⭐ Potentiel", value: entry.potential != null ? String(entry.potential) : "-", inline: true },
      { name: "📊 Stats (manuel)", value: statLines.join("\n") || "-", inline: false },
      { name: "🎭 Costumes", value: costumes.length ? costumes.slice(0, 15).map((c) => `• ${c}`).join("\n") : "-", inline: false },
    ],
    footer: entry.updated_at ? { text: `Dernière maj: ${new Date(entry.updated_at).toISOString()}` } : undefined,
  };
}

export async function handleProfilCommand(env, interaction) {
  const sub = interaction?.data?.options?.[0] || null;
  const subName = sub?.name || null;

  const callerId = interaction?.member?.user?.id || interaction?.user?.id;
  if (!callerId) return msg("Impossible d’identifier l’utilisateur.", { flags: 64 });

  if (subName === "set") {
    const opts = Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]));
    const charSlug = opts.perso;
    if (!charSlug) return msg("Option perso manquante.", { flags: 64 });

    const targetId = opts.membre || callerId;
    const profile = await getUserProfile(env.GAME_DATA, targetId);

    const entry = {
      owned: opts.owned == null ? true : Boolean(opts.owned),
      potential: numOrNull(opts.potential),
      stats: {
        atk: numOrNull(opts.atk),
        def: numOrNull(opts.def),
        hp: numOrNull(opts.hp),
        crit: numOrNull(opts.crit),
        crit_dmg: numOrNull(opts.crit_dmg),
      },
      costumes: parseCostumes(opts.costumes),
      notes: opts.notes ? String(opts.notes).slice(0, 500) : "",
      updated_at: Date.now(),
    };
    profile.user_id = String(targetId);
    profile.updated_at = Date.now();
    profile.characters = profile.characters || {};
    profile.characters[charSlug] = entry;
    await putUserProfile(env.GAME_DATA, targetId, profile);

    return msg(`Profil mis à jour: **${charSlug}** (${targetId === callerId ? "toi" : "membre"}).`, { flags: 64 });
  }

  if (subName === "show") {
    const opts = Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]));
    const targetId = opts.membre || callerId;
    const profile = await getUserProfile(env.GAME_DATA, targetId);
    const label = targetId === callerId ? "toi" : `membre (${targetId})`;
    return msg("", { embeds: [profileSummaryEmbed(profile, label)], flags: 64 });
  }

  if (subName === "perso") {
    const opts = Object.fromEntries((sub.options || []).map((o) => [o.name, o.value]));
    const targetId = opts.membre || callerId;
    const charSlug = opts.perso;
    if (!charSlug) return msg("Option perso manquante.", { flags: 64 });
    const profile = await getUserProfile(env.GAME_DATA, targetId);
    const char = await getCharacter(env.GAME_DATA, charSlug);
    return msg("", { embeds: [profileCharacterEmbed(profile, charSlug, char?.name || null)], flags: 64 });
  }

  return msg("Sous-commande inconnue. Utilise /profil set | show | perso", { flags: 64 });
}
