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

function buildBossPhaseId(bossSlug, phaseKey) {
  return `${normalize(bossSlug)}__phase__${normalize(phaseKey)}`;
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

function inferPhaseKeys(sections = []) {
  const keys = [];
  for (const section of sections || []) {
    const key = String(section?.key || '').trim();
    if (!key) continue;
    if (/^phase\d+$/i.test(key) || ['ground', 'flight', 'climb', 'later-phases', 'enrage', 'core', 'strategy', 'abilities', 'flow', 'approach', 'summoning', 'overview'].includes(key)) {
      keys.push(key);
    }
  }
  return uniq(keys);
}

function inferPressureLevel(phaseKey, section = {}) {
  const key = normalize(phaseKey);
  const text = textBlob(section);
  if (['enrage', 'later-phases', 'flight', 'abilities'].includes(key)) return 'high';
  if (/enrage|chaot|écrase|punit fortement|pression énorme|mort rapide|stun de zone|projectiles en chaîne/.test(text)) return 'high';
  if (['phase1', 'ground', 'climb', 'core', 'flow', 'approach', 'strategy'].includes(key)) return 'medium';
  if (/bouclier|noyau|objectif|placement|recovery|ouverture|fenêtre|invocation|grimpez/.test(text)) return 'medium';
  return 'unknown';
}

function inferWindowTags(phaseKey, section = {}) {
  const key = normalize(phaseKey);
  const text = textBlob(section);
  const tags = [];
  if (key === 'ground') tags.push('safe_burst', 'stable_uptime');
  if (key === 'flight') tags.push('uptime_break', 'ranged_window');
  if (key === 'climb') tags.push('vertical_pressure', 'reposition_window');
  if (key === 'flow' || key === 'strategy' || key === 'approach') tags.push('safe_burst', 'recovery_window');
  if (key === 'core') tags.push('safe_burst', 'interrupt_window');
  if (key === 'abilities') tags.push('interrupt_risk', 'phase_variance');
  if (key === 'summoning') tags.push('objective_window', 'uptime_break');
  if (key === 'later-phases') tags.push('phase_variance', 'interrupt_risk');
  if (key === 'enrage') tags.push('late_fight_pressure', 'interrupt_risk');
  if (/gros dégâts possible|fenêtre de dégâts|ouvrez vos bursts|garder vos cooldowns|safe burst/.test(text)) tags.push('safe_burst');
  if (/uptime casse|perd son uptime|phase aérienne|oblige à courir/.test(text)) tags.push('uptime_break');
  if (/reprise|recovery|temps mort|downtime|après son atterrissage|retombe en arrière|après le pattern|après sa charge|après sa ruée|après son souffle/.test(text)) tags.push('recovery_window');
  if (/fenêtre courte|micro[- ]fenêtre|très court instant|juste après l’esquive|après esquive|esquive parfaite/.test(text)) tags.push('micro_window');
  if (/reset|remet le combat à zéro|force à recommencer|casse complètement la rotation/.test(text)) tags.push('forced_reset');
  if (/contour bleu|brille en bleu|interrupt|interromp/.test(text)) tags.push('interrupt_window');
  if (/bouclier|noyau|objectif|grimpez sur lui/.test(text)) tags.push('objective_window');
  if (/^phase\d+$/.test(key) || key === 'overview') tags.push('phase_variance');
  return uniq(tags);
}

function inferControlTags(phaseKey, section = {}) {
  const key = normalize(phaseKey);
  const text = textBlob(section);
  const tags = [];
  if (text.includes('interrupt') || text.includes('interromp') || text.includes('contour bleu')) tags.push('interrupt_check');
  if (text.includes('knockdown') || text.includes('stagger')) tags.push('knockdown_window');
  if (text.includes('reposition') || text.includes('placement') || text.includes('angle') || text.includes('trajectoire')) tags.push('reposition_check');
  if (text.includes('burst') || text.includes('cooldown') || text.includes('deluge')) tags.push('burst_check');
  if (text.includes('bouclier') || text.includes('noyau') || key === 'summoning' || text.includes('objectif')) tags.push('objective_check');
  if (text.includes('coordination') || text.includes('multijoueur')) tags.push('objective_check');
  if (key === 'flight' || /uptime|tenir les effets|maintenir/.test(text)) tags.push('uptime_check');
  return uniq(tags);
}

function inferScenarioIds(phaseKey, section = {}) {
  const key = normalize(phaseKey);
  const text = textBlob(section);
  const ids = [];
  if (key === 'ground' || key === 'flow' || key === 'strategy' || key === 'approach') ids.push('clean_short_fight');
  if (key === 'flight' || key === 'summoning') ids.push('boss_pressure', 'phase_locked_boss');
  if (key === 'enrage' || key === 'later-phases' || key === 'abilities') ids.push('boss_pressure');
  if (text.includes('burst') || text.includes('cooldown')) ids.push('burst_window');
  return uniq(ids);
}

function inferBurstEvadeHints(section = {}) {
  const text = textBlob(section);
  return {
    burst_window_hint: text.includes('burst') || text.includes('deluge'),
    evade_pressure_hint: text.includes('esquive') || text.includes('evade') || text.includes('dodge'),
  };
}

function inferRiskTags(phaseKey, section = {}) {
  const key = normalize(phaseKey);
  const text = textBlob(section);
  const tags = [];
  if (key === 'flight') tags.push('uptime_drop');
  if (key === 'enrage') tags.push('late_fight_punish');
  if (/stun|éject|puni|punit|laser|écrase|toupie|angles morts|explose/.test(text)) tags.push('execution_punish');
  if (/bouclier|objectif|noyau|invocation|rituel/.test(text)) tags.push('objective_delay');
  if (/distance|projectiles|boules de feu|laser/.test(text)) tags.push('range_punish');
  if (/mêlée|courte portée|griffe|frappe de patte/.test(text)) tags.push('melee_punish');
  if (/interruption|contour bleu|interrupt|ratez l'interruption|si l'interruption échoue/.test(text)) tags.push('interrupt_drop');
  if (/pattern|rotation|enchaînements|plusieurs attaques|casse les combos|force à reculer/.test(text)) tags.push('rotation_break');
  if (/phase change|transition|varie selon|pic de danger|attaque signature/.test(text)) tags.push('pattern_spike');
  return uniq(tags);
}

function inferPositioningTags(section = {}) {
  const text = textBlob(section);
  const tags = [];
  if (/devant|front/.test(text)) tags.push('front_risk');
  if (/derrière/.test(text)) tags.push('rear_risk');
  if (/distance|laser|projectiles|boules de feu/.test(text)) tags.push('range_management');
  if (/mêlée|courte portée/.test(text)) tags.push('melee_management');
  if (/grimp|noyau|bouclier/.test(text)) tags.push('objective_positioning');
  if (/placement|trajectoire|angle|reposition/.test(text)) tags.push('repositioning');
  if (/angles morts|derrière/.test(text)) tags.push('angle_discipline');
  return uniq(tags);
}

function inferRecoveryWindowTags(section = {}) {
  const text = textBlob(section);
  const tags = [];
  if (/knockdown|stagger|met le boss au sol/.test(text)) tags.push('knockdown_window');
  if (/recoveries visibles|recovery|grosses animations|longue animation|ouvertures|petite fenêtre|temps mort|downtime/.test(text)) tags.push('animation_recovery');
  if (/bouclier est détruit|grimpez sur lui|atteindre son noyau|après l’objectif/.test(text)) tags.push('objective_burst_window');
  if (/contour bleu|brille en bleu/.test(text)) tags.push('interrupt_burst_window');
  if (/fin de combo|après son atterrissage|retombe en arrière|après le pattern|après sa charge|après sa ruée|après son souffle/.test(text)) tags.push('pattern_recovery_window');
  if (/juste après l’esquive|après esquive|esquive parfaite/.test(text)) tags.push('post_evade_window');
  return uniq(tags);
}

function inferObjectiveTags(section = {}) {
  const text = textBlob(section);
  const tags = [];
  if (/invocation|rituel/.test(text)) tags.push('summon_sequence');
  if (/bouclier/.test(text)) tags.push('shield_break');
  if (/grimpez sur lui|noyau/.test(text)) tags.push('climb_core');
  if (/phase aérienne|phase volante|volante/.test(text)) tags.push('aerial_transition');
  return uniq(tags);
}


function inferCriticality(section = {}, phaseKey = '') {
  const text = textBlob(section);
  const key = normalize(phaseKey);
  let score = 0;
  const tags = [];

  if (/bouclier|noyau|grimpez sur lui|objectif/.test(text) || ['core', 'climb', 'summoning'].includes(key)) {
    score += 4;
    tags.push('gate_phase');
  }
  if (/gros dégâts possible|ouvrez vos bursts|safe burst|après l’objectif|knockdown|stagger/.test(text) || ['ground', 'flow', 'strategy'].includes(key)) {
    score += 3;
    tags.push('burst_phase');
  }
  if (/enrage|pression énorme|mort rapide|esquive|dodge|survivre|tenir/.test(text) || ['enrage', 'flight', 'abilities', 'later-phases'].includes(key)) {
    score += 3;
    tags.push('survival_phase');
  }
  if (/transition|atterrissage|phase change|retombe|volante/.test(text) || ['flight', 'later-phases', 'overview', 'approach'].includes(key)) {
    score += 2;
    tags.push('transition_phase');
  }
  if (/interrupt|contour bleu|brille en bleu/.test(text)) score += 1;
  if (/fenêtre courte|micro[- ]fenêtre|juste après l’esquive|après esquive/.test(text)) score += 1;
  if (/invocation|rituel|laser|projectiles en chaîne|angles morts/.test(text)) score += 1;

  return { priority_score: score, criticality_tags: uniq(tags) };
}

function inferHints(section = {}) {
  const text = textBlob(section);
  return {
    interrupt_window_hint: /contour bleu|brille en bleu|interromp/.test(text),
    multiplayer_relief_hint: /multijoueur/.test(text),
    melee_pressure_hint: /mêlée|courte portée|griffe/.test(text),
    ranged_pressure_hint: /distance|laser|projectiles|boules de feu/.test(text),
    blue_interrupt_hint: /contour bleu|brille en bleu/.test(text),
  };
}

function buildSummary(section = {}) {
  const firstParagraph = Array.isArray(section?.paragraphs) ? section.paragraphs.find(Boolean) : null;
  const firstBullet = Array.isArray(section?.bullets) ? section.bullets.find(Boolean) : null;
  const callout = section?.callout?.text || null;
  return firstParagraph || callout || firstBullet || null;
}

export function buildScienceBossPhases({ bosses = [] } = {}) {
  const items = [];
  for (const boss of bosses || []) {
    const bossSlug = normalize(boss?.slug || boss?.name);
    const sections = Array.isArray(boss?.guide?.sections) ? boss.guide.sections : [];
    const phaseKeys = inferPhaseKeys(sections);
    for (const phaseKey of phaseKeys) {
      const section = sections.find((entry) => normalize(entry?.key) === normalize(phaseKey)) || {};
      const hints = { ...inferBurstEvadeHints(section), ...inferHints(section) };
      const criticality = inferCriticality(section, phaseKey);
      items.push({
        phase_id: buildBossPhaseId(bossSlug, phaseKey),
        boss_id: bossSlug,
        phase_key: normalize(phaseKey),
        name: section?.title || section?.label || phaseKey,
        priority_score: criticality.priority_score,
        criticality_tags: criticality.criticality_tags,
        pressure_level: inferPressureLevel(phaseKey, section),
        window_tags: inferWindowTags(phaseKey, section),
        control_tags: inferControlTags(phaseKey, section),
        risk_tags: inferRiskTags(phaseKey, section),
        positioning_tags: inferPositioningTags(section),
        recovery_window_tags: inferRecoveryWindowTags(section),
        objective_tags: inferObjectiveTags(section),
        scenario_ids: inferScenarioIds(phaseKey, section),
        burst_window_hint: hints.burst_window_hint,
        evade_pressure_hint: hints.evade_pressure_hint,
        interrupt_window_hint: hints.interrupt_window_hint,
        multiplayer_relief_hint: hints.multiplayer_relief_hint,
        melee_pressure_hint: hints.melee_pressure_hint,
        ranged_pressure_hint: hints.ranged_pressure_hint,
        blue_interrupt_hint: hints.blue_interrupt_hint,
        source_section_key: String(section?.key || phaseKey),
        summary: buildSummary(section),
      });
    }
  }

  return {
    version: 2,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceBossPhases(root = process.cwd()) {
  const compiledPath = path.join(root, 'data', 'compiled', 'bosses.json');
  const bosses = readJSON(compiledPath, []);
  const payload = buildScienceBossPhases({ bosses });
  writeJSON(path.join(root, 'data', 'compiled', 'science-boss-phases.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceBossPhases();
  console.log(`OK science-boss-phases: ${payload.items.length}`);
}
