import { assistantDigestLines, badgeLineFromRefs, familyCountMap, familyInsightLines, mergeUniqueProtoRefs, protoFamilyLabel, refsLine } from './evidence.js';
import { summarizeSnapshotRefs } from '../../lib/published-signals.js';

function text(value) {
  return String(value || '').trim();
}

function short(textValue, max = 760) {
  const s = text(textValue);
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

function protoTheme(protoId) {
  return protoFamilyLabel(protoId);
}

function themeBag(decision = {}) {
  const refs = Array.isArray(decision?.refs) ? decision.refs : [];
  const out = new Map();
  for (const ref of refs) {
    const theme = protoTheme(ref?.protoId);
    if (!theme) continue;
    out.set(theme, (out.get(theme) || 0) + 1);
  }
  return out;
}

function strongestThemes(decision = {}, limit = 2) {
  return Array.from(themeBag(decision).entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .slice(0, limit)
    .map(([theme]) => theme);
}


function familyCount(refs = [], family) {
  return familyCountMap(refs).get(family) || 0;
}

function protoCount(refs = [], protoId) {
  return mergeUniqueProtoRefs(refs).filter((ref) => String(ref?.protoId || "") === String(protoId || "")).length;
}

function recoveryPressureScore(refs = []) {
  return (
    protoCount(refs, "BOSS_PRESSURE_DELTA") * 3 +
    protoCount(refs, "BOSS_PATTERN_RECOVERY_DELTA") * 4 +
    protoCount(refs, "SUCCESSFUL_EVADE_BONUS_DELTA") * 2 +
    protoCount(refs, "PHASE_SPECIFIC_WINDOW_DELTA") * 2 +
    protoCount(refs, "BURST_WINDOW_HOLD_VALUE") * 2 +
    protoCount(refs, "BURST_TRIGGER_WEAPON_DELTA")
  );
}

function recoveryCompareLines(leftName, leftRefs = [], rightName, rightRefs = [], limit = 3) {
  const leftRecovery = recoveryPressureScore(leftRefs);
  const rightRecovery = recoveryPressureScore(rightRefs);
  const leftBurst = protoCount(leftRefs, "WEAPON_SKILL_DELTA") + protoCount(leftRefs, "DAMAGE_WINDOW") + protoCount(leftRefs, "TAG_TO_BURST_CHAIN") + protoCount(leftRefs, "TAG_WINDOW_GAIN");
  const rightBurst = protoCount(rightRefs, "WEAPON_SKILL_DELTA") + protoCount(rightRefs, "DAMAGE_WINDOW") + protoCount(rightRefs, "TAG_TO_BURST_CHAIN") + protoCount(rightRefs, "TAG_WINDOW_GAIN");
  const lines = [];

  if (leftRecovery >= rightRecovery + 2) {
    lines.push(`• **${leftName}** garde mieux sa valeur quand le boss casse le rythme ou impose une reprise sale.`);
  } else if (rightRecovery >= leftRecovery + 2) {
    lines.push(`• **${rightName}** garde mieux sa valeur quand le boss casse le rythme ou impose une reprise sale.`);
  }

  if (leftRecovery > rightRecovery && rightBurst > leftBurst) {
    lines.push(`• **${leftName}** repart mieux après pattern, alors que **${rightName}** vaut surtout si la vraie fenêtre reste intacte.`);
  } else if (rightRecovery > leftRecovery && leftBurst > rightBurst) {
    lines.push(`• **${rightName}** repart mieux après pattern, alors que **${leftName}** vaut surtout si la vraie fenêtre reste intacte.`);
  }

  if (protoCount(leftRefs, "SUCCESSFUL_EVADE_BONUS_DELTA") > protoCount(rightRefs, "SUCCESSFUL_EVADE_BONUS_DELTA")) {
    lines.push(`• **${leftName}** punit mieux une reprise propre après esquive ou micro-fenêtre.`);
  } else if (protoCount(rightRefs, "SUCCESSFUL_EVADE_BONUS_DELTA") > protoCount(leftRefs, "SUCCESSFUL_EVADE_BONUS_DELTA")) {
    lines.push(`• **${rightName}** punit mieux une reprise propre après esquive ou micro-fenêtre.`);
  }

  return lines.slice(0, limit);
}

function windowShapeCompareLines(leftName, leftRefs = [], rightName, rightRefs = [], limit = 3) {
  const lines = [];
  const leftPhase = protoCount(leftRefs, "PHASE_SPECIFIC_WINDOW_DELTA");
  const rightPhase = protoCount(rightRefs, "PHASE_SPECIFIC_WINDOW_DELTA");
  const leftHold = protoCount(leftRefs, "BURST_WINDOW_HOLD_VALUE");
  const rightHold = protoCount(rightRefs, "BURST_WINDOW_HOLD_VALUE");
  const leftRecover = protoCount(leftRefs, "BOSS_PATTERN_RECOVERY_DELTA") + protoCount(leftRefs, "SUCCESSFUL_EVADE_BONUS_DELTA");
  const rightRecover = protoCount(rightRefs, "BOSS_PATTERN_RECOVERY_DELTA") + protoCount(rightRefs, "SUCCESSFUL_EVADE_BONUS_DELTA");

  if (leftPhase > rightPhase && leftHold >= rightHold) {
    lines.push(`• **${leftName}** vaut surtout si la vraie fenêtre de phase est bien gardée avant l’ouverture.`);
  } else if (rightPhase > leftPhase && rightHold >= leftHold) {
    lines.push(`• **${rightName}** vaut surtout si la vraie fenêtre de phase est bien gardée avant l’ouverture.`);
  }

  if (leftHold > rightHold && leftRecover <= rightRecover) {
    lines.push(`• **${leftName}** demande davantage de hold propre ; **${rightName}** repart plus facilement après une reprise courte.`);
  } else if (rightHold > leftHold && rightRecover <= leftRecover) {
    lines.push(`• **${rightName}** demande davantage de hold propre ; **${leftName}** repart plus facilement après une reprise courte.`);
  }

  if (leftRecover >= rightRecover + 2) {
    lines.push(`• **${leftName}** punit mieux une recovery visible ou une micro-fenêtre post-pattern.`);
  } else if (rightRecover >= leftRecover + 2) {
    lines.push(`• **${rightName}** punit mieux une recovery visible ou une micro-fenêtre post-pattern.`);
  }

  return lines.slice(0, limit);
}

function bossAwareCompareLines(leftName, leftRefs = [], rightName, rightRefs = [], limit = 3) {
  const leftCounts = familyCountMap(leftRefs);
  const rightCounts = familyCountMap(rightRefs);
  const lines = [];

  const leftBoss = (leftCounts.get('Boss/phase') || 0) + (leftCounts.get('Esquive') || 0);
  const rightBoss = (rightCounts.get('Boss/phase') || 0) + (rightCounts.get('Esquive') || 0);
  const leftBurst = (leftCounts.get('Burst') || 0) + (leftCounts.get('Timing') || 0);
  const rightBurst = (rightCounts.get('Burst') || 0) + (rightCounts.get('Timing') || 0);
  const leftStatus = (leftCounts.get('Élément') || 0) + (leftCounts.get('Statuts') || 0);
  const rightStatus = (rightCounts.get('Élément') || 0) + (rightCounts.get('Statuts') || 0);

  if (leftBoss > rightBoss && leftBurst >= rightBurst) {
    lines.push(`• **${leftName}** gagne surtout si la vraie fenêtre boss/phase est respectée avant d’ouvrir le Burst.`);
  } else if (rightBoss > leftBoss && rightBurst >= leftBurst) {
    lines.push(`• **${rightName}** gagne surtout si la vraie fenêtre boss/phase est respectée avant d’ouvrir le Burst.`);
  }

  if (leftBoss > rightBoss && leftBurst < rightBurst) {
    lines.push(`• **${leftName}** demande plus de discipline sous pression ; **${rightName}** est plus simple à rentabiliser hors phase idéale.`);
  } else if (rightBoss > leftBoss && rightBurst < leftBurst) {
    lines.push(`• **${rightName}** demande plus de discipline sous pression ; **${leftName}** est plus simple à rentabiliser hors phase idéale.`);
  }

  if (leftStatus > rightStatus && leftBoss >= rightBoss) {
    lines.push(`• **${leftName}** dépend davantage du bon matchup, des stacks ou d’une tenue propre des effets en phase critique.`);
  } else if (rightStatus > leftStatus && rightBoss >= leftBoss) {
    lines.push(`• **${rightName}** dépend davantage du bon matchup, des stacks ou d’une tenue propre des effets en phase critique.`);
  }

  return lines.slice(0, limit);
}

function gateAndSurvivalCompareLines(leftName, leftRefs = [], rightName, rightRefs = [], limit = 3) {
  const lines = [];
  const leftGate = protoCount(leftRefs, 'PHASE_SPECIFIC_WINDOW_DELTA');
  const rightGate = protoCount(rightRefs, 'PHASE_SPECIFIC_WINDOW_DELTA');
  const leftPressure = protoCount(leftRefs, 'BOSS_PRESSURE_DELTA') + protoCount(leftRefs, 'BOSS_INTERRUPT_PENALTY');
  const rightPressure = protoCount(rightRefs, 'BOSS_PRESSURE_DELTA') + protoCount(rightRefs, 'BOSS_INTERRUPT_PENALTY');
  const leftRecovery = protoCount(leftRefs, 'BOSS_PATTERN_RECOVERY_DELTA') + protoCount(leftRefs, 'SUCCESSFUL_EVADE_BONUS_DELTA');
  const rightRecovery = protoCount(rightRefs, 'BOSS_PATTERN_RECOVERY_DELTA') + protoCount(rightRefs, 'SUCCESSFUL_EVADE_BONUS_DELTA');

  if (leftGate >= rightGate + 2 && leftPressure >= rightPressure) {
    lines.push(`• **${leftName}** prend plus de valeur sur une **phase verrou** : il faut garder la fenêtre jusqu’à l’ouverture.`);
  } else if (rightGate >= leftGate + 2 && rightPressure >= leftPressure) {
    lines.push(`• **${rightName}** prend plus de valeur sur une **phase verrou** : il faut garder la fenêtre jusqu’à l’ouverture.`);
  }

  if (leftPressure >= rightPressure + 2 && leftRecovery < rightRecovery) {
    lines.push(`• Sous grosse pression, **${leftName}** demande plus de discipline ; **${rightName}** repart plus facilement après reset/pattern.`);
  } else if (rightPressure >= leftPressure + 2 && rightRecovery < leftRecovery) {
    lines.push(`• Sous grosse pression, **${rightName}** demande plus de discipline ; **${leftName}** repart plus facilement après reset/pattern.`);
  }

  if (leftRecovery >= rightRecovery + 3) {
    lines.push(`• **${leftName}** garde mieux sa valeur sur une **phase survie** (reprise après pattern / micro-fenêtre).`);
  } else if (rightRecovery >= leftRecovery + 3) {
    lines.push(`• **${rightName}** garde mieux sa valeur sur une **phase survie** (reprise après pattern / micro-fenêtre).`);
  }

  return lines.slice(0, limit);
}

function compareThemeEdges(leftName, leftDecision, rightName, rightDecision, limit = 3) {
  const leftBag = themeBag(leftDecision);
  const rightBag = themeBag(rightDecision);
  const keys = Array.from(new Set([...leftBag.keys(), ...rightBag.keys()]));
  const lines = [];
  for (const key of keys) {
    const left = leftBag.get(key) || 0;
    const right = rightBag.get(key) || 0;
    if (left === right) continue;
    if (left > right) lines.push(`• **${leftName}** a plus de repères publiés sur **${key.toLowerCase()}**.`);
    else lines.push(`• **${rightName}** a plus de repères publiés sur **${key.toLowerCase()}**.`);
  }
  return lines.slice(0, limit);
}

export function addCompareAssistantField(embed, refs = [], options = {}) {
  if (!embed) return embed;
  const lines = assistantDigestLines(refs, { cardLimit: 3, contextLimit: 2, refsLimit: 4, includeBadges: true, includeFamilyInsight: true, ...options });
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name: '4) 🧠 Lecture assistant', value: short(lines.join('\n')), inline: false });
  return embed;
}

export function addCompareDataField(embed, overlayA, overlayB) {
  if (!embed) return embed;
  const lines = [];
  if (overlayA?.support?.length) lines.push(...overlayA.support.slice(0, 1).map((x) => `• Côté A : ${x}`));
  if (overlayB?.support?.length) lines.push(...overlayB.support.slice(0, 1).map((x) => `• Côté B : ${x}`));
  if (overlayA?.caution?.[0]) lines.push(`• Côté A : ${overlayA.caution[0]}`);
  if (overlayB?.caution?.[0]) lines.push(`• Côté B : ${overlayB.caution[0]}`);
  const sharedRefs = mergeUniqueProtoRefs(overlayA?.refs || [], overlayB?.refs || []);
  const badgeLine = badgeLineFromRefs(sharedRefs);
  if (badgeLine) lines.unshift(badgeLine);
  const refLine = refsLine(sharedRefs, 'Tests utiles', 6);
  if (refLine) lines.push(refLine);
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  const topCount = embed.fields.findIndex((f) => !/^1\)/.test(String(f?.name || '')));
  const insertAt = topCount === -1 ? embed.fields.length : topCount;
  embed.fields.splice(insertAt, 0, { name: '2) 📊 Pourquoi ça tient', value: short(lines.join('\n')), inline: false });
  return embed;
}

export function addCompareDecisionField(embed, leftName, rightName, leftDecision, rightDecision) {
  if (!embed) return embed;
  const lines = [];
  if (leftDecision?.confirmed?.length) lines.push(`**${leftName}**\n${leftDecision.confirmed.map((x) => `• ${x}`).join('\n')}`);
  if (rightDecision?.confirmed?.length) lines.push(`**${rightName}**\n${rightDecision.confirmed.map((x) => `• ${x}`).join('\n')}`);
  if (!lines.length) {
    if (leftDecision?.caution?.[0]) lines.push(`• ${leftName} : ${leftDecision.caution[0]}`);
    if (rightDecision?.caution?.[0]) lines.push(`• ${rightName} : ${rightDecision.caution[0]}`);
  }
  const refs = [...(leftDecision?.refs || []), ...(rightDecision?.refs || [])];
  const uniq = mergeUniqueProtoRefs(refs);
  const badgeLine = badgeLineFromRefs(uniq);
  if (badgeLine) lines.unshift(badgeLine);
  if (uniq.length) lines.push(`**Tests à regarder**\n• ${summarizeSnapshotRefs(uniq).join(', ')}`);
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name: '3) 🧪 Repères de test', value: short(lines.join('\n\n')), inline: false });
  return embed;
}

export function addCompareContrastField(embed, leftName, rightName, leftDecision, rightDecision) {
  if (!embed) return embed;
  const lines = [];
  const leftThemes = strongestThemes(leftDecision);
  const rightThemes = strongestThemes(rightDecision);
  const leftRefs = mergeUniqueProtoRefs(leftDecision?.refs || []);
  const rightRefs = mergeUniqueProtoRefs(rightDecision?.refs || []);
  if (leftThemes.length) lines.push(`• **${leftName}** ressort surtout sur ${leftThemes.map((x) => `**${x.toLowerCase()}**`).join(' / ')}.`);
  if (rightThemes.length) lines.push(`• **${rightName}** ressort surtout sur ${rightThemes.map((x) => `**${x.toLowerCase()}**`).join(' / ')}.`);
  lines.push(...gateAndSurvivalCompareLines(leftName, leftRefs, rightName, rightRefs, 2));
  lines.push(...bossAwareCompareLines(leftName, leftRefs, rightName, rightRefs, 2));
  lines.push(...windowShapeCompareLines(leftName, leftRefs, rightName, rightRefs, 2));
  lines.push(...recoveryCompareLines(leftName, leftRefs, rightName, rightRefs, 2));
  const leftFamilyLead = familyInsightLines(leftRefs, { limit: 2, subject: leftName });
  const rightFamilyLead = familyInsightLines(rightRefs, { limit: 2, subject: rightName });
  if (leftFamilyLead[1]) lines.push(leftFamilyLead[1]);
  if (rightFamilyLead[1]) lines.push(rightFamilyLead[1]);
  lines.push(...compareThemeEdges(leftName, leftDecision, rightName, rightDecision));
  if (!lines.length) return embed;
  embed.fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 24) : [];
  embed.fields.push({ name: '5) 🎯 Ce qui change vraiment', value: short(lines.join('\n')), inline: false });
  return embed;
}
