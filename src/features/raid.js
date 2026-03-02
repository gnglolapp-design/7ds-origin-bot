import { COMPONENT_IDS } from "../constants.js";
import { cid } from "../lib/ids.js";
import { actionRow, button, stringSelect } from "../lib/components.js";
import { msg, update, modal } from "../discord/responses.js";

const ROLE_OPTIONS = [
  { label: "DPS", value: "DPS", description: "Dégâts principaux", emoji: { name: "⚔️" } },
  { label: "Buffer", value: "Buffer", description: "Boosts et soutien offensif", emoji: { name: "✨" } },
  { label: "Debuffer", value: "Debuffer", description: "Malus et contrôle", emoji: { name: "🌀" } },
  { label: "Heal", value: "Heal", description: "Soins", emoji: { name: "💚" } },
  { label: "Défense", value: "Défense", description: "Tank et protection", emoji: { name: "🛡️" } },
];

const ROLE_ICONS = {
  DPS: "⚔️",
  Buffer: "✨",
  Debuffer: "🌀",
  Heal: "💚",
  "Défense": "🛡️",
};

const TYPE_META = {
  pve: { icon: "🗺️", color: 0x57F287, label: "PvE général" },
  boss: { icon: "👹", color: 0xF1C40F, label: "Boss" },
};

const STATIC_BOSS_OPTIONS = [
  { slug: "guardian-golem", name: "Guardian Golem", emoji: { name: "🪨" }, style: 2, color: 0x95A5A6 },
  { slug: "drake", name: "Drake", emoji: { name: "🐉" }, style: 1, color: 0x3498DB },
  { slug: "red-demon", name: "Red Demon", emoji: { name: "🔥" }, style: 4, color: 0xE74C3C },
  { slug: "grey-demon", name: "Grey Demon", emoji: { name: "🌫️" }, style: 2, color: 0xBDC3C7 },
  { slug: "albion", name: "Albion", emoji: { name: "🗿" }, style: 3, color: 0x9B59B6 },
];

const BOSS_META = Object.fromEntries(
  STATIC_BOSS_OPTIONS.map((boss) => [boss.slug, boss])
);

function clamp(str, max = 100) {
  return String(str || "").slice(0, max);
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

function summarizeType(key) {
  if (key === "pve") return { category: "pve", label: "PvE général" };
  if (key === "boss:catalog") return { category: "boss", label: "Boss · 7DSOrigin.gg" };
  if (key === "boss:other") return { category: "boss", label: "Boss · autre / manuel" };
  if (key.startsWith("boss:")) {
    const slug = key.slice(5);
    const boss = BOSS_META[slug];
    return { category: "boss", label: boss?.name || "Boss", slug };
  }
  return { category: "pve", label: "PvE général" };
}

function raidTypeOptions() {
  return [
    {
      label: "PvE général",
      value: "pve",
      description: "Farm, progression, contenu libre",
      emoji: { name: "🗺️" },
    },
    {
      label: "Boss · 7DSOrigin.gg",
      value: "boss:catalog",
      description: "Choisir un boss dans la liste du bot",
      emoji: { name: "👹" },
    },
    {
      label: "Boss · autre / manuel",
      value: "boss:other",
      description: "Saisir un boss manuellement",
      emoji: { name: "✍️" },
    },
  ];
}

function bossPickerComponents() {
  const buttons = STATIC_BOSS_OPTIONS.map((boss) => button({
    custom_id: cid(COMPONENT_IDS.RAID_BOSS_PICK, { slug: boss.slug }),
    label: clamp(boss.name, 80),
    style: boss.style,
    emoji: boss.emoji,
  }));

  const rows = chunk(buttons, 5).map((items) => actionRow(items));
  rows.push(
    actionRow([
      button({ custom_id: cid(COMPONENT_IDS.RAID_BACK, {}), label: "Retour", style: 1, emoji: { name: "↩️" } }),
      button({ custom_id: cid(COMPONENT_IDS.RAID_TYPE, { direct: "manual" }), label: "Boss manuel", style: 2, emoji: { name: "✍️" } }),
    ])
  );
  return rows;
}

function raidTypePanel() {
  return {
    flags: 64,
    embeds: [{
      title: "Créer un raid",
      color: 0x5865F2,
      description: "Interface compacte pour ouvrir rapidement un raid, puis modifier l’horaire et la note après création.",
      fields: [
        {
          name: "🗺️ PvE général",
          value: "Farm, progression, guild quests, contenu libre.",
          inline: true,
        },
        {
          name: "👹 Boss",
          value: "Boss ciblé depuis 7DSOrigin.gg ou saisie manuelle.",
          inline: true,
        },
        {
          name: "Flux",
          value: "Type → formulaire → message raid → inscription / rôle / édition.",
          inline: false,
        },
      ],
      footer: { text: "Vue privée • le message raid final sera publié dans le salon." },
    }],
    components: [actionRow([
      stringSelect({
        custom_id: cid(COMPONENT_IDS.RAID_TYPE, {}),
        placeholder: "Choisir le type du raid",
        options: raidTypeOptions(),
      }),
    ])],
  };
}

function bossPickerPanel() {
  return {
    flags: 64,
    embeds: [{
      title: "Boss · 7DSOrigin.gg",
      color: 0xF1C40F,
      description: "Choisis un boss pour ouvrir directement le formulaire de création du raid.",
      fields: [
        {
          name: "Boss disponibles",
          value: STATIC_BOSS_OPTIONS.map((boss) => `${boss.emoji?.name || "👹"} **${boss.name}**`).join("  •  "),
          inline: false,
        },
        {
          name: "Astuce",
          value: "Le choix ci-dessous remplit le type du raid. Tu ajoutes ensuite l’horaire et la note dans le formulaire.",
          inline: false,
        },
      ],
      footer: { text: "Sélection compacte par boss" },
    }],
    components: bossPickerComponents(),
  };
}

function countByRole(members = []) {
  const counts = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, 0]));
  for (const member of members) {
    if (counts[member.role] != null) counts[member.role] += 1;
  }
  return counts;
}

function roleSummary(members = []) {
  const counts = countByRole(members);
  return ROLE_OPTIONS.map((r) => `${ROLE_ICONS[r.value]} ${counts[r.value]}`).join("  •  ");
}

function groupMembers(members = []) {
  const grouped = new Map();
  for (const option of ROLE_OPTIONS) grouped.set(option.value, []);
  for (const member of members) {
    const role = grouped.has(member.role) ? member.role : "DPS";
    grouped.get(role).push(member);
  }
  return grouped;
}

function rosterFields(members = []) {
  const grouped = groupMembers(members);
  const fields = [];

  for (const option of ROLE_OPTIONS) {
    const entries = grouped.get(option.value) || [];
    if (!entries.length) continue;
    fields.push({
      name: `${ROLE_ICONS[option.value] || "•"} ${option.label} · ${entries.length}`,
      value: entries.map((m) => `• <@${m.userId}> · Monde ${m.worldLevel}`).join("\n"),
      inline: true,
    });
  }

  if (!fields.length) {
    fields.push({
      name: "Inscriptions",
      value: "Aucune inscription pour le moment.",
      inline: false,
    });
  }

  return fields;
}

function premiumHeader(state) {
  const meta = TYPE_META[state.category] || TYPE_META.pve;
  const status = state.isOpen ? "OUVERT" : "FERMÉ";
  return `${meta.icon} ${state.type} · ${status}`;
}

function raidColor(state) {
  if (state.deleted) return 0x2B2D31;
  if (state.category === "boss") {
    const boss = Object.values(BOSS_META).find((item) => item.name === state.type) || null;
    if (boss) return state.isOpen ? boss.color : 0x8F6A00;
    return state.isOpen ? TYPE_META.boss.color : 0x8F6A00;
  }
  return state.isOpen ? TYPE_META.pve.color : 0x2E7D32;
}

function infoFields(state) {
  const filled = Array.isArray(state.members) ? state.members.length : 0;
  return [
    { name: "🕒 Horaire", value: state.time || "?", inline: true },
    { name: "👑 Créateur", value: `<@${state.ownerId}>`, inline: true },
    { name: "📡 Statut", value: state.isOpen ? "🟢 Ouvert" : "🔴 Fermé", inline: true },
    { name: "📊 Roster", value: `${filled} inscrit(s)\n${roleSummary(state.members)}`, inline: false },
    ...(state.note ? [{ name: "📝 Note", value: state.note, inline: false }] : []),
  ];
}

function raidMessage(state) {
  const embeds = [{
    title: premiumHeader(state),
    color: raidColor(state),
    fields: [
      ...infoFields(state),
      ...rosterFields(state.members),
    ],
    footer: { text: `Raid #${state.id} • rejoins, change ton rôle ou modifie les détails avec les contrôles ci-dessous` },
    timestamp: state.createdAt || undefined,
  }];

  const components = [
    actionRow([
      button({ custom_id: cid(COMPONENT_IDS.RAID_JOIN, { id: state.id }), label: "Inscription", style: 3, disabled: !state.isOpen, emoji: { name: "📝" } }),
      button({ custom_id: cid(COMPONENT_IDS.RAID_LEAVE, { id: state.id }), label: "Quitter", style: 2, emoji: { name: "↩️" } }),
      button({ custom_id: cid(COMPONENT_IDS.RAID_EDIT, { id: state.id }), label: "Modifier", style: 1, emoji: { name: "✏️" } }),
      button({ custom_id: cid(COMPONENT_IDS.RAID_TOGGLE, { id: state.id }), label: state.isOpen ? "Fermer" : "Rouvrir", style: state.isOpen ? 4 : 3, emoji: { name: state.isOpen ? "🔒" : "🔓" } }),
      button({ custom_id: cid(COMPONENT_IDS.RAID_DELETE, { id: state.id }), label: "Supprimer", style: 4, emoji: { name: "🗑️" } }),
    ]),
    actionRow([
      stringSelect({
        custom_id: cid(COMPONENT_IDS.RAID_ROLE, { id: state.id }),
        placeholder: state.isOpen ? "Choisir / modifier mon rôle" : "Raid fermé",
        options: ROLE_OPTIONS,
        disabled: !state.isOpen,
      }),
    ]),
  ];

  return { embeds, components };
}

function deletedRaidMessage(state) {
  return {
    embeds: [{
      title: `🗑️ Raid supprimé · ${state.type}`,
      description: `Ce raid a été supprimé par <@${state.ownerId}>.`,
      color: 0x2B2D31,
      footer: { text: `Raid #${state.id}` },
    }],
    components: [],
  };
}

function createModalForType(typeValue, typeLabel) {
  const isManualBoss = typeValue === "boss:other";
  return modal({
    custom_id: cid(COMPONENT_IDS.RAID_CREATE, { type: typeValue, category: typeValue.startsWith("boss:") ? "boss" : "pve" }),
    title: `Créer · ${typeLabel}`.slice(0, 45),
    components: [
      { type: 1, components: [{ type: 4, custom_id: "raid_time", style: 1, label: "Horaire / plage horaire", min_length: 3, max_length: 64, required: true, placeholder: "ex: 20:30 ou 20:00-21:00" }] },
      { type: 1, components: [{ type: 4, custom_id: "raid_custom_type", style: 1, label: "Nom du boss (si manuel)", min_length: 2, max_length: 80, required: false, placeholder: isManualBoss ? "ex: Red Demon" : "laisser vide" }] },
      { type: 1, components: [{ type: 4, custom_id: "raid_note", style: 2, label: "Note (optionnelle)", required: false, max_length: 250, placeholder: "Besoin d’un heal, boss hebdo, farm, etc." }] },
    ],
  });
}

function editRaidModal(state) {
  return modal({
    custom_id: cid(COMPONENT_IDS.RAID_EDIT, { id: state.id }),
    title: `Modifier · ${state.type}`.slice(0, 45),
    components: [
      { type: 1, components: [{ type: 4, custom_id: "raid_time", style: 1, label: "Horaire / plage horaire", min_length: 3, max_length: 64, required: true, value: cleanText(state.time, "?"), placeholder: "ex: 20:30 ou 20:00-21:00" }] },
      { type: 1, components: [{ type: 4, custom_id: "raid_note", style: 2, label: "Note (optionnelle)", required: false, max_length: 250, value: cleanText(state.note, ""), placeholder: "Besoin d’un heal, boss hebdo, farm, etc." }] },
    ],
  });
}

export async function handleRaidCommand(env) {
  return msg("", raidTypePanel());
}

export async function handleRaidComponent(env, interaction, base, params, raidStub) {
  if (base === COMPONENT_IDS.RAID_BACK) {
    return update(raidTypePanel());
  }

  if (base === COMPONENT_IDS.RAID_TYPE) {
    const direct = params.direct;
    if (direct === "manual") {
      return createModalForType("boss:other", "Boss · autre / manuel");
    }

    const selected = interaction.data.values?.[0] || "pve";
    if (selected === "boss:catalog") {
      return update(bossPickerPanel());
    }
    if (selected === "boss:other") {
      return createModalForType("boss:other", "Boss · autre / manuel");
    }
    return createModalForType("pve", "PvE général");
  }

  if (base === COMPONENT_IDS.RAID_BOSS_PICK) {
    const slug = params.slug;
    const boss = BOSS_META[slug];
    return createModalForType(`boss:${slug}`, boss?.name || "Boss");
  }

  const id = params.id;
  if (!id) return msg("Raid introuvable (id manquant).", { flags: 64 });
  const userId = interaction.member?.user?.id || interaction.user?.id;

  if (base === COMPONENT_IDS.RAID_JOIN) {
    return modal({
      custom_id: cid(COMPONENT_IDS.RAID_JOIN, { id }),
      title: "Inscription raid",
      components: [
        { type: 1, components: [{ type: 4, custom_id: "world_level", style: 1, label: "Niveau du monde", min_length: 1, max_length: 8, required: true, placeholder: "ex: 6" }] },
      ],
    });
  }

  if (base === COMPONENT_IDS.RAID_EDIT) {
    const state = await raidStub.getRaid({ id });
    if (state?.error === "not_found") return msg("Raid introuvable.", { flags: 64 });
    if (state?.ownerId && state.ownerId !== userId) return msg("Seul le créateur du raid peut modifier l’horaire et la note.", { flags: 64 });
    return editRaidModal(state);
  }

  if (base === COMPONENT_IDS.RAID_ROLE) {
    const role = interaction.data.values?.[0];
    const state = await raidStub.setRole({ id, userId, role });
    if (state?.error === "not_joined") return msg("Inscris-toi d’abord avec **Inscription**.", { flags: 64 });
    if (state?.error === "closed") return msg("Ce raid est fermé. Le créateur doit le rouvrir pour modifier les rôles.", { flags: 64 });
    if (state?.error) return msg("Impossible de modifier le rôle pour le moment.", { flags: 64 });
    return update(raidMessage(state));
  }

  if (base === COMPONENT_IDS.RAID_LEAVE) {
    const state = await raidStub.leaveRaid({ id, userId });
    if (state?.error) return msg("Impossible de te retirer de ce raid.", { flags: 64 });
    return update(raidMessage(state));
  }

  if (base === COMPONENT_IDS.RAID_TOGGLE) {
    const state = await raidStub.toggleRaid({ id, userId });
    if (state?.error === "forbidden") return msg("Seul le créateur du raid peut le fermer ou le rouvrir.", { flags: 64 });
    if (state?.error) return msg("Impossible de modifier le statut de ce raid.", { flags: 64 });
    return update(raidMessage(state));
  }

  if (base === COMPONENT_IDS.RAID_DELETE) {
    const state = await raidStub.deleteRaid({ id, userId });
    if (state?.error === "forbidden") return msg("Seul le créateur du raid peut le supprimer.", { flags: 64 });
    if (state?.error) return msg("Impossible de supprimer ce raid.", { flags: 64 });
    return update(deletedRaidMessage(state));
  }

  return msg("Action raid inconnue.", { flags: 64 });
}

export async function handleRaidModalSubmit(env, interaction, params, raidStub) {
  const fields = interaction.data.components.flatMap((row) => row.components);
  const selected = params.type || "pve";
  const selectedType = summarizeType(selected);
  const customType = cleanText(fields.find((f) => f.custom_id === "raid_custom_type")?.value, "");
  const time = cleanText(fields.find((f) => f.custom_id === "raid_time")?.value, "?") || "?";
  const note = cleanText(fields.find((f) => f.custom_id === "raid_note")?.value, "");
  const ownerId = interaction.member?.user?.id || interaction.user?.id;

  let typeLabel = selectedType.label;
  if (selected === "boss:other" && customType) typeLabel = customType;
  if (selectedType.category === "boss" && selected !== "boss:other") typeLabel = selectedType.label;
  if (selectedType.category === "boss" && !typeLabel.toLowerCase().startsWith("boss") && selected === "boss:other" && !customType) typeLabel = "Boss";

  const state = await raidStub.createRaid({
    category: selectedType.category,
    typeKey: selected,
    type: typeLabel,
    time,
    note,
    ownerId,
  });
  return msg("", raidMessage(state));
}

export async function handleRaidJoinModalSubmit(env, interaction, params, raidStub) {
  const id = params.id;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const fields = interaction.data.components.flatMap((row) => row.components);
  const worldLevel = cleanText(fields.find((f) => f.custom_id === "world_level")?.value, "?") || "?";
  const state = await raidStub.joinRaid({ id, userId, worldLevel });
  if (state?.error === "closed") return msg("Ce raid est fermé. Le créateur doit le rouvrir pour accepter de nouvelles inscriptions.", { flags: 64 });
  if (state?.error) return msg("Impossible de t’inscrire à ce raid.", { flags: 64 });
  return update(raidMessage(state));
}

export async function handleRaidEditModalSubmit(env, interaction, params, raidStub) {
  const id = params.id;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const fields = interaction.data.components.flatMap((row) => row.components);
  const time = cleanText(fields.find((f) => f.custom_id === "raid_time")?.value, "?") || "?";
  const note = cleanText(fields.find((f) => f.custom_id === "raid_note")?.value, "");
  const state = await raidStub.editRaid({ id, userId, time, note });
  if (state?.error === "forbidden") return msg("Seul le créateur du raid peut modifier l’horaire et la note.", { flags: 64 });
  if (state?.error === "not_found") return msg("Raid introuvable.", { flags: 64 });
  if (state?.error) return msg("Impossible de modifier ce raid pour le moment.", { flags: 64 });
  return update(raidMessage(state));
}
