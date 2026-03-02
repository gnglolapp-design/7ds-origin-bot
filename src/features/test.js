import { ADMIN_ROLE_ID, KV_KEYS } from "../constants.js";
import { publishProtocolSnapshot } from "../testlab/publication/publish.js";
import { PROTOCOLS } from "../testlab/protocols/registry.js";
import { describeProtocolContexts } from "../testlab/publication/context-describer.js";
import { buildPublishedEmbed, buildPublishedIndexEmbeds, buildPublishedListEmbeds, buildPublishedSnapshotDetailEmbed } from "../testlab/views/published.js";
import { ephem, err, ok, qualityLabel } from "../testlab/views/respond.js";
import { deleteSubmission } from "../testlab/storage/submissions.js";
import { buildHistory, buildDetailEmbed, fmtDate } from "../testlab/views/history.js";
import { protocolEmbedList, resultsEmbed, starterEmbed } from "../testlab/views/results.js";
import { protocolForTestSubcommand } from "../testlab/runtime/submit-map.js";
import { buildSubmitMessage, completePendingAtkSkill, getDisabledSet, getLockedSet, handleSubmit } from "../testlab/runtime/submit-flow.js";

const ACCENT = 0xC99700;
const ERROR = 0xED4245;

function optionsMap(options = []) {
  const out = {};
  for (const o of options) out[o.name] = o.value;
  return out;
}

async function putLockedSet(kv, set) {
  await kv.put(KV_KEYS.TEST_LOCKED, JSON.stringify(Array.from(set)));
}

async function putDisabledSet(kv, set) {
  await kv.put(KV_KEYS.TEST_DISABLED, JSON.stringify(Array.from(set)));
}

function subcommand(interaction) {
  const root = Array.isArray(interaction?.data?.options) ? interaction.data.options[0] : null;
  return { name: String(root?.name || ""), options: Array.isArray(root?.options) ? root.options : [] };
}


export async function handleTestComponent(env, interaction, base, params) {
  if (!base) {
    const raw = String(interaction?.data?.custom_id || "");
    if (raw) {
      const [parsedBase, qs] = raw.split("?", 2);
      base = parsedBase;
      params = params || {};
      if (qs) {
        for (const kv of qs.split("&")) {
          const [k, v] = kv.split("=", 2);
          params[k] = decodeURIComponent(v ?? "");
        }
      }
    }
  }
  if (!base || !String(base).startsWith("test:")) return null;

  const kv = env.GAME_DATA;
  if (!kv) return ephem("KV indisponible.");

  if (base === "test:hist") {
    const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const targetU = String(params.u || "");
    if (targetU && targetU !== String(userId)) {
      return { type: 7, data: { content: "Accès refusé.", flags: 64 } };
    }
    const p = Number(params.p || 0);
    const proto = params.proto ? String(params.proto) : "";
    const built = await buildHistory(kv, userId, p, proto || null);
    return { type: 7, data: { ...built, flags: 64 } };
  }

  if (base === "test:atkskill") {
    return await completePendingAtkSkill(env, interaction, String(params.id || ""), String(interaction?.data?.values?.[0] || ""));
  }

  return { type: 7, data: { content: "Composant /test inconnu.", flags: 64 } };
}

function isAdmin(interaction) {
  const roles = interaction?.member?.roles || [];
  return roles.includes(ADMIN_ROLE_ID);
}

async function handleAdmin(kv, sub, data, disabledSet, lockedSet, interaction) {
  if (sub === "admin:disable") {
    const proto = String(data.protocole || "");
    if (!PROTOCOLS[proto]) return err("Admin /test", "Protocole inconnu.");
    disabledSet.add(proto);
    await putDisabledSet(kv, disabledSet);
    return ok("Admin /test", `Protocole **${proto}** désactivé.`, [], "Test · admin");
  }
  if (sub === "admin:enable") {
    const proto = String(data.protocole || "");
    if (!PROTOCOLS[proto]) return err("Admin /test", "Protocole inconnu.");
    disabledSet.delete(proto);
    await putDisabledSet(kv, disabledSet);
    return ok("Admin /test", `Protocole **${proto}** activé.`, [], "Test · admin");
  }
  if (sub === "admin:reset") {
    const proto = String(data.protocole || "");
    if (!PROTOCOLS[proto]) return err("Admin /test", "Protocole inconnu.");
    await kv.delete(`test:agg:${proto}`);
    return ok("Admin /test", `Agrégats réinitialisés pour **${proto}**.`, [], "Test · admin");
  }
  if (sub === "admin:publier") {
    const proto = String(data.protocole || "");
    const actorId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const res = await publishProtocolSnapshot(kv, proto, actorId, {
      listProtocolDocs,
      resultsEmbed: (kv2, proto) => resultsEmbed(kv2, proto, { fmtDate, accent: ACCENT, error: ERROR }),
      fmtDate,
      describeProtocolContexts,
      accent: ACCENT,
    });
    if (!res.ok) return err("Admin /test", res.message);
    return ok("Admin /test", `Snapshot publié pour **${proto}**.`, [
      { name: "Solidité", value: String(res.snapshot.solidness || res.snapshot.confidence || "—"), inline: true },
      { name: "Valides", value: String(res.snapshot.validCount ?? 0), inline: true },
    ], "Test · admin");
  }
  if (sub === "admin:publies") {
    const embeds = await buildPublishedIndexEmbeds(kv, fmtDate, data.protocole ? String(data.protocole) : null, data.scope ? String(data.scope) : null);
    return msg("", { embeds, flags: 64 });
  }
  if (sub === "admin:publie_detail") {
    const embed = await buildPublishedSnapshotDetailEmbed(kv, fmtDate, String(data.snapshot || ""));
    return msg("", { embeds: [embed], flags: 64 });
  }
  if (sub === "admin:verrouiller") {
    const proto = String(data.protocole || "");
    const state = Boolean(data.etat);
    if (!PROTOCOLS[proto]) return err("Admin /test", "Protocole inconnu.");
    if (state) lockedSet.add(proto); else lockedSet.delete(proto);
    await putLockedSet(kv, lockedSet);
    return ok("Admin /test", `Protocole **${proto}** ${state ? "verrouillé" : "déverrouillé"}.`, [], "Test · admin");
  }
  if (sub === "admin:rechercher") {
    const targetUser = String(data.user || "");
    if (!targetUser) return err("Admin /test", "Utilisateur manquant.");
    const protoFilter = data.protocole ? String(data.protocole) : null;
    const built = await buildHistory(kv, targetUser, 0, protoFilter);
    if (built.embeds?.[0]) built.embeds[0].title = `Historique — ${targetUser}`;
    return msg("", { ...built, flags: 64 });
  }
  if (sub === "admin:detail") {
    const embed = await buildDetailEmbed(kv, String(data.submission || ""), interaction?.member?.user?.id || interaction?.user?.id, true);
    return msg("", { embeds: [embed], flags: 64 });
  }
  if (sub === "admin:supprimer") {
    const actorId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const res = await deleteSubmission(kv, String(data.submission || ""), actorId, true);
    if (!res.ok) return err("Admin /test", res.message);
    return ok("Admin /test", `Soumission **${res.doc.id}** supprimée.`, [
      { name: "Protocole", value: String(res.doc.proto || "?"), inline: true },
      { name: "Auteur", value: `<@${String(res.doc.userId || "unknown")}>`, inline: true },
    ], "Test · admin");
  }
  return err("Admin /test", "Action inconnue.");
}


export async function handleTestCommand(env, interaction) {
  const kv = env.GAME_DATA;
  const disabledSet = await getDisabledSet(kv);
  const lockedSet = await getLockedSet(kv);

  const { name: sub, options } = subcommand(interaction);
  const data = optionsMap(options);

  if (!sub) return ephem("Commande invalide.");

  if (sub === "protocoles") {
    return msg("", { embeds: protocolEmbedList(disabledSet, lockedSet, { accent: ACCENT }), flags: 64 });
  }

  if (sub === "demarrer") {
    const protoId = String(data.protocole || "");
    return msg("", { embeds: starterEmbed(protoId, disabledSet, { accent: ACCENT, error: ERROR }), flags: 64 });
  }

  if (sub === "resultats") {
    const protoId = String(data.protocole || "");
    return msg("", { embeds: await resultsEmbed(kv, protoId, { fmtDate, accent: ACCENT, error: ERROR }), flags: 64 });
  }

  if (sub === "valides") {
    return msg("", { embeds: await buildPublishedListEmbeds(kv, fmtDate) });
  }

  if (sub === "valide") {
    const protoId = String(data.protocole || "");
    return msg("", { embeds: await buildPublishedEmbed(kv, fmtDate, protoId, PROTOCOLS) });
  }

  if (sub === "mon-historique") {
    const protoFilter = data.protocole ? String(data.protocole) : null;
    const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const built = await buildHistory(kv, userId, 0, protoFilter);
    return msg("", { ...built, flags: 64 });
  }

  if (sub === "detail") {
    const id = String(data.submission || "");
    const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const isAdm = isAdmin(interaction);
    return msg("", { embeds: [await buildDetailEmbed(kv, id, userId, isAdm)], flags: 64 });
  }

  if (sub === "supprimer") {
    const actorId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
    const res = await deleteSubmission(kv, String(data.submission || ""), actorId, false);
    if (!res.ok) return err("Test", res.message);
    return ok("Test", `Soumission **${res.doc.id}** supprimée.`, [
      { name: "Protocole", value: String(res.doc.proto || "?"), inline: true },
      { name: "Statut", value: qualityLabel(res.doc.status), inline: true },
    ], "Test · privé");
  }

  if (sub.startsWith("admin:")) {
    if (!isAdmin(interaction)) return err("Test admin — accès refusé", "Rôle requis.");
    return await handleAdmin(kv, sub, data, disabledSet, lockedSet, interaction);
  }

  const routedProto = protocolForTestSubcommand(sub);
  if (routedProto) return await handleSubmit(env, routedProto, data, disabledSet, lockedSet, interaction);

  return ephem("Sous-commande /test inconnue.");
}


export async function buildTestSubmitMessage(env, interaction) {
  const opts = interaction?.data?.options?.[0];
  const sub = opts?.name || "";
  const data = {};
  for (const o of (opts?.options || [])) data[o.name] = o.value;

  const staged = await buildSubmitMessage(env, interaction, sub, data);
  if (staged) return staged;

  const kv = env.GAME_DATA;
  const disabledSet = await getDisabledSet(kv);
  const lockedSet = await getLockedSet(kv);
  const routedProto = protocolForTestSubcommand(sub);
  const resp = routedProto
    ? await handleSubmit(env, routedProto, data, disabledSet, lockedSet, interaction)
    : err("Test", "Sous-commande de soumission inconnue.");

  if (resp?.type && resp?.data) return { ...resp.data, flags: 64 };
  return { content: "Erreur interne.", flags: 64 };
}
