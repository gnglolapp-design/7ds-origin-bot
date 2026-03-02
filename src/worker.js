import { ROUTES, COMPONENT_IDS } from "./constants.js";
import { requireEnv } from "./lib/env.js";
import { json } from "./lib/utils.js";
import { parseCid } from "./lib/ids.js";
import { verifyDiscordRequest } from "./discord/verify.js";
import { InteractionResponseType } from "./discord/responses.js";
import { handlePersoCommand, handlePersoComponent } from "./features/perso.js";
import { handleBossCommand, handleBossComponent } from "./features/boss.js";
import { handleRaidCommand, handleRaidComponent, handleRaidModalSubmit, handleRaidJoinModalSubmit, handleRaidEditModalSubmit } from "./features/raid.js";
import { handleGlossaireCommand, handleGlossaireComponent } from "./features/glossaire.js";
import { handleElementsCommand, handleElementsComponent } from "./features/elements.js";
import { handleListeCommand } from "./features/liste.js";
import { handleCompareCommand, handleCompareArmesCommand, handleComparePersosCommand, handleCompareComponent } from "./features/compare.js";
import { handleMajBaseCommand } from "./features/maj-base.js";
import { handleTierlistCommand } from "./features/tierlist.js";
import { handleTiereditCommand } from "./features/tieredit.js";
import { handleNouveautesCommand } from "./features/nouveautes.js";
import { handleAutocomplete } from "./features/autocomplete.js";

import { handleHealthCommand } from "./features/health.js";
import { handleStatsBotCommand } from "./features/stats-bot.js";
import { handleMediaCheckCommand } from "./features/media-check.js";
import { handleSyncReportCommand } from "./features/sync-report.js";
import { handleTestCommand, handleTestComponent, buildTestSubmitMessage } from "./features/test.js";
import { buildCompoMessage, handleCompoComponent } from "./features/compo.js";
import { sendFollowup } from "./discord/followup.js";
import { editOriginalResponse } from "./discord/edit-original.js";
import { trackCommandUsage, trackEntityView } from "./lib/stats.js";
import { RaidDO } from "./raid/durable-object.js";

const TEST_COMMAND_NAMES = new Set(["test", "testbasic", "testtempo", "testbuild", "testchain", "testburst", "testboss", "testadvanced", "testadmin"]);

export { RaidDO };

function raidStub(env) {
  const id = env.RAID.idFromName("global");
  const stub = env.RAID.get(id);
  const call = async (payload) => {
    const response = await stub.fetch("https://raid/op", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  };
  return {
    createRaid: (x) => call({ op: "create", ...x }),
    joinRaid: (x) => call({ op: "join", ...x }),
    setRole: (x) => call({ op: "setRole", ...x }),
    leaveRaid: (x) => call({ op: "leave", ...x }),
    toggleRaid: (x) => call({ op: "toggle", ...x }),
    deleteRaid: (x) => call({ op: "delete", ...x }),
    editRaid: (x) => call({ op: "edit", ...x }),
    getRaid: (x) => call({ op: "get", ...x }),
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/") return new Response("OK", { status: 200 });
    if (url.pathname !== ROUTES.INTERACTIONS) return new Response("Not Found", { status: 404 });

    requireEnv(env, ["DISCORD_PUBLIC_KEY"]);
    const { isValid, body } = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
    if (!isValid) return new Response("Bad signature", { status: 401 });
    const interaction = JSON.parse(body);

    if (interaction.type === 1) return json({ type: InteractionResponseType.PONG });

    if (interaction.type === 2) {
      const name = interaction.data?.name;
      if (name) await trackCommandUsage(env.GAME_DATA, name);
      if (name === "perso") return json(await handlePersoCommand(env, interaction));
      if (name === "boss") return json(await handleBossCommand(env, interaction));
      if (name === "raid") return json(await handleRaidCommand(env, interaction));
      if (name === "glossaire") return json(await handleGlossaireCommand(env));
      if (name === "elements") return json(await handleElementsCommand(env));
      if (name === "liste") return json(await handleListeCommand(env, interaction));
      if (name === "compare") return json(await handleCompareCommand(env, interaction));
      if (name === "compare-persos") return json(await handleComparePersosCommand(env, interaction));
      if (name === "compare-armes") return json(await handleCompareArmesCommand(env, interaction));
      if (name === "maj-base") return json(await handleMajBaseCommand(env));
      if (name === "tierlist") return json(await handleTierlistCommand(env, interaction));
      if (name === "tieredit") return json(await handleTiereditCommand(env, interaction));
      if (name === "nouveautes") return json(await handleNouveautesCommand(env));
      if (name === "health") return json(await handleHealthCommand(env, interaction));
      if (name === "stats-bot") return json(await handleStatsBotCommand(env, interaction));
      if (name === "media-check") return json(await handleMediaCheckCommand(env, interaction));
      if (name === "sync-report") return json(await handleSyncReportCommand(env, interaction));
      if (name === "compo") {
        // Defer immediately to avoid Discord 3s timeout, then send follow-up
        ctx.waitUntil((async () => {
          const data = await buildCompoMessage(env, interaction);
          await sendFollowup(interaction, data);
        })());
        return json({ type: 5, data: { flags: 64 } });
      }

      if (TEST_COMMAND_NAMES.has(name)) {
        const root = interaction?.data?.options?.[0] || null;
        const sub = root?.type === 2 && root?.options?.[0]
          ? `${root.name}:${root.options[0].name}`
          : (root?.name || "");
        if (sub && (sub.startsWith("soumettre_") || sub.startsWith("systeme:"))) {
          ctx.waitUntil((async () => {
            const data = await buildTestSubmitMessage(env, interaction);
            await editOriginalResponse(interaction, data);
          })());
          return json({ type: 5, data: { flags: 64 } });
        }
        return json(await handleTestCommand(env, interaction));
      }

      return json({ type: 4, data: { content: "Commande inconnue.", flags: 64 } });
    }

    if (interaction.type === 3) {
      const { base, params } = parseCid(interaction.data.custom_id);
      if (base === COMPONENT_IDS.PERSO_SELECT) {
        const selected = interaction.data.values?.[0];
        if (selected) await trackEntityView(env.GAME_DATA, "character", selected);
      }
      if (base === "boss:pick") {
        const selected = interaction.data.values?.[0];
        if (selected) await trackEntityView(env.GAME_DATA, "boss", selected);
      }
      if (base.startsWith("perso:")) return json(await handlePersoComponent(env, interaction, base, params));
      if (base.startsWith("compare:")) return json(await handleCompareComponent(env, interaction, base, params));
      if (base === "compo:view") return json(await handleCompoComponent(env, interaction, params));
      if (base.startsWith("boss:")) return json(await handleBossComponent(env, interaction, base, params));
      if (base.startsWith("raid:")) return json(await handleRaidComponent(env, interaction, base, params, raidStub(env)));
      if (base.startsWith("glossaire:")) return json(await handleGlossaireComponent(env, interaction));
      if (base.startsWith("elements:")) return json(await handleElementsComponent(env, interaction));
      if (base.startsWith("test:")) return json(await handleTestComponent(env, interaction, base, params));
      return json({ type: 7, data: { content: "Composant inconnu.", flags: 64 } });
    }

    if (interaction.type === 4) {
      return json(await handleAutocomplete(env, interaction));
    }

    if (interaction.type === 5) {
      const { base, params } = parseCid(interaction.data.custom_id);
      const stub = raidStub(env);
      if (base === COMPONENT_IDS.RAID_CREATE) return json(await handleRaidModalSubmit(env, interaction, params, stub));
      if (base === COMPONENT_IDS.RAID_JOIN) return json(await handleRaidJoinModalSubmit(env, interaction, params, stub));
      if (base === COMPONENT_IDS.RAID_EDIT) return json(await handleRaidEditModalSubmit(env, interaction, params, stub));
      return json({ type: 4, data: { content: "Modal inconnue.", flags: 64 } });
    }

    return json({ type: 4, data: { content: "Interaction non supportée.", flags: 64 } });
  }
};
