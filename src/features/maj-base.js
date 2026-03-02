import { msg } from "../discord/responses.js";
import { getBaseMeta, getBossIndex } from "../lib/kv.js";
import { loadAllCharacters } from "../lib/catalog.js";
import { countFutureCoverage } from "../lib/progression.js";

const BASE_ACCENT = 0x2ECC71;

function formatDate(value) {
  if (!value) return "Non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

export async function handleMajBaseCommand(env) {
  const [characters, bosses, meta] = await Promise.all([
    loadAllCharacters(env.GAME_DATA),
    getBossIndex(env.GAME_DATA),
    getBaseMeta(env.GAME_DATA),
  ]);

  const statsCount = characters.filter((char) => char?.stats && Object.keys(char.stats).length).length;
  const costumesCount = characters.reduce((sum, char) => sum + ((char?.costumes || []).length), 0);
  const weaponsCount = characters.reduce((sum, char) => sum + ((char?.weapons || []).length), 0);
  const kvEntries = meta?.kv_entries || (characters.length + bosses.length + 2 + (meta ? 1 : 0));
  const sources = meta?.sources?.length ? meta.sources.join(" · ") : "7dsorigin.gg · genshin.gg/7dso · hideoutgacha.com";
  const costumeImages = meta?.coverage?.costume_images ?? characters.reduce((sum, char) => sum + ((char?.costumes || []).filter((costume) => costume?.image).length), 0);
  const costumesTotal = meta?.coverage?.costumes_total ?? costumesCount;
  const sourceStatus = meta?.pipeline?.source_status || null;
  const futureCoverage = meta?.coverage?.future || countFutureCoverage(characters);

  return msg("", {
    embeds: [{
      color: BASE_ACCENT,
      title: "Maj base — état actuel",
      description: "Vue unique et compacte de la base utilisée par le bot Discord.",
      fields: [
        { name: "Volume", value: `**Personnages** · ${characters.length}\n**Boss** · ${bosses.length}\n**Entrées KV** · ${kvEntries}`, inline: true },
        { name: "Couverture", value: `**Fiches avec stats** · ${statsCount}\n**Armes** · ${weaponsCount}\n**Costumes** · ${costumesCount}`, inline: true },
        { name: "Dernière synchro", value: formatDate(meta?.generated_at), inline: true },
        { name: "Visuels", value: `**Images costumes** · ${costumeImages}/${costumesTotal}\n**Portraits persos** · ${meta?.coverage?.characters_with_portrait ?? characters.filter((char) => char?.images?.portrait).length}\n**Portraits boss** · ${meta?.coverage?.bosses_with_portrait ?? bosses.filter((boss) => boss?.images?.portrait).length}`, inline: true },
        { name: "Pipeline", value: sourceStatus ? `**Fresh** · ${sourceStatus.fresh || 0}\n**Fallback raw** · ${sourceStatus.fallback_previous_raw || 0}\n**Low confidence** · ${sourceStatus.fresh_low_confidence || 0}` : "Non disponible pour l’instant", inline: true },
        { name: "Couverture future", value: `**Pré-farm** · ${futureCoverage?.prefarm || 0}\n**Amélioration** · ${futureCoverage?.upgrade || 0}\n**Sources de farm** · ${futureCoverage?.farm_sources || 0}\n**Matériaux** · ${futureCoverage?.materials || 0}`, inline: true },
        { name: "Sources", value: sources, inline: false },
      ],
      footer: { text: meta?.version ? `Maj base · ${meta.version}` : "Maj base · métadonnées partielles" },
    }],
  });
}
