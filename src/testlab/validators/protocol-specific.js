import { validateInt, validateNumber, requiredText } from './common.js';

export function validateProtocolSpecific(protoId, data) {
  const errs = [];
  if (protoId === 'SCALING_ATK') {
    errs.push(requiredText('arme', data.arme) || '');
    errs.push(requiredText('skill', data.skill) || '');
    errs.push(validateNumber('atk', data.atk, { min: 1 }) || '');
    errs.push(validateNumber('dmg', data.dmg, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    errs.push(validateInt('crit', data.crit, { min: 0, max: 1 }) || '');
  } else if (protoId === 'SCALING_DEF') {
    errs.push(validateNumber('def', data.def, { min: 1 }) || '');
    errs.push(validateNumber('dmg_taken', data.dmg_taken, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'CRIT_RATE_REAL') {
    errs.push(validateNumber('crit_rate_shown', data.crit_rate_shown, { min: 0, max: 100 }) || '');
    errs.push(validateInt('attempts', data.attempts, { min: 1 }) || '');
    errs.push(validateInt('crits', data.crits, { min: 0 }) || '');
    if (data.attempts != null && data.crits != null && Number(data.crits) > Number(data.attempts)) errs.push('crits > attempts');
  } else if (protoId === 'CRIT_DMG_REAL') {
    errs.push(validateNumber('dmg_noncrit', data.dmg_noncrit, { min: 1 }) || '');
    errs.push(validateNumber('dmg_crit', data.dmg_crit, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BUFF_STACKING') {
    errs.push(validateNumber('base_dmg', data.base_dmg, { min: 1 }) || '');
    errs.push(validateNumber('buff1_dmg', data.buff1_dmg, { min: 1 }) || '');
    errs.push(validateNumber('buff2_dmg', data.buff2_dmg, { min: 1 }) || '');
    errs.push(requiredText('buff1', data.buff1, { maxLen: 60 }) || '');
    errs.push(requiredText('buff2', data.buff2, { maxLen: 60 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'STATUS_PROC_RATE') {
    errs.push(requiredText('status', data.status, { maxLen: 60 }) || '');
    errs.push(validateInt('attempts', data.attempts, { min: 1 }) || '');
    errs.push(validateInt('procs', data.procs, { min: 0 }) || '');
    if (data.attempts != null && data.procs != null && Number(data.procs) > Number(data.attempts)) errs.push('procs > attempts');
  } else if (protoId === 'MULTI_HIT_SNAPSHOT') {
    errs.push(validateNumber('before_dmg', data.before_dmg, { min: 1 }) || '');
    errs.push(validateNumber('after_dmg', data.after_dmg, { min: 1 }) || '');
    errs.push(validateInt('split_hit', data.split_hit, { min: 1 }) || '');
    errs.push(validateInt('total_hits', data.total_hits, { min: 2 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    if (data.split_hit != null && data.total_hits != null && Number(data.split_hit) >= Number(data.total_hits)) errs.push('split_hit >= total_hits');
  } else if (protoId === 'COOLDOWN_REAL') {
    errs.push(validateNumber('shown_cd', data.shown_cd, { min: 0.1 }) || '');
    errs.push(validateNumber('observed_cd', data.observed_cd, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BUFF_UPTIME') {
    errs.push(requiredText('buff', data.buff, { maxLen: 60 }) || '');
    errs.push(validateNumber('expected_duration', data.expected_duration, { min: 0.1 }) || '');
    errs.push(validateNumber('observed_active', data.observed_active, { min: 0 }) || '');
    errs.push(validateNumber('cycle_duration', data.cycle_duration, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    if (data.observed_active != null && data.cycle_duration != null && Number(data.observed_active) > Number(data.cycle_duration)) errs.push('observed_active > cycle_duration');
  } else if (protoId === 'INTERACTION_AB') {
    errs.push(validateNumber('base_dmg', data.base_dmg, { min: 1 }) || '');
    errs.push(requiredText('effect_a', data.effect_a, { maxLen: 60 }) || '');
    errs.push(validateNumber('a_dmg', data.a_dmg, { min: 1 }) || '');
    errs.push(requiredText('effect_b', data.effect_b, { maxLen: 60 }) || '');
    errs.push(validateNumber('b_dmg', data.b_dmg, { min: 1 }) || '');
    errs.push(validateNumber('ab_dmg', data.ab_dmg, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'WEAPON_SKILL_DELTA') {
    errs.push(requiredText('arme_a', data.arme_a, { maxLen: 80 }) || '');
    errs.push(requiredText('arme_b', data.arme_b, { maxLen: 80 }) || '');
    errs.push(requiredText('skill', data.skill, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_a', data.dmg_a, { min: 1 }) || '');
    errs.push(validateNumber('dmg_b', data.dmg_b, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'ORDER_OF_USE') {
    errs.push(requiredText('order_ref', data.order_ref, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_ref', data.dmg_ref, { min: 1 }) || '');
    errs.push(requiredText('order_test', data.order_test, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_test', data.dmg_test, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'DAMAGE_WINDOW') {
    errs.push(requiredText('action', data.action, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_window', data.dmg_window, { min: 1 }) || '');
    errs.push(validateNumber('dmg_early', data.dmg_early, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'TAG_SWAP_IMPACT') {
    errs.push(requiredText('trigger', data.trigger, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 1 }) || '');
    errs.push(validateNumber('dmg_tag', data.dmg_tag, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'TAG_TO_BURST_CHAIN') {
    errs.push(requiredText('trigger', data.trigger, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 1 }) || '');
    errs.push(validateNumber('dmg_chain', data.dmg_chain, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'TAG_WINDOW_GAIN') {
    errs.push(requiredText('action', data.action, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_no_tag', data.dmg_no_tag, { min: 1 }) || '');
    errs.push(validateNumber('dmg_tag_window', data.dmg_tag_window, { min: 1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'COSTUME_IMPACT') {
    errs.push(requiredText('costume', data.costume, { maxLen: 100 }) || '');
    errs.push(requiredText('impact_type', data.impact_type, { maxLen: 30 }) || '');
    errs.push(validateNumber('base_value', data.base_value, { min: 0.1 }) || '');
    errs.push(validateNumber('costume_value', data.costume_value, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'POTENTIAL_IMPACT') {
    errs.push(requiredText('potential', data.potential, { maxLen: 100 }) || '');
    errs.push(requiredText('impact_type', data.impact_type, { maxLen: 30 }) || '');
    errs.push(validateNumber('base_value', data.base_value, { min: 0.1 }) || '');
    errs.push(validateNumber('potential_value', data.potential_value, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BUFF_REAL_UPTIME') {
    errs.push(requiredText('buff', data.buff, { maxLen: 80 }) || '');
    errs.push(validateNumber('expected_duration', data.expected_duration, { min: 0.1 }) || '');
    errs.push(validateNumber('observed_active', data.observed_active, { min: 0 }) || '');
    errs.push(validateNumber('cycle_duration', data.cycle_duration, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    if (data.observed_active != null && data.cycle_duration != null && Number(data.observed_active) > Number(data.cycle_duration)) errs.push('observed_active > cycle_duration');
  } else if (protoId === 'DEBUFF_REAL_UPTIME') {
    errs.push(requiredText('debuff', data.debuff, { maxLen: 80 }) || '');
    errs.push(validateNumber('expected_duration', data.expected_duration, { min: 0.1 }) || '');
    errs.push(validateNumber('observed_active', data.observed_active, { min: 0 }) || '');
    errs.push(validateNumber('cycle_duration', data.cycle_duration, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    if (data.observed_active != null && data.cycle_duration != null && Number(data.observed_active) > Number(data.cycle_duration)) errs.push('observed_active > cycle_duration');
  } else if (protoId === 'STAT_PRIORITY_DELTA') {
    errs.push(requiredText('stat_ref', data.stat_ref, { maxLen: 60 }) || '');
    errs.push(validateNumber('dmg_ref', data.dmg_ref, { min: 0.1 }) || '');
    errs.push(requiredText('stat_test', data.stat_test, { maxLen: 60 }) || '');
    errs.push(validateNumber('dmg_test', data.dmg_test, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BOSS_PRESSURE_DELTA') {
    errs.push(requiredText('boss', data.boss, { maxLen: 100 }) || '');
    errs.push(requiredText('setup', data.setup, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_clean', data.dmg_clean, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_pressure', data.dmg_pressure, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BURST_STATE_DELTA') {
    errs.push(requiredText('state_off_label', data.state_off_label, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_off', data.dmg_off, { min: 0.1 }) || '');
    errs.push(requiredText('state_on_label', data.state_on_label, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_on', data.dmg_on, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'ELEMENT_MATCHUP_DELTA') {
    errs.push(requiredText('element_id', data.element_id, { maxLen: 40 }) || '');
    errs.push(requiredText('target_element', data.target_element, { maxLen: 40 }) || '');
    errs.push(validateNumber('dmg_neutral', data.dmg_neutral, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_matchup', data.dmg_matchup, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'RES_SHRED_DELTA') {
    errs.push(requiredText('shred_type', data.shred_type, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_shred', data.dmg_shred, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'PHASE_SPECIFIC_WINDOW_DELTA') {
    errs.push(requiredText('boss', data.boss, { maxLen: 100 }) || '');
    errs.push(requiredText('phase_id', data.phase_id, { maxLen: 60 }) || '');
    errs.push(requiredText('action', data.action, { maxLen: 80 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_window', data.dmg_window, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BOSS_INTERRUPT_PENALTY') {
    errs.push(requiredText('boss', data.boss, { maxLen: 100 }) || '');
    errs.push(requiredText('setup', data.setup, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_clean', data.dmg_clean, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_interrupted', data.dmg_interrupted, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BURST_TRIGGER_WEAPON_DELTA') {
    errs.push(requiredText('equippable_weapon_id', data.equippable_weapon_id, { maxLen: 120 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_triggered', data.dmg_triggered, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'BURST_WINDOW_HOLD_VALUE') {
    errs.push(requiredText('action', data.action, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_early', data.dmg_early, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_hold', data.dmg_hold, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'COMBINED_SKILL_DELTA') {
    errs.push(requiredText('combined_attack_id', data.combined_attack_id, { maxLen: 120 }) || '');
    errs.push(validateNumber('dmg_base', data.dmg_base, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_combined', data.dmg_combined, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'SUCCESSFUL_EVADE_BONUS_DELTA') {
    errs.push(requiredText('evade_rule_id', data.evade_rule_id, { maxLen: 120 }) || '');
    errs.push(requiredText('window_label', data.window_label, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_fail', data.dmg_fail, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_success', data.dmg_success, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  } else if (protoId === 'ELEMENTAL_STATUS_UPTIME') {
    errs.push(requiredText('status_id', data.status_id, { maxLen: 80 }) || '');
    errs.push(requiredText('element_id', data.element_id, { maxLen: 40 }) || '');
    errs.push(validateNumber('expected_duration', data.expected_duration, { min: 0.1 }) || '');
    errs.push(validateNumber('observed_active', data.observed_active, { min: 0 }) || '');
    errs.push(validateNumber('cycle_duration', data.cycle_duration, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
    if (data.observed_active != null && data.cycle_duration != null && Number(data.observed_active) > Number(data.cycle_duration)) errs.push('observed_active > cycle_duration');
  } else if (protoId === 'BOSS_PATTERN_RECOVERY_DELTA') {
    errs.push(requiredText('boss', data.boss, { maxLen: 100 }) || '');
    errs.push(requiredText('pattern_label', data.pattern_label, { maxLen: 100 }) || '');
    errs.push(validateNumber('dmg_disrupted', data.dmg_disrupted, { min: 0.1 }) || '');
    errs.push(validateNumber('dmg_recovered', data.dmg_recovered, { min: 0.1 }) || '');
    errs.push(validateInt('n', data.n, { min: 1 }) || '');
  }

  return errs.filter(Boolean);
}

export function protocolSuspectWarnings(protoId, data) {
  let status = 'ok';
  const warnings = [];

  if (protoId === 'BUFF_STACKING') {
    const base = Number(data.base_dmg);
    const b2 = Number(data.buff2_dmg);
    if (base > 0 && b2 / base > 10) { status = 'suspect'; warnings.push('multiplicateur très élevé'); }
  }
  if (protoId === 'CRIT_RATE_REAL') {
    const shown = Number(data.crit_rate_shown);
    const rate = Number(data.crits) / Math.max(1, Number(data.attempts));
    if (Math.abs(rate * 100 - shown) > 20) { status = 'suspect'; warnings.push('écart fort vs taux affiché'); }
  }
  if (protoId === 'MULTI_HIT_SNAPSHOT') {
    const ratio = Number(data.after_dmg) / Math.max(1, Number(data.before_dmg));
    if (ratio > 2 || ratio < 0.4) { status = 'suspect'; warnings.push('écart très fort entre hits avant/après'); }
  }
  if (protoId === 'COOLDOWN_REAL') {
    const ratio = Number(data.observed_cd) / Math.max(0.1, Number(data.shown_cd));
    if (ratio > 1.5 || ratio < 0.5) { status = 'suspect'; warnings.push('écart très fort entre cooldown affiché et observé'); }
  }
  if (protoId === 'BUFF_UPTIME') {
    const uptime = Number(data.observed_active) / Math.max(0.1, Number(data.cycle_duration));
    if (uptime > 1) { status = 'suspect'; warnings.push('uptime > 100%'); }
  }
  if (protoId === 'INTERACTION_AB') {
    const base = Number(data.base_dmg);
    const ab = Number(data.ab_dmg);
    if (base > 0 && ab / base > 10) { status = 'suspect'; warnings.push('interaction A+B extrêmement élevée'); }
  }
  if (protoId === 'WEAPON_SKILL_DELTA') {
    const ratio = Number(data.dmg_b) / Math.max(1, Number(data.dmg_a));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre les deux armes'); }
  }
  if (protoId === 'ORDER_OF_USE') {
    const ratio = Number(data.dmg_test) / Math.max(1, Number(data.dmg_ref));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre les deux ordres'); }
  }
  if (protoId === 'DAMAGE_WINDOW') {
    const ratio = Number(data.dmg_window) / Math.max(1, Number(data.dmg_early));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre fenêtre gardée et lancement trop tôt'); }
  }
  if (protoId === 'TAG_SWAP_IMPACT') {
    const ratio = Number(data.dmg_tag) / Math.max(1, Number(data.dmg_base));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort avec/sans tag-swap'); }
  }
  if (protoId === 'TAG_TO_BURST_CHAIN') {
    const ratio = Number(data.dmg_chain) / Math.max(1, Number(data.dmg_base));
    if (ratio > 5 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre la base et la chaîne tag vers Burst'); }
  }
  if (protoId === 'TAG_WINDOW_GAIN') {
    const ratio = Number(data.dmg_tag_window) / Math.max(1, Number(data.dmg_no_tag));
    if (ratio > 5 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre sans tag et fenêtre préparée'); }
  }
  if (protoId === 'COSTUME_IMPACT') {
    const ratio = Number(data.costume_value) / Math.max(0.1, Number(data.base_value));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort avec/sans costume'); }
  }
  if (protoId === 'POTENTIAL_IMPACT') {
    const ratio = Number(data.potential_value) / Math.max(0.1, Number(data.base_value));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort avec/sans potentiel'); }
  }
  if (protoId === 'BUFF_REAL_UPTIME' || protoId === 'DEBUFF_REAL_UPTIME') {
    const uptime = Number(data.observed_active) / Math.max(0.1, Number(data.cycle_duration));
    if (uptime > 1) { status = 'suspect'; warnings.push('uptime > 100%'); }
  }
  if (protoId === 'STAT_PRIORITY_DELTA') {
    const ratio = Number(data.dmg_test) / Math.max(0.1, Number(data.dmg_ref));
    if (ratio > 3 || ratio < 0.33) { status = 'suspect'; warnings.push('écart très fort entre les deux axes de stats'); }
  }
  if (protoId === 'BOSS_PRESSURE_DELTA') {
    const ratio = Number(data.dmg_pressure) / Math.max(0.1, Number(data.dmg_clean));
    if (ratio > 1.5 || ratio < 0.2) { status = 'suspect'; warnings.push('écart très fort entre combat propre et pression boss'); }
  }
  if (protoId === 'BURST_STATE_DELTA') {
    const ratio = Number(data.dmg_on) / Math.max(0.1, Number(data.dmg_off));
    if (ratio > 5 || ratio < 0.4) { status = 'suspect'; warnings.push('écart très fort entre hors Burst et Burst'); }
  }
  if (protoId === 'ELEMENT_MATCHUP_DELTA') {
    const ratio = Number(data.dmg_matchup) / Math.max(0.1, Number(data.dmg_neutral));
    if (ratio > 5 || ratio < 0.5) { status = 'suspect'; warnings.push('écart très fort sur le matchup élémentaire'); }
  }
  if (protoId === 'RES_SHRED_DELTA') {
    const ratio = Number(data.dmg_shred) / Math.max(0.1, Number(data.dmg_base));
    if (ratio > 5 || ratio < 0.5) { status = 'suspect'; warnings.push('écart très fort entre sans shred et avec shred'); }
  }
  if (protoId === 'PHASE_SPECIFIC_WINDOW_DELTA') {
    const ratio = Number(data.dmg_window) / Math.max(0.1, Number(data.dmg_base));
    if (ratio > 5 || ratio < 0.5) { status = 'suspect'; warnings.push('écart très fort entre hors fenêtre et fenêtre de phase'); }
  }
  if (protoId === 'BOSS_INTERRUPT_PENALTY') {
    const ratio = Number(data.dmg_interrupted) / Math.max(0.1, Number(data.dmg_clean));
    if (ratio > 1.1 || ratio < 0.1) { status = 'suspect'; warnings.push("écart très fort sur la pénalité d'interruption"); }
  }

  return { status, warnings };
}
