import path from 'node:path';
import { readJSON, writeJSON } from './lib/fs-utils.mjs';

function uniq(arr=[]) { return Array.from(new Set((arr||[]).filter(Boolean))); }

const root = process.cwd();
const compiledDir = path.join(root, 'data', 'compiled');

const bosses = readJSON(path.join(compiledDir, 'science-bosses.json'), { items: [] }).items || [];
const phases = readJSON(path.join(compiledDir, 'science-boss-phases.json'), { items: [] }).items || [];
const patterns = readJSON(path.join(compiledDir, 'science-boss-patterns.json'), { items: [] }).items || [];

const phasesNoPatterns = phases.filter((p) => !(p.pattern_ids || []).length).map((p) => ({ boss_id: p.boss_id, phase_id: p.phase_id, phase_key: p.phase_key, name: p.name }));
const usedPatternIds = new Set();
for (const ph of phases) for (const pid of (ph.pattern_ids || [])) usedPatternIds.add(pid);

const unusedPatterns = patterns.filter((p) => !usedPatternIds.has(p.pattern_id)).map((p) => ({ pattern_id: p.pattern_id, name: p.name, tags: p.tags }));

const bossesCoverage = bosses.map((b) => {
  const bph = phases.filter((p) => p.boss_id === b.boss_id);
  const withPat = bph.filter((p) => (p.pattern_ids || []).length).length;
  return { boss_id: b.boss_id, name: b.name, phases: bph.length, phases_with_patterns: withPat };
});

const report = {
  version: 1,
  generated_at: new Date().toISOString(),
  summary: {
    bosses: bosses.length,
    phases: phases.length,
    patterns: patterns.length,
    phases_without_patterns: phasesNoPatterns.length,
    unused_patterns: unusedPatterns.length,
  },
  bossesCoverage,
  phasesNoPatterns: phasesNoPatterns.slice(0, 200),
  unusedPatterns: unusedPatterns.slice(0, 200),
};

writeJSON(path.join(compiledDir, 'science-coverage-report.json'), report);
console.log('OK: science-coverage-report');
