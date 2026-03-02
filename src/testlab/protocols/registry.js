export const PROTOCOLS = {
  SCALING_ATK: {
    id: "SCALING_ATK",
    title: "Scaling ATK → Dégâts",
    what: "Mesure le ratio dégâts / ATK sur une compétence précise, dans des conditions contrôlées.",
    min_n: 10,
    fields: [
      ["perso", "slug du perso (autocomplete)"],
      ["arme", "nom exact de l'arme (optionnel)"],
      ["skill", "nom de la compétence testée (texte)"],
      ["atk", "ATK affichée"],
      ["dmg", "dégâts observés (non-crit ou crit selon champ)"],
      ["crit", "0 = non crit, 1 = crit"],
      ["n", "nombre de mesures"],
      ["notes", "optionnel"]
    ],
  },
  SCALING_DEF: {
    id: "SCALING_DEF",
    title: "Scaling DEF → Réduction",
    what: "Mesure la réduction des dégâts subis en fonction de DEF, sur une source de dégâts la plus stable possible.",
    min_n: 10,
    fields: [
      ["perso", "slug du perso"],
      ["def", "DEF affichée"],
      ["dmg_taken", "dégâts subis observés"],
      ["n", "nombre de mesures"],
      ["notes", "optionnel"]
    ],
  },
  CRIT_RATE_REAL: {
    id: "CRIT_RATE_REAL",
    title: "Taux crit réel",
    what: "Mesure le taux de crit observé sur N tentatives.",
    min_n: 50,
    fields: [
      ["perso", "slug du perso"],
      ["crit_rate_shown", "taux crit affiché (%)"],
      ["attempts", "nombre de tentatives"],
      ["crits", "nombre de crits observés"],
      ["notes", "optionnel"]
    ],
  },
  CRIT_DMG_REAL: {
    id: "CRIT_DMG_REAL",
    title: "Dégâts crit réels",
    what: "Mesure le ratio dégâts crit / dégâts non-crit.",
    min_n: 20,
    fields: [
      ["perso", "slug du perso"],
      ["dmg_noncrit", "dégâts non-crit observés (moyenne)"],
      ["dmg_crit", "dégâts crit observés (moyenne)"],
      ["n", "nombre de mesures"],
      ["notes", "optionnel"]
    ],
  },
  BUFF_STACKING: {
    id: "BUFF_STACKING",
    title: "Stacking buffs",
    what: "Compare base vs buff1 vs buff1+buff2 pour inférer additif/multiplicatif.",
    min_n: 10,
    fields: [
      ["perso", "slug du perso"],
      ["base_dmg", "dégâts sans buff"],
      ["buff1_dmg", "dégâts avec buff 1"],
      ["buff2_dmg", "dégâts avec buff 1 + buff 2"],
      ["buff1", "nom buff 1 (texte)"],
      ["buff2", "nom buff 2 (texte)"],
      ["n", "nombre de mesures"],
      ["notes", "optionnel"]
    ],
  },
  STATUS_PROC_RATE: {
    id: "STATUS_PROC_RATE",
    title: "Taux proc statut",
    what: "Mesure le taux d'application d'un statut sur N tentatives.",
    min_n: 50,
    fields: [
      ["perso", "slug du perso"],
      ["status", "nom du statut (texte)"],
      ["attempts", "tentatives"],
      ["procs", "procs observés"],
      ["notes", "optionnel"]
    ],
  },

MULTI_HIT_SNAPSHOT: {
  id: "MULTI_HIT_SNAPSHOT",
  title: "Multi-hit / snapshot",
  what: "Compare les hits avant/après un changement d'état pendant une même séquence pour voir si le jeu garde la valeur du lancement du sort ou la recalcule.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["before_dmg", "dégâts moyens avant changement d'état"],
    ["after_dmg", "dégâts moyens après changement d'état"],
    ["split_hit", "hit où l'état change"],
    ["total_hits", "nombre total de hits"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
COOLDOWN_REAL: {
  id: "COOLDOWN_REAL",
  title: "Cooldown réel",
  what: "Mesure l'écart entre cooldown affiché et cooldown réellement observé.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["shown_cd", "cooldown affiché"],
    ["observed_cd", "cooldown réellement observé"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BUFF_UPTIME: {
  id: "BUFF_UPTIME",
  title: "Uptime buff/debuff",
  what: "Mesure l'uptime réel d'un buff ou debuff sur un cycle donné.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["buff", "nom du buff/debuff"],
    ["expected_duration", "durée théorique d'activation"],
    ["observed_active", "temps actif observé"],
    ["cycle_duration", "durée totale du cycle"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
INTERACTION_AB: {
  id: "INTERACTION_AB",
  title: "Interaction A + B",
  what: "Compare base, A seul, B seul et A+B pour classifier l'interaction observée.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["base_dmg", "dégâts de base"],
    ["effect_a", "nom effet A"],
    ["a_dmg", "dégâts avec A seul"],
    ["effect_b", "nom effet B"],
    ["b_dmg", "dégâts avec B seul"],
    ["ab_dmg", "dégâts avec A+B"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
WEAPON_SKILL_DELTA: {
  id: "WEAPON_SKILL_DELTA",
  title: "Impact arme → skill",
  what: "Compare deux armes du même perso sur une même action pour voir ce que l'arme change vraiment.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["arme_a", "arme de référence"],
    ["arme_b", "arme testée"],
    ["skill", "skill ou action comparée"],
    ["dmg_a", "dégâts observés avec l'arme A"],
    ["dmg_b", "dégâts observés avec l'arme B"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
ORDER_OF_USE: {
  id: "ORDER_OF_USE",
  title: "Ordre d'utilisation",
  what: "Compare deux ordres d'action sur le même setup pour voir si l'ordre change vraiment le résultat.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["order_ref", "ordre de référence (ex: buff > skill)"],
    ["dmg_ref", "dégâts avec l'ordre de référence"],
    ["order_test", "ordre testé"],
    ["dmg_test", "dégâts avec l'ordre testé"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
DAMAGE_WINDOW: {
  id: "DAMAGE_WINDOW",
  title: "Fenêtre de dégâts",
  what: "Compare une action gardée pour le bon moment vs jouée trop tôt pour mesurer la vraie valeur de la fenêtre.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["action", "skill ou action gardée"],
    ["dmg_window", "dégâts au bon moment"],
    ["dmg_early", "dégâts si joué trop tôt"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
TAG_SWAP_IMPACT: {
  id: "TAG_SWAP_IMPACT",
  title: "Impact tag / swap",
  what: "Compare sans tag/swap puis avec tag/swap pour mesurer ce que ce passage apporte vraiment.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["trigger", "nom du tag / swap / déclencheur"],
    ["dmg_base", "dégâts sans tag/swap"],
    ["dmg_tag", "dégâts avec tag/swap"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
TAG_TO_BURST_CHAIN: {
  id: "TAG_TO_BURST_CHAIN",
  title: "Chaîne tag vers Burst",
  what: "Compare une séquence sans relais tag/Burst puis la même avec chaîne tag vers Burst pour mesurer si le relais ouvre un vrai gain.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["trigger", "entrée / relais testé"],
    ["dmg_base", "résultat sans chaîne"],
    ["dmg_chain", "résultat avec chaîne tag vers Burst"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
TAG_WINDOW_GAIN: {
  id: "TAG_WINDOW_GAIN",
  title: "Gain de fenêtre préparée par tag",
  what: "Compare une action lancée sans préparation tag puis dans une fenêtre préparée par tag pour mesurer le vrai gain.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["action", "action gardée ou préparée"],
    ["dmg_no_tag", "résultat sans préparation tag"],
    ["dmg_tag_window", "résultat avec fenêtre préparée"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
COSTUME_IMPACT: {
  id: "COSTUME_IMPACT",
  title: "Impact costume",
  what: "Compare sans costume puis avec costume pour voir si le costume change vraiment dégâts, survie ou utilité.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["costume", "nom du costume testé"],
    ["impact_type", "degats / survie / utilite"],
    ["base_value", "valeur observée sans costume"],
    ["costume_value", "valeur observée avec costume"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
POTENTIAL_IMPACT: {
  id: "POTENTIAL_IMPACT",
  title: "Impact potentiel",
  what: "Compare sans potentiel puis avec potentiel pour voir ce qu'il change vraiment en dégâts, survie ou utilité.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["potential", "nom du potentiel testé"],
    ["impact_type", "degats / survie / utilite"],
    ["base_value", "valeur observée sans potentiel"],
    ["potential_value", "valeur observée avec potentiel"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BUFF_REAL_UPTIME: {
  id: "BUFF_REAL_UPTIME",
  title: "Uptime réel buff",
  what: "Mesure si un buff important reste assez longtemps actif pour mériter une vraie priorité en combat.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["buff", "nom du buff"],
    ["expected_duration", "durée théorique"],
    ["observed_active", "temps actif observé"],
    ["cycle_duration", "durée totale du cycle"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
DEBUFF_REAL_UPTIME: {
  id: "DEBUFF_REAL_UPTIME",
  title: "Uptime réel debuff",
  what: "Mesure si un debuff important tient vraiment assez longtemps pour peser dans un vrai combat.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["debuff", "nom du debuff"],
    ["expected_duration", "durée théorique"],
    ["observed_active", "temps actif observé"],
    ["cycle_duration", "durée totale du cycle"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
STAT_PRIORITY_DELTA: {
  id: "STAT_PRIORITY_DELTA",
  title: "Priorité de stats",
  what: "Compare deux axes de stats sur le même perso pour voir lequel rapporte vraiment le plus.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["stat_ref", "axe de référence (ex: ATK)"],
    ["dmg_ref", "résultat avec cet axe"],
    ["stat_test", "axe testé (ex: crit_dmg)"],
    ["dmg_test", "résultat avec cet axe"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BOSS_PRESSURE_DELTA: {
  id: "BOSS_PRESSURE_DELTA",
  title: "Pression boss",
  what: "Compare un setup en combat propre puis sous pression boss pour voir ce qu'il perd quand le rythme se casse.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["boss", "boss testé"],
    ["setup", "setup ou plan de jeu testé"],
    ["dmg_clean", "résultat en combat propre"],
    ["dmg_pressure", "résultat sous pression"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},

BURST_STATE_DELTA: {
  id: "BURST_STATE_DELTA",
  title: "Impact état Burst",
  what: "Compare un même setup hors Burst puis en Burst pour mesurer la dépendance réelle à l'état Burst.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["state_off_label", "nom de l'état hors Burst"],
    ["dmg_off", "résultat hors Burst"],
    ["state_on_label", "nom de l'état Burst"],
    ["dmg_on", "résultat en Burst"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
ELEMENT_MATCHUP_DELTA: {
  id: "ELEMENT_MATCHUP_DELTA",
  title: "Matchup élémentaire",
  what: "Compare une référence neutre puis un matchup élémentaire ciblé pour mesurer le vrai gain de l'élément.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["element_id", "élément offensif testé"],
    ["target_element", "élément de la cible"],
    ["dmg_neutral", "résultat neutre"],
    ["dmg_matchup", "résultat avec matchup élémentaire"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
RES_SHRED_DELTA: {
  id: "RES_SHRED_DELTA",
  title: "Impact shred résistance",
  what: "Compare un setup sans shred puis avec shred pour voir ce qu'une baisse de résistance apporte vraiment.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["shred_type", "type de shred ou debuff"],
    ["dmg_base", "résultat sans shred"],
    ["dmg_shred", "résultat avec shred"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
PHASE_SPECIFIC_WINDOW_DELTA: {
  id: "PHASE_SPECIFIC_WINDOW_DELTA",
  title: "Fenêtre par phase boss",
  what: "Compare une action jouée hors fenêtre puis dans la bonne phase du boss pour mesurer la valeur réelle de cette fenêtre.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["boss", "boss testé"],
    ["phase_id", "phase ciblée"],
    ["action", "skill ou action gardée"],
    ["dmg_base", "résultat hors fenêtre de phase"],
    ["dmg_window", "résultat dans la bonne fenêtre"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BOSS_INTERRUPT_PENALTY: {
  id: "BOSS_INTERRUPT_PENALTY",
  title: "Pénalité d'interruption boss",
  what: "Compare un setup propre puis le même setup interrompu pour mesurer ce que le boss casse réellement.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["boss", "boss testé"],
    ["setup", "setup ou plan de jeu testé"],
    ["dmg_clean", "résultat en setup propre"],
    ["dmg_interrupted", "résultat après interruption"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},

BURST_TRIGGER_WEAPON_DELTA: {
  id: "BURST_TRIGGER_WEAPON_DELTA",
  title: "Trigger Burst d'arme équipable",
  what: "Compare une arme équipable hors déclenchement de Burst puis sur un déclenchement lié au Burst pour mesurer sa vraie valeur.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["equippable_weapon_id", "arme équipable testée"],
    ["dmg_base", "résultat sans trigger Burst"],
    ["dmg_triggered", "résultat avec trigger Burst"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BURST_WINDOW_HOLD_VALUE: {
  id: "BURST_WINDOW_HOLD_VALUE",
  title: "Valeur de hold fenêtre Burst",
  what: "Compare une action Burst jouée trop tôt puis gardée pour la bonne fenêtre pour mesurer la vraie valeur du hold.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["action", "skill ou action gardée"],
    ["dmg_early", "résultat si joué trop tôt"],
    ["dmg_hold", "résultat si gardé pour la fenêtre"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
COMBINED_SKILL_DELTA: {
  id: "COMBINED_SKILL_DELTA",
  title: "Impact Combined Skill",
  what: "Compare une séquence de référence puis la même avec Combined Attack/Skill pour mesurer son gain réel.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["combined_attack_id", "Combined Attack testée"],
    ["dmg_base", "résultat de référence"],
    ["dmg_combined", "résultat avec Combined"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
SUCCESSFUL_EVADE_BONUS_DELTA: {
  id: "SUCCESSFUL_EVADE_BONUS_DELTA",
  title: "Bonus après esquive réussie",
  what: "Compare une action sans esquive réussie puis après une esquive réussie pour voir la vraie valeur du bonus.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["evade_rule_id", "règle d'esquive testée"],
    ["window_label", "nom de la fenêtre / action"],
    ["dmg_fail", "résultat sans esquive réussie"],
    ["dmg_success", "résultat après esquive réussie"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
ELEMENTAL_STATUS_UPTIME: {
  id: "ELEMENTAL_STATUS_UPTIME",
  title: "Uptime statut élémentaire",
  what: "Mesure le temps réel d'un statut élémentaire actif sur un cycle, pour voir s'il tient assez pour peser dans le combat.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["status_id", "statut élémentaire"],
    ["element_id", "élément concerné"],
    ["expected_duration", "durée théorique"],
    ["observed_active", "temps actif observé"],
    ["cycle_duration", "durée totale du cycle"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
BOSS_PATTERN_RECOVERY_DELTA: {
  id: "BOSS_PATTERN_RECOVERY_DELTA",
  title: "Recovery après pattern boss",
  what: "Compare un état cassé par le pattern du boss puis la reprise du setup pour mesurer la récupération réelle.",
  min_n: 10,
  fields: [
    ["perso", "slug du perso"],
    ["boss", "boss testé"],
    ["pattern_label", "pattern ou événement boss"],
    ["dmg_disrupted", "résultat pendant l'état cassé"],
    ["dmg_recovered", "résultat après reprise"],
    ["n", "nombre de mesures"],
    ["notes", "optionnel"]
  ],
},
};
