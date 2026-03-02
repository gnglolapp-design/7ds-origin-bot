import { buildBossCrossReadingLines, buildBossPhaseTeamDecisionLines, buildBossRecoveryLines, buildBossTeamFitLines, buildBossTeamWindowLines, buildBossWindowDecisionLines } from "../../lib/science-boss.js";
import { slicePublishedForTeam, summarizeSnapshotRefs } from '../../lib/published-signals.js';

function normalize(v) {
  return String(v || '').toLowerCase();
}

function confidenceRank(label) {
  const x = normalize(label);
  if (x.includes('bonne') || x.includes('forte') || x.includes('high')) return 3;
  if (x.includes('moyenne') || x.includes('medium')) return 2;
  if (x.includes('faible') || x.includes('low')) return 1;
  return 0;
}

function hasTagLike(picks, patterns = []) {
  const needles = patterns.map(normalize);
  return (picks || []).some((p) => (p.tags || []).some((tag) => needles.some((n) => normalize(tag).includes(n))));
}

export function buildLabOverlay(team, published, bossOverlay = null) {
  const byProto = Object.fromEntries((published || []).map((x) => [String(x?.protoId || ''), x]));
  const support = [];
  const caution = [];

  const burstHeavy = (team.total.convert || 0) + (team.total.burst || 0) >= 6;
  const setupHeavy = (team.total.control || 0) + (team.total.open || 0) + (team.total.utility || 0) >= 6
    || hasTagLike(team.picks, ['buff', 'debuff', 'control', 'stun', 'freeze', 'shock', 'burn', 'bleed']);
  const cycleHeavy = (team.total.tempo || 0) + (team.total.stabilize || 0) + (team.total.sustain || 0) >= 5;

  if (burstHeavy) {
    const snap = byProto.SCALING_ATK;
    if (snap && confidenceRank(snap.confidence) >= 2) support.push('Les résultats publiés confirment mieux les pics de dégâts.');
    else caution.push('Conversion encore peu sécurisée par des mesures SCALING_ATK publiées.');
  }

  if (setupHeavy) {
    const hasBuff = byProto.BUFF_STACKING && confidenceRank(byProto.BUFF_STACKING.confidence) >= 2;
    const hasInter = byProto.INTERACTION_AB && confidenceRank(byProto.INTERACTION_AB.confidence) >= 2;
    const hasStatus = byProto.STATUS_PROC_RATE && confidenceRank(byProto.STATUS_PROC_RATE.confidence) >= 2;
    if (hasBuff || hasInter || hasStatus) support.push('Les résultats publiés confirment une partie des buffs, interactions et effets.');
    else caution.push("Il manque encore des résultats publiés sur buffs, interactions et effets.");
  }

  if (cycleHeavy) {
    const hasCd = byProto.COOLDOWN_REAL && confidenceRank(byProto.COOLDOWN_REAL.confidence) >= 2;
    const hasUptime = byProto.BUFF_UPTIME && confidenceRank(byProto.BUFF_UPTIME.confidence) >= 2;
    if (hasCd || hasUptime) support.push('Les résultats publiés confirment mieux le rythme du kit.');
    else caution.push("Il manque encore des résultats publiés sur le rythme réel du kit.");
  }

  if (team.picks?.length >= 2) {
    if (byProto.WEAPON_SKILL_DELTA && confidenceRank(byProto.WEAPON_SKILL_DELTA.confidence) >= 2) {
      support.push("Les tests arme + skill aident à voir qui mérite la meilleure arme pour le vrai tour.");
    } else {
      caution.push("Il manque encore des tests arme + skill pour départager proprement les armes de l'équipe.");
    }
  }

  if (burstHeavy) {
    const hasOrder = byProto.ORDER_OF_USE && confidenceRank(byProto.ORDER_OF_USE.confidence) >= 2;
    const hasWindow = byProto.DAMAGE_WINDOW && confidenceRank(byProto.DAMAGE_WINDOW.confidence) >= 2;
    const hasBurst = byProto.BURST_STATE_DELTA && confidenceRank(byProto.BURST_STATE_DELTA.confidence) >= 2;
    const hasBurstTrigger = byProto.BURST_TRIGGER_WEAPON_DELTA && confidenceRank(byProto.BURST_TRIGGER_WEAPON_DELTA.confidence) >= 2;
    const hasBurstHold = byProto.BURST_WINDOW_HOLD_VALUE && confidenceRank(byProto.BURST_WINDOW_HOLD_VALUE.confidence) >= 2;
    if (hasOrder || hasWindow || hasBurst) support.push("Les tests d'ordre, de fenêtre et de Burst aident à savoir quoi garder pour le vrai tour de dégâts.");
    else caution.push("Il manque encore des tests d'ordre, de fenêtre et de Burst pour confirmer le meilleur moment de dégâts.");
    if (hasBurstTrigger || hasBurstHold) support.push("Les tests Burst avancés aident à voir qui doit ouvrir la fenêtre et qui doit encore hold sa ressource.");
    else caution.push("Il manque encore des tests Burst avancés pour savoir qui doit ouvrir la fenêtre et qui doit encore hold.");
  }

  if (setupHeavy) {
    const hasBuffReal = byProto.BUFF_REAL_UPTIME && confidenceRank(byProto.BUFF_REAL_UPTIME.confidence) >= 2;
    const hasDebuffReal = byProto.DEBUFF_REAL_UPTIME && confidenceRank(byProto.DEBUFF_REAL_UPTIME.confidence) >= 2;
    const hasCombined = byProto.COMBINED_SKILL_DELTA && confidenceRank(byProto.COMBINED_SKILL_DELTA.confidence) >= 2;
    const hasTagBurst = byProto.TAG_TO_BURST_CHAIN && confidenceRank(byProto.TAG_TO_BURST_CHAIN.confidence) >= 2;
    const hasTagWindow = byProto.TAG_WINDOW_GAIN && confidenceRank(byProto.TAG_WINDOW_GAIN.confidence) >= 2;
    const hasElementalStatus = byProto.ELEMENTAL_STATUS_UPTIME && confidenceRank(byProto.ELEMENTAL_STATUS_UPTIME.confidence) >= 2;
    if (hasBuffReal || hasDebuffReal) support.push("Les tests d'uptime aident à voir quels buffs et affaiblissements tiennent vraiment pour l'équipe.");
    else caution.push("Il manque encore des tests d'uptime pour confirmer quels effets tiennent vraiment pour l'équipe.");
    if (hasCombined) support.push("Les tests Combined aident à voir quelles paires valent vraiment la peine d'être gardées.");
    if (hasTagBurst || hasTagWindow) support.push("Les tests tag avancés aident à voir qui doit relayer vers Burst et qui doit préparer la fenêtre.");
    if (hasElementalStatus) support.push("Les tests de statut élémentaire aident à voir quels setups gardent vraiment leurs stacks et contrôles.");
  }

  if (byProto.STAT_PRIORITY_DELTA && confidenceRank(byProto.STAT_PRIORITY_DELTA.confidence) >= 2) {
    support.push("Les tests de priorité de stats aident à voir quel axe rapporte le plus à l'équipe.");
  }

  if (bossOverlay) {
    const frictionText = (bossOverlay.friction || []).join(' ').toLowerCase();
    const hasWindowFriction = frictionText.includes('fenêtre') || frictionText.includes('stagger') || frictionText.includes('interrupt');
    if (hasWindowFriction) {
      const hasCd = byProto.COOLDOWN_REAL && confidenceRank(byProto.COOLDOWN_REAL.confidence) >= 2;
      const hasUptime = byProto.BUFF_UPTIME && confidenceRank(byProto.BUFF_UPTIME.confidence) >= 2;
      const hasPhase = byProto.PHASE_SPECIFIC_WINDOW_DELTA && confidenceRank(byProto.PHASE_SPECIFIC_WINDOW_DELTA.confidence) >= 2;
      const hasInterrupt = byProto.BOSS_INTERRUPT_PENALTY && confidenceRank(byProto.BOSS_INTERRUPT_PENALTY.confidence) >= 2;
      const hasRecovery = byProto.BOSS_PATTERN_RECOVERY_DELTA && confidenceRank(byProto.BOSS_PATTERN_RECOVERY_DELTA.confidence) >= 2;
      if (hasCd || hasUptime || hasPhase || hasInterrupt) support.push("Les résultats publiés aident mieux à lire le moment dangereux du boss et ce qu'il interrompt vraiment.");
      else caution.push("Il manque encore des résultats publiés pour confirmer le moment dangereux du boss et ce qu'il interrompt vraiment.");
      if (hasRecovery) support.push("Les tests de recovery aident à voir ce qui repart vraiment après le pattern dangereux du boss.");
    }
    if (byProto.BOSS_PRESSURE_DELTA && confidenceRank(byProto.BOSS_PRESSURE_DELTA.confidence) >= 2) {
      support.push('Les tests boss pressure aident à voir quels setups perdent le plus de valeur quand le boss casse le rythme.');
    } else {
      caution.push('Il manque encore des tests boss pressure pour savoir ce qui tient le mieux sous pression boss.');
    }
    const hasElement = byProto.ELEMENT_MATCHUP_DELTA && confidenceRank(byProto.ELEMENT_MATCHUP_DELTA.confidence) >= 2;
    const hasShred = byProto.RES_SHRED_DELTA && confidenceRank(byProto.RES_SHRED_DELTA.confidence) >= 2;
    if (hasElement || hasShred) support.push("Les tests élémentaires aident à voir si l'équipe gagne plus via le bon matchup ou via une baisse de résistance.");
  }

  return {
    support: Array.from(new Set(support)).slice(0, 4),
    caution: Array.from(new Set(caution)).slice(0, 4),
    available: summarizeSnapshotRefs(published).slice(0, 6),
  };
}

export function buildCompoEvidence(team, published = [], boss = null, bossOverlay = null) {
  const refs = slicePublishedForTeam(published, team, boss || bossOverlay?.boss || null);
  return {
    refs,
    summary: summarizeSnapshotRefs(refs),
    lab: buildLabOverlay(team, refs, bossOverlay),
  };
}


export function buildTeamAdvice(team, lab = null) {
  const lines = [];
  if (team.opener?.name) lines.push(`Laisse **${team.opener.name}** bien démarrer le combat si possible.`);
  if (team.converter?.name) lines.push(`Garde **${team.converter.name}** pour le vrai tour de dégâts.`);
  if (team.stabilizer?.name) lines.push(`Protège **${team.stabilizer.name}** si le combat devient brouillon.`);
  if (team.gaps?.[0]) lines.push(`Corrige d’abord : ${String(team.gaps[0]).replace(/^❗\s*/, '')}.`);
  if (lab?.support?.[0]) lines.push(lab.support[0]);
  if (lab?.support?.[1]) lines.push(lab.support[1]);
  else if (!lab?.support?.length && lab?.caution?.[0]) lines.push(lab.caution[0]);
  return lines.slice(0, 3);
}

export function buildBossAdvice(team, bossOverlay, lab = null) {
  const lines = [];
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const scienceLines = buildBossCrossReadingLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 3);
  const phaseLines = buildBossPhaseTeamDecisionLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2);
  const windowLines = buildBossTeamWindowLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2);
  const recoveryLines = buildBossRecoveryLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2);
  if (bossOverlay?.moment) lines.push(`Garde tes ressources importantes pour : **${bossOverlay.moment}**.`);
  if (phaseLines[0]) lines.push(phaseLines[0]);
  if (windowLines[0]) lines.push(windowLines[0]);
  if (bossOverlay?.exposed?.name) lines.push(`Surveille surtout **${bossOverlay.exposed.name}** : c’est le perso le plus exposé ici.`);
  if (bossOverlay?.friction?.[0]) lines.push(`Le plus gros problème du combat : ${bossOverlay.friction[0]}.`);
  if (scienceLines[0]) lines.push(scienceLines[0]);
  if (!phaseLines.length && team?.converter?.name) lines.push(`Évite d’utiliser trop tôt **${team.converter.name}** si le boss demande une vraie fenêtre.`);
  if (phaseLines[1]) lines.push(phaseLines[1]);
  if (windowLines[1]) lines.push(windowLines[1]);
  if (recoveryLines[0]) lines.push(recoveryLines[0]);
  if (scienceLines[1]) lines.push(scienceLines[1]);
  if (lab?.support?.[0]) lines.push(lab.support[0]);
  if (lab?.support?.[1]) lines.push(lab.support[1]);
  else if (!lab?.support?.length && lab?.caution?.[0]) lines.push(lab.caution[0]);
  return lines.slice(0, 3);
}

export function buildTeamDecisionLines(team, lab = null, bossOverlay = null) {
  const lines = [];
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const teamFit = buildBossTeamFitLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2);
  const teamWindow = buildBossTeamWindowLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2);
  const bossWindow = buildBossWindowDecisionLines(scienceBoss, sciencePhases, bossOverlay?.sectionKey || null, 1);
  let priority1 = null;
  if ((team.gaps || []).length) {
    const gap = String(team.gaps[0] || '');
    if (gap.includes('ouverture')) priority1 = "**Priorité 1** · Ajoute d'abord un meilleur démarrage.";
    else if (gap.includes('dégâts') || gap.includes('finir')) priority1 = "**Priorité 1** · Ajoute d'abord plus de dégâts.";
    else if (gap.includes('stabilisation') || gap.includes('tenue')) priority1 = "**Priorité 1** · Ajoute d'abord plus de tenue.";
  }
  if (!priority1 && teamFit[0]) priority1 = `**Priorité 1** · ${teamFit[0].charAt(0).toUpperCase()}${teamFit[0].slice(1)}`;
  if (!priority1 && teamWindow[0]) priority1 = `**Priorité 1** · ${teamWindow[0].charAt(0).toUpperCase()}${teamWindow[0].slice(1)}`;
  if (!priority1 && team.deps?.[0]) priority1 = `**Priorité 1** · Sécurise d'abord : ${String(team.deps[0]).replace(/^⚠️\s*/, '')}.`;
  if (priority1) lines.push(priority1);

  if (bossOverlay?.moment && team.converter?.name) lines.push(`**Priorité 2** · Garde **${team.converter.name}** pour **${bossOverlay.moment}**.`);
  else if (bossWindow[0]) lines.push(`**Priorité 2** · ${bossWindow[0].charAt(0).toUpperCase()}${bossWindow[0].slice(1)}`);
  else if (team.stabilizer?.name) lines.push(`**Priorité 2** · Garde **${team.stabilizer.name}** pour stabiliser l'équipe.`);

  if (teamFit[1]) lines.push(`**Priorité 3** · ${teamFit[1].charAt(0).toUpperCase()}${teamFit[1].slice(1)}`);
  else if (teamWindow[1]) lines.push(`**Priorité 3** · ${teamWindow[1].charAt(0).toUpperCase()}${teamWindow[1].slice(1)}`);
  else if (lab?.support?.[0]) lines.push(`**Priorité 3** · Tests : ${lab.support[0].replace(/^Les résultats publiés\s*/i, '')}`);
  else if (lab?.caution?.[0]) lines.push(`**Priorité 3** · Prudence : ${lab.caution[0].replace(/^Il manque encore\s*/i, 'il manque encore ')}`);
  else if (team.saves?.[0]) lines.push(`**Priorité 3** · Garde un filet de sécurité : ${String(team.saves[0]).replace(/^•\s*/, '')}.`);
  return lines.slice(0, 3);
}
