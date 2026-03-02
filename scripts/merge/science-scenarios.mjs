import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJSON } from '../lib/fs-utils.mjs';
import { listScenarios } from '../../src/testlab/scenarios/index.js';

export function buildScienceScenarios() {
  const items = listScenarios().map((scenario) => ({
    scenario_id: scenario.id,
    label: scenario.label,
    description: scenario.description,
    required_context: Array.isArray(scenario.requiredContext) ? scenario.requiredContext : [],
    controls: Array.isArray(scenario.controls) ? scenario.controls : [],
    focus_metrics: Array.isArray(scenario.focusMetrics) ? scenario.focusMetrics : [],
  }));
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };
}

export function writeScienceScenarios(root = process.cwd()) {
  const payload = buildScienceScenarios();
  writeJSON(path.join(root, 'data', 'compiled', 'science-scenarios.json'), payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceScenarios();
  console.log(`OK science-scenarios: ${payload.items.length}`);
}
