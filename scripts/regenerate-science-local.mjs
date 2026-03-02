import fs from 'node:fs';
import path from 'node:path';
import { readJSON, writeJSON } from './lib/fs-utils.mjs';
import { buildKvBulk } from './merge/kv-bulk.mjs';
import { buildScienceCharacters } from './merge/science-characters.mjs';
import { buildScienceWeaponKits } from './merge/science-weapon-kits.mjs';
import { buildScienceSkills } from './merge/science-skills.mjs';
import { buildScienceBosses } from './merge/science-bosses.mjs';
import { buildScienceBossPhases } from './merge/science-boss-phases.mjs';
import { buildScienceEquippableWeapons } from './merge/science-equippable-weapons.mjs';
import { buildScienceElements } from './merge/science-elements.mjs';
import { buildScienceStatuses } from './merge/science-statuses.mjs';
import { buildScienceScenarios } from './merge/science-scenarios.mjs';
import { buildScienceBurstEffects } from './merge/science-burst-effects.mjs';
import { buildScienceCombinedAttacks } from './merge/science-combined-attacks.mjs';
import { buildScienceEvadeRules } from './merge/science-evade-rules.mjs';
import { checkScienceData } from './check-science-data.mjs';

const root = process.cwd();
const compiledDir = path.join(root, 'data', 'compiled');
const rawDir = path.join(root, 'data', 'raw');
const manualDir = path.join(root, 'data', 'manual');
const characters = readJSON(path.join(compiledDir, 'characters.json'), []);
const bosses = readJSON(path.join(compiledDir, 'bosses.json'), []);
const genshin = readJSON(path.join(rawDir, 'genshin.json'), {});
const hideout = readJSON(path.join(rawDir, 'hideout.json'), {});
const origin = readJSON(path.join(rawDir, '7dsorigin.json'), {});
const sourceReport = readJSON(path.join(compiledDir, 'source-report.json'), null);
const mediaReport = readJSON(path.join(compiledDir, 'media-report.json'), null);
const syncReport = readJSON(path.join(compiledDir, 'sync-report.json'), null);
const nouveautes = readJSON(path.join(compiledDir, 'catalog-nouveautes.json'), null);
const meta = readJSON(path.join(compiledDir, 'source-report.json'), null) ? readJSON(path.join(compiledDir, 'kv-bulk.json'), []).find(e => e.key==='meta:base')?.value : null;
const scienceCharacters = buildScienceCharacters({ characters, rawSources: { genshin, hideout, origin } });
const scienceWeaponKits = buildScienceWeaponKits({ characters, rawSources: { genshin, hideout, origin } });
const scienceSkills = buildScienceSkills({ characters, rawSources: { genshin, hideout, origin } });
const scienceBosses = buildScienceBosses({ bosses, rawSources: { hideout, origin } });
const scienceBossPhases = buildScienceBossPhases({ bosses });
const scienceEquippableWeapons = buildScienceEquippableWeapons({ genshin: genshin?.weapons || [], manual: readJSON(path.join(manualDir, 'equippable-weapons.json'), []) });
const scienceElements = buildScienceElements();
const scienceStatuses = buildScienceStatuses({ characters });
const scienceScenarios = buildScienceScenarios();
const scienceBurstEffects = buildScienceBurstEffects({ manual: readJSON(path.join(manualDir, 'burst-effects.json'), []) });
const scienceCombinedAttacks = buildScienceCombinedAttacks({ manual: readJSON(path.join(manualDir, 'combined-attacks.json'), []) });
const scienceEvadeRules = buildScienceEvadeRules({ manual: readJSON(path.join(manualDir, 'evade-rules.json'), []) });
for (const [name, payload] of Object.entries({
  'science-characters.json': scienceCharacters,
  'science-weapon-kits.json': scienceWeaponKits,
  'science-skills.json': scienceSkills,
  'science-bosses.json': scienceBosses,
  'science-boss-phases.json': scienceBossPhases,
  'science-equippable-weapons.json': scienceEquippableWeapons,
  'science-elements.json': scienceElements,
  'science-statuses.json': scienceStatuses,
  'science-scenarios.json': scienceScenarios,
  'science-burst-effects.json': scienceBurstEffects,
  'science-combined-attacks.json': scienceCombinedAttacks,
  'science-evade-rules.json': scienceEvadeRules,
})) writeJSON(path.join(compiledDir, name), payload);
checkScienceData(root);
const oldBase = readJSON(path.join(compiledDir, 'kv-bulk.json'), []).find((e) => e.key === 'meta:base');
const baseMeta = oldBase ? JSON.parse(oldBase.value) : { version: 'v50', generated_at: new Date().toISOString() };
baseMeta.kv_entries = 0;
const tierlistPath = path.join(manualDir, 'tierlist.json');
const tierlist = fs.existsSync(tierlistPath) ? JSON.parse(fs.readFileSync(tierlistPath, 'utf-8')) : null;
const kvBulk = buildKvBulk(characters, bosses, baseMeta, tierlist, nouveautes, {
  sourceReport,
  mediaReport,
  syncReport,
  science: {
    characters: scienceCharacters,
    weaponKits: scienceWeaponKits,
    skills: scienceSkills,
    bosses: scienceBosses,
    bossPhases: scienceBossPhases,
    equippableWeapons: scienceEquippableWeapons,
    elements: scienceElements,
    statuses: scienceStatuses,
    scenarios: scienceScenarios,
    burstEffects: scienceBurstEffects,
    combinedAttacks: scienceCombinedAttacks,
    evadeRules: scienceEvadeRules,
  },
});
writeJSON(path.join(compiledDir, 'kv-bulk.json'), kvBulk);
console.log('OK regenerate-science-local', {
  burstEffects: scienceBurstEffects.items.length,
  combinedAttacks: scienceCombinedAttacks.items.length,
  evadeRules: scienceEvadeRules.items.length,
  weapons: scienceEquippableWeapons.items.length,
});
