import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON, writeJSON } from '../lib/fs-utils.mjs';
import { slugify } from '../lib/slug.mjs';

function normalize(value) {
  return slugify(value || '');
}

function uniq(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function textBlob(section = {}) {
  return [
    section?.title || '',
    section?.label || '',
    section?.subtitle || '',
    ...(section?.paragraphs || []),
    ...(section?.bullets || []),
    ...(section?.fields || []).flatMap((field) => [field?.name || '', field?.value || '']),
    section?.callout?.title || '',
    section?.callout?.text || '',
  ].join(' ').toLowerCase();
}

function buildBossPhaseId(bossSlug, phaseKey) {
  return `${normalize(bossSlug)}__phase__${normalize(phaseKey)}`;
}

function inferPhaseIds(slug, sections = []) {
  const phaseKeys = [];
  for (const section of sections || []) {
    const key = String(section?.key || '').trim();
    if (!key) continue;
    if (/^phase\d+$/i.test(key) || ['ground', 'flight', 'climb', 'later-phases', 'enrage', 'core', 'strategy', 'abilities', 'flow', 'approach', 'summoning', 'overview'].includes(key)) {
      phaseKeys.push(buildBossPhaseId(slug, key));
    }
  }
  return uniq(phaseKeys);
}

function inferPressureProfile(sectionKeys = [], sections = []) {
  const keys = new Set(sectionKeys);
  const blob = sections.map((section) => textBlob(section)).join(' ');
  if (keys.has('enrage') || keys.has('flight') || keys.has('later-phases') || /puni|menaç|ecras|chaot|interruption|ultimate|stun de zone|ecrase|coordination serrée|plusieurs patterns/.test(blob)) return 'high';
  if (keys.has('abilities') || keys.has('climb') || keys.has('phase1') || keys.has('core') || keys.has('flow') || /pression|objectif|placement|distance|bouclier|noyau|recovery|invocation|trajectoire/.test(blob)) return 'medium';
  return 'unknown';
}

function inferWindowTags(sectionKeys = []) {
  const tags = [];
  const keys = new Set(sectionKeys);
  if (keys.has('core') || keys.has('flow') || keys.has('approach') || keys.has('strategy')) tags.push('safe_burst');
  if (keys.has('flight') || keys.has('climb') || keys.has('summoning')) tags.push('uptime_break');
  if (keys.has('abilities')) tags.push('interrupt_risk');
  if (keys.has('enrage')) tags.push('interrupt_risk', 'late_fight_pressure');
  if (keys.has('later-phases') || keys.has('phase1') || keys.has('overview')) tags.push('phase_variance');
  return uniq(tags);
}

function inferRecommendedScenarios(sectionKeys = []) {
  const keys = new Set(sectionKeys);
  const scenarios = [];
  if (keys.has('core') || keys.has('flow') || keys.has('approach') || keys.has('strategy')) scenarios.push('clean_short_fight');
  if (keys.has('flight') || keys.has('enrage') || keys.has('later-phases') || keys.has('abilities')) scenarios.push('boss_pressure');
  if (keys.has('phase1') || keys.has('later-phases') || keys.has('ground') || keys.has('flight') || keys.has('climb')) scenarios.push('phase_locked_boss');
  return uniq(scenarios);
}

function inferKnownRisks(sectionKeys = []) {
  const keys = new Set(sectionKeys);
  const risks = [];
  if (keys.has('flight') || keys.has('climb') || keys.has('summoning')) risks.push('uptime_drop', 'rotation_break');
  if (keys.has('enrage')) risks.push('late_fight_punish');
  if (keys.has('abilities') || keys.has('core')) risks.push('interrupt_risk');
  if (keys.has('later-phases') || keys.has('overview')) risks.push('pattern_shift');
  return uniq(risks);
}

function inferMultiplayerRelief(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  if (/multijoueur[^.]{0,80}(pression baisse fortement|solution la plus efficace|simplifie|compensent)/.test(blob) || /en multijoueur[^.]{0,80}(pression baisse|compensent|simplifier)/.test(blob)) return 'high';
  if (/multijoueur/.test(blob)) return 'medium';
  return 'unknown';
}

function inferInterruptProfile(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  return {
    blue_interrupt_required: /contour bleu|brille en bleu/.test(blob),
    tag_interrupt_recommended: /utilise immédiatement un tag|interruption par tag|tag pour l[’']interrompre/.test(blob),
    knockdown_window: /knockdown|met le boss au sol|ouvre une grande fenêtre de dégâts|ouvre une grosse fenêtre de dégâts/.test(blob),
  };
}

function inferPositioningTags(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  const tags = [];
  if (/devant|frontale|frontaux/.test(blob)) tags.push('front_pressure');
  if (/derrière/.test(blob)) tags.push('rear_punish');
  if (/distance|laser|projectiles|boules de feu/.test(blob)) tags.push('range_check');
  if (/mêlée|courte portée/.test(blob)) tags.push('melee_check');
  if (/placement|reposition|angles|trajectoire|diagonale/.test(blob)) tags.push('reposition_check');
  if (/grimp|noyau|bouclier|objectif/.test(blob)) tags.push('objective_positioning');
  if (/angles morts|angle mort|trajectoire/.test(blob)) tags.push('angle_check');
  return uniq(tags);
}

function inferRecoveryWindowTags(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  const tags = [];
  if (/knockdown|met le boss au sol|stagger/.test(blob)) tags.push('knockdown_window');
  if (/grosses animations|recoveries visibles|recovery|ouvertures|reprise|retombe en arrière|temps mort|downtime|après sa charge|après sa ruée|après son souffle/.test(blob)) tags.push('recovery_window');
  if (/fenêtre courte|micro[- ]fenêtre|juste après l’esquive|après esquive/.test(blob)) tags.push('micro_window');
  if (/reset|remet le combat à zéro|force à recommencer|casse complètement la rotation/.test(blob)) tags.push('forced_reset');
  if (/bouclier est détruit|grimpez sur lui|atteindre son noyau|après l’objectif/.test(blob)) tags.push('objective_window');
  if (/phase bleue|contour bleu|brille en bleu/.test(blob)) tags.push('interrupt_window');
  return uniq(tags);
}

function inferObjectiveTags(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  const tags = [];
  if (/rituel d[’']invocation|invocation/.test(blob)) tags.push('summon_sequence');
  if (/bouclier/.test(blob)) tags.push('shield_break');
  if (/grimpez sur lui|atteindre son noyau|noyau/.test(blob)) tags.push('climb_core');
  if (/phase aérienne|phase volante|volante/.test(blob)) tags.push('aerial_transition');
  if (/contour bleu|brille en bleu/.test(blob)) tags.push('interrupt_gate');
  return uniq(tags);
}

function inferBurstPlanTags(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  const tags = [];
  if (/burst|cooldowns|cooldowns?/.test(blob)) tags.push('burst_sensitive');
  if (/garder les gros dégâts|gardez des cooldowns|conserver les bursts|ne brûlez pas vos bursts|attendre la bonne fenêtre/.test(blob)) tags.push('hold_for_window');
  if (/knockdown|met le boss au sol/.test(blob)) tags.push('burst_on_knockdown');
  if (/bouclier casse|bouclier est détruit|noyau|après l’objectif/.test(blob)) tags.push('burst_after_objective');
  if (/fin du combat|enrage|late/.test(blob)) tags.push('late_fight_hold');
  return uniq(tags);
}

function inferHazardTags(sections = []) {
  const blob = sections.map((section) => textBlob(section)).join(' ');
  const tags = [];
  if (/atterrissage inflige des dégâts|éloignez-vous immédiatement/.test(blob)) tags.push('spawn_damage');
  if (/enrage|ultimate/.test(blob)) tags.push('ultimate_finish');
  if (/chaot|écras|punit fortement|stun de zone/.test(blob)) tags.push('mistake_punish');
  if (/interruption|coupent les combos|cassent facilement le rythme|rotation cassée/.test(blob)) tags.push('rotation_break');
  if (/boules de feu|laser|projectiles|toupie|griffe|patterns dangereux/.test(blob)) tags.push('pattern_spike');
  return uniq(tags);
}

export function buildScienceBosses({ bosses = [], rawSources = {} } = {}) {
  const originBossKeys = new Set(
    (rawSources.origin?.bosses || []).flatMap((boss) => [normalize(boss?.slug), normalize(boss?.name)]).filter(Boolean),
  );
  const hideoutBossKeys = new Set([
    ...Object.keys(rawSources.hideout?.boss_guide?.bosses || {}).map((key) => normalize(key)),
    ...Object.values(rawSources.hideout?.boss_guide?.bosses || {}).flatMap((boss) => [normalize(boss?.slug), normalize(boss?.name)]).filter(Boolean),
  ]);

  const items = (bosses || []).map((boss) => {
    const keySlug = normalize(boss?.slug);
    const keyName = normalize(boss?.name);
    const sections = boss?.guide?.sections || [];
    const sectionKeys = sections.map((section) => String(section?.key || '').trim()).filter(Boolean);
    const phaseIds = inferPhaseIds(keySlug, sections);
    return {
      boss_id: keySlug,
      slug: boss?.slug || keySlug,
      name: boss?.name || boss?.slug || 'Unknown boss',
      phase_ids: phaseIds,
      phase_count: phaseIds.length,
      pressure_profile: inferPressureProfile(sectionKeys, sections),
      multiplayer_relief: inferMultiplayerRelief(sections),
      window_tags: inferWindowTags(sectionKeys),
      pattern_tags: sectionKeys,
      positioning_tags: inferPositioningTags(sections),
      recovery_window_tags: inferRecoveryWindowTags(sections),
      objective_tags: inferObjectiveTags(sections),
      burst_plan_tags: inferBurstPlanTags(sections),
      hazard_tags: inferHazardTags(sections),
      interrupt_profile: inferInterruptProfile(sections),
      elements: uniq((boss?.elements || boss?.attributes || []).map((x) => normalize(x))),
      source_refs: {
        seven_origin: originBossKeys.has(keySlug) || originBossKeys.has(keyName),
        hideout: hideoutBossKeys.has(keySlug) || hideoutBossKeys.has(keyName),
      },
      science: {
        recommended_scenarios: inferRecommendedScenarios(sectionKeys),
        known_risks: inferKnownRisks(sectionKeys),
      },
    };
  });

  return {
    version: 3,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceBosses(root = process.cwd()) {
  const compiledPath = path.join(root, 'data', 'compiled', 'bosses.json');
  const rawDir = path.join(root, 'data', 'raw');
  const bosses = readJSON(compiledPath, []);
  const payload = buildScienceBosses({
    bosses,
    rawSources: {
      hideout: readJSON(path.join(rawDir, 'hideout.json'), {}),
      origin: readJSON(path.join(rawDir, '7dsorigin.json'), {}),
    },
  });
  writeJSON(path.join(root, 'data', 'compiled', 'science-bosses.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceBosses();
  console.log(`OK science-bosses: ${payload.items.length}`);
}
