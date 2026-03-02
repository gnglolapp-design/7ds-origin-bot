import { getPublishedIndex } from "../testlab/publication/store.js";
import {
  contextCompactSummary,
  signalConfidenceRank,
  signalMap,
  slicePublishedForBoss,
  slicePublishedForCharacter,
  slicePublishedForContext,
  slicePublishedForEquippableWeapon,
  slicePublishedForTeam,
  slicePublishedForWeapon,
  snapshotSolidnessLabel,
  summarizeSnapshotRefs,
} from "../testlab/publication/read-model.js";

export {
  contextCompactSummary,
  signalConfidenceRank,
  signalMap,
  slicePublishedForBoss,
  slicePublishedForCharacter,
  slicePublishedForContext,
  slicePublishedForEquippableWeapon,
  slicePublishedForTeam,
  slicePublishedForWeapon,
  snapshotSolidnessLabel,
  summarizeSnapshotRefs,
};

export async function getPublishedSignalsIndex(kv) {
  try {
    return await getPublishedIndex(kv);
  } catch {
    return [];
  }
}

function blobFromParts(parts = []) {
  return parts.flatMap((x) => Array.isArray(x) ? x : [x]).map((x) => String(x || "")).join(" \n ").toLowerCase();
}

function hasAny(blob, needles = []) {
  return needles.some((n) => blob.includes(String(n).toLowerCase()));
}

function uniqRefs(list = []) {
  return Array.from(new Map((list || []).map((x) => [String(x?.snapshotId || x?.protoId || ""), x])).values());
}

function addRef(refs, snap) {
  if (snap) refs.push(snap);
}

function conflictLongLine(conflict) {
  if (!conflict) return "";
  return `${conflict.short} : ${conflict.reason}. ${conflict.leaning} ${conflict.retest} ${conflict.provisional}`;
}

function snapshotConflictShort(snap) {
  const conflict = snap?.__selection?.conflict || snap?.conflict || null;
  if (!conflict) return "";
  return String(conflict.short || conflict.reason || '').trim();
}

export function hasPublishedSignal(published = [], protoId, minRank = 2) {
  const snap = signalMap(published)[String(protoId || "")];
  return Boolean(snap) && signalConfidenceRank(snapshotSolidnessLabel(snap)) >= Number(minRank || 0);
}

export function getCharacterSignalOverlay(profile, theory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([
    profile?.tags, profile?.orientations,
    theory?.functions, theory?.effects, theory?.needs, theory?.dependencies,
    theory?.planRole, theory?.planLines, theory?.dominant,
  ]);

  const support = [];
  const caution = [];
  const refs = [];

  const pushIf = (id, predicate, okText, missText) => {
    if (!predicate) return;
    const snap = by[id];
    if (snap) refs.push(snap);
    if (snap && signalConfidenceRank(snapshotSolidnessLabel(snap)) >= 2) {
      support.push(okText + (snap?.__selection?.label ? ` (${snap.__selection.label})` : ""));
      if (snap?.__selection?.conflict) caution.push(conflictLongLine(snap.__selection.conflict));
    else if (snapshotConflictShort(snap)) caution.push(snapshotConflictShort(snap));
    } else caution.push(missText);
  };

  pushIf("SCALING_ATK", hasAny(blob, ["burst", "crit", "aoe", "damage", "dégâts", "finir", "fenêtre", "gros dégâts"]), "Les résultats publiés confirment mieux quand ce perso fait ses gros dégâts.", "Il manque encore des résultats publiés pour confirmer ses gros dégâts.");
  pushIf("MULTI_HIT_SNAPSHOT", hasAny(blob, ["hit", "multi", "combo", "ticks", "projectile"]), "Les résultats publiés aident à lire si le sort garde sa valeur de départ ou recalcule.", "Il manque encore des résultats publiés sur le comportement exact des hits du sort.");
  pushIf("BUFF_STACKING", hasAny(blob, ["buff", "boost", "stack", "support"]), "Les résultats publiés aident à confirmer comment ses buffs se cumulent.", "Il manque encore des résultats publiés pour confirmer comment ses buffs se cumulent.");
  pushIf("INTERACTION_AB", hasAny(blob, ["debuff", "mark", "tag", "combo", "synergy", "synergie", "state", "status"]), "Les résultats publiés aident à confirmer ses interactions avec d'autres effets.", "Il manque encore des résultats publiés pour confirmer ses interactions avec d'autres effets.");
  pushIf("STATUS_PROC_RATE", hasAny(blob, ["burn", "bleed", "poison", "shock", "freeze", "stun", "paral", "status", "dot"]), "Les résultats publiés aident à confirmer la régularité de ses effets.", "Il manque encore des résultats publiés pour confirmer la régularité de ses effets.");
  pushIf("COOLDOWN_REAL", hasAny(blob, ["cooldown", "cd", "rotation", "timing", "rythme"]), "Les résultats publiés aident à confirmer le vrai rythme de ses sorts.", "Il manque encore des résultats publiés pour confirmer le vrai rythme de ses sorts.");
  pushIf("BUFF_UPTIME", hasAny(blob, ["uptime", "duration", "durée", "maintain", "refresh", "aura", "buff"]), "Les résultats publiés aident à confirmer combien de temps ses effets restent vraiment actifs.", "Il manque encore des résultats publiés pour confirmer la durée réelle de ses effets.");
  pushIf("BURST_STATE_DELTA", hasAny(blob, ["burst", "ultimate", "ultime", "gros dégâts", "fenêtre"]), "Les résultats publiés aident à confirmer ce que l'état Burst change vraiment sur son plan de jeu.", "Il manque encore des résultats publiés pour confirmer sa vraie dépendance au Burst.");
  pushIf("BURST_TRIGGER_WEAPON_DELTA", hasAny(blob, ["burst", "arme", "weapon", "trigger", "ouvrir", "open"]), "Les résultats publiés aident à confirmer si son arme ouvre vraiment la bonne fenêtre Burst.", "Il manque encore des résultats publiés pour confirmer si son arme ouvre vraiment la bonne fenêtre Burst.");
  pushIf("BURST_WINDOW_HOLD_VALUE", hasAny(blob, ["burst", "timing", "fenêtre", "garder", "hold", "préparer"]), "Les résultats publiés aident à confirmer s'il faut garder sa ressource pour le vrai tour Burst.", "Il manque encore des résultats publiés pour confirmer s'il faut vraiment garder sa ressource pour le Burst.");
  pushIf("COMBINED_SKILL_DELTA", hasAny(blob, ["combined", "combo", "pair", "paire", "duo", "tag"]), "Les résultats publiés aident à confirmer si sa séquence Combined vaut vraiment le détour.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur en Combined.");
  pushIf("TAG_TO_BURST_CHAIN", hasAny(blob, ["tag", "swap", "relay", "relais", "burst", "open", "ouvrir"]), "Les résultats publiés aident à confirmer si son relais tag ouvre vraiment une bonne chaîne vers Burst.", "Il manque encore des résultats publiés pour confirmer sa vraie chaîne tag vers Burst.");
  pushIf("TAG_WINDOW_GAIN", hasAny(blob, ["tag", "fenêtre", "window", "prepare", "préparer", "setup"]), "Les résultats publiés aident à confirmer si préparer sa fenêtre via tag rapporte vraiment.", "Il manque encore des résultats publiés pour confirmer la vraie valeur de sa fenêtre préparée par tag.");
  pushIf("SUCCESSFUL_EVADE_BONUS_DELTA", hasAny(blob, ["evade", "esquive", "dodge", "perfect evade", "reactive"]), "Les résultats publiés aident à confirmer la valeur réelle de son bonus après esquive réussie.", "Il manque encore des résultats publiés pour confirmer la vraie valeur de son bonus d'esquive.");
  pushIf("ELEMENTAL_STATUS_UPTIME", hasAny(blob, ["freeze", "cold", "burn", "shock", "curse", "status", "dot"]), "Les résultats publiés aident à confirmer si ses statuts élémentaires tiennent vraiment assez longtemps.", "Il manque encore des résultats publiés pour confirmer la tenue réelle de ses statuts élémentaires.");
  pushIf("ELEMENT_MATCHUP_DELTA", hasAny(blob, ["element", "élément", "holy", "darkness", "fire", "cold", "earth", "lightning", "wind", "physical"]), "Les résultats publiés aident à confirmer quand son élément lui apporte un vrai gain.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur élémentaire.");
  pushIf("RES_SHRED_DELTA", hasAny(blob, ["resistance", "résistance", "shred", "break", "reduce"]), "Les résultats publiés aident à confirmer la valeur réelle d'une baisse de résistance.", "Il manque encore des résultats publiés pour confirmer la valeur réelle des baisses de résistance.");
  pushIf("POTENTIAL_IMPACT", hasAny(blob, ["potential", "potentiel", "trait", "passif"]), "Les résultats publiés aident à confirmer ce que son potentiel change vraiment.", "Il manque encore des résultats publiés pour confirmer l'impact réel de son potentiel.");
  pushIf("COSTUME_IMPACT", hasAny(blob, ["costume", "skin", "tenue"]), "Les résultats publiés aident à confirmer ce que son costume change vraiment.", "Il manque encore des résultats publiés pour confirmer l'impact réel de son costume.");
  pushIf("STAT_PRIORITY_DELTA", hasAny(blob, ["crit", "atk", "attack", "penetration", "perforation", "stat"]), "Les résultats publiés aident à confirmer quelle priorité de stats lui rapporte le plus.", "Il manque encore des résultats publiés pour confirmer sa meilleure priorité de stats.");

  return {
    support: Array.from(new Set(support)).slice(0, 4),
    caution: Array.from(new Set(caution)).slice(0, 4),
    refs: uniqRefs(refs).slice(0, 7),
  };
}

export function getCharacterDecisionOverlay(char, profile, theory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([
    char?.roles, char?.costumes?.map((x) => x?.name || x?.title || x?.label),
    (char?.weapons || []).map((w) => [w?.name, (w?.potentials || []).map((p) => p?.name || p?.tier), (w?.skills || []).map((s) => s?.name)]),
    profile?.tags, profile?.orientations, theory?.functions, theory?.effects, theory?.dependencies, theory?.planLines, theory?.planRole,
  ]);
  const confirmed = [];
  const caution = [];
  const refs = [];
  const hasWeapons = Array.isArray(char?.weapons) && char.weapons.length >= 2;
  const hasPotentials = Array.isArray(char?.weapons) && char.weapons.some((w) => Array.isArray(w?.potentials) && w.potentials.length);
  const hasCostumes = Array.isArray(char?.costumes) && char.costumes.length > 0;
  const timingSensitive = hasAny(blob, ["timing", "fenêtre", "burst", "gros dégâts", "tag", "swap", "préparer", "setup"]);
  const buffSensitive = hasAny(blob, ["buff", "debuff", "status", "burn", "bleed", "freeze", "stun", "aura"]);
  const statSensitive = hasAny(blob, ["atk", "attack", "crit", "perforation", "penetration", "stat"]);

  if (hasWeapons) {
    addRef(refs, by.WEAPON_SKILL_DELTA);
    if (hasPublishedSignal(published, "WEAPON_SKILL_DELTA", 2)) confirmed.push("Les tests arme + skill aident à voir quelle arme gagne vraiment sur son action importante.");
    else caution.push("Il manque encore des tests arme + skill pour départager proprement ses armes.");
  }
  if (timingSensitive) {
    addRef(refs, by.ORDER_OF_USE);
    addRef(refs, by.DAMAGE_WINDOW);
    addRef(refs, by.PHASE_SPECIFIC_WINDOW_DELTA);
    addRef(refs, by.BOSS_INTERRUPT_PENALTY);
    if (hasPublishedSignal(published, "ORDER_OF_USE", 2) || hasPublishedSignal(published, "DAMAGE_WINDOW", 2) || hasPublishedSignal(published, "PHASE_SPECIFIC_WINDOW_DELTA", 2)) confirmed.push("Les tests d'ordre et de fenêtre aident à confirmer quoi garder pour son vrai tour.");
    else caution.push("Il manque encore des tests d'ordre et de fenêtre pour confirmer son meilleur moment.");
    if (hasPublishedSignal(published, "BOSS_INTERRUPT_PENALTY", 2)) confirmed.push("Les tests d'interruption aident à voir ce qu'il perd quand le boss casse son setup.");
    else caution.push("Il manque encore des tests d'interruption pour voir ce qu'il perd quand le boss coupe son setup.");
  }
  if (hasAny(blob, ["tag", "swap"])) {
    addRef(refs, by.TAG_SWAP_IMPACT);
    addRef(refs, by.TAG_TO_BURST_CHAIN);
    addRef(refs, by.TAG_WINDOW_GAIN);
    addRef(refs, by.COMBINED_SKILL_DELTA);
    if (hasPublishedSignal(published, "TAG_SWAP_IMPACT", 2)) confirmed.push("Les tests tag / swap aident à voir si son entrée ou son relais valent vraiment le coup.");
    else caution.push("Il manque encore des tests tag / swap pour mesurer sa vraie valeur à l'entrée.");
    if (hasPublishedSignal(published, "COMBINED_SKILL_DELTA", 2)) confirmed.push("Les tests Combined aident à voir si ce perso mérite d'être gardé pour une paire précise.");
    else caution.push("Il manque encore des tests Combined pour savoir si ce perso mérite d'être gardé pour une paire précise.");
  }
  if (hasAny(blob, ["evade", "esquive", "dodge", "reactive"])) {
    addRef(refs, by.SUCCESSFUL_EVADE_BONUS_DELTA);
    if (hasPublishedSignal(published, "SUCCESSFUL_EVADE_BONUS_DELTA", 2)) confirmed.push("Les tests d'esquive aident à voir si sa vraie valeur dépend d'une exécution propre.");
    else caution.push("Il manque encore des tests d'esquive pour savoir s'il faut vraiment réussir cette fenêtre.");
  }
  if (hasCostumes) {
    addRef(refs, by.COSTUME_IMPACT);
    if (hasPublishedSignal(published, "COSTUME_IMPACT", 2)) confirmed.push("Les tests aident à voir si un costume lui apporte un vrai gain ou juste un confort léger.");
    else caution.push("Il manque encore des tests pour voir si un costume vaut vraiment l'investissement sur lui.");
  }
  if (hasPotentials) {
    addRef(refs, by.POTENTIAL_IMPACT);
    if (hasPublishedSignal(published, "POTENTIAL_IMPACT", 2)) confirmed.push("Les tests aident à confirmer quels potentiels changent vraiment sa valeur.");
    else caution.push("Il manque encore des tests pour confirmer quels potentiels valent vraiment le coup.");
  }
  if (buffSensitive) {
    addRef(refs, by.BUFF_REAL_UPTIME);
    addRef(refs, by.DEBUFF_REAL_UPTIME);
    addRef(refs, by.RES_SHRED_DELTA);
    addRef(refs, by.ELEMENTAL_STATUS_UPTIME);
    if (hasPublishedSignal(published, "BUFF_REAL_UPTIME", 2) || hasPublishedSignal(published, "DEBUFF_REAL_UPTIME", 2)) confirmed.push("Les tests d'uptime aident à voir si ses buffs ou affaiblissements tiennent vraiment en combat.");
    else caution.push("Il manque encore des tests d'uptime pour confirmer si ses effets tiennent vraiment.");
    if (hasPublishedSignal(published, "RES_SHRED_DELTA", 2)) confirmed.push("Les tests aident à voir si ses baisses de résistance rapportent un vrai gain.");
    if (hasPublishedSignal(published, "ELEMENTAL_STATUS_UPTIME", 2)) confirmed.push("Les tests aident à voir si ses statuts élémentaires tiennent assez pour porter le plan de jeu.");
  }
  if (statSensitive) {
    addRef(refs, by.STAT_PRIORITY_DELTA);
    addRef(refs, by.BURST_STATE_DELTA);
    addRef(refs, by.BURST_TRIGGER_WEAPON_DELTA);
    addRef(refs, by.BURST_WINDOW_HOLD_VALUE);
    addRef(refs, by.ELEMENT_MATCHUP_DELTA);
    if (hasPublishedSignal(published, "STAT_PRIORITY_DELTA", 2)) confirmed.push("Les tests aident à confirmer quelle priorité de stats lui rapporte le plus.");
    else caution.push("Il manque encore des tests pour confirmer sa meilleure priorité de stats.");
    if (hasPublishedSignal(published, "BURST_STATE_DELTA", 2)) confirmed.push("Les tests Burst aident à voir si son meilleur build dépend trop d'un état Burst.");
    if (hasPublishedSignal(published, "BURST_TRIGGER_WEAPON_DELTA", 2) || hasPublishedSignal(published, "BURST_WINDOW_HOLD_VALUE", 2)) confirmed.push("Les tests Burst avancés aident à voir s'il faut ouvrir ou hold la vraie fenêtre de dégâts.");
    if (hasPublishedSignal(published, "ELEMENT_MATCHUP_DELTA", 2)) confirmed.push("Les tests élémentaires aident à voir quand son élément devient vraiment rentable.");
  }
  addRef(refs, by.BOSS_PRESSURE_DELTA);
  if (hasPublishedSignal(published, "BOSS_PRESSURE_DELTA", 2)) confirmed.push("Les tests boss pressure commencent à montrer s'il garde sa valeur quand le combat devient brouillon.");
  else caution.push("Il manque encore des tests boss pressure pour savoir s'il tient bien quand le combat coupe ton rythme.");

  return {
    confirmed: Array.from(new Set(confirmed)).slice(0, 4),
    caution: Array.from(new Set(caution)).slice(0, 3),
    refs: uniqRefs(refs).slice(0, 7),
  };
}

export function getWeaponSignalOverlay(compatTheory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([
    compatTheory?.functions, compatTheory?.dominant, compatTheory?.planRole,
    compatTheory?.planLines, compatTheory?.deltaSummary?.positive, compatTheory?.deltaSummary?.negative,
    compatTheory?.lines,
  ]);

  const support = [];
  const caution = [];
  const refs = [];

  const pushIf = (id, predicate, okText, missText) => {
    if (!predicate) return;
    const snap = by[id];
    if (snap) refs.push(snap);
    if (snap && signalConfidenceRank(snapshotSolidnessLabel(snap)) >= 2) support.push(okText);
    else caution.push(missText);
  };

  pushIf("SCALING_ATK", hasAny(blob, ["burst", "crit", "damage", "gros dégâts"]), "Les résultats publiés aident à confirmer si cette arme gagne surtout en dégâts.", "Il manque encore des résultats publiés pour confirmer son vrai gain de dégâts.");
  pushIf("BUFF_STACKING", hasAny(blob, ["buff", "support", "stack"]), "Les résultats publiés aident à confirmer comment cette arme profite des buffs.", "Il manque encore des résultats publiés pour confirmer comment cette arme profite des buffs.");
  pushIf("COOLDOWN_REAL", hasAny(blob, ["cooldown", "rotation", "timing", "rythme"]), "Les résultats publiés aident à confirmer si cette arme change vraiment le rythme du kit.", "Il manque encore des résultats publiés pour confirmer son impact sur le rythme du kit.");
  pushIf("INTERACTION_AB", hasAny(blob, ["tag", "combo", "synergie", "state", "status"]), "Les résultats publiés aident à confirmer les interactions poussées de cette arme.", "Il manque encore des résultats publiés pour confirmer les interactions poussées de cette arme.");
  pushIf("STAT_PRIORITY_DELTA", hasAny(blob, ["atk", "crit", "stat", "damage", "dégâts"]), "Les résultats publiés aident à confirmer quelle priorité de stats sert le mieux cette arme.", "Il manque encore des résultats publiés pour confirmer la meilleure priorité de stats avec cette arme.");
  pushIf("BURST_STATE_DELTA", hasAny(blob, ["burst", "ultimate", "ultime", "fenêtre", "gros dégâts"]), "Les résultats publiés aident à confirmer si cette arme dépend beaucoup du Burst.", "Il manque encore des résultats publiés pour confirmer si cette arme dépend beaucoup du Burst.");
  pushIf("BURST_TRIGGER_WEAPON_DELTA", hasAny(blob, ["burst", "weapon", "arme", "trigger", "ouvrir", "open"]), "Les résultats publiés aident à confirmer si cette arme ouvre vraiment la bonne fenêtre Burst.", "Il manque encore des résultats publiés pour confirmer si cette arme ouvre vraiment la bonne fenêtre Burst.");
  pushIf("BURST_WINDOW_HOLD_VALUE", hasAny(blob, ["burst", "hold", "garder", "timing", "fenêtre"]), "Les résultats publiés aident à confirmer s'il faut hold cette arme pour la vraie fenêtre Burst.", "Il manque encore des résultats publiés pour confirmer s'il faut vraiment hold cette arme pour la fenêtre Burst.");
  pushIf("COMBINED_SKILL_DELTA", hasAny(blob, ["combined", "combo", "pair", "paire", "tag"]), "Les résultats publiés aident à confirmer si cette arme gagne surtout dans une Combined propre.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur en Combined.");
  pushIf("TAG_TO_BURST_CHAIN", hasAny(blob, ["tag", "swap", "relay", "relais", "burst", "ouvrir"]), "Les résultats publiés aident à confirmer si cette arme profite surtout d'un vrai relais tag vers Burst.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur en chaîne tag vers Burst.");
  pushIf("TAG_WINDOW_GAIN", hasAny(blob, ["tag", "fenêtre", "window", "prepare", "préparer"]), "Les résultats publiés aident à confirmer si cette arme gagne surtout dans une fenêtre préparée par tag.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur en fenêtre préparée par tag.");
  pushIf("SUCCESSFUL_EVADE_BONUS_DELTA", hasAny(blob, ["evade", "esquive", "dodge", "reactive"]), "Les résultats publiés aident à confirmer si cette arme demande une esquive propre pour briller.", "Il manque encore des résultats publiés pour confirmer si cette arme dépend d'une esquive propre.");
  pushIf("ELEMENT_MATCHUP_DELTA", hasAny(blob, ["element", "élément", "holy", "darkness", "fire", "cold", "earth", "lightning", "wind", "physical"]), "Les résultats publiés aident à confirmer quand cette arme profite vraiment d'un bon matchup élémentaire.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur élémentaire.");
  pushIf("PHASE_SPECIFIC_WINDOW_DELTA", hasAny(blob, ["phase", "fenêtre", "timing", "burst"]), "Les résultats publiés aident à confirmer si cette arme gagne surtout dans une bonne fenêtre de phase.", "Il manque encore des résultats publiés pour confirmer sa vraie valeur par phase de boss.");

  return {
    support: Array.from(new Set(support)).slice(0, 2),
    caution: Array.from(new Set(caution)).slice(0, 2),
    refs: uniqRefs(refs).slice(0, 5),
  };
}

export function getWeaponDecisionOverlay(char, weapon, compatTheory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([
    char?.name, weapon?.name,
    compatTheory?.functions, compatTheory?.dominant, compatTheory?.planRole,
    compatTheory?.planLines, compatTheory?.deltaSummary?.positive, compatTheory?.deltaSummary?.negative,
    compatTheory?.lines,
  ]);
  const confirmed = [];
  const caution = [];
  const refs = [];
  const timingSensitive = hasAny(blob, ["timing", "fenêtre", "burst", "gros dégâts", "setup", "préparer"]);
  const buffSensitive = hasAny(blob, ["buff", "support", "stack", "status", "debuff"]);

  addRef(refs, by.WEAPON_SKILL_DELTA);
  if (hasPublishedSignal(published, "WEAPON_SKILL_DELTA", 2)) confirmed.push("Les tests arme + skill aident à mesurer son vrai gain sur l'action qui t'intéresse.");
  else caution.push("Il manque encore des tests arme + skill pour mesurer son vrai gain sur l'action importante.");

  if (timingSensitive) {
    addRef(refs, by.ORDER_OF_USE);
    addRef(refs, by.DAMAGE_WINDOW);
    addRef(refs, by.PHASE_SPECIFIC_WINDOW_DELTA);
    addRef(refs, by.BOSS_INTERRUPT_PENALTY);
    addRef(refs, by.BURST_TRIGGER_WEAPON_DELTA);
    addRef(refs, by.BURST_WINDOW_HOLD_VALUE);
    if (hasPublishedSignal(published, "ORDER_OF_USE", 2) || hasPublishedSignal(published, "DAMAGE_WINDOW", 2) || hasPublishedSignal(published, "PHASE_SPECIFIC_WINDOW_DELTA", 2)) confirmed.push("Les tests d'ordre et de fenêtre aident à voir si cette arme demande une meilleure préparation.");
    else caution.push("Il manque encore des tests d'ordre et de fenêtre pour confirmer quand cette arme est vraiment meilleure.");
    if (hasPublishedSignal(published, "BOSS_INTERRUPT_PENALTY", 2)) confirmed.push("Les tests d'interruption aident à voir si cette arme perd trop de valeur quand le boss coupe le setup.");
    if (hasPublishedSignal(published, "BURST_TRIGGER_WEAPON_DELTA", 2) || hasPublishedSignal(published, "BURST_WINDOW_HOLD_VALUE", 2)) confirmed.push("Les tests Burst avancés aident à voir s'il faut ouvrir ou hold cette arme pour la vraie fenêtre.");
  }
  if (buffSensitive) {
    addRef(refs, by.BUFF_REAL_UPTIME);
    addRef(refs, by.ELEMENTAL_STATUS_UPTIME);
    if (hasPublishedSignal(published, "BUFF_REAL_UPTIME", 2)) confirmed.push("Les tests d'uptime aident à voir si ses bonus tiennent assez longtemps pour valoir le détour.");
    else caution.push("Il manque encore des tests d'uptime pour savoir si ses bonus tiennent assez longtemps.");
    if (hasPublishedSignal(published, "ELEMENTAL_STATUS_UPTIME", 2)) confirmed.push("Les tests aident à voir si les statuts élémentaires liés à cette arme tiennent vraiment.");
  }
  addRef(refs, by.STAT_PRIORITY_DELTA);
  addRef(refs, by.BURST_STATE_DELTA);
  addRef(refs, by.ELEMENT_MATCHUP_DELTA);
  if (hasPublishedSignal(published, "STAT_PRIORITY_DELTA", 2)) confirmed.push("Les tests aident à confirmer quelle priorité de stats sert le mieux cette arme.");
  if (hasPublishedSignal(published, "BURST_STATE_DELTA", 2)) confirmed.push("Les tests Burst aident à voir si cette arme dépend beaucoup d'un état Burst.");
  if (hasPublishedSignal(published, "ELEMENT_MATCHUP_DELTA", 2)) confirmed.push("Les tests élémentaires aident à voir quand cette arme prend vraiment de la valeur.");
  if (hasPublishedSignal(published, "TAG_TO_BURST_CHAIN", 2)) confirmed.push("Les tests tag → Burst aident à voir si cette arme vaut surtout pour ouvrir ou relayer le vrai tour Burst.");
  if (hasPublishedSignal(published, "TAG_WINDOW_GAIN", 2)) confirmed.push("Les tests de fenêtre préparée aident à voir si cette arme gagne surtout quand le tag prépare l'action.");
  if (hasPublishedSignal(published, "COMBINED_SKILL_DELTA", 2)) confirmed.push("Les tests Combined aident à voir si cette arme vaut surtout dans une paire précise.");
  if (hasPublishedSignal(published, "SUCCESSFUL_EVADE_BONUS_DELTA", 2)) confirmed.push("Les tests d'esquive aident à voir si cette arme demande une exécution propre pour tenir sa valeur.");
  addRef(refs, by.BOSS_PRESSURE_DELTA);
  if (hasPublishedSignal(published, "BOSS_PRESSURE_DELTA", 2)) confirmed.push("Les tests boss pressure aident à voir si cette arme garde sa valeur quand le combat casse le rythme.");
  else caution.push("Il manque encore des tests boss pressure pour savoir si cette arme tient bien quand le combat devient sale.");

  return {
    confirmed: Array.from(new Set(confirmed)).slice(0, 4),
    caution: Array.from(new Set(caution)).slice(0, 3),
    refs: uniqRefs(refs).slice(0, 6),
  };
}

export function getBossSignalOverlay(theory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([theory?.demand, theory?.gamePlan, theory?.punishments, theory?.usefulProfiles, theory?.pace]);

  const support = [];
  const caution = [];
  const refs = [];

  const pushIf = (id, predicate, okText, missText) => {
    if (!predicate) return;
    const snap = by[id];
    if (snap) refs.push(snap);
    if (snap && signalConfidenceRank(snapshotSolidnessLabel(snap)) >= 2) support.push(okText);
    else caution.push(missText);
    if (snap?.__selection?.conflict) caution.push(conflictLongLine(snap.__selection.conflict));
    else if (snapshotConflictShort(snap)) caution.push(snapshotConflictShort(snap));
  };

  pushIf("COOLDOWN_REAL", hasAny(blob, ["cooldown", "timing", "fenêtre", "burst", "rythme"]), "Les résultats publiés aident à confirmer quand garder les gros sorts.", "Il manque encore des résultats publiés pour confirmer quand garder les gros sorts.");
  pushIf("BUFF_UPTIME", hasAny(blob, ["buff", "durée", "setup", "prepare", "préparer"]), "Les résultats publiés aident à confirmer quels effets valent la peine d'être gardés.", "Il manque encore des résultats publiés pour confirmer quels effets valent la peine d'être gardés.");
  pushIf("STATUS_PROC_RATE", hasAny(blob, ["status", "dot", "burn", "shock", "freeze", "stun"]), "Les résultats publiés aident à confirmer si les effets réguliers tiennent bien sur ce type de combat.", "Il manque encore des résultats publiés pour confirmer la régularité des effets sur ce type de combat.");
  pushIf("BURST_STATE_DELTA", hasAny(blob, ["burst", "phase", "fenêtre", "timing"]), "Les résultats publiés aident à confirmer si le boss force un vrai jeu autour du Burst.", "Il manque encore des résultats publiés pour confirmer l'impact réel du Burst sur ce boss.");
  pushIf("BURST_WINDOW_HOLD_VALUE", hasAny(blob, ["burst", "fenêtre", "timing", "garder", "hold"]), "Les résultats publiés aident à confirmer s'il faut vraiment garder les ressources pour la bonne fenêtre Burst.", "Il manque encore des résultats publiés pour confirmer s'il faut vraiment garder les ressources pour la bonne fenêtre Burst.");
  pushIf("TAG_TO_BURST_CHAIN", hasAny(blob, ["tag", "swap", "relay", "relais", "burst", "ouvrir"]), "Les résultats publiés aident à confirmer si le boss récompense vraiment une chaîne tag vers Burst bien tenue.", "Il manque encore des résultats publiés pour confirmer la vraie valeur des chaînes tag vers Burst sur ce boss.");
  pushIf("TAG_WINDOW_GAIN", hasAny(blob, ["tag", "fenêtre", "window", "prepare", "préparer"]), "Les résultats publiés aident à confirmer si préparer la bonne fenêtre via tag rapporte vraiment sur ce boss.", "Il manque encore des résultats publiés pour confirmer la vraie valeur des fenêtres préparées par tag sur ce boss.");
  pushIf("ELEMENTAL_STATUS_UPTIME", hasAny(blob, ["freeze", "cold", "burn", "shock", "curse", "status"]), "Les résultats publiés aident à confirmer quels statuts élémentaires tiennent vraiment sur ce boss.", "Il manque encore des résultats publiés pour confirmer quels statuts élémentaires tiennent vraiment sur ce boss.");
  pushIf("ELEMENT_MATCHUP_DELTA", hasAny(blob, ["element", "élément", "holy", "darkness", "fire", "cold", "earth", "lightning", "wind", "physical"]), "Les résultats publiés aident à confirmer quels matchups élémentaires rapportent vraiment sur ce boss.", "Il manque encore des résultats publiés pour confirmer les meilleurs matchups élémentaires sur ce boss.");
  pushIf("BOSS_PRESSURE_DELTA", hasAny(blob, ["boss", "phase", "rythme", "timing", "fenêtre", "danger"]), "Les résultats publiés aident à confirmer ce qui perd de la valeur quand le boss casse le rythme.", "Il manque encore des résultats publiés pour confirmer ce qui perd de la valeur quand le boss casse le rythme.");
  pushIf("PHASE_SPECIFIC_WINDOW_DELTA", hasAny(blob, ["phase", "fenêtre", "timing", "danger"]), "Les résultats publiés aident à confirmer la vraie fenêtre utile par phase de boss.", "Il manque encore des résultats publiés pour confirmer la vraie fenêtre utile par phase de boss.");
  pushIf("BOSS_INTERRUPT_PENALTY", hasAny(blob, ["interrupt", "interruption", "stagger", "casse", "danger"]), "Les résultats publiés aident à confirmer ce que le boss casse vraiment quand il interrompt ton setup.", "Il manque encore des résultats publiés pour confirmer ce que le boss casse vraiment quand il interrompt ton setup.");
  pushIf("BOSS_PATTERN_RECOVERY_DELTA", hasAny(blob, ["recover", "recovery", "reprendre", "retomber", "pattern", "interruption"]), "Les résultats publiés aident à confirmer ce qui récupère vraiment après un pattern boss raté ou subi.", "Il manque encore des résultats publiés pour confirmer ce qui récupère vraiment après un pattern boss.");
  pushIf("DEBUFF_REAL_UPTIME", hasAny(blob, ["debuff", "status", "armure", "reduce", "break"]), "Les résultats publiés aident à confirmer quels affaiblissements tiennent vraiment sur ce type de combat.", "Il manque encore des résultats publiés pour confirmer la tenue réelle des affaiblissements sur ce type de combat.");

  return {
    support: Array.from(new Set(support)).slice(0, 3),
    caution: Array.from(new Set(caution)).slice(0, 2),
    refs: uniqRefs(refs).slice(0, 5),
  };
}

export function getBossDecisionOverlay(theory, published = []) {
  const by = signalMap(published);
  const blob = blobFromParts([theory?.demand, theory?.gamePlan, theory?.punishments, theory?.usefulProfiles, theory?.pace]);
  const confirmed = [];
  const caution = [];
  const refs = [];
  const timingSensitive = hasAny(blob, ["timing", "fenêtre", "danger", "burst", "rythme", "phase"]);
  const debuffSensitive = hasAny(blob, ["debuff", "status", "burn", "shock", "freeze", "stun", "break"]);
  const setupSensitive = hasAny(blob, ["buff", "prepare", "préparer", "setup", "garder"]);

  if (timingSensitive) {
    addRef(refs, by.ORDER_OF_USE);
    addRef(refs, by.DAMAGE_WINDOW);
    addRef(refs, by.PHASE_SPECIFIC_WINDOW_DELTA);
    addRef(refs, by.BOSS_INTERRUPT_PENALTY);
    addRef(refs, by.BURST_WINDOW_HOLD_VALUE);
    addRef(refs, by.TAG_TO_BURST_CHAIN);
    addRef(refs, by.TAG_WINDOW_GAIN);
    addRef(refs, by.BOSS_PATTERN_RECOVERY_DELTA);
    if (hasPublishedSignal(published, "ORDER_OF_USE", 2) || hasPublishedSignal(published, "DAMAGE_WINDOW", 2) || hasPublishedSignal(published, "PHASE_SPECIFIC_WINDOW_DELTA", 2)) confirmed.push("Les tests d'ordre et de fenêtre aident à voir quoi garder pour la phase dangereuse.");
    else caution.push("Il manque encore des tests d'ordre et de fenêtre pour confirmer quoi garder pour la phase dangereuse.");
    if (hasPublishedSignal(published, "BOSS_INTERRUPT_PENALTY", 2)) confirmed.push("Les tests d'interruption aident à voir ce que le boss casse vraiment quand il coupe ton setup.");
    if (hasPublishedSignal(published, "BURST_WINDOW_HOLD_VALUE", 2)) confirmed.push("Les tests Burst avancés aident à voir s'il faut garder les ressources pour la bonne fenêtre.");
    if (hasPublishedSignal(published, "TAG_TO_BURST_CHAIN", 2)) confirmed.push("Les tests tag → Burst aident à voir si le bon relais vaut la peine d'être gardé pour ce boss.");
    if (hasPublishedSignal(published, "TAG_WINDOW_GAIN", 2)) confirmed.push("Les tests de fenêtre préparée aident à voir si le tag doit vraiment préparer le bon tour sur ce boss.");
    if (hasPublishedSignal(published, "BOSS_PATTERN_RECOVERY_DELTA", 2)) confirmed.push("Les tests de recovery aident à voir ce qui repart vraiment après un pattern boss subi.");
  }
  addRef(refs, by.BOSS_PRESSURE_DELTA);
  if (hasPublishedSignal(published, "BOSS_PRESSURE_DELTA", 2)) confirmed.push("Les tests boss pressure aident à voir quels setups perdent le plus de valeur quand le boss casse ton rythme.");
  else caution.push("Il manque encore des tests boss pressure pour confirmer quels setups tiennent le mieux ici.");

  if (setupSensitive) {
    addRef(refs, by.BUFF_REAL_UPTIME);
    if (hasPublishedSignal(published, "BUFF_REAL_UPTIME", 2)) confirmed.push("Les tests d'uptime aident à voir quels buffs valent vraiment le temps de setup.");
    else caution.push("Il manque encore des tests d'uptime pour confirmer quels buffs valent le temps de setup.");
  }
  if (debuffSensitive) {
    addRef(refs, by.DEBUFF_REAL_UPTIME);
    addRef(refs, by.RES_SHRED_DELTA);
    addRef(refs, by.ELEMENTAL_STATUS_UPTIME);
    addRef(refs, by.ELEMENT_MATCHUP_DELTA);
    if (hasPublishedSignal(published, "DEBUFF_REAL_UPTIME", 2)) confirmed.push("Les tests d'uptime aident à voir quels affaiblissements tiennent vraiment sur ce boss.");
    else caution.push("Il manque encore des tests pour confirmer quels affaiblissements tiennent vraiment sur ce boss.");
    if (hasPublishedSignal(published, "RES_SHRED_DELTA", 2)) confirmed.push("Les tests aident à voir si les baisses de résistance sont vraiment rentables sur ce boss.");
    if (hasPublishedSignal(published, "ELEMENTAL_STATUS_UPTIME", 2)) confirmed.push("Les tests aident à voir quels statuts élémentaires tiennent assez pour structurer le combat.");
    if (hasPublishedSignal(published, "ELEMENT_MATCHUP_DELTA", 2)) confirmed.push("Les tests élémentaires aident à voir quels matchups sont vraiment rentables sur ce boss.");
  }

  return {
    confirmed: Array.from(new Set(confirmed)).slice(0, 4),
    caution: Array.from(new Set(caution)).slice(0, 3),
    refs: uniqRefs(refs).slice(0, 6),
  };
}
