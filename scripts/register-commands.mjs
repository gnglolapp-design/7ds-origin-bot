import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  const raw = fs.readFileSync(file, "utf-8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  throw new Error(".env manquant");
}

const env = loadEnv(envPath);
const appId = env.DISCORD_APPLICATION_ID;
const guildId = env.DISCORD_GUILD_ID;
const botToken = env.DISCORD_BOT_TOKEN;

if (!appId) throw new Error("DISCORD_APPLICATION_ID manquant");
if (!guildId) throw new Error("DISCORD_GUILD_ID manquant");
if (!botToken) throw new Error("DISCORD_BOT_TOKEN manquant");

const api = "https://discord.com/api/v10";
const STRING = 3;

const NUMBER = 10; 
const INTEGER = 4;
// Discord option type
const CHAT_INPUT = 1;
const SUB_COMMAND = 1;
const BOOLEAN = 5;
const HIDDEN_BY_DEFAULT = "0";

// Discord application command option types (https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type)

const SUB_COMMAND_GROUP = 2;

const USER = 6;
const CHANNEL = 7;
const ROLE = 8;
const MENTIONABLE = 9;

const ATTACHMENT = 11;

const rawCommands = [
  { name: "perso", description: "Afficher un personnage" },
  { name: "boss", description: "Afficher un boss" },
  { name: "raid", description: "Créer un raid et gérer les inscriptions" },
  { name: "glossaire", description: "Afficher le glossaire de combat" },
  { name: "elements", description: "Afficher le résumé des éléments" },
  {
    name: "liste",
    description: "Lister les personnages avec filtres",
    type: CHAT_INPUT,
    options: [
      { type: STRING, name: "attribut", description: "Filtrer par attribut", autocomplete: true, required: false },
      { type: STRING, name: "role", description: "Filtrer par rôle", autocomplete: true, required: false },
      { type: STRING, name: "arme", description: "Filtrer par type d'arme", autocomplete: true, required: false },
      { type: STRING, name: "rarete", description: "Filtrer par rareté", autocomplete: true, required: false },
      { type: STRING, name: "tag", description: "Filtrer par tag gameplay détecté", autocomplete: true, required: false },
    ],
  },
  {
    name: "compare-persos",
    description: "Comparer deux personnages",
    type: CHAT_INPUT,
    options: [
      { type: STRING, name: "perso1", description: "Premier personnage", autocomplete: true, required: true },
      { type: STRING, name: "perso2", description: "Second personnage", autocomplete: true, required: true },
    ],
  },
  {
    name: "compare-armes",
    description: "Comparer deux armes d'un même personnage",
    type: CHAT_INPUT,
    options: [
      { type: STRING, name: "perso", description: "Personnage concerné", autocomplete: true, required: true },
      { type: STRING, name: "arme1", description: "Première arme", autocomplete: true, required: true },
      { type: STRING, name: "arme2", description: "Seconde arme", autocomplete: true, required: true },
    ],
  },
  { name: "maj-base", description: "Afficher l'état actuel de la base du bot", type: CHAT_INPUT },
  { name: "nouveautes", description: "Afficher les dernières nouveautés détectées dans la base", type: CHAT_INPUT },
  {
    name: "compo",
    description: "Analyser une composition de 2 à 4 profils",
    type: CHAT_INPUT,
    options: [
      {
        type: SUB_COMMAND,
        name: "analyser",
        description: "Analyse structurée d'équipe",
        options: [
          { type: STRING, name: "perso1", description: "Personnage 1", autocomplete: true, required: true },
          { type: STRING, name: "perso2", description: "Personnage 2", autocomplete: true, required: true },
          { type: STRING, name: "arme1", description: "Arme de perso1", autocomplete: true, required: false },
          { type: STRING, name: "arme2", description: "Arme de perso2", autocomplete: true, required: false },
          { type: STRING, name: "perso3", description: "Personnage 3", autocomplete: true, required: false },
          { type: STRING, name: "arme3", description: "Arme de perso3", autocomplete: true, required: false },
          { type: STRING, name: "perso4", description: "Personnage 4", autocomplete: true, required: false },
          { type: STRING, name: "arme4", description: "Arme de perso4", autocomplete: true, required: false },
        ],
      },
      {
        type: SUB_COMMAND,
        name: "vs-boss",
        description: "Analyse d'équipe + friction boss",
        options: [
          { type: STRING, name: "perso1", description: "Personnage 1", autocomplete: true, required: true },
          { type: STRING, name: "perso2", description: "Personnage 2", autocomplete: true, required: true },
          { type: STRING, name: "boss", description: "Boss", autocomplete: true, required: true },
          { type: STRING, name: "arme1", description: "Arme de perso1", autocomplete: true, required: false },
          { type: STRING, name: "arme2", description: "Arme de perso2", autocomplete: true, required: false },
          { type: STRING, name: "perso3", description: "Personnage 3", autocomplete: true, required: false },
          { type: STRING, name: "arme3", description: "Arme de perso3", autocomplete: true, required: false },
          { type: STRING, name: "perso4", description: "Personnage 4", autocomplete: true, required: false },
          { type: STRING, name: "arme4", description: "Arme de perso4", autocomplete: true, required: false },
        ],
      },
    ],
  },
  
  {
    name: "test",
    description: "Outils de tests theorycraft (strict)",
    type: CHAT_INPUT,
    options: [
      { type: SUB_COMMAND, name: "protocoles", description: "Lister les protocoles disponibles" },
      { type: SUB_COMMAND, name: "charte", description: "Afficher la charte du Test Lab" },
      {
        type: SUB_COMMAND,
        name: "demarrer",
        description: "Afficher la fiche d'un protocole (champs requis, N min)",
        options: [
          { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
        ],
      },
      {
        type: SUB_COMMAND,
        name: "resultats",
        description: "Afficher les résultats agrégés d'un protocole",
        options: [
          { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
        ],
      },
      {
        type: SUB_COMMAND,
        name: "valides",
        description: "Lister les snapshots publiés",
      },
      {
        type: SUB_COMMAND,
        name: "valide",
        description: "Afficher un snapshot publié",
        options: [
          { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "mon-historique",
        description: "Afficher ton historique de soumissions (privé)",
        options: [
          { type: STRING, name: "protocole", description: "Filtrer par protocole (optionnel)", autocomplete: true, required: false },
        ],
      },
      {
        type: SUB_COMMAND,
        name: "detail",
        description: "Afficher le détail d'une soumission (privé)",
        options: [
          { type: STRING, name: "submission", description: "ID de soumission (ex: kx7p3...)", required: true },
        ],
      },
      {
        type: SUB_COMMAND,
        name: "supprimer",
        description: "Supprimer une de tes soumissions (privé)",
        options: [
          { type: STRING, name: "submission", description: "ID de soumission", required: true },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_atk",
        description: "Soumettre un test SCALING_ATK (ATK → dégâts)",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: STRING, name: "arme", description: "Arme utilisée", autocomplete: true, required: true },
          { type: NUMBER, name: "atk", description: "ATK affichée", required: true },
          { type: NUMBER, name: "dmg", description: "Dégâts observés", required: true },
          { type: INTEGER, name: "crit", description: "0=non crit, 1=crit", required: true },
          { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_def",
        description: "Soumettre un test SCALING_DEF (DEF → dégâts subis)",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: NUMBER, name: "def", description: "DEF affichée", required: true },
          { type: NUMBER, name: "dmg_taken", description: "Dégâts subis observés", required: true },
          { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_crit_rate",
        description: "Soumettre un test CRIT_RATE_REAL",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: NUMBER, name: "crit_rate_shown", description: "Taux crit affiché (%)", required: true },
          { type: INTEGER, name: "attempts", description: "Tentatives", required: true },
          { type: INTEGER, name: "crits", description: "Crits observés", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_crit_dmg",
        description: "Soumettre un test CRIT_DMG_REAL",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: NUMBER, name: "dmg_noncrit", description: "Dégâts non-crit (moyenne)", required: true },
          { type: NUMBER, name: "dmg_crit", description: "Dégâts crit (moyenne)", required: true },
          { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_buff",
        description: "Soumettre un test BUFF_STACKING",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: NUMBER, name: "base_dmg", description: "Dégâts sans buff", required: true },
          { type: NUMBER, name: "buff1_dmg", description: "Dégâts avec buff 1", required: true },
          { type: NUMBER, name: "buff2_dmg", description: "Dégâts avec buff 1 + buff 2", required: true },
          { type: STRING, name: "buff1", description: "Nom buff 1", required: true },
          { type: STRING, name: "buff2", description: "Nom buff 2", required: true },
          { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },

      {
        type: SUB_COMMAND,
        name: "soumettre_status",
        description: "Soumettre un test STATUS_PROC_RATE",
        options: [
          { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
          { type: STRING, name: "status", description: "Nom statut", required: true },
          { type: INTEGER, name: "attempts", description: "Tentatives", required: true },
          { type: INTEGER, name: "procs", description: "Procs observés", required: true },
          { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
        ],
      },


{
  type: SUB_COMMAND,
  name: "soumettre_multihit",
  description: "Soumettre un test MULTI_HIT_SNAPSHOT",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: NUMBER, name: "before_dmg", description: "Dégâts avant changement d'état", required: true },
    { type: NUMBER, name: "after_dmg", description: "Dégâts après changement d'état", required: true },
    { type: INTEGER, name: "split_hit", description: "Hit où l'état change", required: true },
    { type: INTEGER, name: "total_hits", description: "Nombre total de hits", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},

{
  type: SUB_COMMAND,
  name: "soumettre_cooldown",
  description: "Soumettre un test COOLDOWN_REAL",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: NUMBER, name: "shown_cd", description: "Cooldown affiché", required: true },
    { type: NUMBER, name: "observed_cd", description: "Cooldown observé", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},

{
  type: SUB_COMMAND,
  name: "soumettre_uptime",
  description: "Soumettre un test BUFF_UPTIME",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: STRING, name: "buff", description: "Nom du buff/debuff", required: true },
    { type: NUMBER, name: "expected_duration", description: "Durée théorique", required: true },
    { type: NUMBER, name: "observed_active", description: "Temps actif observé", required: true },
    { type: NUMBER, name: "cycle_duration", description: "Durée du cycle", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},

{
  type: SUB_COMMAND,
  name: "soumettre_interaction",
  description: "Soumettre un test INTERACTION_AB",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: NUMBER, name: "base_dmg", description: "Dégâts de base", required: true },
    { type: STRING, name: "effect_a", description: "Nom effet A", required: true },
    { type: NUMBER, name: "a_dmg", description: "Dégâts avec A seul", required: true },
    { type: STRING, name: "effect_b", description: "Nom effet B", required: true },
    { type: NUMBER, name: "b_dmg", description: "Dégâts avec B seul", required: true },
    { type: NUMBER, name: "ab_dmg", description: "Dégâts avec A+B", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},

      {
  type: SUB_COMMAND,
  name: "soumettre_arme_skill",
  description: "Soumettre un test WEAPON_SKILL_DELTA",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: STRING, name: "arme_a", description: "Arme de référence", autocomplete: true, required: true },
    { type: STRING, name: "arme_b", description: "Arme testée", autocomplete: true, required: true },
    { type: STRING, name: "skill", description: "Skill ou action comparée", required: true },
    { type: NUMBER, name: "dmg_a", description: "Dégâts avec arme A", required: true },
    { type: NUMBER, name: "dmg_b", description: "Dégâts avec arme B", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},
      {
  type: SUB_COMMAND,
  name: "soumettre_ordre",
  description: "Soumettre un test ORDER_OF_USE",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: STRING, name: "order_ref", description: "Ordre de référence", required: true },
    { type: NUMBER, name: "dmg_ref", description: "Dégâts ordre de référence", required: true },
    { type: STRING, name: "order_test", description: "Ordre testé", required: true },
    { type: NUMBER, name: "dmg_test", description: "Dégâts ordre testé", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},
      {
  type: SUB_COMMAND,
  name: "soumettre_fenetre",
  description: "Soumettre un test DAMAGE_WINDOW",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: STRING, name: "action", description: "Skill ou action gardée", required: true },
    { type: NUMBER, name: "dmg_window", description: "Dégâts au bon moment", required: true },
    { type: NUMBER, name: "dmg_early", description: "Dégâts si joué trop tôt", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},
      {
  type: SUB_COMMAND,
  name: "soumettre_tag_swap",
  description: "Soumettre un test TAG_SWAP_IMPACT",
  options: [
    { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
    { type: STRING, name: "trigger", description: "Nom du tag / swap", required: true },
    { type: NUMBER, name: "dmg_base", description: "Dégâts sans tag/swap", required: true },
    { type: NUMBER, name: "dmg_tag", description: "Dégâts avec tag/swap", required: true },
    { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
    { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
  ],
},

      {
        type: SUB_COMMAND_GROUP,
        name: "systeme",
        description: "Soumissions v77.2 (costumes, potentiels, uptime, stats, boss)",
        options: [
          {
            type: SUB_COMMAND,
            name: "tag_to_burst",
            description: "Soumettre un test TAG_TO_BURST_CHAIN",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "trigger", description: "Entrée / relais tag testé", required: true },
              { type: NUMBER, name: "dmg_base", description: "Résultat sans chaîne", required: true },
              { type: NUMBER, name: "dmg_chain", description: "Résultat avec chaîne tag vers Burst", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "boss", description: "Boss testé (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "tag_window",
            description: "Soumettre un test TAG_WINDOW_GAIN",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "action", description: "Action gardée ou préparée", required: true },
              { type: NUMBER, name: "dmg_no_tag", description: "Résultat sans préparation tag", required: true },
              { type: NUMBER, name: "dmg_tag_window", description: "Résultat avec fenêtre préparée", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "boss", description: "Boss testé (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "costume",
            description: "Soumettre un test COSTUME_IMPACT",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "costume", description: "Nom du costume", required: true },
              { type: STRING, name: "impact_type", description: "degats / survie / utilite", required: true },
              { type: NUMBER, name: "base_value", description: "Valeur sans costume", required: true },
              { type: NUMBER, name: "costume_value", description: "Valeur avec costume", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "potentiel",
            description: "Soumettre un test POTENTIAL_IMPACT",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "potential", description: "Nom du potentiel", required: true },
              { type: STRING, name: "impact_type", description: "degats / survie / utilite", required: true },
              { type: NUMBER, name: "base_value", description: "Valeur sans potentiel", required: true },
              { type: NUMBER, name: "potential_value", description: "Valeur avec potentiel", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "uptime_buff",
            description: "Soumettre un test BUFF_REAL_UPTIME",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "buff", description: "Nom du buff", required: true },
              { type: NUMBER, name: "expected_duration", description: "Durée théorique", required: true },
              { type: NUMBER, name: "observed_active", description: "Temps actif observé", required: true },
              { type: NUMBER, name: "cycle_duration", description: "Durée du cycle", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "uptime_debuff",
            description: "Soumettre un test DEBUFF_REAL_UPTIME",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "debuff", description: "Nom du debuff", required: true },
              { type: NUMBER, name: "expected_duration", description: "Durée théorique", required: true },
              { type: NUMBER, name: "observed_active", description: "Temps actif observé", required: true },
              { type: NUMBER, name: "cycle_duration", description: "Durée du cycle", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "stat_priority",
            description: "Soumettre un test STAT_PRIORITY_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "stat_ref", description: "Axe de référence", required: true },
              { type: NUMBER, name: "dmg_ref", description: "Résultat avec cet axe", required: true },
              { type: STRING, name: "stat_test", description: "Axe testé", required: true },
              { type: NUMBER, name: "dmg_test", description: "Résultat avec cet axe", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "boss_pressure",
            description: "Soumettre un test BOSS_PRESSURE_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "boss", description: "Boss testé", autocomplete: true, required: true },
              { type: STRING, name: "setup", description: "Setup ou plan de jeu", required: true },
              { type: NUMBER, name: "dmg_clean", description: "Résultat en combat propre", required: true },
              { type: NUMBER, name: "dmg_pressure", description: "Résultat sous pression", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "burst_state",
            description: "Soumettre un test BURST_STATE_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "state_off_label", description: "Label hors Burst", required: true },
              { type: NUMBER, name: "dmg_off", description: "Résultat hors Burst", required: true },
              { type: STRING, name: "state_on_label", description: "Label en Burst", required: true },
              { type: NUMBER, name: "dmg_on", description: "Résultat en Burst", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "element_matchup",
            description: "Soumettre un test ELEMENT_MATCHUP_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "element_id", description: "Élément offensif", autocomplete: true, required: true },
              { type: STRING, name: "target_element", description: "Élément de la cible", autocomplete: true, required: true },
              { type: NUMBER, name: "dmg_neutral", description: "Résultat neutre", required: true },
              { type: NUMBER, name: "dmg_matchup", description: "Résultat matchup", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "res_shred",
            description: "Soumettre un test RES_SHRED_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "shred_type", description: "Type de shred", required: true },
              { type: NUMBER, name: "dmg_base", description: "Résultat sans shred", required: true },
              { type: NUMBER, name: "dmg_shred", description: "Résultat avec shred", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "phase_window",
            description: "Soumettre un test PHASE_SPECIFIC_WINDOW_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "boss", description: "Boss testé", autocomplete: true, required: true },
              { type: STRING, name: "phase_id", description: "Phase ciblée", autocomplete: true, required: true },
              { type: STRING, name: "action", description: "Skill ou action gardée", required: true },
              { type: NUMBER, name: "dmg_base", description: "Résultat hors fenêtre", required: true },
              { type: NUMBER, name: "dmg_window", description: "Résultat dans la fenêtre", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "boss_interrupt",
            description: "Soumettre un test BOSS_INTERRUPT_PENALTY",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "boss", description: "Boss testé", autocomplete: true, required: true },
              { type: STRING, name: "setup", description: "Setup ou plan de jeu", required: true },
              { type: NUMBER, name: "dmg_clean", description: "Résultat propre", required: true },
              { type: NUMBER, name: "dmg_interrupted", description: "Résultat interrompu", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },

          {
            type: SUB_COMMAND,
            name: "burst_trigger_weapon",
            description: "Soumettre un test BURST_TRIGGER_WEAPON_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable", autocomplete: true, required: true },
              { type: NUMBER, name: "dmg_base", description: "Résultat hors trigger Burst", required: true },
              { type: NUMBER, name: "dmg_triggered", description: "Résultat avec trigger Burst", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "burst_hold",
            description: "Soumettre un test BURST_WINDOW_HOLD_VALUE",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "action", description: "Skill ou action gardée", required: true },
              { type: NUMBER, name: "dmg_early", description: "Résultat si joué trop tôt", required: true },
              { type: NUMBER, name: "dmg_hold", description: "Résultat si gardé", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "boss", description: "Boss testé (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "combined_skill",
            description: "Soumettre un test COMBINED_SKILL_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack", autocomplete: true, required: true },
              { type: NUMBER, name: "dmg_base", description: "Résultat de référence", required: true },
              { type: NUMBER, name: "dmg_combined", description: "Résultat avec Combined", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "boss", description: "Boss testé (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "evade_bonus",
            description: "Soumettre un test SUCCESSFUL_EVADE_BONUS_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive", autocomplete: true, required: true },
              { type: STRING, name: "window_label", description: "Fenêtre / action testée", required: true },
              { type: NUMBER, name: "dmg_fail", description: "Résultat sans esquive réussie", required: true },
              { type: NUMBER, name: "dmg_success", description: "Résultat avec esquive réussie", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "boss", description: "Boss testé (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "elemental_status",
            description: "Soumettre un test ELEMENTAL_STATUS_UPTIME",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "status_id", description: "Statut élémentaire", autocomplete: true, required: true },
              { type: STRING, name: "element_id", description: "Élément concerné", autocomplete: true, required: true },
              { type: NUMBER, name: "expected_duration", description: "Durée théorique", required: true },
              { type: NUMBER, name: "observed_active", description: "Temps actif observé", required: true },
              { type: NUMBER, name: "cycle_duration", description: "Durée du cycle", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "active_burst_element_id", description: "Élément du Burst actif (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "boss_recovery",
            description: "Soumettre un test BOSS_PATTERN_RECOVERY_DELTA",
            options: [
              { type: STRING, name: "perso", description: "Personnage", autocomplete: true, required: true },
              { type: STRING, name: "boss", description: "Boss testé", autocomplete: true, required: true },
              { type: STRING, name: "pattern_label", description: "Pattern ou événement boss", required: true },
              { type: NUMBER, name: "dmg_disrupted", description: "Résultat état cassé", required: true },
              { type: NUMBER, name: "dmg_recovered", description: "Résultat après reprise", required: true },
              { type: INTEGER, name: "n", description: "Nombre de mesures", required: true },
              { type: STRING, name: "phase_id", description: "Phase boss (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "scenario_id", description: "Scénario canonique (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "equippable_weapon_id", description: "Arme équipable (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_effect_id", description: "Effet de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "burst_family", description: "Famille de Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "combined_attack_id", description: "Combined Attack liée (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "successful_evade", description: "Esquive réussie juste avant ? (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "evade_rule_id", description: "Règle d'esquive (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "deluge_state", description: "État du Déluge/Burst (optionnel)", autocomplete: true, required: false },
              { type: STRING, name: "notes", description: "Notes (optionnel)", required: false },
            ],
          },
        ],
      },
      {
        type: SUB_COMMAND_GROUP,
        name: "admin",
        description: "Administration des protocoles / agrégats",
        options: [
          {
            type: SUB_COMMAND,
            name: "disable",
            description: "Désactiver un protocole",
            options: [
              { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "enable",
            description: "Activer un protocole",
            options: [
              { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "reset",
            description: "Réinitialiser les agrégats d'un protocole",
            options: [
              { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "rechercher",
            description: "Voir l'historique privé d'un utilisateur",
            options: [
              { type: USER, name: "user", description: "Utilisateur ciblé", required: true },
              { type: STRING, name: "protocole", description: "Filtrer par protocole", autocomplete: true, required: false },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "detail",
            description: "Afficher le détail d'une soumission",
            options: [
              { type: STRING, name: "submission", description: "ID de soumission", required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "supprimer",
            description: "Supprimer une soumission",
            options: [
              { type: STRING, name: "submission", description: "ID de soumission", required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "publier",
            description: "Publier un snapshot validé d'un protocole",
            options: [
              { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "publies",
            description: "Lister les snapshots publiés",
            options: [
              { type: STRING, name: "protocole", description: "Filtrer par protocole", autocomplete: true, required: false },
              { type: STRING, name: "scope", description: "Filtrer par portée", required: false, choices: [
                { name: "global", value: "global" },
                { name: "character", value: "character" },
                { name: "weapon", value: "weapon" },
                { name: "boss", value: "boss" },
                { name: "costume", value: "costume" },
                { name: "potential", value: "potential" }
              ] },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "publie_detail",
            description: "Afficher le détail d'un snapshot publié",
            options: [
              { type: STRING, name: "snapshot", description: "ID de snapshot publié", required: true },
            ],
          },
          {
            type: SUB_COMMAND,
            name: "verrouiller",
            description: "Verrouiller ou déverrouiller un protocole",
            options: [
              { type: STRING, name: "protocole", description: "ID du protocole", autocomplete: true, required: true },
              { type: BOOLEAN, name: "etat", description: "true = verrouillé, false = déverrouillé", required: true },
            ],
          },
        ],
      },
    ],
  },
{
    name: "tierlist",
    description: "Afficher la tierlist manuelle du serveur",
    type: CHAT_INPUT,
    options: [
      { type: STRING, name: "vue", description: "Vue de tierlist", autocomplete: true, required: false },
      { type: STRING, name: "tier", description: "Filtrer un tier précis", autocomplete: true, required: false },
    ],
  },
  {
    name: "tieredit",
    description: "Éditer la tierlist manuelle du serveur",
    type: CHAT_INPUT,
    default_member_permissions: HIDDEN_BY_DEFAULT,
    options: [
      {
        type: STRING,
        name: "action",
        description: "Action à appliquer",
        autocomplete: true,
        required: true,
      },
      { type: STRING, name: "vue", description: "Vue de tierlist", autocomplete: true, required: true },
      { type: STRING, name: "tier", description: "Tier concerné", autocomplete: true, required: false },
      { type: STRING, name: "perso", description: "Personnage concerné", autocomplete: true, required: false },
      { type: STRING, name: "note", description: "Note à définir (ou '-' pour supprimer)", required: false },
    ],
  },
  {
    name: "health",
    description: "Contrôle staff de l'état du bot et du pipeline",
    type: CHAT_INPUT,
    default_member_permissions: HIDDEN_BY_DEFAULT,
  },
  {
    name: "stats-bot",
    description: "Afficher les statistiques d'usage du bot",
    type: CHAT_INPUT,
    default_member_permissions: HIDDEN_BY_DEFAULT,
  },
  {
    name: "media-check",
    description: "Lister les médias manquants dans la base",
    type: CHAT_INPUT,
    default_member_permissions: HIDDEN_BY_DEFAULT,
  },
  {
    name: "sync-report",
    description: "Afficher le rapport staff de la dernière synchro",
    type: CHAT_INPUT,
    default_member_permissions: HIDDEN_BY_DEFAULT,
  },
];

function splitOversizedTestCommands(list = []) {
  const legacyTest = list.find((cmd) => cmd?.name === "test");
  if (!legacyTest || !Array.isArray(legacyTest.options)) return list;

  const rootOptions = legacyTest.options;
  const byName = Object.fromEntries(rootOptions.map((opt) => [String(opt?.name || ''), opt]));
  const systemOptions = Object.fromEntries(((byName.systeme?.options) || []).map((opt) => [String(opt?.name || ''), opt]));
  const adminOptions = Array.isArray(byName.admin?.options) ? byName.admin.options : [];

  const pickRoot = (name) => byName[name] || null;
  const pickSystem = (name) => systemOptions[name] || null;
  const makeCommand = (name, description, options, extra = {}) => ({
    name,
    description,
    type: CHAT_INPUT,
    options: options.filter(Boolean),
    ...extra,
  });

  const split = [
    makeCommand('test', 'Test Lab · protocoles, résultats et historique', [
      pickRoot('protocoles'), pickRoot('charte'), pickRoot('demarrer'), pickRoot('resultats'), pickRoot('valides'), pickRoot('valide'), pickRoot('mon-historique'), pickRoot('detail'), pickRoot('supprimer'),
    ]),
    makeCommand('testbasic', 'Test Lab · soumissions de base', [
      pickRoot('soumettre_atk'), pickRoot('soumettre_def'), pickRoot('soumettre_crit_rate'), pickRoot('soumettre_crit_dmg'), pickRoot('soumettre_buff'), pickRoot('soumettre_status'), pickRoot('soumettre_multihit'),
    ]),
    makeCommand('testtempo', 'Test Lab · rythme, fenêtre et rotation', [
      pickRoot('soumettre_cooldown'), pickRoot('soumettre_uptime'), pickRoot('soumettre_interaction'), pickRoot('soumettre_arme_skill'), pickRoot('soumettre_ordre'), pickRoot('soumettre_fenetre'), pickRoot('soumettre_tag_swap'),
    ]),
    makeCommand('testbuild', 'Test Lab · costumes, potentiels et uptime', [
      pickSystem('costume'), pickSystem('potentiel'), pickSystem('uptime_buff'), pickSystem('uptime_debuff'), pickSystem('stat_priority'),
    ]),
    makeCommand('testchain', 'Test Lab · tag, chaînes et Combined', [
      pickSystem('tag_to_burst'), pickSystem('tag_window'), pickSystem('combined_skill'),
    ]),
    makeCommand('testburst', 'Test Lab · Burst et lecture élémentaire', [
      pickSystem('burst_state'), pickSystem('element_matchup'), pickSystem('burst_trigger_weapon'), pickSystem('burst_hold'),
    ]),
    makeCommand('testboss', 'Test Lab · boss, phases et recovery', [
      pickSystem('boss_pressure'), pickSystem('res_shred'), pickSystem('phase_window'), pickSystem('boss_interrupt'), pickSystem('boss_recovery'),
    ]),
    makeCommand('testadvanced', 'Test Lab · evade et statuts avancés', [
      pickSystem('evade_bonus'), pickSystem('elemental_status'),
    ]),
    makeCommand('testadmin', 'Test Lab · administration', adminOptions, { default_member_permissions: HIDDEN_BY_DEFAULT }),
  ];

  return [...list.filter((cmd) => cmd !== legacyTest), ...split];
}

const commands = splitOversizedTestCommands(rawCommands);

async function discordPut(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bot ${botToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Discord API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

console.log("1) Suppression des commandes globales...");
await discordPut(`${api}/applications/${appId}/commands`, []);
console.log("2) Enregistrement des commandes GUILD...");
const result = await discordPut(`${api}/applications/${appId}/guilds/${guildId}/commands`, commands);
console.log("OK: commandes guild enregistrées.");
console.log(JSON.stringify(result, null, 2));
console.log("Note: tieredit, health, stats-bot, media-check et sync-report sont créés avec default_member_permissions=0. Si tu veux les afficher uniquement au rôle staff précis, règle ensuite la permission de commande côté Discord (Server Settings > Integrations). ");