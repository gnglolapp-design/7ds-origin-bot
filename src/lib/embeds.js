import { chunk } from "./utils.js";
import { analyzeCharacterProfile, countRealCostumes, describeCharacterCompleteness, resolveCharacterCostumes, summarizeCharacterUnknowns } from "./gameplay.js";
import { describeProgressionAvailability, summarizeProgressionBlock, withProgressionShape } from "./progression.js";
import { getTheoryProfile, getWeaponCompatibility } from "./theorycraft.js";
import { explainCharacterTheory } from "./assistant.js";

const ATTRIBUTE_COLORS = {
  Fire: 0xe67e22,
  Flame: 0xe67e22,
  Thunder: 0xf1c40f,
  Lightning: 0xf1c40f,
  Darkness: 0x6c5ce7,
  Dark: 0x6c5ce7,
  Holy: 0xf5f6fa,
  Light: 0xf5f6fa,
  Wind: 0x2ecc71,
  Earth: 0x8e6e53,
  Physical: 0x95a5a6,
  Cold: 0x74b9ff,
  Ice: 0x74b9ff,
  Water: 0x3498db,
};

const SECTION_COLORS = {
  overview: 0x5865f2,
  stats: 0x3498db,
  skills: 0xf39c12,
  potentiels: 0x8e44ad,
  costumes: 0xe84393,
  boss: 0xc0392b,
  raid: 0x2ecc71,
};

const KIND_ICONS = {
  "Adventure Skill": "🧭",
  Passive: "✨",
  "Normal Attack": "⚔️",
  "Special Attack": "💥",
  "Normal Skill": "🪄",
  "Tag Skill": "🔁",
  "Ultimate Move": "🔥",
};

const ATTRIBUTE_ICONS = {
  Fire: "🔥",
  Flame: "🔥",
  Thunder: "⚡",
  Lightning: "⚡",
  Darkness: "🌑",
  Dark: "🌑",
  Holy: "✨",
  Light: "✨",
  Wind: "🍃",
  Earth: "🪨",
  Physical: "⚔️",
  Cold: "❄️",
  Ice: "❄️",
  Water: "💧",
};

const ROLE_ICONS = {
  DPS: "⚔️",
  "Défense": "🛡️",
  Defense: "🛡️",
  Heal: "💚",
  Buffer: "✨",
  Debuffer: "☠️",
};

function pickAttributeColor(char) {
  return ATTRIBUTE_COLORS[char?.attribute] || ATTRIBUTE_COLORS[char?.attributes?.[0]] || 0x2b2d31;
}

function pickColor(char, section = "overview") {
  return SECTION_COLORS[section] || pickAttributeColor(char);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 3)) + "...";
}

function compactText(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function statLabel(label) {
  return {
    Attack: "ATK",
    Defense: "DEF",
    "Max HP": "HP",
    Accuracy: "Précision",
    Block: "Blocage",
    "Crit Rate": "Taux crit.",
    "Crit Damage": "Dégâts crit.",
    "Crit Res": "Rés. crit.",
    "Crit Dmg Res": "Rés. dmg crit.",
    "PvP Dmg Inc": "PvP dmg+",
    "PvP Dmg Dec": "PvP dmg-",
    "Block Dmg Res": "Rés. blocage",
    "Move Speed": "Vitesse",
  }[label] || label;
}

function safeUrl(url) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) ? value : null;
}

function makeEmbed(char, title, description = "", section = "overview") {
  const embed = {
    title: truncate(title, 256),
    description: truncate(compactText(description), 4096),
    color: pickColor(char, section),
  };
  const portrait = safeUrl(char?.images?.portrait);
  if (portrait) embed.thumbnail = { url: portrait };
  return embed;
}

function addFields(embed, fields) {
  if (!fields.length) return embed;
  embed.fields = fields.map((field) => ({
    name: truncate(field.name, 256),
    value: truncate(compactText(field.value || "—"), 1024),
    inline: !!field.inline,
  }));
  return embed;
}

function firstAdvice(items = [], fallback = "Non disponible pour l’instant") {
  const arr = Array.isArray(items) ? items : [items];
  const hit = arr.map((x) => String(x || "").trim()).find(Boolean);
  return hit || fallback;
}

function weaponAdviceLines(char, profile) {
  const weapons = Array.isArray(char?.weapons) ? char.weapons : [];
  if (!weapons.length) return "Non disponible pour l’instant";
  return weapons.slice(0, 3).map((weapon) => {
    const compat = getWeaponCompatibility((profile?.weapons || []).find((x) => x?.name === weapon.name) || {}, char, weapon);
    const reason = firstAdvice([compat?.functions?.[0], compat?.dominant?.[0], compat?.planRole?.[0]], "un usage encore flou");
    return `• **${weapon.name}** · à choisir si tu veux surtout ${reason}`;
  }).join("\n");
}

function characterAdviceLines(char, theory) {
  return [
    `• **Quand il est fort** · ${firstAdvice([theory?.planRole?.[0], theory?.dominant?.[0]], "quand le combat laisse jouer son point fort")}`,
    `• **Ce qu’il faut lui donner** · ${firstAdvice([theory?.needs?.[0], theory?.synergies?.[0]], "un cadre simple pour bien jouer son kit")}`,
    `• **Ce qu’il faut éviter** · ${firstAdvice([theory?.dependencies?.[0], theory?.planRisks?.[0]], "les combats qui cassent trop vite son tour")}`,
  ].join("\n");
}

function capEmbeds(list) {
  if (!Array.isArray(list)) return [];
  if (list.length <= 10) return list;
  const out = list.slice(0, 10);
  const tail = out[out.length - 1];
  tail.description = truncate(`${tail.description || ""}\n\n*(Affichage tronqué : limite Discord de 10 embeds.)*`, 4096);
  return out;
}

function weaponSummaryLine(weapon) {
  const stats = [
    `**${weapon.name}**`,
    weapon.attribute ? `${ATTRIBUTE_ICONS[weapon.attribute] || "•"} ${weapon.attribute}` : null,
    `${(weapon.skills || []).length} skill(s)`,
    `${(weapon.potentials || []).length} potentiel(s)`,
  ].filter(Boolean).join(" • ");
  return `• ${stats}`;
}

function sourceFooter(char) {
  const parts = [];
  if (char?.sources?.seven_origin) parts.push("7dsorigin");
  if (char?.sources?.hideout) parts.push("Hideout");
  if (char?.sources?.genshin) parts.push("genshin.gg");
  return parts.length ? `Sources · ${parts.join(" · ")}` : "";
}

function formatRoles(char) {
  const roles = char.roles || [];
  if (!roles.length) return null;
  return roles.map((role) => `${ROLE_ICONS[role] || "•"} ${role}`).join("\n");
}

function metaLine(char, weapon) {
  return [
    weapon?.name ? `**Arme** · ${weapon.name}` : null,
    weapon?.attribute ? `**Élément** · ${ATTRIBUTE_ICONS[weapon.attribute] || "•"} ${weapon.attribute}` : char?.attribute ? `**Élément** · ${ATTRIBUTE_ICONS[char.attribute] || "•"} ${char.attribute}` : null,
    weapon?.skills ? `**Skills** · ${(weapon.skills || []).length}` : null,
    weapon?.potentials ? `**Potentiels** · ${(weapon.potentials || []).length}` : null,
  ].filter(Boolean).join("\n");
}

function footerText(...parts) {
  return parts
    .flat()
    .map((part) => compactText(part))
    .filter(Boolean)
    .join(" · ");
}

function applySectionHeader(embed, { name, subtitle, iconUrl, footer }) {
  const icon = safeUrl(iconUrl);
  embed.author = {
    name: truncate(subtitle ? `${name} · ${subtitle}` : name, 256),
    ...(icon ? { icon_url: icon } : {}),
  };
  if (footer) embed.footer = { text: truncate(Array.isArray(footer) ? footerText(footer) : footer, 2048) };
}

function skillField(skill) {
  const icon = KIND_ICONS[skill.kind] || "•";
  const name = `${icon} ${skill.name || skill.kind || "Skill"}`;
  const lines = [];
  if (skill.kind && skill.name !== skill.kind) lines.push(`*${skill.kind}*`);
  if (skill.cooldown) lines.push(`**Cooldown** · ${skill.cooldown}`);
  if (skill.description) lines.push(skill.description);
  return { name, value: lines.join("\n") || "Aucune description." };
}

export function characterOverviewEmbeds(char) {
  char = withProgressionShape(char);
  const quickStats = [];
  if (char.stats?.Attack) quickStats.push(`**ATK** ${char.stats.Attack}`);
  if (char.stats?.Defense) quickStats.push(`**DEF** ${char.stats.Defense}`);
  if (char.stats?.["Max HP"]) quickStats.push(`**HP** ${char.stats["Max HP"]}`);

  const profile = analyzeCharacterProfile(char);
  const theory = getTheoryProfile(char, profile);
  const explanation = explainCharacterTheory(char, profile, theory, summarizeCharacterUnknowns(char));
  const attributeText = char.attribute ? `${ATTRIBUTE_ICONS[char.attribute] || "•"} ${char.attribute}` : null;
  const rolesText = formatRoles(char);

  const main = makeEmbed(char, "Aperçu", char.description || "Aucune description disponible.", "overview");
  applySectionHeader(main, {
    name: char.name,
    subtitle: char.rarity ? `Rareté ${char.rarity}` : "Fiche personnage",
    iconUrl: char.images?.portrait,
    footer: ["Aperçu · vue 1/2", sourceFooter(char)],
  });
  addFields(main, [
    ...(attributeText ? [{ name: "Élément", value: attributeText, inline: true }] : []),
    ...(rolesText ? [{ name: "Rôles", value: rolesText, inline: true }] : []),
    ...(countRealCostumes(char) ? [{ name: "Costumes", value: `${countRealCostumes(char)} costume(s)`, inline: true }] : []),
    ...(quickStats.length ? [{ name: "Stats rapides", value: quickStats.join("\n"), inline: true }] : []),
    ...(char.weapons?.length ? [{ name: "Armes disponibles", value: truncate(char.weapons.slice(0, 2).map(weaponSummaryLine).join("\n") + (char.weapons.length > 2 ? "\n• …" : ""), 1024), inline: false }] : []),
    {
      name: "Identité du perso",
      value: theory.dominant.length ? theory.dominant.join("\n") : (profile.orientations.length ? profile.orientations.join("\n") : "Non disponible pour l’instant"),
      inline: false,
    },
  ]);

  const detail = makeEmbed(char, "Aperçu · repères utiles", "Vue courte : ce qu’il apporte, comment il se joue et ce qu’il faut surveiller.", "overview");
  applySectionHeader(detail, {
    name: char.name,
    subtitle: "Aperçu · vue 2/2",
    iconUrl: char.images?.portrait,
    footer: ["Aperçu · vue 2/2", sourceFooter(char)],
  });
  addFields(detail, [
    {
      name: "Repères simples",
      value: [
        `**Fiabilité du conseil du kit** · ${theory.stability || "Non disponible pour l’instant"}`,
        `**Gros dégâts au bon moment** · ${theory.conversion || "Non disponible pour l’instant"}`,
        theory.planRole?.length ? `**Plan simple** · ${theory.planRole.join(" · ")}` : null,
        theory.secondary.length ? `**Autre rôle utile** · ${theory.secondary.join(" · ")}` : null,
        theory.synergies?.[0] ? `**Bonne synergie** · ${theory.synergies[0]}` : null,
      ].filter(Boolean).join("\n"),
      inline: false,
    },
    {
      name: "Pourquoi cette analyse",
      value: explanation.reading,
      inline: false,
    },
    {
      name: "À garder en tête",
      value: `${explanation.cautions}

**Fiabilité du conseil** · ${explanation.confidence}`,
      inline: false,
    },
  ]);

  return [main, detail];
}

export function characterGameplayEmbeds(char) {
  char = withProgressionShape(char);
  const profile = analyzeCharacterProfile(char);
  const theory = getTheoryProfile(char, profile);
  const unknowns = summarizeCharacterUnknowns(char);
  const explanation = explainCharacterTheory(char, profile, theory, unknowns);

  const main = makeEmbed(char, "Gameplay", "Vue rapide : ce que fait le kit et comment l’utiliser.", "overview");
  applySectionHeader(main, {
    name: char.name,
    subtitle: "Gameplay · vue 1/2",
    iconUrl: char.images?.portrait,
    footer: ["Gameplay · vue 1/2", "Conseils prudents"],
  });
  const gameplayIcon = char.weapons?.flatMap((weapon) => weapon.skills || []).find((skill) => skill?.icon)?.icon;
  if (gameplayIcon) main.thumbnail = { url: gameplayIcon };
  addFields(main, [
    {
      name: "Ce que fait le perso",
      value: theory.functions.length ? theory.functions.map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant",
      inline: true,
    },
    {
      name: "Comment le jouer",
      value: theory.planLines?.length ? theory.planLines.join("\n") : (theory.planRole?.length ? theory.planRole.join(" · ") : "Non disponible pour l’instant"),
      inline: true,
    },
    {
      name: "Effets repérés",
      value: theory.effects.length ? `• ${theory.effects.join("\n• ")}` : "Non disponible pour l’instant",
      inline: false,
    },
    {
      name: "Tags utiles",
      value: profile.tags.length ? `• ${profile.tags.join("\n• ")}` : "Non disponible pour l’instant",
      inline: false,
    },
  ]);

  const detail = makeEmbed(char, "Gameplay · points d’attention", "Vue courte : ce qui aide, ce qui bloque et ce qu’il manque encore.", "overview");
  applySectionHeader(detail, {
    name: char.name,
    subtitle: "Gameplay · vue 2/2",
    iconUrl: char.images?.portrait,
    footer: ["Gameplay · vue 2/2", "Conseils prudents"],
  });
  addFields(detail, [
    {
      name: "Ce qui aide le kit",
      value: theory.needs.length ? theory.needs.map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant",
      inline: true,
    },
    {
      name: "Ce qui peut coincer",
      value: theory.dependencies.length ? theory.dependencies.map((line) => `• ${line}`).join("\n") : "Non disponible pour l’instant",
      inline: true,
    },
    {
      name: "Pourquoi cette analyse",
      value: explanation.reasons,
      inline: false,
    },
    {
      name: "À garder en tête",
      value: `${explanation.cautions}

**Fiabilité du conseil** · ${explanation.confidence}`,
      inline: false,
    },
    {
      name: "Zones encore floues",
      value: unknowns.length ? unknowns.map((line) => `• ${line}`).join("\n") : "Aucun manque majeur repéré sur cette fiche.",
      inline: false,
    },
    {
      name: "🎮 Conseils de jeu",
      value: [
        `• **Ce qu’il faut faire** · ${firstAdvice([theory.planLines?.[0], theory.planRole?.[0]], "jouer autour de son point fort principal")}`,
        `• **Ce qu’il faut lui donner** · ${firstAdvice([theory.needs?.[0], theory.synergies?.[0]], "un allié ou un cadre qui l’aide à bien jouer")}`,
        `• **Ce qu’il faut éviter** · ${firstAdvice([theory.dependencies?.[0], theory.planRisks?.[0]], "les combats qui cassent trop vite son tour")}`,
      ].join("\n"),
      inline: false,
    },
  ]);

  return [main, detail];
}

export function characterProgressionEmbeds(char) {
  char = withProgressionShape(char);
  const progressionSummary = summarizeProgressionBlock(char);
  const completeness = [...describeCharacterCompleteness(char), ...describeProgressionAvailability(char)];

  const progress = makeEmbed(char, "Progression", "Bloc préparé pour les futures données de progression, sans inventer de contenu absent des sources.", "overview");
  applySectionHeader(progress, {
    name: char.name,
    subtitle: "Progression · état actuel",
    iconUrl: char.images?.portrait,
    footer: ["Progression · vue unique", "Données futures"],
  });
  addFields(progress, [
    {
      name: "Suivi progression",
      value: progressionSummary.join("\n"),
      inline: false,
    },
    {
      name: "Disponibilité des données",
      value: completeness.map((line) => `• ${line}`).join("\n"),
      inline: false,
    },
  ]);

  if (char.images?.portrait) progress.thumbnail = { url: char.images.portrait };
  return [progress];
}

export function characterStatsEmbeds(char) {
  const stats = Object.entries(char.stats || {});
  const embed = makeEmbed(char, "Stats", stats.length ? "Répartition principale du personnage." : "Stats indisponibles sur les sources configurées.", "stats");
  applySectionHeader(embed, {
    name: char.name,
    subtitle: "Fiche statistique",
    iconUrl: char.images?.portrait,
    footer: ["Stats · vue unique", sourceFooter(char)],
  });

  if (stats.length) {
    const groups = chunk(stats, 5);
    addFields(
      embed,
      groups.map((group, idx) => ({
        name: idx === 0 ? "Base" : `Stats ${idx + 1}`,
        value: group.map(([k, v]) => `**${statLabel(k)}** · ${v}`).join("\n"),
        inline: true,
      }))
    );
  }

  return [embed];
}

function fallbackWeapon(char, mode) {
  const list = char?.weapons || [];
  if (!list.length) return null;
  const key = mode === "potentiels" ? "potentials" : "skills";
  return list.find((w) => (w[key] || []).length) || list[0];
}

export function characterSkillsEmbeds(char, weaponName, pageIndex = 0) {
  const weapon = (char.weapons || []).find((w) => w.name === weaponName) || fallbackWeapon(char, "skills");
  if (!weapon) return [makeEmbed(char, "Skills", "Compétences indisponibles.", "skills")];
  const skills = weapon.skills || [];
  if (!skills.length) {
    const empty = makeEmbed(char, "Skills", `Aucune compétence trouvée pour **${weapon.name}**.`, "skills");
    applySectionHeader(empty, {
      name: char.name,
      subtitle: `${weapon.name} · Compétences`,
      iconUrl: char.images?.portrait,
      footer: `${metaLine(char, weapon)}${sourceFooter(char) ? ` · ${sourceFooter(char)}` : ""}`,
    });
    return [empty];
  }

  const heroIcon = safeUrl((weapon.skills || []).find((s) => s.icon)?.icon) || char.images?.portrait;
  const embed = makeEmbed(
    char,
    `Skills`,
    metaLine(char, weapon),
    "skills"
  );
  applySectionHeader(embed, {
    name: char.name,
    subtitle: `${weapon.name}`,
    iconUrl: heroIcon,
    footer: ["Skills · vue unique", weapon.attribute ? `${ATTRIBUTE_ICONS[weapon.attribute] || "•"} ${weapon.attribute}` : weapon.name],
  });
  addFields(embed, skills.slice(0,25).map(skillField));
  if (heroIcon) embed.thumbnail = { url: heroIcon };
  return [embed];
}

export function characterPotentialsEmbeds(char, weaponName, pageIndex = 0) {
  const weapon = (char.weapons || []).find((w) => w.name === weaponName) || fallbackWeapon(char, "potentiels");
  if (!weapon) return [makeEmbed(char, "Potentiels", "Potentiels indisponibles.", "potentiels")];
  const potentials = weapon.potentials || [];
  if (!potentials.length) {
    const empty = makeEmbed(char, "Potentiels", `Aucun potentiel trouvé pour **${weapon.name}**.`, "potentiels");
    applySectionHeader(empty, {
      name: char.name,
      subtitle: `${weapon.name} · Progression`,
      iconUrl: char.images?.portrait,
      footer: ["Potentiels · vue unique", weapon.attribute ? `${ATTRIBUTE_ICONS[weapon.attribute] || "•"} ${weapon.attribute}` : "Potentiels"],
    });
    return [empty];
  }

  const pages = chunk(potentials, 5);
  const idx = Math.max(0, Math.min(pages.length - 1, Number(pageIndex) || 0));
  const page = pages[idx] || [];
  const embed = makeEmbed(
    char,
    `Potentiels${pages.length > 1 ? ` · ${idx + 1}/${pages.length}` : ""}`,
    metaLine(char, weapon),
    "potentiels"
  );
  applySectionHeader(embed, {
    name: char.name,
    subtitle: `${weapon.name}`,
    iconUrl: char.images?.portrait,
    footer: `${weapon.attribute ? `${ATTRIBUTE_ICONS[weapon.attribute] || "•"} ${weapon.attribute}` : weapon.name}${pages.length > 1 ? ` · Page ${idx + 1}/${pages.length}` : ""}`,
  });
  addFields(
    embed,
    page.map((tier) => ({
      name: `Tier ${tier.tier}`,
      value: tier.text || (tier.items || []).join("\n") || "—",
      inline: false,
    }))
  );
  return [embed];
}

export function characterCostumesEmbeds(char, costumeIndex = 0) {
  const costumes = resolveCharacterCostumes(char);
  if (!costumes.length) {
    return [makeEmbed(char, "Costumes", "Aucun costume trouvé.", "costumes")];
  }

  const index = Math.max(0, Math.min(costumes.length - 1, Number(costumeIndex) || 0));
  const costume = costumes[index] || {};
  const costumeName = truncate(costume.name || `Costume ${index + 1}`, 256);
  const costumeImage = safeUrl(costume.image);
  const embed = makeEmbed(
    char,
    "Costume",
    costume.description || `**${costumeName}**
Costume ${index + 1} / ${costumes.length}`,
    "costumes"
  );
  applySectionHeader(embed, {
    name: char.name || "Personnage",
    subtitle: costumeName,
    iconUrl: costumeImage || char.images?.portrait,
    footer: `Costume ${index + 1}/${costumes.length}${sourceFooter(char) ? ` · ${sourceFooter(char)}` : ""}`,
  });
  const fields = [];
  if (costume.effect_title) fields.push({ name: "Effet", value: costume.effect_title, inline: false });
  if (costume.effect) fields.push({ name: "Détail", value: costume.effect, inline: false });
  if (costume.passive) fields.push({ name: "Passif", value: costume.passive, inline: false });
  if (!fields.length && !embed.description) embed.description = "Détails indisponibles.";
  else addFields(embed, fields);
  if (costumeImage) embed.thumbnail = { url: costumeImage };
  return [embed];
}


export function bossEmbeds(boss) {
  const embeds = [];
  const overview = {
    title: truncate(boss.name || "Boss", 256),
    description: truncate(compactText(boss.description || "Aucune description disponible."), 4096),
    color: SECTION_COLORS.boss,
    author: { name: "Boss Guide", icon_url: boss.images?.portrait || undefined },
    footer: { text: footerText("Boss · vue 1/4", "Source · 7dsorigin / Hideout") },
  };
  if (boss.images?.portrait) overview.thumbnail = { url: boss.images.portrait };
  addFields(overview, [
    ...(boss.unlock_requirements ? [{ name: "Déblocage", value: boss.unlock_requirements, inline: false }] : []),
  ]);
  embeds.push(overview);

  if (boss.stats && Object.keys(boss.stats).length) {
    const statsEmbed = {
      title: "Stats",
      color: 0xe67e22,
      author: { name: `${boss.name} · Fiche boss`, icon_url: boss.images?.portrait || undefined },
      footer: { text: footerText("Boss · vue 2/4", "Vue combat") },
    };
    addFields(
      statsEmbed,
      chunk(Object.entries(boss.stats), 5).map((group, idx) => ({
        name: idx === 0 ? "Base" : `Stats ${idx + 1}`,
        value: group.map(([k, v]) => `**${k}** · ${v}`).join("\n"),
        inline: true,
      }))
    );
    embeds.push(statsEmbed);
  }

  if (boss.rewards) {
    embeds.push({
      title: "Rewards",
      description: truncate(compactText(boss.rewards), 4096),
      color: 0xd35400,
      author: { name: `${boss.name} · Loot`, icon_url: boss.images?.portrait || undefined },
      footer: { text: footerText("Boss · vue 3/4", "Récompenses") },
    });
  }
  if (boss.guide) {
    embeds.push({
      title: "Guide",
      description: truncate(compactText(boss.guide), 4096),
      color: 0xc0392b,
      author: { name: `${boss.name} · Stratégie`, icon_url: boss.images?.portrait || undefined },
      footer: { text: footerText("Boss · vue 4/4", "Guide") },
    });
  }
  return capEmbeds(embeds);
}
