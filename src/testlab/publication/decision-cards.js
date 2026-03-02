function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function uniqueList(...groups) {
  return Array.from(new Set(groups.flatMap((group) => Array.isArray(group) ? group : [group]).map((x) => String(x || '').trim()).filter(Boolean)));
}

function snapshotContexts(snapshot = {}) {
  return snapshot?.contexts && typeof snapshot.contexts === 'object' ? snapshot.contexts : {};
}

function firstFocusLabel(snapshot = {}) {
  const ctx = snapshotContexts(snapshot);
  const candidates = [
    ['phase', uniqueList(ctx.phases, ctx.phaseIds)],
    ['burst', uniqueList(ctx.burstEffects, ctx.burst_effect_ids, ctx.burstFamilies, ctx.burst_families)],
    ['combined', uniqueList(ctx.combinedAttacks, ctx.combined_attack_ids)],
    ['esquive', uniqueList(ctx.evadeRules, ctx.evade_rule_ids)],
    ['élément', uniqueList(ctx.elements, ctx.elementIds)],
    ['boss', uniqueList(ctx.bosses)],
    ['scénario', uniqueList(ctx.scenarios, ctx.scenarioIds)],
    ['arme équipable', uniqueList(ctx.equippableWeapons, ctx.equippable_weapon_ids)],
    ['arme', uniqueList(ctx.weaponNames)],
    ['perso', uniqueList(ctx.characters)],
  ];
  for (const [label, values] of candidates) {
    if (values.length) return `${label} ${values[0]}`;
  }
  return null;
}

function withFocus(summary, snapshot = {}) {
  const focus = firstFocusLabel(snapshot);
  return focus ? `${summary} (${focus}).` : `${summary}.`;
}

function addMetricCard(cards, kind, title, metricAvg, positiveSummary, negativeSummary, snapshot) {
  if (metricAvg == null) return;
  cards.push({
    kind,
    title,
    summary: withFocus(metricAvg >= 1 ? positiveSummary : negativeSummary, snapshot),
  });
}

export function buildDecisionCards(protoId, snapshot = {}) {
  const metricAvg = safeNumber(snapshot?.contexts?.metric_avg ?? snapshot?.metric_avg);
  const cards = [];

  if (protoId === 'WEAPON_SKILL_DELTA') {
    addMetricCard(cards, 'weapon_delta', 'Lecture rapide', metricAvg,
      'Le kit testé garde un avantage moyen dans les données publiées',
      'Le kit testé ne montre pas d’avantage moyen publié',
      snapshot,
    );
  }

  if (protoId === 'STAT_PRIORITY_DELTA') {
    addMetricCard(cards, 'stat_priority', 'Priorité de stat', metricAvg,
      'L’axe testé garde une meilleure valeur moyenne dans la preuve publiée',
      'L’axe testé ne dépasse pas clairement la référence publiée',
      snapshot,
    );
  }

  if (protoId === 'BOSS_PRESSURE_DELTA') {
    addMetricCard(cards, 'boss_pressure', 'Tenue sous pression', metricAvg,
      'Le setup tient correctement sous pression boss',
      'Le setup semble perdre de la valeur quand le boss casse le rythme',
      snapshot,
    );
  }

  if (protoId === 'BURST_STATE_DELTA') {
    addMetricCard(cards, 'burst_state', 'État Burst', metricAvg,
      'Le plan de jeu gagne bien de la valeur quand le bon état Burst est actif',
      'Le gain du Burst reste limité ou trop instable pour être central',
      snapshot,
    );
  }

  if (protoId === 'ELEMENT_MATCHUP_DELTA') {
    addMetricCard(cards, 'element_matchup', 'Matchup élémentaire', metricAvg,
      'Le bon matchup élémentaire apporte un vrai gain publié',
      'Le matchup élémentaire testé ne crée pas encore un gain net publié',
      snapshot,
    );
  }

  if (protoId === 'TAG_TO_BURST_CHAIN') {
    addMetricCard(cards, 'tag_to_burst', 'Chaîne tag → Burst', metricAvg,
      'Le relais tag vers Burst crée un vrai gain publié quand la chaîne est propre',
      'La chaîne tag vers Burst ne crée pas encore un avantage net publié',
      snapshot,
    );
  }

  if (protoId === 'TAG_WINDOW_GAIN') {
    addMetricCard(cards, 'tag_window', 'Fenêtre préparée par tag', metricAvg,
      'Préparer la fenêtre via tag semble réellement payant dans les données publiées',
      'La fenêtre préparée par tag ne crée pas encore un avantage net publié',
      snapshot,
    );
  }

  if (protoId === 'PHASE_SPECIFIC_WINDOW_DELTA') {
    addMetricCard(cards, 'phase_window', 'Fenêtre de phase', metricAvg,
      'La bonne fenêtre de phase vaut vraiment la peine d’être préparée',
      'La fenêtre de phase testée ne crée pas encore un avantage net publié',
      snapshot,
    );
  }

  if (protoId === 'BOSS_INTERRUPT_PENALTY') {
    addMetricCard(cards, 'boss_interrupt', 'Pénalité d’interruption', metricAvg,
      'Le setup perd clairement de la valeur quand le boss interrompt la séquence',
      'La séquence testée résiste plutôt bien aux interruptions du boss',
      snapshot,
    );
  }

  if (protoId === 'BURST_TRIGGER_WEAPON_DELTA') {
    addMetricCard(cards, 'burst_trigger_weapon', 'Déclenchement via arme', metricAvg,
      'Déclencher ou ouvrir la fenêtre Burst via l’arme testée rapporte réellement',
      'L’ouverture Burst via l’arme testée ne crée pas encore un gain net publié',
      snapshot,
    );
  }

  if (protoId === 'BURST_WINDOW_HOLD_VALUE') {
    addMetricCard(cards, 'burst_hold', 'Valeur du hold Burst', metricAvg,
      'Garder la ressource pour la vraie fenêtre Burst semble payant',
      'Hold la ressource ne donne pas encore un avantage net publié',
      snapshot,
    );
  }

  if (protoId === 'COMBINED_SKILL_DELTA') {
    addMetricCard(cards, 'combined_skill', 'Combined Attack / skill', metricAvg,
      'La paire testée vaut la peine d’être gardée pour une Combined propre',
      'La Combined testée ne dépasse pas clairement la séquence de référence',
      snapshot,
    );
  }

  if (protoId === 'SUCCESSFUL_EVADE_BONUS_DELTA') {
    addMetricCard(cards, 'evade_bonus', 'Bonus d’esquive réussie', metricAvg,
      'La valeur du setup dépend bien d’une esquive réussie propre',
      'Le bonus d’esquive testée ne change pas encore assez le résultat publié',
      snapshot,
    );
  }

  if (protoId === 'ELEMENTAL_STATUS_UPTIME') {
    addMetricCard(cards, 'elemental_status', 'Uptime de statut', metricAvg,
      'Le statut élémentaire testé tient assez bien pour soutenir le plan de jeu',
      'Le statut élémentaire testé ne tient pas encore assez pour être un vrai pilier',
      snapshot,
    );
  }

  if (protoId === 'BOSS_PATTERN_RECOVERY_DELTA') {
    addMetricCard(cards, 'boss_recovery', 'Récupération post-pattern', metricAvg,
      'Le setup récupère correctement après le pattern ou la coupure du boss',
      'Le setup récupère mal après le pattern du boss et perd du tempo',
      snapshot,
    );
  }

  return cards;
}
