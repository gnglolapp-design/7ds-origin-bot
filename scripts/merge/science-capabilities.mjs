import path from 'node:path';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';

function nowIso() {
  return new Date().toISOString();
}

function lc(v) { return String(v || '').toLowerCase(); }

function hasAny(text, terms = []) {
  const t = lc(text);
  return terms.some((x) => t.includes(x));
}

function mergeCaps(base = {}, add = {}) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(add || {})) {
    if (v === true) out[k] = true;
    else if (v === false && out[k] == null) out[k] = false;
  }
  return out;
}

function inferSkillCapabilities(skill = {}) {
  const desc = lc(skill.description || '');
  const name = lc(skill.name || '');
  const blob = `${name} ${desc}`;

  const caps = {};

  // Interrupt / CC
  if (hasAny(blob, ['interrupt', 'interruption', 'stun', 'étour', 'knock', 'repousse', 'projette', 'freeze', 'gel'])) {
    caps.interrupt = true;
  }
  if (hasAny(blob, ['knockdown', 'renverse', 'mise au sol'])) caps.knockdown = true;
  if (hasAny(blob, ['stun', 'étour'])) caps.stun = true;
  if (hasAny(blob, ['silence', 'réduction de skill', 'empêche'])) caps.silence = true;

  // Dispel / cleanse
  if (hasAny(blob, ['cleanse', 'purifie', 'retire les effets négatifs', 'retire les malus'])) caps.cleanse = true;
  if (hasAny(blob, ['dispel', 'retire les buffs', 'supprime les buffs', 'annule les bonus'])) caps.dispel = true;

  // Defensive tools
  if (hasAny(blob, ['invincible', 'invuln', 'invulnér', 'immune', 'immunité'])) caps.invulnerability = true;
  if (hasAny(blob, ['barrier', 'bouclier'])) caps.barrier = true;
  if (hasAny(blob, ['taunt', 'provoque'])) caps.taunt = true;
  if (hasAny(blob, ['heal', 'soin', 'régénère'])) caps.heal = true;
  if (hasAny(blob, ['damage reduction', 'réduction des dégâts', 'mitigation'])) caps.damage_reduction = true;

  // Mobility / evade
  if (skill.successful_evade_bonus || hasAny(blob, ['evade', 'esquive', 'dash', 'teleport', 'téléport'])) caps.mobility = true;
  if (hasAny(blob, ['iframe', 'i-frame'])) caps.iframe = true;

  // Burst / gauge interactions (generic readiness)
  if (hasAny(blob, ['burst gauge', 'jauge de burst', 'charge la jauge'])) caps.burst_gauge_gain = true;
  if (hasAny(blob, ['burst', 'ultimate'])) caps.burst_related = true;

  return caps;
}

export function buildScienceCapabilities({ compiledDir, manualDir }) {
  const skillsPack = readJSON(path.join(compiledDir, 'science-skills.json'), { items: [] });
  const kitsPack = readJSON(path.join(compiledDir, 'science-weapon-kits.json'), { items: [] });
  const overrides = readJSON(path.join(manualDir, 'capabilities-overrides.json'), { skills: {}, weapon_kits: {}, characters: {} });

  const skillCaps = {};
  for (const skill of skillsPack.items || []) {
    const inferred = inferSkillCapabilities(skill);
    const manual = overrides.skills?.[skill.skill_id] || null;
    skillCaps[skill.skill_id] = mergeCaps(inferred, manual);
  }

  const kitCaps = {};
  for (const kit of kitsPack.items || []) {
    const caps = {};
    // Aggregate from skills belonging to kit
    for (const sk of skillsPack.items || []) {
      if (sk.weapon_kit_id !== kit.weapon_kit_id) continue;
      Object.assign(caps, mergeCaps(caps, skillCaps[sk.skill_id]));
    }
    const manual = overrides.weapon_kits?.[kit.weapon_kit_id] || null;
    kitCaps[kit.weapon_kit_id] = mergeCaps(caps, manual);
  }

  const charCaps = {};
  for (const kit of kitsPack.items || []) {
    const cid = kit.character_id;
    charCaps[cid] = mergeCaps(charCaps[cid], kitCaps[kit.weapon_kit_id]);
  }
  for (const [cid, manual] of Object.entries(overrides.characters || {})) {
    charCaps[cid] = mergeCaps(charCaps[cid], manual);
  }

  const items = {
    skills: skillCaps,
    weapon_kits: kitCaps,
    characters: charCaps,
  };

  return {
    version: 1,
    generated_at: nowIso(),
    items,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const compiledDir = path.join(root, 'data', 'compiled');
  const manualDir = path.join(root, 'data', 'manual');
  const out = buildScienceCapabilities({ compiledDir, manualDir });
  writeJSON(path.join(compiledDir, 'science-capabilities.json'), out);
  console.log('OK: science-capabilities');
}
