import { autocomplete } from "../discord/responses.js";
import { getTierlist, getBossIndex, kvGetJSON } from "../lib/kv.js";
import { KV_KEYS } from "../constants.js";
import {
  buildChoiceList,
  loadAllCharacters,
  resolveCharacter,
  uniqueAttributes,
  uniqueRarities,
  uniqueRoles,
  uniqueWeapons,
  uniqueGameplayTags,
} from "../lib/catalog.js";

function flattenOptions(options = [], state = {}) {
  for (const option of options) {
    if (option.type === 1 || option.type === 2) {
      flattenOptions(option.options || [], state);
      continue;
    }
    state[option.name] = option.value;
    if (option.focused) state.__focused = option;
  }
  return state;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toId(label) {
  return normalizeText(label)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "x";
}

function characterChoices(characters, query) {
  return buildChoiceList(characters, query, (char) => ({
    name: char.name,
    value: char.slug,
  }));
}

function valueChoices(values, query) {
  return buildChoiceList(values, query, (value) => ({
    name: String(value),
    value: String(value),
  }));
}

function bossChoices(bosses, query) {
  return buildChoiceList(bosses, query, (boss) => ({
    name: boss.name || boss.slug,
    value: boss.slug || String(boss.name || ""),
  }));
}


async function scienceIndexChoices(kv, key, query, mapper) {
  const items = await kvGetJSON(kv, key, []);
  const list = Array.isArray(items) ? items : [];
  return buildChoiceList(list, query, mapper);
}

function labelScenario(item) {
  return item?.label || item?.scenario_id || 'Scénario';
}

function labelPhase(item) {
  return item?.name || item?.phase_id || 'Phase';
}

function labelEquippable(item) {
  const name = item?.name || item?.weapon_id || 'Arme équipable';
  const type = item?.weapon_type ? ` · ${item.weapon_type}` : '';
  return `${name}${type}`;
}


function labelBurstEffect(item) {
  const element = item?.element_id ? ` · ${item.element_id}` : '';
  const family = item?.burst_family ? ` · ${item.burst_family}` : '';
  return `${item?.burst_effect_id || 'Burst'}${element}${family}`;
}

function labelCombinedAttack(item) {
  const behavior = item?.burst_element_behavior ? ` · ${item.burst_element_behavior}` : '';
  return `${item?.combined_attack_id || 'Combined Attack'}${behavior}`;
}

function labelEvadeRule(item) {
  const trigger = item?.trigger_type ? ` · ${item.trigger_type}` : '';
  return `${item?.evade_rule_id || 'Evade Rule'}${trigger}`;
}

function tierChoices(query) {
  return valueChoices(["S", "A", "B", "C"], query);
}

function tiereditActionChoices(query) {
  return valueChoices(["ajouter", "retirer", "deplacer", "noter", "vider", "afficher"], query);
}

function tierlistViewChoices(payload, query) {
  const views = Object.entries(payload?.views || {}).map(([key, value]) => ({
    key,
    label: value?.label || key,
  }));
  return buildChoiceList(views, query, (view) => ({
    name: view.label,
    value: view.key,
  }));
}

function weaponChoicesForCharacter(characters, charValue, query) {
  const selected = resolveCharacter(characters, charValue);
  if (!selected?.weapons?.length) {
    return valueChoices(uniqueWeapons(characters), query);
  }
  const choices = selected.weapons
    .map((weapon) => ({
      name: weapon?.name || weapon?.type || "Arme",
      value: weapon?.name || weapon?.type || "Arme",
    }))
    .filter((entry) => entry.name);
  const cleanQuery = choices.some((entry) => normalizeText(entry.value) === normalizeText(query)) ? "" : query;
  return buildChoiceList(choices, cleanQuery, (entry) => entry);
}

function findWeaponFromState(selected, rawWeapon) {
  const wanted = String(rawWeapon || "").trim();
  if (!selected || !wanted) return null;
  const wantedNorm = normalizeText(wanted);
  return (selected.weapons || []).find((weapon) => {
    const name = String(weapon?.name || weapon?.type || "");
    return wanted === name
      || wantedNorm === normalizeText(name)
      || wantedNorm === toId(name)
      || wantedNorm.endsWith(`:${toId(name)}`)
      || wantedNorm.endsWith(`:${normalizeText(name)}`);
  }) || null;
}

function skillChoicesForWeapon(selected, rawWeapon, query) {
  const weapon = findWeaponFromState(selected, rawWeapon);
  if (!weapon) return [];
  const seen = new Set();
  const skills = [];
  for (const skill of weapon.skills || []) {
    const label = String(skill?.name || skill?.label || "").trim();
    if (!label) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    skills.push({ name: label, value: label });
  }
  const cleanQuery = skills.some((entry) => normalizeText(entry.value) === normalizeText(query)) ? "" : query;
  return buildChoiceList(skills, cleanQuery, (entry) => entry);
}

export async function handleAutocomplete(env, interaction) {
  const commandName = interaction?.data?.name;
  const state = flattenOptions(interaction?.data?.options || [], {});
  const focused = state.__focused;
  if (!focused) return autocomplete([]);

  const query = String(focused.value || "");
  const characters = await loadAllCharacters(env.GAME_DATA);

  if (commandName === "liste") {
    if (focused.name === "attribut") return autocomplete(valueChoices(uniqueAttributes(characters), query));
    if (focused.name === "role") return autocomplete(valueChoices(uniqueRoles(characters), query));
    if (focused.name === "arme") return autocomplete(valueChoices(uniqueWeapons(characters), query));
    if (focused.name === "rarete") return autocomplete(valueChoices(uniqueRarities(characters), query));
    if (focused.name === "tag") return autocomplete(valueChoices(uniqueGameplayTags(characters), query));
  }

  if (commandName === "compare" || commandName === "compare-persos") {
    if (["perso", "perso1", "perso2"].includes(focused.name)) {
      return autocomplete(characterChoices(characters, query));
    }
  }

  if (commandName === "compare-armes") {
    if (focused.name === "perso") return autocomplete(characterChoices(characters, query));
    if (["arme1", "arme2"].includes(focused.name)) {
      return autocomplete(weaponChoicesForCharacter(characters, state.perso, query));
    }
  }

  if (commandName === "compo") {
    if (["perso1", "perso2", "perso3", "perso4"].includes(focused.name)) {
      return autocomplete(characterChoices(characters, query));
    }
    if (["arme1", "arme2", "arme3", "arme4"].includes(focused.name)) {
      const slot = focused.name.replace("arme", "");
      return autocomplete(weaponChoicesForCharacter(characters, state[`perso${slot}`], query));
    }
    if (focused.name === "boss") {
      const bosses = await getBossIndex(env.GAME_DATA);
      return autocomplete(bossChoices((bosses || []).filter((b) => String(b?.slug || b?.name || "").toLowerCase() !== "information"), query));
    }
  }

  if (["test", "testbasic", "testtempo", "testbuild", "testchain", "testburst", "testboss", "testadvanced", "testadmin"].includes(commandName)) {
    const protocolChoices = [
      "SCALING_ATK",
      "SCALING_DEF",
      "CRIT_RATE_REAL",
      "CRIT_DMG_REAL",
      "BUFF_STACKING",
      "STATUS_PROC_RATE",
      "MULTI_HIT_SNAPSHOT",
      "COOLDOWN_REAL",
      "BUFF_UPTIME",
      "INTERACTION_AB",
      "WEAPON_SKILL_DELTA",
      "ORDER_OF_USE",
      "DAMAGE_WINDOW",
      "TAG_SWAP_IMPACT",
      "TAG_TO_BURST_CHAIN",
      "TAG_WINDOW_GAIN",
      "COSTUME_IMPACT",
      "POTENTIAL_IMPACT",
      "BUFF_REAL_UPTIME",
      "DEBUFF_REAL_UPTIME",
      "STAT_PRIORITY_DELTA",
      "BOSS_PRESSURE_DELTA",
      "BURST_STATE_DELTA",
      "ELEMENT_MATCHUP_DELTA",
      "RES_SHRED_DELTA",
      "PHASE_SPECIFIC_WINDOW_DELTA",
      "BOSS_INTERRUPT_PENALTY",
      "BURST_TRIGGER_WEAPON_DELTA",
      "BURST_WINDOW_HOLD_VALUE",
      "COMBINED_SKILL_DELTA",
      "SUCCESSFUL_EVADE_BONUS_DELTA",
      "ELEMENTAL_STATUS_UPTIME",
      "BOSS_PATTERN_RECOVERY_DELTA",
    ];

    if (focused.name === "protocole") return autocomplete(valueChoices(protocolChoices, query));
    if (focused.name === "perso") return autocomplete(characterChoices(characters, query));
    if (["arme", "arme_a", "arme_b"].includes(focused.name)) return autocomplete(weaponChoicesForCharacter(characters, state.perso, query));
    if (focused.name === "boss") {
      const bosses = await getBossIndex(env.GAME_DATA);
      return autocomplete(bossChoices((bosses || []).filter((b) => String(b?.slug || b?.name || "").toLowerCase() !== "information"), query));
    }
    if (focused.name === "impact_type") return autocomplete(valueChoices(["degats", "survie", "utilite"], query));
    if (["element_id", "target_element"].includes(focused.name)) {
      return autocomplete(valueChoices(["fire", "cold", "earth", "lightning", "wind", "physical", "holy", "darkness"], query));
    }
    if (focused.name === "scenario_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_SCENARIOS, query, (item) => ({
        name: labelScenario(item),
        value: String(item?.scenario_id || item?.id || ''),
      })));
    }
    if (focused.name === "phase_id") {
      const selectedBoss = String(state.boss || '').trim().toLowerCase();
      const items = await kvGetJSON(env.GAME_DATA, KV_KEYS.SCI_BOSS_PHASE_INDEX, []);
      const list = (Array.isArray(items) ? items : []).filter((item) => !selectedBoss || String(item?.boss_id || '').trim().toLowerCase() === selectedBoss);
      return autocomplete(buildChoiceList(list, query, (item) => ({
        name: labelPhase(item),
        value: String(item?.phase_id || ''),
      })));
    }
    if (focused.name === "equippable_weapon_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_WEAPON_INDEX, query, (item) => ({
        name: labelEquippable(item),
        value: String(item?.weapon_id || ''),
      })));
    }
    if (focused.name === "status_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_STATUSES, query, (item) => ({
        name: String(item?.label || item?.status_id || 'Statut'),
        value: String(item?.status_id || item?.label || ''),
      })));
    }
    if (focused.name === "burst_effect_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_BURST_EFFECTS, query, (item) => ({
        name: labelBurstEffect(item),
        value: String(item?.burst_effect_id || ''),
      })));
    }
    if (focused.name === "combined_attack_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_COMBINED_ATTACKS, query, (item) => ({
        name: labelCombinedAttack(item),
        value: String(item?.combined_attack_id || ''),
      })));
    }
    if (focused.name === "evade_rule_id") {
      return autocomplete(await scienceIndexChoices(env.GAME_DATA, KV_KEYS.SCI_EVADE_RULES, query, (item) => ({
        name: labelEvadeRule(item),
        value: String(item?.evade_rule_id || ''),
      })));
    }
    if (["burst_family", "deluge_state"].includes(focused.name)) {
      const values = focused.name === 'burst_family' ? ["normal", "special"] : ["idle", "charging", "ready", "active", "extended", "converted"];
      return autocomplete(valueChoices(values, query));
    }
    if (focused.name === "successful_evade") {
      return autocomplete(valueChoices(["true", "false"], query));
    }
    if (focused.name === "active_burst_element_id") {
      return autocomplete(valueChoices(["fire", "cold", "earth", "lightning", "wind", "physical", "holy", "darkness"], query));
    }

    if (focused.name === "skill") {
      const selected = resolveCharacter(characters, state.perso);
      return autocomplete(skillChoicesForWeapon(selected, state.arme, query));
    }
  }

  if (commandName === "tierlist" || commandName === "tieredit") {
    const payload = await getTierlist(env.GAME_DATA);
    if (focused.name === "vue") return autocomplete(tierlistViewChoices(payload, query));
    if (focused.name === "tier") return autocomplete(tierChoices(query));
  }

  if (commandName === "tieredit") {
    if (focused.name === "action") return autocomplete(tiereditActionChoices(query));
    if (focused.name === "perso") return autocomplete(characterChoices(characters, query));
  }

  return autocomplete([]);
}
