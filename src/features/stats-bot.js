import { denyAdminCommand, memberHasAdminRole } from "../lib/admin.js";
import { msg } from "../discord/responses.js";
import { getBotStatsLive, getBossIndex } from "../lib/kv.js";
import { loadAllCharacters } from "../lib/catalog.js";

const ACCENT = 0xC99700;

function topEntries(map = {}, limit = 8) {
  return Object.entries(map || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0)).slice(0, limit);
}

function renderTop(items = [], formatter) {
  const lines = (items || []).map(formatter).filter(Boolean);
  return lines.length ? lines.join("\n") : "Non disponible pour l’instant";
}

function formatDate(value) {
  if (!value) return "Non disponible pour l’instant";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible pour l’instant";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);
}

export async function handleStatsBotCommand(env, interaction) {
  if (!memberHasAdminRole(interaction)) return denyAdminCommand("Stats-bot");
  const [stats, characters, bosses] = await Promise.all([
    getBotStatsLive(env.GAME_DATA),
    loadAllCharacters(env.GAME_DATA),
    getBossIndex(env.GAME_DATA),
  ]);

  const characterNames = Object.fromEntries(characters.map((char) => [char.slug, char.name]));
  const bossNames = Object.fromEntries((bosses || []).map((boss) => [boss.slug, boss.name]));
  const topCommands = topEntries(stats?.commands, 8);
  const topCharacters = topEntries(stats?.entities?.characters, 8);
  const topBosses = topEntries(stats?.entities?.bosses, 8);

  return msg("", {
    embeds: [{
      color: ACCENT,
      title: "Stats-bot — résumé staff",
      description: "Vue unique des usages les plus fréquents sur le bot 7DS Origin.",
      fields: [
        { name: "Volumes", value: `**Interactions suivies** · ${stats?.totals?.interactions ?? 0}\n**Commandes** · ${stats?.totals?.commands ?? 0}\n**Vues composants** · ${stats?.totals?.component_views ?? 0}`, inline: true },
        { name: "Commandes les plus utilisées", value: renderTop(topCommands, ([name, count]) => `• **/${name}** — ${count}`), inline: true },
        { name: "Personnages les plus consultés", value: renderTop(topCharacters, ([slug, count]) => `• **${characterNames[slug] || slug}** — ${count}`), inline: false },
        { name: "Boss les plus consultés", value: renderTop(topBosses, ([slug, count]) => `• **${bossNames[slug] || slug}** — ${count}`), inline: false },
      ],
      footer: { text: stats?.updated_at ? `Stats-bot · ${formatDate(stats.updated_at)}` : "Stats-bot · aucune donnée live" },
    }],
    flags: 64,
  });
}
