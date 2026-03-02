import { denyAdminCommand, memberHasAdminRole } from "../lib/admin.js";
import { getSyncReport } from "../lib/kv.js";
import { msg } from "../discord/responses.js";

const ACCENT = 0x5865F2;

function renderLines(items = [], formatter = (x) => `• ${x}`, limit = 8) {
  const lines = (items || []).slice(0, limit).map(formatter).filter(Boolean);
  return lines.length ? lines.join("\n") : "Aucun élément détecté.";
}

export async function handleSyncReportCommand(env, interaction) {
  if (!memberHasAdminRole(interaction)) return denyAdminCommand("Sync-report");
  const report = await getSyncReport(env.GAME_DATA);
  if (!report) {
    return msg("", {
      embeds: [{ color: ACCENT, title: "Sync-report — indisponible", description: "Aucun sync report n’est actuellement chargé dans le KV.", footer: { text: "Sync-report · données absentes" } }],
      flags: 64,
    });
  }

  return msg("", {
    embeds: [{
      color: ACCENT,
      title: "Sync-report — résumé staff",
      description: "Vue unique du résultat de la dernière synchro pipeline.",
      fields: [
        { name: "Pipeline", value: `**Sources fresh** · ${report?.summary?.fresh_sources ?? 0}/${report?.summary?.sources_total ?? 0}\n**Fallback raw** · ${report?.summary?.fallback_sources ?? 0}\n**Low confidence** · ${report?.summary?.low_confidence_sources ?? 0}`, inline: true },
        { name: "Médias manquants", value: `**Costumes sans image** · ${report?.summary?.costume_missing_images ?? 0}\n**Persos sans portrait** · ${report?.summary?.character_missing_portraits ?? 0}\n**Boss sans portrait** · ${report?.summary?.boss_missing_portraits ?? 0}`, inline: true },
        { name: "Impact base", value: `**Persos modifiés** · ${report?.summary?.updated_characters ?? 0}\n**Boss modifiés** · ${report?.summary?.updated_bosses ?? 0}\n**Doublons costumes suspects** · ${report?.summary?.costume_duplicate_candidates ?? 0}`, inline: true },
        { name: "Sources à surveiller", value: renderLines(report?.problematic_sources, (entry) => `• **${entry.source}** — ${entry.status}${entry.reason ? ` · ${entry.reason}` : ""}`), inline: false },
        { name: "Entrées touchées", value: `**Personnages**\n${renderLines(report?.changed_characters, (entry) => {
          const parts = [];
          if (entry.added_weapons) parts.push(`armes +${entry.added_weapons}`);
          if (entry.added_costumes) parts.push(`costumes +${entry.added_costumes}`);
          if (entry.added_costume_images) parts.push(`images +${entry.added_costume_images}`);
          if (entry.changed) parts.push("fiche modifiée");
          return `• **${entry.name}**${parts.length ? ` — ${parts.join(" · ")}` : ""}`;
        })}\n\n**Boss**\n${renderLines(report?.changed_bosses, (entry) => `• **${entry.name}**${entry.added ? " — nouveau" : entry.changed ? " — modifié" : ""}`)}`, inline: false },
      ],
      footer: { text: report?.generated_at ? `Sync-report · ${report.generated_at}` : "Sync-report" },
    }],
    flags: 64,
  });
}
