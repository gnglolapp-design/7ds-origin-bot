const TAG_LABELS = {
  reposition_check: 'repositionnement fréquent',
  range_check: 'distance à stabiliser',
  melee_check: 'mêlée à contrôler',
  front_pressure: 'pression frontale',
  front_risk: 'avant dangereux',
  rear_punish: 'le dos se fait punir',
  objective_positioning: 'placement lié à l’objectif',
  burst_on_knockdown: 'Burst sur knockdown',
  burst_sensitive: 'gros tour sensible à la fenêtre',
  hold_for_window: 'garder le Burst pour la vraie fenêtre',
  late_fight_hold: 'garder une ressource pour la fin',
  rotation_break: 'le boss casse facilement la rotation',
  mistake_punish: 'erreur vite punie',
  spawn_damage: 'invocations qui ajoutent de la pression',
  ultimate_finish: 'fin de combat très punitive',
  rear_risk: 'éviter le dos en automatique',
  range_management: 'gérer la distance',
  melee_management: 'gérer le corps à corps',
  execution_punish: 'erreur vite punie',
  range_punish: 'distance punie',
  melee_punish: 'mêlée punie',
  safe_burst: 'fenêtre de Burst sûre',
  stable_uptime: 'bonne tenue des effets',
  knockdown_window: 'fenêtre de knockdown',
  interrupt_window: 'fenêtre d’interruption',
  interrupt_risk: 'interruptions qui cassent le setup',
  phase_variance: 'phase très variable',
  uptime_break: 'uptime cassé',
  ranged_window: 'fenêtre favorable à distance',
  late_fight_pressure: 'pression forte en fin de phase',
  vertical_pressure: 'pression verticale',
  reposition_window: 'fenêtre courte pour se replacer',
  recovery_window: 'petite fenêtre de reprise',
  objective_window: 'fenêtre liée à un objectif',
  interrupt_gate: 'interruption obligatoire avant de rouvrir le plan',
  objective_burst_window: 'fenêtre de Burst après objectif',
  burst_after_objective: 'Burst surtout rentable après l’objectif',
  pattern_spike: 'pic de danger sur certains patterns',
  shield_break: 'casser le bouclier',
  aerial_transition: 'gérer la transition aérienne',
  climb_core: 'gérer le core / la montée',
  summon_sequence: 'gérer la séquence d’invocation',
  burst_check: 'vérifie le plan Burst',
  objective_check: 'vérifie l’objectif de phase',
  uptime_check: 'vérifie la tenue des effets',
  angle_check: 'vérifie les angles / la trajectoire',
  objective_delay: 'objectif raté ou trop lent',
  interrupt_drop: 'interrupt raté',
  animation_recovery: 'grosse recovery visible',
  pattern_recovery_window: 'reprise après pattern',
  repositioning: 'repositionnement imposé',
  angle_discipline: 'angles à respecter',
  late_fight_punish: 'fin de phase très punitive',
  gate_phase: 'phase verrou de progression',
  burst_phase: 'phase de vraie ouverture dégâts',
  survival_phase: 'phase de tenue / survie',
  transition_phase: 'phase de transition',
  micro_window: 'micro-fenêtre utile',
  forced_reset: 'reset forcé avant reprise',
  post_evade_window: 'fenêtre après esquive',
  interrupt_burst_window: 'fenêtre après interrupt',
};

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function tagLabel(value) {
  const key = String(value || '').trim();
  return TAG_LABELS[key] || key.replace(/_/g, ' ');
}

function prettyList(values = [], limit = 3) {
  const arr = Array.from(new Set((values || []).map(tagLabel).filter(Boolean)));
  if (!arr.length) return null;
  const head = arr.slice(0, limit).join(', ');
  return arr.length > limit ? `${head} +${arr.length - limit}` : head;
}

function pressureLabel(value) {
  if (value === 'high') return 'haute';
  if (value === 'medium') return 'moyenne';
  if (value === 'low') return 'faible';
  return 'inconnue';
}

function priorityLabel(value) {
  if (value >= 7) return 'critique';
  if (value >= 5) return 'haute';
  if (value >= 3) return 'moyenne';
  return 'basse';
}

function criticalityLine(phase = {}) {
  const tags = prettyList(phase?.criticality_tags, 2);
  const score = Number(phase?.priority_score || 0);
  if (!tags && !score) return null;
  const bits = [];
  if (score) bits.push(`priorité ${priorityLabel(score)}`);
  if (tags) bits.push(tags);
  return bits.join(' · ');
}

function reliefLabel(value) {
  if (value === 'high') return 'le multi soulage beaucoup';
  if (value === 'medium') return 'le multi aide';
  if (value === 'low') return 'le multi change peu';
  return 'effet multi encore flou';
}

function phaseLine(phase = {}) {
  const bits = [];
  if (phase?.pressure_level) bits.push(`pression ${pressureLabel(phase.pressure_level)}`);
  const criticality = criticalityLine(phase);
  if (criticality) bits.push(criticality);
  const windows = prettyList(phase?.recovery_window_tags?.length ? phase.recovery_window_tags : phase.window_tags, 2);
  if (windows) bits.push(`fenêtres ${windows}`);
  const risks = prettyList(phase?.risk_tags, 2);
  if (risks) bits.push(`risques ${risks}`);
  return `• **${phase?.name || phase?.phase_key || phase?.phase_id || 'Phase'}** — ${bits.join(' · ')}`;
}

function phaseMatchScore(phase = {}, sectionKey = '') {
  const target = norm(sectionKey);
  if (!target) return -1;
  const values = [phase?.phase_key, phase?.source_section_key, phase?.name, phase?.summary].map(norm);
  let score = -1;
  for (const value of values) {
    if (!value) continue;
    if (value === target) score = Math.max(score, 5);
    if (value.includes(target) || target.includes(value)) score = Math.max(score, 4);
  }
  const aliases = {
    ground: ['sol', 'ground'],
    flight: ['air', 'aerien', 'vol', 'flight'],
    enrage: ['enrage', 'ultime', 'rage'],
    climb: ['climb', 'core', 'montee'],
    'later-phases': ['later', 'phase', 'late'],
    phase1: ['phase1', 'phase 1'],
    overview: ['overview', 'core', 'strategy'],
  };
  const aliasList = aliases[target] || [];
  for (const alias of aliasList) {
    if (values.some((value) => value.includes(alias))) score = Math.max(score, 3);
  }
  return score;
}

function relevantPhases(sciencePhases = [], sectionKey = null) {
  const list = Array.isArray(sciencePhases) ? sciencePhases.filter(Boolean) : [];
  if (!list.length) return [];
  const rank = (phase) => Number(phase?.priority_score || 0);
  if (!sectionKey) return list.slice().sort((a, b) => rank(b) - rank(a) || (b?.burst_window_hint ? 1 : 0) - (a?.burst_window_hint ? 1 : 0));
  const scored = list
    .map((phase) => ({ phase, score: phaseMatchScore(phase, sectionKey) }))
    .sort((a, b) => b.score - a.score || rank(b.phase) - rank(a.phase) || (b.phase?.burst_window_hint ? 1 : 0) - (a.phase?.burst_window_hint ? 1 : 0));
  const best = scored[0]?.score ?? -1;
  if (best >= 3) return scored.filter((entry) => entry.score >= best).map((entry) => entry.phase);
  return list.slice().sort((a, b) => rank(b) - rank(a) || (b?.burst_window_hint ? 1 : 0) - (a?.burst_window_hint ? 1 : 0));
}

function uniqueLines(lines = [], limit = 4) {
  return Array.from(new Set((lines || []).map((x) => String(x || '').trim()).filter(Boolean))).slice(0, limit);
}

function totalOf(team = {}, keys = []) {
  return (keys || []).reduce((sum, key) => sum + Number(team?.total?.[key] || 0), 0);
}

function primaryPhase(sciencePhases = [], sectionKey = null) {
  return relevantPhases(sciencePhases, sectionKey)[0] || null;
}

function phaseRecoverySet(scienceBoss = null, phase = null) {
  return new Set([
    ...(scienceBoss?.recovery_window_tags || []),
    ...(phase?.recovery_window_tags || []),
    ...(phase?.window_tags || []),
  ]);
}

function phaseRiskSet(scienceBoss = null, phase = null) {
  return new Set([
    ...(phase?.risk_tags || []),
    ...(scienceBoss?.hazard_tags || []),
    ...(scienceBoss?.science?.known_risks || []),
  ]);
}

export function getRelevantBossPhases(sciencePhases = [], sectionKey = null, limit = 3) {
  return relevantPhases(sciencePhases, sectionKey).slice(0, limit);
}

export function buildBossTeamFitLines(scienceBoss = null, sciencePhases = [], team = null, sectionKey = null, limit = 4) {
  if (!scienceBoss || !team) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  const lines = [];
  const objectives = new Set([...(scienceBoss?.objective_tags || []), ...(phase?.objective_tags || [])]);
  const controls = new Set([...(phase?.control_tags || []), ...(scienceBoss?.interrupt_profile?.blue_interrupt_required ? ['interrupt_check'] : [])]);
  const windows = new Set([...(scienceBoss?.recovery_window_tags || []), ...(phase?.recovery_window_tags || []), ...(phase?.window_tags || [])]);
  const criticality = new Set(phase?.criticality_tags || []);
  const controlTotal = totalOf(team, ['control']);
  const stabilizeTotal = totalOf(team, ['stabilize', 'sustain']);
  const burstTotal = totalOf(team, ['convert', 'burst']);
  const setupTotal = totalOf(team, ['open', 'control', 'utility']);
  const tempoTotal = totalOf(team, ['tempo', 'sustain', 'stabilize']);
  const isFragile = String(team?.balance || '').toLowerCase().includes('fragile');
  const singleCarry = Boolean(team?.converter?.name) && burstTotal >= 3 && (Number(team?.converter?.s?.convert || 0) + Number(team?.converter?.s?.burst || 0) >= Math.max(3, burstTotal - 1));

  if ((controls.has('interrupt_check') || phase?.blue_interrupt_hint || scienceBoss?.interrupt_profile?.blue_interrupt_required) && controlTotal < 2) {
    lines.push("il manque encore un vrai contrôle / interrupt pour rendre ce boss plus stable.");
  } else if ((controls.has('interrupt_check') || phase?.blue_interrupt_hint || scienceBoss?.interrupt_profile?.blue_interrupt_required) && controlTotal >= 2) {
    lines.push("l’équipe a déjà assez de contrôle pour respecter la vraie fenêtre d’interrupt.");
  }

  if ((criticality.has('gate_phase') || objectives.has('shield_break') || objectives.has('climb_core') || objectives.has('summon_sequence')) && team?.converter?.name) {
    lines.push(`garde **${team.converter.name}** pour l’après-objectif plutôt que de le vider trop tôt.`);
  }

  if ((scienceBoss?.pressure_profile === 'high' || phase?.pressure_level === 'high' || criticality.has('survival_phase')) && (stabilizeTotal < 3 || isFragile)) {
    lines.push("la tenue reste le point faible : sous cette pression, l’équipe perd vite sa vraie valeur.");
  } else if ((scienceBoss?.pressure_profile === 'high' || phase?.pressure_level === 'high' || criticality.has('survival_phase')) && stabilizeTotal >= 3) {
    lines.push("l’équipe a assez de tenue pour traverser la phase sale sans tout casser.");
  }

  if ((controls.has('uptime_check') || windows.has('uptime_break')) && tempoTotal < 3) {
    lines.push("le setup risque de retomber trop vite : il faut mieux rejouer les effets ou stabiliser le rythme.");
  }

  if ((criticality.has('burst_phase') || controls.has('burst_check') || windows.has('objective_burst_window') || phase?.burst_window_hint) && burstTotal >= 3) {
    lines.push("l’équipe a bien un vrai tour dégâts, mais il faut l’ouvrir seulement sur la bonne fenêtre.");
  } else if ((criticality.has('burst_phase') || controls.has('burst_check') || windows.has('objective_burst_window') || phase?.burst_window_hint) && burstTotal < 3) {
    lines.push("la phase donne une vraie fenêtre dégâts, mais l’équipe manque encore d’un finisher net pour la punir.");
  }

  if (criticality.has('transition_phase') && setupTotal < 3) {
    lines.push("la transition risque de casser le plan : il manque encore assez d’ouverture ou d’utilité pour la sécuriser.");
  } else if (criticality.has('transition_phase') && setupTotal >= 3) {
    lines.push("l’équipe a assez d’ouverture pour garder la transition propre avant de repartir.");
  }

  if ((phase?.multiplayer_relief_hint || scienceBoss?.multiplayer_relief === 'high') && team?.picks?.length >= 3) {
    lines.push("ce boss récompense surtout une exécution propre à plusieurs, pas un seul carry qui force tout.");
  }

  if (singleCarry && (criticality.has('gate_phase') || criticality.has('survival_phase') || phase?.pressure_level === 'high')) {
    lines.push(`le setup dépend encore trop de **${team.converter.name}** au moment où la phase punit le plus.`);
  }

  if ((phase?.melee_pressure_hint && phase?.ranged_pressure_hint) || (phase?.risk_tags || []).includes('execution_punish')) {
    lines.push("les erreurs de position ou de tempo coûtent cher : garde un plan simple avant de chercher le max dégâts.");
  }

  return uniqueLines(lines, limit);
}

export function buildBossRecoveryLines(scienceBoss = null, sciencePhases = [], team = null, sectionKey = null, limit = 4) {
  if (!scienceBoss) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return [];
  const lines = [];
  const recoveries = phaseRecoverySet(scienceBoss, phase);
  const risks = phaseRiskSet(scienceBoss, phase);
  const criticality = new Set(phase?.criticality_tags || []);
  const controlTotal = totalOf(team, ['control']);
  const stabilizeTotal = totalOf(team, ['stabilize', 'sustain']);
  const burstTotal = totalOf(team, ['convert', 'burst']);
  const tempoTotal = totalOf(team, ['tempo', 'sustain', 'stabilize']);
  const setupTotal = totalOf(team, ['open', 'control', 'utility']);
  const singleCarry = Boolean(team?.converter?.name) && burstTotal >= 3 && (Number(team?.converter?.s?.convert || 0) + Number(team?.converter?.s?.burst || 0) >= Math.max(3, burstTotal - 1));

  if (recoveries.has('pattern_recovery_window') || recoveries.has('animation_recovery') || recoveries.has('recovery_window')) {
    if (tempoTotal >= 3) lines.push(`après le pattern, l’équipe peut repartir proprement si elle garde encore de quoi relancer **${phase?.name || 'la phase'}**.`);
    else lines.push(`la reprise après pattern reste fragile : attends la vraie recovery de **${phase?.name || 'cette phase'}** avant de rouvrir le plan.`);
  }

  if (recoveries.has('objective_burst_window') && team?.converter?.name) {
    lines.push(`si l’objectif tombe, garde surtout **${team.converter.name}** pour la reprise juste après.`);
  }

  if (recoveries.has('interrupt_burst_window') || scienceBoss?.interrupt_profile?.knockdown_window) {
    if (controlTotal >= 2) lines.push('si l’interrupt passe, la meilleure reprise devient beaucoup plus stable.');
    else lines.push('un interrupt raté retire souvent la reprise la plus propre de la phase.');
  }

  if ((criticality.has('survival_phase') || phase?.pressure_level === 'high' || risks.has('execution_punish')) && stabilizeTotal < 3) {
    lines.push('sous cette pression, la reprise se perd vite si la tenue tombe avant la fin du pattern.');
  }

  if (phase?.evade_pressure_hint && setupTotal < 3) {
    lines.push('garde une marge d’esquive puis relance seulement ce qui remet le plan propre.');
  }

  if (singleCarry && (recoveries.has('pattern_recovery_window') || criticality.has('burst_phase'))) {
    lines.push(`si **${team.converter.name}** manque la reprise, le rendement du setup chute fortement.`);
  }

  return uniqueLines(lines, limit);
}

export function buildBossTeamWindowLines(scienceBoss = null, sciencePhases = [], team = null, sectionKey = null, limit = 4) {
  if (!scienceBoss || !team) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return [];
  const lines = [];
  const recoveries = phaseRecoverySet(scienceBoss, phase);
  const risks = phaseRiskSet(scienceBoss, phase);
  const criticality = new Set(phase?.criticality_tags || []);
  const burstTotal = totalOf(team, ['convert', 'burst']);
  const controlTotal = totalOf(team, ['control']);
  const stabilizeTotal = totalOf(team, ['stabilize', 'sustain']);
  const tempoTotal = totalOf(team, ['tempo', 'stabilize', 'sustain']);
  const setupTotal = totalOf(team, ['open', 'control', 'utility']);

  if (criticality.has('gate_phase') && team?.converter?.name) {
    lines.push(`garde **${team.converter.name}** tant que le verrou n'est pas tombé : la vraie fenêtre vient après.`);
  }
  if ((recoveries.has('objective_burst_window') || recoveries.has('interrupt_burst_window') || criticality.has('burst_phase')) && burstTotal < 3) {
    lines.push("la phase donne une vraie fenêtre, mais l'équipe manque encore d'un finisher propre pour la punir.");
  } else if ((recoveries.has('objective_burst_window') || recoveries.has('interrupt_burst_window') || criticality.has('burst_phase')) && team?.converter?.name) {
    lines.push(`la meilleure ouverture mérite surtout **${team.converter.name}**, pas un tour lancé trop tôt.`);
  }
  if (recoveries.has('micro_window')) {
    if (setupTotal >= 3 && team?.opener?.name) lines.push(`la micro-fenêtre devient jouable si **${team.opener.name}** prépare bien l'ouverture.`);
    else lines.push("la fenêtre est courte : prépare l'ouverture et évite de vouloir tout lancer d'un coup.");
  }
  if ((recoveries.has('post_evade_window') || phase?.evade_pressure_hint) && setupTotal < 3) {
    lines.push("la reprise post-esquive reste fragile : garde plus de marge avant de relancer le tour dégâts.");
  }
  if ((recoveries.has('interrupt_burst_window') || phase?.blue_interrupt_hint) && controlTotal < 2) {
    lines.push("sans interrupt fiable, l'équipe perd sa meilleure reprise de phase.");
  }
  if ((recoveries.has('pattern_recovery_window') || recoveries.has('animation_recovery')) && tempoTotal < 3) {
    lines.push("après le pattern, il manque encore assez de tempo pour recoller tout de suite au bon plan.");
  } else if ((recoveries.has('pattern_recovery_window') || recoveries.has('animation_recovery')) && team?.opener?.name) {
    lines.push(`après le pattern, **${team.opener.name}** peut aider à recoller au bon rythme si la reprise reste propre.`);
  }
  if ((criticality.has('survival_phase') || phase?.pressure_level === 'high' || risks.has('execution_punish')) && stabilizeTotal < 3) {
    lines.push("sous cette pression, la vraie fenêtre disparaît vite si la tenue casse avant la reprise.");
  }
  if ((recoveries.has('forced_reset') || risks.has('rotation_break')) && burstTotal >= 3) {
    lines.push("si le boss force un reset, reconstruis d'abord le setup au lieu de jeter ton gros tour à vide.");
  }

  return uniqueLines(lines, limit);
}

export function buildBossCrossReadingLines(scienceBoss = null, sciencePhases = [], team = null, sectionKey = null, limit = 4) {
  return uniqueLines([
    ...buildBossScienceActionLines(scienceBoss, sciencePhases, sectionKey, 2),
    ...buildBossTeamFitLines(scienceBoss, sciencePhases, team, sectionKey, 2),
    ...buildBossTeamWindowLines(scienceBoss, sciencePhases, team, sectionKey, 2),
    ...buildBossRecoveryLines(scienceBoss, sciencePhases, team, sectionKey, 2),
  ], limit);
}

export function buildBossPhaseTeamDecisionLines(scienceBoss = null, sciencePhases = [], team = null, sectionKey = null, limit = 4) {
  if (!scienceBoss || !team) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return [];
  const lines = [];
  const criticality = new Set(phase?.criticality_tags || []);
  const controlTotal = totalOf(team, ['control']);
  const stabilizeTotal = totalOf(team, ['stabilize', 'sustain']);
  const burstTotal = totalOf(team, ['convert', 'burst']);
  const setupTotal = totalOf(team, ['open', 'control', 'utility']);
  const tempoTotal = totalOf(team, ['tempo', 'sustain', 'stabilize']);

  if (criticality.has('gate_phase')) {
    lines.push(`sur **${phase?.name || 'cette phase'}**, traite d’abord le verrou : le rendement vient après.`);
    if (team?.converter?.name) lines.push(`ne jette pas trop tôt **${team.converter.name}** tant que le verrou n’est pas tombé.`);
  }
  if (criticality.has('burst_phase')) {
    if (burstTotal >= 3 && team?.converter?.name) lines.push(`la vraie fenêtre de **${phase?.name || 'cette phase'}** mérite surtout **${team.converter.name}**.`);
    else lines.push(`la phase ouvre une vraie fenêtre, mais il manque encore un finisher plus net pour la punir.`);
  }
  if (criticality.has('survival_phase')) {
    if (stabilizeTotal >= 3 && team?.stabilizer?.name) lines.push(`la tenue de **${team.stabilizer.name}** aide vraiment à traverser **${phase?.name || 'cette phase'}**.`);
    else lines.push(`**${phase?.name || 'cette phase'}** reste surtout une phase de tenue : sécurise mieux la survie avant le rendement.`);
  }
  if (criticality.has('transition_phase')) {
    if (setupTotal >= 3 && team?.opener?.name) lines.push(`la transition se relit bien si **${team.opener.name}** garde l’ouverture propre.`);
    else lines.push(`la transition risque de casser le plan : il manque encore assez d’ouverture pour la sécuriser.`);
  }
  if ((phase?.blue_interrupt_hint || scienceBoss?.interrupt_profile?.blue_interrupt_required) && controlTotal < 2) {
    lines.push('cette phase demande un interrupt plus fiable que ce que l’équipe apporte aujourd’hui.');
  }
  if ((phase?.control_tags || []).includes('uptime_check') && tempoTotal < 3) {
    lines.push('cette phase casse vite les effets : rejoue le setup au lieu de supposer qu’il tiendra tout seul.');
  }
  return uniqueLines(lines, limit);
}


export function buildBossPhaseDecisionLines(scienceBoss = null, sciencePhases = [], sectionKey = null, limit = 3) {
  if (!scienceBoss) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return [];
  const lines = [];
  const objectives = new Set(phase?.objective_tags || []);
  const recoveries = new Set([...(phase?.recovery_window_tags || []), ...(phase?.window_tags || [])]);
  const controls = new Set(phase?.control_tags || []);
  const criticality = new Set(phase?.criticality_tags || []);

  if (criticality.has('gate_phase')) lines.push('cette phase sert surtout de verrou : respecte-la avant de chercher ton vrai rendement.');
  if (criticality.has('survival_phase')) lines.push('priorité à la tenue et au plan propre : la valeur réelle chute vite si tu forces.');
  if (criticality.has('transition_phase')) lines.push('traite-la comme une transition à sécuriser, pas comme une vraie phase de dégâts continue.');
  if (criticality.has('burst_phase')) lines.push('c’est une vraie phase d’ouverture : garde tes ressources pour ce moment précis.');

  if (objectives.has('shield_break')) lines.push('résous d’abord le bouclier : le vrai plan dégâts commence après.');
  if (objectives.has('climb_core')) lines.push('sécurise d’abord le core / la montée avant de vider tes ressources.');
  if (objectives.has('summon_sequence')) lines.push('nettoie la séquence d’invocation avant de forcer le tour Burst.');
  if (phase?.blue_interrupt_hint || scienceBoss?.interrupt_profile?.blue_interrupt_required) lines.push('garde ton interrupt bleu pour la vraie ouverture de phase.');
  if (recoveries.has('objective_burst_window') || scienceBoss?.burst_plan_tags?.includes('burst_after_objective')) lines.push('ouvre surtout après l’objectif ou la casse de mécanique, pas avant.');
  if (recoveries.has('interrupt_burst_window') || scienceBoss?.interrupt_profile?.knockdown_window) lines.push('si l’interrupt ou le knockdown passe, c’est la meilleure fenêtre pour engager.');
  if (phase?.burst_window_hint && !lines.length) lines.push('ne force pas trop tôt : attends la vraie fenêtre visible de cette phase.');
  if (recoveries.has('pattern_recovery_window')) lines.push('attends la vraie reprise après le pattern au lieu de forcer entre deux animations.');
  if (recoveries.has('animation_recovery')) lines.push('profite plutôt des grosses recoveries visibles que d’une micro-ouverture risquée.');
  if (phase?.evade_pressure_hint) lines.push('garde une marge d’esquive avant de relancer ton tour.');
  if (phase?.melee_pressure_hint && !phase?.ranged_pressure_hint) lines.push('la mêlée souffre plus ici : évite d’y jeter tout ton plan.');
  if (phase?.ranged_pressure_hint && !phase?.melee_pressure_hint) lines.push('la distance est plus taxée ici : profite mieux du corps à corps ou d’une fenêtre courte.');
  if (controls.has('uptime_check')) lines.push('ne compte pas sur une tenue passive trop longue : rejoue ton setup au bon moment.');
  if (controls.has('objective_check') && !objectives.size) lines.push('ne confonds pas phase de préparation et vraie phase de dégâts.');
  if (controls.has('burst_check')) lines.push('cette phase vérifie surtout ton vrai timing Burst, pas ton confort global.');

  return uniqueLines(lines, limit);
}

export function buildBossWindowDecisionLines(scienceBoss = null, sciencePhases = [], sectionKey = null, limit = 4) {
  if (!scienceBoss) return [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return [];
  const lines = [];
  const recoveries = phaseRecoverySet(scienceBoss, phase);
  const risks = phaseRiskSet(scienceBoss, phase);
  const criticality = new Set(phase?.criticality_tags || []);

  if (criticality.has('gate_phase')) lines.push('la vraie fenêtre n’existe qu’après le verrou de phase : ne brûle rien avant.');
  if (recoveries.has('objective_burst_window')) lines.push('la meilleure ouverture vient juste après l’objectif ou la mécanique cassée.');
  if (recoveries.has('interrupt_burst_window') || phase?.blue_interrupt_hint) lines.push('si l’interrupt bleu passe, c’est la reprise la plus propre pour engager.');
  if (recoveries.has('pattern_recovery_window') || recoveries.has('animation_recovery')) lines.push('attends la recovery visible après pattern au lieu de forcer une micro-fenêtre douteuse.');
  if (recoveries.has('post_evade_window') || phase?.evade_pressure_hint) lines.push('garde une marge d’esquive : une partie de la valeur réelle vient de la petite reprise juste après.');
  if (recoveries.has('micro_window')) lines.push('la fenêtre utile est courte : prépare plutôt l’ouverture que de vouloir tout lancer en même temps.');
  if (recoveries.has('forced_reset') || risks.has('rotation_break') || risks.has('interrupt_drop')) lines.push('si le pattern te casse, refais d’abord le plan propre avant de chercher le rendement max.');
  if (criticality.has('burst_phase') && !(recoveries.has('objective_burst_window') || recoveries.has('interrupt_burst_window'))) lines.push('cette phase donne une vraie ouverture, mais seulement si tu arrives dessus avec le setup déjà prêt.');

  return uniqueLines(lines, limit);
}

export function buildBossWindowField(scienceBoss = null, sciencePhases = [], sectionKey = null) {
  if (!scienceBoss) return null;
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return null;
  const recoveries = phaseRecoverySet(scienceBoss, phase);
  const risks = phaseRiskSet(scienceBoss, phase);
  const lines = [];
  const open = [];
  if (recoveries.has('objective_burst_window')) open.push('après objectif');
  if (recoveries.has('interrupt_burst_window') || phase?.blue_interrupt_hint) open.push('après interrupt');
  if (recoveries.has('pattern_recovery_window')) open.push('après pattern');
  if (recoveries.has('animation_recovery')) open.push('sur grosse recovery');
  if (recoveries.has('post_evade_window') || phase?.evade_pressure_hint) open.push('après esquive propre');
  if (!open.length && phase?.burst_window_hint) open.push('sur la vraie fenêtre visible');
  if (open.length) lines.push(`Ouverture réelle : **${open.slice(0,3).join(' · ')}**`);

  const close = [];
  if ((phase?.criticality_tags || []).includes('gate_phase')) close.push('verrou non résolu');
  if (risks.has('rotation_break')) close.push('pattern qui casse la rotation');
  if (risks.has('interrupt_drop')) close.push('interrupt raté');
  if (risks.has('execution_punish')) close.push('erreur de tempo');
  if (close.length) lines.push(`Ce qui ferme la fenêtre : **${close.slice(0,3).join(' · ')}**`);

  const recovery = [];
  if (recoveries.has('micro_window')) recovery.push('micro-fenêtre à préparer');
  if (recoveries.has('forced_reset')) recovery.push('reset avant reprise');
  if (recoveries.has('pattern_recovery_window')) recovery.push('reprise après pattern');
  if (recoveries.has('post_evade_window')) recovery.push('reprise post-esquive');
  if (recovery.length) lines.push(`Lecture reprise : **${recovery.slice(0,3).join(' · ')}**`);

  const plan = buildBossWindowDecisionLines(scienceBoss, sciencePhases, sectionKey, 1)[0];
  if (plan) lines.push(`Conseil : **${plan}**`);
  if (!lines.length) return null;
  return { name: '1d) 🎯 Fenêtre réelle', value: lines.join('\n').slice(0, 1024), inline: false };
}

export function buildBossScienceActionLines(scienceBoss = null, sciencePhases = [], sectionKey = null, limit = 4) {
  if (!scienceBoss) return [];
  const lines = [];
  const phase = primaryPhase(sciencePhases, sectionKey);
  lines.push(...buildBossPhaseDecisionLines(scienceBoss, sciencePhases, sectionKey, 2));
  lines.push(...buildBossWindowDecisionLines(scienceBoss, sciencePhases, sectionKey, 2));
  if (scienceBoss?.interrupt_profile?.blue_interrupt_required) lines.push('prévois au moins une interruption bleue fiable.');
  if (scienceBoss?.interrupt_profile?.knockdown_window) lines.push('garde un vrai plan de dégâts pour la fenêtre de knockdown.');
  if (phase?.burst_window_hint || (phase?.recovery_window_tags || []).includes('objective_burst_window')) lines.push(`la vraie reprise de dégâts arrive surtout sur **${phase?.name || 'cette phase'}**.`);
  if ((phase?.recovery_window_tags || []).includes('pattern_recovery_window')) lines.push('la meilleure reprise vient après le pattern, pas pendant son animation active.');
  if ((phase?.recovery_window_tags || []).includes('animation_recovery')) lines.push('les grosses recoveries visibles donnent une meilleure reprise que les micro-fenêtres forcées.');
  if (phase?.blue_interrupt_hint) lines.push('la phase retombe beaucoup mieux si ton interrupt bleu est disponible au bon moment.');
  if (scienceBoss?.multiplayer_relief === 'high' || phase?.multiplayer_relief_hint) lines.push('en multi, la pression retombe nettement si chacun respecte son rôle.');
  if ((phase?.control_tags || []).includes('objective_check')) lines.push('si l’objectif n’est pas respecté, le boss ne donne pas sa vraie fenêtre de dégâts.');
  if ((phase?.risk_tags || []).includes('interrupt_drop')) lines.push('un interrupt raté casse vite le plan et te renvoie sur une phase sale.');
  const positioning = prettyList(phase?.positioning_tags?.length ? phase.positioning_tags : scienceBoss.positioning_tags, 2);
  if (positioning) lines.push(`le placement compte beaucoup : ${positioning}.`);
  const risks = prettyList([...(phase?.risk_tags || []), ...(scienceBoss?.science?.known_risks || []), ...(scienceBoss?.hazard_tags || [])], 2);
  if (risks) lines.push(`la vraie punition vient surtout de ${risks}.`);
  return uniqueLines(lines, limit);
}

export function buildBossPhaseField(scienceBoss = null, sciencePhases = [], sectionKey = null) {
  const phase = primaryPhase(sciencePhases, sectionKey);
  if (!phase) return null;
  const lines = [];
  lines.push(`Phase retenue : **${phase?.name || phase?.phase_key || 'Phase'}** · pression **${pressureLabel(phase?.pressure_level)}**`);
  const decisionLine = buildBossPhaseDecisionLines(scienceBoss, sciencePhases, sectionKey, 1)[0] || null;
  if (decisionLine) lines.push(`Décision de phase : **${decisionLine}**`);
  const criticality = criticalityLine(phase);
  if (criticality) lines.push(`Criticité : **${criticality}**`);
  const objectives = prettyList(phase?.objective_tags, 2);
  if (objectives) lines.push(`Priorité : **${objectives}**`);
  const windows = prettyList([...(phase?.recovery_window_tags || []), ...(phase?.window_tags || [])], 3);
  if (windows) lines.push(`Fenêtre utile : **${windows}**`);
  const recovery = prettyList(phase?.recovery_window_tags, 2);
  if (recovery) lines.push(`Reprise : **${recovery}**`);
  const controls = prettyList(phase?.control_tags, 2);
  if (controls) lines.push(`Ce que la phase vérifie : **${controls}**`);
  const positioning = prettyList(phase?.positioning_tags, 2);
  if (positioning) lines.push(`Placement : **${positioning}**`);
  const risks = prettyList(phase?.risk_tags, 2);
  if (risks) lines.push(`Punition principale : **${risks}**`);
  const extra = [];
  if (phase?.melee_pressure_hint) extra.push('mêlée sous pression');
  if (phase?.ranged_pressure_hint) extra.push('distance sous pression');
  if (phase?.multiplayer_relief_hint || scienceBoss?.multiplayer_relief === 'high') extra.push('multi utile');
  if (phase?.blue_interrupt_hint) extra.push('interrupt bleu à garder');
  if (extra.length) lines.push(`Lecture rapide : **${extra.join(' · ')}**`);
  return {
    name: '1c) 🧭 Lecture de phase',
    value: lines.join('\n').slice(0, 1024),
    inline: false,
  };
}

export function buildBossScienceField(scienceBoss = null, sciencePhases = [], sectionKey = null) {
  if (!scienceBoss) return null;
  const fields = [];
  fields.push(`Pression **${pressureLabel(scienceBoss.pressure_profile)}** · ${reliefLabel(scienceBoss.multiplayer_relief)}`);

  const interruptBits = [];
  if (scienceBoss?.interrupt_profile?.blue_interrupt_required) interruptBits.push('interrupt bleu critique');
  if (scienceBoss?.interrupt_profile?.tag_interrupt_recommended) interruptBits.push('tag recommandé');
  if (scienceBoss?.interrupt_profile?.knockdown_window) interruptBits.push('fenêtre de knockdown');
  if (interruptBits.length) fields.push(`Interrupts : **${interruptBits.join(' · ')}**`);

  const positioning = prettyList(scienceBoss.positioning_tags, 3);
  if (positioning) fields.push(`Placement : **${positioning}**`);
  const burstPlan = prettyList(scienceBoss.burst_plan_tags, 3);
  if (burstPlan) fields.push(`Plan Burst : **${burstPlan}**`);
  const objectives = prettyList(scienceBoss.objective_tags, 3);
  if (objectives) fields.push(`Objectifs : **${objectives}**`);
  const risks = prettyList([...(scienceBoss?.science?.known_risks || []), ...(scienceBoss?.hazard_tags || [])], 3);
  if (risks) fields.push(`Risques : **${risks}**`);

  if (scienceBoss?.phase_count) {
    const critical = Number(scienceBoss?.critical_phase_count || 0);
    fields.push(`Phases connues : **${scienceBoss.phase_count}**${critical ? ` · phases critiques **${critical}**` : ''}`);
  }
  const scenarios = prettyList(scienceBoss?.science?.recommended_scenarios, 2);
  if (scenarios) fields.push(`Scénarios utiles : **${scenarios}**`);
  const phaseLines = relevantPhases(sciencePhases, sectionKey).slice(0, 2).map(phaseLine);
  if (phaseLines.length) fields.push(`Phases utiles :\n${phaseLines.join('\n')}`);

  return {
    name: 'Lecture science 7DSO',
    value: fields.join('\n').slice(0, 1024),
    inline: false,
  };
}
