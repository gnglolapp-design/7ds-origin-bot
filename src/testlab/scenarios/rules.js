import { getScenario } from './index.js';

export function getScenarioRules(id) {
  const scenario = getScenario(id);
  if (!scenario) return null;
  return {
    requiredContext: Array.isArray(scenario.requiredContext) ? scenario.requiredContext : [],
    controls: Array.isArray(scenario.controls) ? scenario.controls : [],
    focusMetrics: Array.isArray(scenario.focusMetrics) ? scenario.focusMetrics : [],
  };
}

export function scenarioRequiresField(id, field) {
  const rules = getScenarioRules(id);
  if (!rules) return false;
  return rules.requiredContext.includes(field);
}
