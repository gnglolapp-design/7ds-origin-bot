import { denyAdminCommand, memberHasAdminRole } from "../lib/admin.js";
import { getMediaReport } from "../lib/kv.js";
import { msg } from "../discord/responses.js";

const ACCENT = 0xFEE75C;

function renderList(items = [], formatter = (x) => `• ${x}`, limit = 10) {
  const lines = (items || []).slice(0, limit).map(formatter).filter(Boolean);
  return lines.length ? lines.join("\n") : "Aucun élément détecté.";
}

export async function handleMediaCheckCommand(env, interaction) {
  if (!memberHasAdminRole(interaction)) return denyAdminCommand("Media-check");
  const report = await getMediaReport(env.GAME_DATA);
  if (!report) {
    return msg("", {
      embeds: [{ color: ACCENT, title: "Media-check — indisponible", description: "Aucun media report n’est actuellement chargé dans le KV.", footer: { text: "Media-check · données absentes" } }],
      flags: 64,
    });
  }

  return msg("", {
    embeds: [{
      color: ACCENT,
      title: "Media-check — résumé staff",
      description: "Vue unique des visuels manquants ou incomplets dans la base 7DS Origin.",
      fields: [
        { name: "Couverture", value: `**Costumes** · ${report?.summary?.costume_images ?? 0}/${report?.summary?.costume_total ?? 0} avec image\n**Costumes sans image** · ${report?.summary?.costume_missing_images ?? 0}\n**Persos sans portrait** · ${report?.summary?.character_missing_portraits ?? 0}\n**Boss sans portrait** · ${report?.summary?.boss_missing_portraits ?? 0}`, inline: true },
        { name: "Doublons costumes suspects", value: renderList(report?.missing?.costume_duplicate_candidates, (entry) => `• **${entry.name}** — ${entry.total_costumes} → ${entry.expected_after_merge}`), inline: true },
        { name: "Costumes sans image", value: renderList(report?.missing?.costume_images, (entry) => `• **${entry.character}** — ${entry.costume || "Costume sans nom"}`), inline: false },
        { name: "Portraits manquants", value: `**Persos**\n${renderList(report?.missing?.character_portraits)}\n\n**Boss**\n${renderList(report?.missing?.boss_portraits)}`, inline: false },
      ],
      footer: { text: report?.generated_at ? `Media-check · ${report.generated_at}` : "Media-check" },
    }],
    flags: 64,
  });
}
