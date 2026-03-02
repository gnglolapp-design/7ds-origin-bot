import { KV_KEYS } from "../../constants.js";
import { msg } from "../../discord/responses.js";
import { loadAllCharacters, resolveCharacter } from "../../lib/catalog.js";
import { validateSubmission as validateSubmission2 } from "../validators/index.js";
import { computeMetric as computeMetric2 } from "../metrics/protocols.js";
import { storeSubmission } from "../storage/submissions.js";
import { updateAggregates } from "../storage/aggregates.js";

const ACCENT = 0xC99700;
const ERROR = 0xED4245;

function ephem(content, embeds = []) {
  return msg("", { content, embeds, flags: 64 });
}

function err(title, description) {
  return ephem("", [{
    color: ERROR,
    title,
    description,
    footer: { text: "Test · paramètres invalides" },
  }]);
}

function ok(title, description, fields = [], footer = "Test · enregistré") {
  return ephem("", [{
    color: ACCENT,
    title,
    description,
    fields,
    footer: { text: footer },
  }]);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function toId(label) {
  return normalizeText(label)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "x";
}

function findWeaponByValue(char, rawValue) {
  const wanted = String(rawValue || "").trim();
  if (!char || !wanted) return null;
  const wantedNorm = normalizeText(wanted);
  const weapons = Array.isArray(char.weapons) ? char.weapons : [];
  return weapons.find((weapon) => {
    const name = String(weapon?.name || weapon?.type || "");
    return wanted === name
      || wantedNorm === normalizeText(name)
      || wantedNorm === toId(name)
      || wantedNorm.endsWith(`:${toId(name)}`)
      || wantedNorm.endsWith(`:${normalizeText(name)}`);
  }) || null;
}

function buildWeaponSkillChoices(weapon) {
  const out = [];
  const seen = new Set();
  for (const skill of (weapon?.skills || [])) {
    const label = String(skill?.name || skill?.label || "").trim();
    if (!label) continue;
    const value = toId(label);
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ label, value });
  }
  return out.slice(0, 25);
}

function makePendingId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function qualityLabel(status) {
  if (status === "ok") return "✅ Valide";
  if (status === "suspect") return "⚠️ Suspect";
  return "❌ Rejeté";
}

export async function getDisabledSet(kv) {
  const raw = await kv.get(KV_KEYS.TEST_DISABLED, { type: "json" });
  const arr = Array.isArray(raw) ? raw : [];
  return new Set(arr.map(String));
}

export async function getLockedSet(kv) {
  const raw = await kv.get(KV_KEYS.TEST_LOCKED, { type: "json" });
  const arr = Array.isArray(raw) ? raw : [];
  return new Set(arr.map(String));
}

export async function handleSubmit(env, protoId, data, disabledSet, lockedSet, interaction) {
  if (disabledSet.has(protoId)) return err("Test", `Le protocole **${protoId}** est désactivé.`);
  if (lockedSet?.has?.(protoId)) return err("Test", `Le protocole **${protoId}** est verrouillé temporairement.`);

  const kv = env.GAME_DATA;
  if (!kv) return err("Test", "KV indisponible.");

  const characters = await loadAllCharacters(kv);
  const selected = resolveCharacter(characters, data.perso);
  if (!selected) return err("Test", "Personnage introuvable (perso).");

  if (protoId === "SCALING_ATK") {
    const weapon = findWeaponByValue(selected, data.arme);
    if (!weapon) return err("SCALING_ATK — rejeté", "• arme invalide ou introuvable pour ce personnage");
    data = { ...data, perso: selected.slug || data.perso, arme: weapon.name || data.arme };
    const skillNames = buildWeaponSkillChoices(weapon).map((entry) => entry.label);
    if (!skillNames.includes(String(data.skill || ""))) {
      return err("SCALING_ATK — rejeté", "• skill invalide pour l'arme sélectionnée");
    }
  }

  if (protoId === "WEAPON_SKILL_DELTA") {
    const weaponA = findWeaponByValue(selected, data.arme_a);
    const weaponB = findWeaponByValue(selected, data.arme_b);
    if (!weaponA) return err("WEAPON_SKILL_DELTA — rejeté", "• arme_a invalide ou introuvable pour ce personnage");
    if (!weaponB) return err("WEAPON_SKILL_DELTA — rejeté", "• arme_b invalide ou introuvable pour ce personnage");
    data = { ...data, perso: selected.slug || data.perso, arme_a: weaponA.name || data.arme_a, arme_b: weaponB.name || data.arme_b };
  }

  const validation = await validateSubmission2(kv, protoId, data);
  if (validation.status === "reject") {
    return err(`${protoId} — rejeté`, validation.errors.map((e) => `• ${e}`).join("\n"));
  }

  const metric = computeMetric2(protoId, data);
  const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
  const payload = { ...data, status: validation.status, warnings: validation.warnings || [], metric };
  const qualityScore = validation.status === "ok" ? 100 : (validation.status === "suspect" ? 70 : 0);
  const stored = await storeSubmission(kv, protoId, userId, payload, qualityScore);
  const agg = await updateAggregates(kv, protoId, metric, validation.status, payload);

  const fields = [];
  fields.push({ name: "Statut", value: qualityLabel(validation.status), inline: true });
  fields.push({ name: "ID", value: `\`${stored.id}\``, inline: true });
  if (metric != null && validation.status === "ok") fields.push({ name: "Métrique", value: Number(metric).toFixed(4), inline: true });
  if (validation.warnings?.length) fields.push({ name: "Avertissements", value: validation.warnings.map((w) => `• ${w}`).join("\n") });

  return ok(
    `${protoId} — soumission enregistrée`,
    `Perso: **${selected.name}**\nN: **${data.n ?? data.attempts ?? "—"}**`,
    fields,
    `Test · agrégats mis à jour (${agg.n_ok || 0} valides)`,
  );
}

export async function buildSubmitMessage(env, interaction, sub, data) {
  const kv = env.GAME_DATA;
  const disabledSet = await getDisabledSet(kv);
  const lockedSet = await getLockedSet(kv);

  if (sub !== "soumettre_atk") return null;

  if (disabledSet.has("SCALING_ATK")) {
    return { ...(err("Test", "Le protocole **SCALING_ATK** est désactivé.").data), flags: 64 };
  }
  if (lockedSet.has("SCALING_ATK")) {
    return { ...(err("Test", "Le protocole **SCALING_ATK** est verrouillé temporairement.").data), flags: 64 };
  }

  const characters = await loadAllCharacters(kv);
  const selected = resolveCharacter(characters, data.perso);
  if (!selected) return { ...(err("Test", "Personnage introuvable (perso).").data), flags: 64 };

  const weapon = findWeaponByValue(selected, data.arme);
  if (!weapon) {
    return { ...(err("SCALING_ATK — rejeté", "• arme invalide ou introuvable pour ce personnage").data), flags: 64 };
  }

  const preValidation = await validateSubmission2(kv, "SCALING_ATK", { ...data, arme: weapon.name || data.arme, skill: "__pending__" });
  const errors = (preValidation.errors || []).filter((entry) => !String(entry).startsWith("skill "));
  if (preValidation.status === "reject" && errors.length) {
    return { ...(err("SCALING_ATK — rejeté", errors.map((entry) => `• ${entry}`).join("\n")).data), flags: 64 };
  }

  const skills = buildWeaponSkillChoices(weapon);
  if (!skills.length) {
    return { ...(err("SCALING_ATK — rejeté", "• aucune compétence indexée pour cette arme").data), flags: 64 };
  }

  const pendingId = makePendingId();
  const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
  await kv.put(`test:pending:atk:${pendingId}`, JSON.stringify({
    userId,
    createdAt: Date.now(),
    weaponName: weapon.name || "",
    data: { ...data, perso: selected.slug || data.perso, arme: weapon.name || data.arme },
    skills,
  }), { expirationTtl: 3600 });

  return {
    embeds: [{
      color: ACCENT,
      title: "SCALING_ATK — choisir la compétence",
      description: `Perso: **${selected.name}**\nArme: **${weapon.name || "—"}**\nATK: **${data.atk}** · Dégâts: **${data.dmg}** · Crit: **${data.crit}** · N: **${data.n}**\n\nChoisis maintenant la **skill exacte** de l'arme pour finaliser la soumission.`,
      footer: { text: "Test · étape 2/2" },
    }],
    components: [{
      type: 1,
      components: [{
        type: 3,
        custom_id: `test:atkskill?id=${encodeURIComponent(pendingId)}`,
        placeholder: "Choisir la compétence de l'arme",
        min_values: 1,
        max_values: 1,
        options: skills.map((entry) => ({ label: entry.label.slice(0, 100), value: entry.value.slice(0, 100) })),
      }],
    }],
    flags: 64,
  };
}

export async function completePendingAtkSkill(env, interaction, pendingId, chosen) {
  const kv = env.GAME_DATA;
  const userId = interaction?.member?.user?.id || interaction?.user?.id || "unknown";
  if (!pendingId) {
    return { type: 7, data: { content: "Sélection invalide.", flags: 64, components: [] } };
  }
  const pending = await kv.get(`test:pending:atk:${pendingId}`, { type: "json" });
  if (!pending) {
    return { type: 7, data: { content: "Cette sélection a expiré. Relance `/test soumettre_atk`.", flags: 64, components: [] } };
  }
  if (String(pending.userId || "") !== String(userId)) {
    return { type: 7, data: { content: "Accès refusé.", flags: 64, components: [] } };
  }

  const skill = (pending.skills || []).find((entry) => String(entry.value) === String(chosen || ""));
  if (!skill) {
    return { type: 7, data: { content: "Compétence invalide. Relance `/test soumettre_atk`.", flags: 64, components: [] } };
  }

  const disabledSet = await getDisabledSet(kv);
  const lockedSet = await getLockedSet(kv);
  const submitData = { ...(pending.data || {}), skill: skill.label, arme: pending.weaponName || pending.data?.arme || "" };
  const resp = await handleSubmit(env, "SCALING_ATK", submitData, disabledSet, lockedSet, interaction);
  await kv.delete(`test:pending:atk:${pendingId}`);
  return { type: 7, data: { ...(resp?.data || { content: "Erreur interne." }), flags: 64, components: [] } };
}
