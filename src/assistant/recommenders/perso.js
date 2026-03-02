import {
  getCharacterDecisionOverlay,
  getCharacterSignalOverlay,
  getWeaponDecisionOverlay,
  getWeaponSignalOverlay,
  signalConfidenceRank,
  slicePublishedForCharacter,
  slicePublishedForWeapon,
  snapshotSolidnessLabel,
  summarizeSnapshotRefs,
} from '../../lib/published-signals.js';
import { analyzeWeaponIdentity } from '../../lib/gameplay.js';
import { getWeaponCompatibility } from '../../lib/theorycraft.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function includesAny(blob, needles = []) {
  const hay = normalize(blob);
  return needles.some((needle) => hay.includes(normalize(needle)));
}

function protoRank(list = [], protoId) {
  const snap = (list || []).find((entry) => String(entry?.protoId || '') === String(protoId || ''));
  return snap ? signalConfidenceRank(snapshotSolidnessLabel(snap)) : 0;
}

function exactContextCount(list = []) {
  return (list || []).filter((entry) => String(entry?.__selection?.label || '') === 'contexte exact').length;
}

function inferStatFocus(profile, theory) {
  const blob = [
    ...(profile?.tags || []),
    ...(profile?.orientations || []),
    ...(theory?.functions || []),
    ...(theory?.effects || []),
    ...(theory?.dominant || []),
  ].join(' \n ');

  if (includesAny(blob, ['heal', 'support', 'barrier', 'tank', 'defense', 'survie', 'soin', 'bouclier'])) {
    return "vise d'abord une ligne de tenue simple (HP / DEF) avant d'ajouter du luxe.";
  }
  if (includesAny(blob, ['crit', 'burst', 'back attack', 'gros dégâts', 'mono-cible'])) {
    return "vise d'abord une ligne offensive simple (ATK / Crit).";
  }
  if (includesAny(blob, ['burn', 'bleed', 'shock', 'dot', 'debuff', 'control', 'freeze', 'stun'])) {
    return "vise d'abord de l'ATK puis assez de tenue pour garder le bon rythme.";
  }
  return "commence par la ligne de stats qui renforce son point fort principal, sans sacrifier toute sa tenue.";
}

function buildWeaponChoices(char, published = []) {
  const weapons = Array.isArray(char?.weapons) ? char.weapons : [];
  return weapons.map((weapon) => {
    const identity = analyzeWeaponIdentity(weapon);
    const compat = getWeaponCompatibility(identity, char, weapon);
    const scoped = slicePublishedForWeapon(published, char, weapon);
    const protoBoost =
      protoRank(scoped, 'WEAPON_SKILL_DELTA') * 4 +
      Math.max(protoRank(scoped, 'ORDER_OF_USE'), protoRank(scoped, 'DAMAGE_WINDOW')) * 2 +
      protoRank(scoped, 'BOSS_PRESSURE_DELTA') * 2 +
      protoRank(scoped, 'BUFF_REAL_UPTIME') +
      protoRank(scoped, 'STAT_PRIORITY_DELTA');
    const advancedBurstBoost =
      protoRank(scoped, 'BURST_TRIGGER_WEAPON_DELTA') * 2 +
      protoRank(scoped, 'BURST_WINDOW_HOLD_VALUE') * 2 +
      protoRank(scoped, 'TAG_TO_BURST_CHAIN') * 2 +
      protoRank(scoped, 'TAG_WINDOW_GAIN') +
      protoRank(scoped, 'COMBINED_SKILL_DELTA');
    const advancedStabilityBoost =
      protoRank(scoped, 'SUCCESSFUL_EVADE_BONUS_DELTA') +
      protoRank(scoped, 'ELEMENTAL_STATUS_UPTIME') +
      protoRank(scoped, 'BOSS_PATTERN_RECOVERY_DELTA');
    const evidence = protoBoost + advancedBurstBoost + advancedStabilityBoost + exactContextCount(scoped) * 3 + Math.min(4, scoped.length);
    const blob = [
      weapon?.name,
      ...(compat?.functions || []),
      ...(compat?.dominant || []),
      ...(compat?.planRole || []),
      ...(compat?.planLines || []),
      compat?.stability,
      compat?.conversion,
    ].join(' \n ');
    const safeBias = includesAny(blob, ['simple', 'marge', 'lisible', 'support', 'barrier', 'control', 'garde de la valeur', 'stable', 'sûr']) ? 2 : 0;
    const burstBias = includesAny(blob, ['gros dégâts', 'burst', 'crit', 'back attack', 'finir', 'fenêtre']) ? 2 : 0;
    const pressureBias = includesAny(blob, ['support', 'barrier', 'survie', 'tenir', 'rythme', 'stabilise']) ? 1 : 0;
    return {
      weapon,
      compat,
      scoped,
      evidence,
      safeScore: evidence + safeBias + protoRank(scoped, 'BOSS_PRESSURE_DELTA') * 2 + protoRank(scoped, 'SUCCESSFUL_EVADE_BONUS_DELTA'),
      burstScore: evidence + burstBias + protoRank(scoped, 'WEAPON_SKILL_DELTA') * 2 + protoRank(scoped, 'DAMAGE_WINDOW') + advancedBurstBoost * 2,
      pressureScore: evidence + pressureBias + protoRank(scoped, 'BOSS_PRESSURE_DELTA') * 3 + protoRank(scoped, 'BUFF_REAL_UPTIME') + protoRank(scoped, 'DEBUFF_REAL_UPTIME') + protoRank(scoped, 'BOSS_PATTERN_RECOVERY_DELTA') * 2,
    };
  });
}

function topBy(list = [], key) {
  return [...list].sort((a, b) => Number(b?.[key] || 0) - Number(a?.[key] || 0))[0] || null;
}

function roleFocusLabel(entry = {}) {
  const refs = entry?.scoped || [];
  const burstWeight =
    protoRank(refs, 'WEAPON_SKILL_DELTA') +
    protoRank(refs, 'DAMAGE_WINDOW') +
    protoRank(refs, 'BURST_TRIGGER_WEAPON_DELTA') +
    protoRank(refs, 'BURST_WINDOW_HOLD_VALUE') +
    protoRank(refs, 'TAG_TO_BURST_CHAIN') +
    protoRank(refs, 'TAG_WINDOW_GAIN') +
    protoRank(refs, 'COMBINED_SKILL_DELTA');
  const pressureWeight =
    protoRank(refs, 'BOSS_PRESSURE_DELTA') +
    protoRank(refs, 'BOSS_PATTERN_RECOVERY_DELTA') +
    protoRank(refs, 'SUCCESSFUL_EVADE_BONUS_DELTA');
  const statusWeight =
    protoRank(refs, 'ELEMENTAL_STATUS_UPTIME') +
    protoRank(refs, 'BUFF_REAL_UPTIME') +
    protoRank(refs, 'DEBUFF_REAL_UPTIME');
  const blob = [
    ...(entry?.compat?.dominant || []),
    ...(entry?.compat?.functions || []),
    ...(entry?.compat?.planRole || []),
    ...(entry?.compat?.planLines || []),
    entry?.compat?.stability,
    entry?.compat?.conversion,
  ].filter(Boolean).join(' \n ');

  if (burstWeight >= pressureWeight && burstWeight >= statusWeight) {
    if (includesAny(blob, ['hold', 'fenêtre', 'burst', 'back attack', 'crit'])) return 'vraie fenêtre Burst';
    return 'tour dégâts / ouverture';
  }
  if (pressureWeight >= statusWeight) {
    if (includesAny(blob, ['stable', 'survie', 'tenir', 'barrier', 'support'])) return 'combat sale / tenue';
    return 'pression boss / reprise';
  }
  if (statusWeight > 0) return 'stacks / uptime / relais';
  if (includesAny(blob, ['support', 'barrier', 'heal', 'survie'])) return 'tenue simple';
  if (includesAny(blob, ['crit', 'back attack', 'burst'])) return 'gros tour';
  return 'lecture encore générale';
}

function uniqueWeaponEntries(entries = []) {
  const out = [];
  const seen = new Set();
  for (const entry of entries || []) {
    const name = String(entry?.weapon?.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(entry);
  }
  return out;
}

export function buildPersoWeaponRouting(char, published = []) {
  const weaponChoices = buildWeaponChoices(char, published);
  const safe = topBy(weaponChoices, 'safeScore');
  const burst = topBy(weaponChoices, 'burstScore');
  const pressure = topBy(weaponChoices, 'pressureScore');
  const leads = [];
  const seen = new Set();

  const pushLead = (entry, roleLabel) => {
    const name = String(entry?.weapon?.name || '').trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    leads.push({ ...entry, roleLabel });
  };

  pushLead(safe, 'Kit le plus sûr');
  pushLead(burst, 'Kit dégâts / Burst');
  pushLead(pressure, 'Kit combat sale');

  return {
    choices: weaponChoices,
    safe,
    burst,
    pressure,
    leads: leads.slice(0, 3),
  };
}

export function buildPersoWeaponContrastLines(char, published = []) {
  const routing = buildPersoWeaponRouting(char, published);
  const leads = uniqueWeaponEntries(routing?.leads || []);
  if (!leads.length) return [];
  const names = leads.map((entry) => String(entry?.weapon?.name || '').trim()).filter(Boolean);
  if (names.length === 1) {
    return [`• **${names[0]}** garde la main sur presque tous les scénarios publiés : c’est le kit le plus polyvalent pour l’instant.`];
  }

  const lines = [];
  const [first, second, third] = leads;
  const firstName = String(first?.weapon?.name || '').trim();
  const secondName = String(second?.weapon?.name || '').trim();
  if (firstName && secondName && firstName !== secondName) {
    lines.push(`• **${firstName}** ressort surtout pour **${roleFocusLabel(first)}**, alors que **${secondName}** prend plus de valeur sur **${roleFocusLabel(second)}**.`);
  }

  const pressure = routing?.pressure;
  const safe = routing?.safe;
  const burst = routing?.burst;
  if (pressure?.weapon?.name && burst?.weapon?.name && pressure.weapon.name !== burst.weapon.name) {
    lines.push(`• Sous pression ou après pattern, **${pressure.weapon.name}** garde mieux sa valeur réelle, alors que **${burst.weapon.name}** vaut surtout si la vraie fenêtre reste propre.`);
  } else if (pressure?.weapon?.name && safe?.weapon?.name && pressure.weapon.name !== safe.weapon.name) {
    lines.push(`• Quand le combat se brouille, **${pressure.weapon.name}** repart mieux après le pattern, alors que **${safe.weapon.name}** sécurise surtout le plan de base.`);
  }

  if (third?.weapon?.name) {
    lines.push(`• **${third.weapon.name}** garde surtout de la valeur dans les combats plus sales ou irréguliers (${roleFocusLabel(third)}).`);
  } else if (secondName && protoRank(second?.scoped || [], 'BOSS_PRESSURE_DELTA') >= 2) {
    lines.push(`• Quand le combat se brouille, **${secondName}** garde mieux sa valeur réelle que le kit le plus gourmand.`);
  }

  // Micro-fenêtres (esquive / recovery) vs phases verrou
  const microFirst = protoRank(first?.scoped || [], 'SUCCESSFUL_EVADE_BONUS_DELTA') + protoRank(first?.scoped || [], 'BOSS_PATTERN_RECOVERY_DELTA');
  const microSecond = protoRank(second?.scoped || [], 'SUCCESSFUL_EVADE_BONUS_DELTA') + protoRank(second?.scoped || [], 'BOSS_PATTERN_RECOVERY_DELTA');
  if (firstName && secondName && microFirst >= microSecond + 2) {
    lines.push(`• Sur une micro-fenêtre (esquive/recovery), **${firstName}** punit plus souvent que **${secondName}**.`);
  } else if (firstName && secondName && microSecond >= microFirst + 2) {
    lines.push(`• Sur une micro-fenêtre (esquive/recovery), **${secondName}** punit plus souvent que **${firstName}**.`);
  }

  const gateFirst = protoRank(first?.scoped || [], 'PHASE_SPECIFIC_WINDOW_DELTA') + protoRank(first?.scoped || [], 'BURST_WINDOW_HOLD_VALUE');
  const gateSecond = protoRank(second?.scoped || [], 'PHASE_SPECIFIC_WINDOW_DELTA') + protoRank(second?.scoped || [], 'BURST_WINDOW_HOLD_VALUE');
  if (firstName && secondName && gateFirst >= gateSecond + 2) {
    lines.push(`• Sur une phase verrou (hold + fenêtre), **${firstName}** est plus facile à rentabiliser proprement.`);
  } else if (firstName && secondName && gateSecond >= gateFirst + 2) {
    lines.push(`• Sur une phase verrou (hold + fenêtre), **${secondName}** est plus facile à rentabiliser proprement.`);
  }

  if (burst?.weapon?.name && safe?.weapon?.name && burst.weapon.name !== safe.weapon.name) {
    lines.push(`• En pratique : **${safe.weapon.name}** sécurise mieux le plan de base, tandis que **${burst.weapon.name}** mérite surtout la vraie fenêtre dégâts.`);
  }
  return lines.slice(0, 4);
}

export function buildPersoRecommendationLines(char, profile, theory, published = []) {
  const lines = [];
  const weaponChoices = buildWeaponChoices(char, published);
  const mainWeapon = topBy(weaponChoices, 'safeScore');
  const burstWeapon = topBy(weaponChoices, 'burstScore');
  const pressureWeapon = topBy(weaponChoices, 'pressureScore');

  if (mainWeapon?.weapon?.name) {
    const reason = protoRank(mainWeapon.scoped, 'BURST_TRIGGER_WEAPON_DELTA') >= 2 || protoRank(mainWeapon.scoped, 'BURST_WINDOW_HOLD_VALUE') >= 2 || protoRank(mainWeapon.scoped, 'TAG_TO_BURST_CHAIN') >= 2
      ? 'mieux confirmée pour ouvrir, relayer ou hold la vraie fenêtre Burst.'
      : protoRank(mainWeapon.scoped, 'WEAPON_SKILL_DELTA') >= 2
        ? 'mieux confirmée.'
        : 'la plus simple à rentabiliser.';
    lines.push(`**Priorité 1** · Arme : **${mainWeapon.weapon.name}** — ${reason}`);
  } else {
    lines.push(`**Priorité 1** · ${inferStatFocus(profile, theory)}`);
  }

  lines.push(`**Priorité 2** · Stats : ${inferStatFocus(profile, theory).replace(/^vise d'abord\s*/i, '').replace(/^commence par\s*/i, '')}`);

  const costumeRank = protoRank(published, 'COSTUME_IMPACT');
  const potentialRank = protoRank(published, 'POTENTIAL_IMPACT');
  let thirdLine = "**Priorité 3** · Garde tes ressources pour plus tard : costume et potentiel restent encore flous.";
  if ((char?.costumes || []).length || (char?.weapons || []).some((w) => (w?.potentials || []).length)) {
    if (potentialRank >= costumeRank && potentialRank >= 2) thirdLine = '**Priorité 3** · Potentiel : meilleure piste après l\'arme et les stats.';
    else if (costumeRank >= 2) thirdLine = '**Priorité 3** · Costume : bonne piste après l\'arme et les stats.';
  }
  if (burstWeapon?.weapon?.name && burstWeapon.weapon.name !== mainWeapon?.weapon?.name) {
    const burstNote = protoRank(burstWeapon.scoped, 'COMBINED_SKILL_DELTA') >= 2
      ? ' à garder pour une Combined / vraie fenêtre.'
      : protoRank(burstWeapon.scoped, 'TAG_TO_BURST_CHAIN') >= 2
        ? ' à garder pour relayer vers le vrai tour Burst.'
        : protoRank(burstWeapon.scoped, 'TAG_WINDOW_GAIN') >= 2
          ? ' à garder pour une fenêtre préparée par tag.'
          : protoRank(burstWeapon.scoped, 'BURST_WINDOW_HOLD_VALUE') >= 2
            ? ' à garder pour le bon hold Burst.'
            : ''; 
    thirdLine = `**Priorité 3** · Option dégâts : **${burstWeapon.weapon.name}**${burstNote}`;
  } else if (pressureWeapon?.weapon?.name && pressureWeapon.weapon.name !== mainWeapon?.weapon?.name) {
    thirdLine = `**Priorité 3** · Option sûre : **${pressureWeapon.weapon.name}**.`;
  } else if (protoRank(published, 'BOSS_PRESSURE_DELTA') >= 2) {
    thirdLine = '**Priorité 3** · Prépare un plan simple pour les combats brouillons.';
  } else if (includesAny([theory?.stability, theory?.conversion, ...(theory?.dependencies || [])].join(' \n '), ['timing', 'fenêtre', 'préparer'])) {
    thirdLine = '**Priorité 3** · En combat sale, ne mise pas tout sur son premier gros tour.';
  }
  lines.push(thirdLine);

  return lines.slice(0, 3);
}

export function buildPersoEvidence(char, profile, theory, published = []) {
  const refs = slicePublishedForCharacter(published, char);
  return {
    refs,
    summary: summarizeSnapshotRefs(refs),
    overlay: getCharacterSignalOverlay(profile, theory, refs),
    decision: getCharacterDecisionOverlay(char, profile, theory, refs),
  };
}

export function buildPersoWeaponEvidence(char, weapon, compatibilityTheory, published = []) {
  const refs = slicePublishedForWeapon(published, char, weapon);
  return {
    refs,
    summary: summarizeSnapshotRefs(refs),
    overlay: getWeaponSignalOverlay(compatibilityTheory, refs),
    decision: getWeaponDecisionOverlay(char, weapon, compatibilityTheory, refs),
  };
}
