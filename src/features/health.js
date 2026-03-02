import { denyAdminCommand, memberHasAdminRole } from "../lib/admin.js";
import { getBaseMeta, getBotStatsLive, getMediaReport, getSourceReport, getSyncReport } from "../lib/kv.js";
import { msg } from "../discord/responses.js";

const ACCENT = 0x57F287;

function formatDate(value) {
  if (!value) return "Non disponible pour l’instant";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible pour l’instant";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);
}

export async function handleHealthCommand(env, interaction) {
  if (!memberHasAdminRole(interaction)) return denyAdminCommand("Health");

  const [meta, sourceReport, mediaReport, syncReport, stats] = await Promise.all([
    getBaseMeta(env.GAME_DATA),
    getSourceReport(env.GAME_DATA),
    getMediaReport(env.GAME_DATA),
    getSyncReport(env.GAME_DATA),
    getBotStatsLive(env.GAME_DATA),
  ]);

  return msg("", {
    embeds: [{
      color: ACCENT,
      title: "Health — bot et pipeline",
      description: "Vue staff unique : état du pipeline, rapports chargés, couverture visuelle et activité bot.",
      fields: [
        { name: "Pipeline", value: `**Dernière sync** · ${formatDate(meta?.generated_at)}\n**Version** · ${meta?.version || "Non disponible pour l’instant"}\n**Snapshot précédent** · ${meta?.pipeline?.previous_snapshot_available ? "Oui" : "Non"}`, inline: true },
        { name: "Sources", value: `**Fresh** · ${sourceReport?.summary?.fresh ?? meta?.pipeline?.source_status?.fresh ?? 0}\n**Fallback raw** · ${sourceReport?.summary?.fallback_previous_raw ?? meta?.pipeline?.source_status?.fallback_previous_raw ?? 0}\n**Low confidence** · ${sourceReport?.summary?.fresh_low_confidence ?? meta?.pipeline?.source_status?.fresh_low_confidence ?? 0}`, inline: true },
        { name: "Rapports chargés", value: `**Source report** · ${sourceReport ? "OK" : "Non disponible"}\n**Media report** · ${mediaReport ? "OK" : "Non disponible"}\n**Sync report** · ${syncReport ? "OK" : "Non disponible"}`, inline: true },
        { name: "Couverture visuelle", value: `**Images costumes** · ${mediaReport?.summary?.costume_images ?? meta?.coverage?.costume_images ?? 0}/${mediaReport?.summary?.costume_total ?? meta?.coverage?.costumes_total ?? 0}\n**Portraits persos manquants** · ${mediaReport?.summary?.character_missing_portraits ?? 0}\n**Portraits boss manquants** · ${mediaReport?.summary?.boss_missing_portraits ?? 0}`, inline: true },
        { name: "Activité bot", value: `**Interactions suivies** · ${stats?.totals?.interactions ?? 0}\n**Commandes suivies** · ${stats?.totals?.commands ?? 0}\n**Vues composants suivies** · ${stats?.totals?.component_views ?? 0}`, inline: true },
      ],
      footer: { text: stats?.updated_at ? `Health · stats ${formatDate(stats.updated_at)}` : "Health · monitoring staff" },
    }],
    flags: 64,
  });
}
