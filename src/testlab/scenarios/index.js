export const SCENARIOS = {
  clean_short_fight: {
    id: 'clean_short_fight',
    label: 'Combat propre court',
    description: 'Setup propre, peu de perturbations, cycle court pour isoler un gain direct.',
    requiredContext: ['character_id'],
    controls: ['same_target', 'same_skill', 'same_buff_state'],
    focusMetrics: ['gain_ratio', 'stability'],
  },
  clean_long_cycle: {
    id: 'clean_long_cycle',
    label: 'Combat long stable',
    description: 'Cycle plus long pour juger uptime, régularité et tenue réelle.',
    requiredContext: ['character_id'],
    controls: ['same_target', 'same_rotation_family'],
    focusMetrics: ['uptime_ratio', 'stability'],
  },
  burst_window: {
    id: 'burst_window',
    label: 'Fenêtre burst',
    description: 'Mesure la vraie valeur d\'une fenêtre de burst ou d\'un alignement de setup.',
    requiredContext: ['character_id'],
    controls: ['same_target', 'same_phase', 'same_buff_state'],
    focusMetrics: ['burst_gain_ratio', 'timing_penalty'],
  },
  tag_swap_setup: {
    id: 'tag_swap_setup',
    label: 'Tag / swap setup',
    description: 'Mesure ce que le swap ou le tag ajoute dans un setup comparable.',
    requiredContext: ['character_id'],
    controls: ['same_target', 'same_rotation_family'],
    focusMetrics: ['tag_gain_ratio', 'stability'],
  },
  boss_pressure: {
    id: 'boss_pressure',
    label: 'Pression boss',
    description: 'Mesure la perte ou la tenue d\'un setup quand le boss casse le rythme.',
    requiredContext: ['character_id', 'boss_id'],
    controls: ['same_boss', 'same_setup_family'],
    focusMetrics: ['pressure_retention', 'recovery_penalty'],
  },
  phase_locked_boss: {
    id: 'phase_locked_boss',
    label: 'Boss à phase verrouillée',
    description: 'Mesure un setup dans une phase précise d\'un boss.',
    requiredContext: ['character_id', 'boss_id', 'phase_id'],
    controls: ['same_boss', 'same_phase'],
    focusMetrics: ['phase_gain_ratio', 'stability'],
  },
};

export function getScenario(id) {
  if (!id) return null;
  return SCENARIOS[String(id)] || null;
}

export function listScenarios() {
  return Object.values(SCENARIOS);
}
