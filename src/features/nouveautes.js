import { msg } from "../discord/responses.js";
import { getNouveautes } from "../lib/kv.js";

const NEWS_ACCENT = 0x2ECC71;
const EMPTY_ACCENT = 0x5865F2;

function formatDate(value) {
  if (!value) return "Non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(date);
}

function renderLines(items = [], formatter, limit = 8) {
  const lines = (items || []).slice(0, limit).map(formatter).filter(Boolean);
  return lines.length ? lines.join("\n") : "Aucun changement détecté.";
}

function characterLine(entry) {
  if (!entry) return null;
  return `• **${entry.name || entry.slug}**`;
}

function updateLine(entry) {
  if (!entry) return null;
  const changes = [];
  if ((entry.added_weapons || []).length) changes.push(`armes +${entry.added_weapons.length}`);
  if ((entry.added_costumes || []).length) changes.push(`costumes +${entry.added_costumes.length}`);
  if (entry.added_costume_images) changes.push(`images +${entry.added_costume_images}`);
  if (entry.changed) changes.push("fiche modifiée");
  return `• **${entry.name || entry.slug}**${changes.length ? ` — ${changes.join(" · ")}` : ""}`;
}

function bossLine(entry) {
  if (!entry) return null;
  return `• **${entry.name || entry.slug}**${entry.changed ? " — guide modifié" : ""}`;
}

function lectureRapide(summary = {}) {
  const lines = [];
  if ((summary.new_characters || 0) > 0) lines.push(`${summary.new_characters} nouveau(x) personnage(s)`);
  if ((summary.updated_characters || 0) > 0) lines.push(`${summary.updated_characters} fiche(s) personnage enrichie(s)`);
  if ((summary.new_bosses || 0) > 0) lines.push(`${summary.new_bosses} nouveau(x) boss`);
  if ((summary.updated_bosses || 0) > 0) lines.push(`${summary.updated_bosses} boss mis à jour`);
  if ((summary.added_costumes || 0) > 0) lines.push(`${summary.added_costumes} costume(s) ajouté(s)`);
  if ((summary.added_costume_images || 0) > 0) lines.push(`${summary.added_costume_images} image(s) costume ajoutée(s)`);
  return lines.length ? lines.map((line) => `• ${line}`).join("\n") : "Aucun changement détecté sur cette fenêtre.";
}

export async function handleNouveautesCommand(env) {
  const payload = await getNouveautes(env.GAME_DATA);
  if (!payload) {
    return msg("", {
      embeds: [{ color: EMPTY_ACCENT, title: "Nouveautés — indisponible", description: "Aucun état de nouveautés n’est actuellement chargé dans le KV.", footer: { text: "Nouveautés · données absentes" } }],
      flags: 64,
    });
  }

  const summary = payload.summary || {};
  const previousDate = formatDate(payload.previous_generated_at);
  const currentDate = formatDate(payload.generated_at);
  const seedMode = payload.seed === true;
  const description = seedMode
    ? "Premier snapshot détecté. Le bot est prêt, mais il faut au moins une synchro suivante pour comparer les changements de la base."
    : "Vue unique et compacte des ajouts et enrichissements détectés entre la synchro précédente et la synchro actuelle.";

  return msg("", {
    embeds: [{
      color: NEWS_ACCENT,
      title: "Nouveautés — base 7DS Origin",
      description,
      fields: [
        { name: "Fenêtre comparée", value: `**Précédente** · ${previousDate}\n**Actuelle** · ${currentDate}`, inline: true },
        { name: "Lecture rapide", value: lectureRapide(summary), inline: true },
        { name: "Chiffres clés", value: `**Nouveaux persos** · ${summary.new_characters || 0}\n**Persos modifiés** · ${summary.updated_characters || 0}\n**Nouveaux boss** · ${summary.new_bosses || 0}\n**Boss modifiés** · ${summary.updated_bosses || 0}\n**Armes ajoutées** · ${summary.added_weapons || 0}\n**Costumes ajoutés** · ${summary.added_costumes || 0}\n**Images costumes** · ${summary.added_costume_images || 0}`, inline: false },
        { name: "Nouveaux personnages", value: renderLines(payload.characters?.added, characterLine), inline: true },
        { name: "Personnages mis à jour", value: renderLines(payload.characters?.updated, updateLine), inline: true },
        { name: "Boss ajoutés / mis à jour", value: renderLines([...(payload.bosses?.added || []), ...(payload.bosses?.updated || [])], bossLine), inline: false },
      ],
      footer: { text: payload.version ? `Nouveautés · ${payload.version}` : "Nouveautés" },
    }],
  });
}
