function uniqueContextList(values = [], limit = 8) {
  return Array.from(new Set((values || []).map((x) => String(x || '').trim()).filter(Boolean))).slice(0, limit);
}

function compactContextText(values = [], limit = 3) {
  const arr = uniqueContextList(values, 99);
  if (!arr.length) return '—';
  const head = arr.slice(0, limit).join(', ');
  return arr.length > limit ? `${head} +${arr.length - limit}` : head;
}

function protocolContextSourceDocs(docs = []) {
  const valid = docs.filter((d) => d.status === 'ok' && d.metric != null);
  if (valid.length) return valid;
  const weighted = docs.filter((d) => d.metric != null && d.status !== 'reject');
  return weighted.length ? weighted : docs;
}

export function compactPublishedContext(entry) {
  const contexts = entry?.contexts && typeof entry.contexts === 'object' ? entry.contexts : {};
  const summary = Array.isArray(contexts.summary) ? contexts.summary.filter(Boolean) : [];
  if (summary.length) return summary.slice(0, 2).join(' · ');
  const label = String(entry?.scopeLabel || '').trim();
  if (label) return label;
  return `${String(entry?.scopeType || 'global')} · ${String(entry?.scopeValue || 'all')}`;
}

export function describeProtocolContexts(protoId, docs = []) {
  const source = protocolContextSourceDocs(docs);
  const characters = uniqueContextList(source.map((d) => d.perso), 10);
  const weaponNames = uniqueContextList(source.flatMap((d) => [d.arme, d.arme_a, d.arme_b]), 12);
  const weapons = uniqueContextList(source.flatMap((d) => {
    const base = String(d.perso || '').trim();
    return [d.arme, d.arme_a, d.arme_b].filter(Boolean).map((w) => `${base}:${String(w).trim()}`);
  }), 18);
  const bosses = uniqueContextList(source.map((d) => d.boss), 8);
  const equippableWeapons = uniqueContextList(source.map((d) => d.equippable_weapon_id), 10);
  const phases = uniqueContextList(source.map((d) => d.phase_id), 10);
  const elements = uniqueContextList(source.flatMap((d) => [d.element_id, d.active_burst_element_id]), 10);
  const scenarios = uniqueContextList(source.map((d) => d.scenario_id), 10);
  const burstEffects = uniqueContextList(source.map((d) => d.burst_effect_id), 10);
  const burstFamilies = uniqueContextList(source.map((d) => d.burst_family), 4);
  const combinedAttacks = uniqueContextList(source.map((d) => d.combined_attack_id), 8);
  const evadeRules = uniqueContextList(source.map((d) => d.evade_rule_id), 8);
  const delugeStates = uniqueContextList(source.map((d) => d.deluge_state), 8);
  const successfulEvade = uniqueContextList(source.map((d) => d.successful_evade), 2);
  const costumes = uniqueContextList(source.map((d) => d.costume), 8);
  const potentials = uniqueContextList(source.map((d) => d.potential), 8);
  const buffs = uniqueContextList(source.map((d) => d.buff), 8);
  const debuffs = uniqueContextList(source.map((d) => d.debuff), 8);
  const stats = uniqueContextList(source.flatMap((d) => [d.stat_ref, d.stat_test]), 8);
  const actions = uniqueContextList(source.flatMap((d) => [d.skill, d.action, d.trigger, d.order_ref, d.order_test]), 10);
  const setups = uniqueContextList(source.map((d) => d.setup), 8);
  const scopes = new Set();
  if (characters.length) scopes.add('perso');
  if (weaponNames.length) scopes.add('arme');
  if (bosses.length) scopes.add('boss');
  if (equippableWeapons.length) scopes.add('weapon');
  if (phases.length) scopes.add('phase');
  if (elements.length) scopes.add('element');
  if (scenarios.length) scopes.add('scenario');
  if (burstEffects.length || burstFamilies.length || delugeStates.length) scopes.add('burst');
  if (combinedAttacks.length) scopes.add('combined');
  if (evadeRules.length || successfulEvade.length) scopes.add('evade');
  if (costumes.length) scopes.add('costume');
  if (potentials.length) scopes.add('potential');
  if (buffs.length || debuffs.length) scopes.add('uptime');
  if (stats.length) scopes.add('stats');
  if (setups.length || protoId === 'ORDER_OF_USE' || protoId === 'DAMAGE_WINDOW') scopes.add('compo');

  const summary = [];
  if (characters.length) summary.push(`Persos : **${compactContextText(characters, 3)}**`);
  if (weaponNames.length) summary.push(`Armes : **${compactContextText(weaponNames, 3)}**`);
  if (actions.length) summary.push(`Actions : **${compactContextText(actions, 3)}**`);
  if (costumes.length) summary.push(`Costumes : **${compactContextText(costumes, 3)}**`);
  if (potentials.length) summary.push(`Potentiels : **${compactContextText(potentials, 3)}**`);
  if (buffs.length) summary.push(`Buffs : **${compactContextText(buffs, 3)}**`);
  if (debuffs.length) summary.push(`Debuffs : **${compactContextText(debuffs, 3)}**`);
  if (stats.length) summary.push(`Axes de stats : **${compactContextText(stats, 3)}**`);
  if (bosses.length) summary.push(`Boss : **${compactContextText(bosses, 3)}**`);
  if (equippableWeapons.length) summary.push(`Armes équipables : **${compactContextText(equippableWeapons, 3)}**`);
  if (phases.length) summary.push(`Phases : **${compactContextText(phases, 3)}**`);
  if (elements.length) summary.push(`Éléments : **${compactContextText(elements, 3)}**`);
  if (scenarios.length) summary.push(`Scénarios : **${compactContextText(scenarios, 3)}**`);
  if (burstEffects.length) summary.push(`Bursts : **${compactContextText(burstEffects, 3)}**`);
  if (burstFamilies.length) summary.push(`Familles de Burst : **${compactContextText(burstFamilies, 3)}**`);
  if (combinedAttacks.length) summary.push(`Combined Attacks : **${compactContextText(combinedAttacks, 3)}**`);
  if (evadeRules.length) summary.push(`Règles d'esquive : **${compactContextText(evadeRules, 3)}**`);
  if (delugeStates.length) summary.push(`États Déluge : **${compactContextText(delugeStates, 3)}**`);
  if (setups.length) summary.push(`Setups : **${compactContextText(setups, 3)}**`);

  const shortBits = [];
  if (characters.length) shortBits.push(`perso ${compactContextText(characters, 1)}`);
  if (weaponNames.length) shortBits.push(`arme ${compactContextText(weaponNames, 1)}`);
  if (bosses.length) shortBits.push(`boss ${compactContextText(bosses, 1)}`);
  if (equippableWeapons.length) shortBits.push(`équipable ${compactContextText(equippableWeapons, 1)}`);
  if (phases.length) shortBits.push(`phase ${compactContextText(phases, 1)}`);
  if (elements.length) shortBits.push(`élément ${compactContextText(elements, 1)}`);
  if (scenarios.length) shortBits.push(`scénario ${compactContextText(scenarios, 1)}`);
  if (burstEffects.length || burstFamilies.length) shortBits.push(`burst ${compactContextText(burstEffects.length ? burstEffects : burstFamilies, 1)}`);
  if (costumes.length) shortBits.push(`costume ${compactContextText(costumes, 1)}`);
  if (potentials.length) shortBits.push(`potentiel ${compactContextText(potentials, 1)}`);
  if (buffs.length) shortBits.push(`buff ${compactContextText(buffs, 1)}`);
  if (debuffs.length) shortBits.push(`debuff ${compactContextText(debuffs, 1)}`);
  if (stats.length) shortBits.push(`stats ${compactContextText(stats, 1)}`);

  return {
    scopes: Array.from(scopes),
    characters,
    weaponNames,
    weapons,
    bosses,
    equippableWeapons,
    equippable_weapon_ids: equippableWeapons,
    phases,
    phaseIds: phases,
    elements,
    elementIds: elements,
    scenarios,
    scenarioIds: scenarios,
    burstEffects,
    burstFamilies,
    combinedAttacks,
    evadeRules,
    delugeStates,
    successfulEvade,
    costumes,
    potentials,
    buffs,
    debuffs,
    stats,
    actions,
    setups,
    summary,
    short: shortBits.slice(0, 2).join(' · '),
  };
}
