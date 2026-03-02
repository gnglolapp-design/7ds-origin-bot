export function computeMetric(protoId, data) {
  switch (protoId) {
    case 'SCALING_ATK': {
      const atk = Number(data.atk);
      const dmg = Number(data.dmg);
      if (!atk) return null;
      return dmg / atk;
    }
    case 'SCALING_DEF': {
      const defv = Number(data.def);
      const dmg = Number(data.dmg_taken);
      if (!defv) return null;
      return dmg / defv;
    }
    case 'CRIT_RATE_REAL': {
      const a = Number(data.attempts);
      const c = Number(data.crits);
      if (!a) return null;
      return c / a;
    }
    case 'CRIT_DMG_REAL': {
      const nc = Number(data.dmg_noncrit);
      const c = Number(data.dmg_crit);
      if (!nc) return null;
      return c / nc;
    }
    case 'BUFF_STACKING': {
      const base = Number(data.base_dmg);
      const b2 = Number(data.buff2_dmg);
      if (!base) return null;
      return b2 / base;
    }
    case 'STATUS_PROC_RATE': {
      const a = Number(data.attempts);
      const p = Number(data.procs);
      if (!a) return null;
      return p / a;
    }
    case 'MULTI_HIT_SNAPSHOT': {
      const before = Number(data.before_dmg);
      const after = Number(data.after_dmg);
      if (!before) return null;
      return after / before;
    }
    case 'COOLDOWN_REAL': {
      const shown = Number(data.shown_cd);
      const observed = Number(data.observed_cd);
      if (!shown) return null;
      return observed / shown;
    }
    case 'BUFF_UPTIME':
    case 'BUFF_REAL_UPTIME':
    case 'DEBUFF_REAL_UPTIME': {
      const active = Number(data.observed_active);
      const cycle = Number(data.cycle_duration);
      if (!cycle) return null;
      return active / cycle;
    }
    case 'INTERACTION_AB': {
      const base = Number(data.base_dmg);
      const ab = Number(data.ab_dmg);
      if (!base) return null;
      return ab / base;
    }
    case 'WEAPON_SKILL_DELTA': {
      const a = Number(data.dmg_a);
      const b = Number(data.dmg_b);
      if (!a) return null;
      return b / a;
    }
    case 'ORDER_OF_USE':
    case 'STAT_PRIORITY_DELTA': {
      const ref = Number(data.dmg_ref);
      const test = Number(data.dmg_test);
      if (!ref) return null;
      return test / ref;
    }
    case 'DAMAGE_WINDOW': {
      const early = Number(data.dmg_early);
      const window = Number(data.dmg_window);
      if (!early) return null;
      return window / early;
    }
    case 'TAG_SWAP_IMPACT': {
      const base = Number(data.dmg_base);
      const tag = Number(data.dmg_tag);
      if (!base) return null;
      return tag / base;
    }
    case 'TAG_TO_BURST_CHAIN': {
      const base = Number(data.dmg_base);
      const chain = Number(data.dmg_chain);
      if (!base) return null;
      return chain / base;
    }
    case 'TAG_WINDOW_GAIN': {
      const noTag = Number(data.dmg_no_tag);
      const tagWindow = Number(data.dmg_tag_window);
      if (!noTag) return null;
      return tagWindow / noTag;
    }
    case 'COSTUME_IMPACT': {
      const base = Number(data.base_value);
      const value = Number(data.costume_value);
      if (!base) return null;
      return value / base;
    }
    case 'POTENTIAL_IMPACT': {
      const base = Number(data.base_value);
      const value = Number(data.potential_value);
      if (!base) return null;
      return value / base;
    }
    case 'BOSS_PRESSURE_DELTA': {
      const clean = Number(data.dmg_clean);
      const pressure = Number(data.dmg_pressure);
      if (!clean) return null;
      return pressure / clean;
    }
    case 'BURST_STATE_DELTA': {
      const off = Number(data.dmg_off);
      const on = Number(data.dmg_on);
      if (!off) return null;
      return on / off;
    }
    case 'ELEMENT_MATCHUP_DELTA': {
      const neutral = Number(data.dmg_neutral);
      const matchup = Number(data.dmg_matchup);
      if (!neutral) return null;
      return matchup / neutral;
    }
    case 'RES_SHRED_DELTA': {
      const basev = Number(data.dmg_base);
      const shred = Number(data.dmg_shred);
      if (!basev) return null;
      return shred / basev;
    }
    case 'PHASE_SPECIFIC_WINDOW_DELTA': {
      const basev = Number(data.dmg_base);
      const window = Number(data.dmg_window);
      if (!basev) return null;
      return window / basev;
    }
    case 'BOSS_INTERRUPT_PENALTY': {
      const clean = Number(data.dmg_clean);
      const interrupted = Number(data.dmg_interrupted);
      if (!clean) return null;
      return interrupted / clean;
    }
    case 'BURST_TRIGGER_WEAPON_DELTA': {
      const basev = Number(data.dmg_base);
      const triggered = Number(data.dmg_triggered);
      if (!basev) return null;
      return triggered / basev;
    }
    case 'BURST_WINDOW_HOLD_VALUE': {
      const early = Number(data.dmg_early);
      const hold = Number(data.dmg_hold);
      if (!early) return null;
      return hold / early;
    }
    case 'COMBINED_SKILL_DELTA': {
      const basev = Number(data.dmg_base);
      const combined = Number(data.dmg_combined);
      if (!basev) return null;
      return combined / basev;
    }
    case 'SUCCESSFUL_EVADE_BONUS_DELTA': {
      const fail = Number(data.dmg_fail);
      const success = Number(data.dmg_success);
      if (!fail) return null;
      return success / fail;
    }
    case 'ELEMENTAL_STATUS_UPTIME': {
      const active = Number(data.observed_active);
      const cycle = Number(data.cycle_duration);
      if (!cycle) return null;
      return active / cycle;
    }
    case 'BOSS_PATTERN_RECOVERY_DELTA': {
      const disrupted = Number(data.dmg_disrupted);
      const recovered = Number(data.dmg_recovered);
      if (!disrupted) return null;
      return recovered / disrupted;
    }
    default:
      return null;
  }
}

export function computeSecondaryMetrics(protoId, data) {
  const primary = computeMetric(protoId, data);
  if (primary == null) return {};

  if (protoId === 'WEAPON_SKILL_DELTA') {
    return {
      gain_ratio: primary,
      gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_b) - Number(data.dmg_a),
    };
  }
  if (protoId === 'ORDER_OF_USE' || protoId === 'STAT_PRIORITY_DELTA') {
    return {
      gain_ratio: primary,
      gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_test) - Number(data.dmg_ref),
    };
  }
  if (protoId === 'DAMAGE_WINDOW') {
    return {
      window_gain_ratio: primary,
      timing_penalty_pct: (1 - (1 / Math.max(primary, 1e-9))) * 100,
      delta_abs: Number(data.dmg_window) - Number(data.dmg_early),
    };
  }
  if (protoId === 'TAG_TO_BURST_CHAIN') {
    return {
      tag_burst_chain_ratio: primary,
      tag_burst_chain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_chain) - Number(data.dmg_base),
    };
  }
  if (protoId === 'TAG_WINDOW_GAIN') {
    return {
      tag_window_ratio: primary,
      tag_window_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_tag_window) - Number(data.dmg_no_tag),
    };
  }
  if (protoId === 'BOSS_PRESSURE_DELTA') {
    return {
      pressure_retention: primary,
      pressure_loss_pct: (1 - primary) * 100,
      delta_abs: Number(data.dmg_pressure) - Number(data.dmg_clean),
    };
  }
  if (protoId === 'BURST_STATE_DELTA') {
    return {
      burst_gain_ratio: primary,
      burst_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_on) - Number(data.dmg_off),
    };
  }
  if (protoId === 'ELEMENT_MATCHUP_DELTA') {
    return {
      matchup_gain_ratio: primary,
      matchup_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_matchup) - Number(data.dmg_neutral),
    };
  }
  if (protoId === 'RES_SHRED_DELTA') {
    return {
      shred_gain_ratio: primary,
      shred_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_shred) - Number(data.dmg_base),
    };
  }
  if (protoId === 'PHASE_SPECIFIC_WINDOW_DELTA') {
    return {
      phase_window_gain_ratio: primary,
      phase_window_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_window) - Number(data.dmg_base),
    };
  }
  if (protoId === 'BOSS_INTERRUPT_PENALTY') {
    return {
      interruption_retention: primary,
      interruption_loss_pct: (1 - primary) * 100,
      delta_abs: Number(data.dmg_interrupted) - Number(data.dmg_clean),
    };
  }
  if (protoId === 'BURST_TRIGGER_WEAPON_DELTA') {
    return {
      trigger_gain_ratio: primary,
      trigger_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_triggered) - Number(data.dmg_base),
    };
  }
  if (protoId === 'BURST_WINDOW_HOLD_VALUE') {
    return {
      hold_gain_ratio: primary,
      hold_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_hold) - Number(data.dmg_early),
    };
  }
  if (protoId === 'COMBINED_SKILL_DELTA') {
    return {
      combined_gain_ratio: primary,
      combined_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_combined) - Number(data.dmg_base),
    };
  }
  if (protoId === 'SUCCESSFUL_EVADE_BONUS_DELTA') {
    return {
      evade_gain_ratio: primary,
      evade_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_success) - Number(data.dmg_fail),
    };
  }
  if (protoId === 'ELEMENTAL_STATUS_UPTIME') {
    return {
      elemental_uptime: primary,
      expected_ratio: Number(data.observed_active) / Math.max(0.1, Number(data.expected_duration)),
      delta_abs: Number(data.observed_active) - Number(data.expected_duration),
    };
  }
  if (protoId === 'BOSS_PATTERN_RECOVERY_DELTA') {
    return {
      recovery_ratio: primary,
      recovery_gain_pct: (primary - 1) * 100,
      delta_abs: Number(data.dmg_recovered) - Number(data.dmg_disrupted),
    };
  }
  return { primary };
}
