function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

export function statusWeight(status) {
  if (status === 'ok') return 1;
  if (status === 'suspect') return 0.35;
  return 0;
}

function freshnessFactor(submission = {}) {
  const now = Date.now();
  const stamp = Number(submission.submittedAt ?? submission.createdAt ?? submission.timestamp ?? 0);
  if (!Number.isFinite(stamp) || stamp <= 0) return 1;
  const ageDays = Math.max(0, (now - stamp) / 86400000);
  if (ageDays <= 14) return 1.08;
  if (ageDays <= 45) return 1.03;
  if (ageDays <= 120) return 1;
  if (ageDays <= 240) return 0.96;
  return 0.9;
}

function reproducibilityFactor(submission = {}, cohort = []) {
  if (!Array.isArray(cohort) || cohort.length < 2) return 1;
  const actorKey = String(submission.actorId || submission.userId || submission.authorId || '');
  const actorIds = Array.from(new Set(cohort.map((d) => String(d?.actorId || d?.userId || d?.authorId || '')).filter(Boolean)));
  if (!actorIds.length) return 1;
  const diversity = actorIds.length / Math.max(1, cohort.length);
  let factor = diversity >= 0.45 ? 1.08 : diversity >= 0.25 ? 1.03 : diversity >= 0.12 ? 1 : 0.94;
  if (actorKey && actorIds.length === 1) factor = Math.min(factor, 0.92);
  return factor;
}

function contextCoverageFactor(submission = {}, context = {}) {
  const merged = { ...submission, ...context };
  const hasContext = Number(Boolean(merged.perso || merged.character_id))
    + Number(Boolean(merged.boss || merged.boss_id))
    + Number(Boolean(merged.arme || merged.arme_a || merged.arme_b || merged.weapon_kit_id || merged.equippable_weapon_id))
    + Number(Boolean(merged.skill || merged.skill_id))
    + Number(Boolean(merged.element || merged.element_id || merged.active_burst_element_id))
    + Number(Boolean(merged.phase || merged.phase_id || merged.scenario || merged.scenario_id || merged.burst_state || merged.burst_family || merged.burst_effect_id))
    + Number(Boolean(merged.combined_attack_id || merged.evade_rule_id || merged.successful_evade != null || merged.deluge_state));
  return clamp(0.85, 1.28, 0.82 + (hasContext * 0.07));
}

export function computeEvidenceWeight(submission = {}, context = {}, cohort = []) {
  const base = statusWeight(submission.status);
  if (base <= 0) {
    return {
      raw_weight: 0,
      quality_factor: 0,
      sample_factor: 0,
      context_factor: 0,
      consistency_factor: 0,
      freshness_factor: 0,
      reproducibility_factor: 0,
    };
  }

  const n = Number(submission.n ?? submission.attempts ?? submission.runs ?? 0);
  const sampleFactor = n > 0 ? clamp(0.6, 1.85, 0.58 + Math.log10(n + 1)) : 1;

  const contextFactor = contextCoverageFactor(submission, context);

  const warningCount = Array.isArray(submission.warnings) ? submission.warnings.length : 0;
  const consistencyFactor = clamp(0.7, 1.1, 1.08 - (warningCount * 0.08));

  const qualityScore = Number(submission.qualityScore);
  const qualityFactor = Number.isFinite(qualityScore)
    ? clamp(0.75, 1.2, 0.75 + (qualityScore / 100) * 0.45)
    : 1;

  const freshFactor = freshnessFactor(submission);
  const reproFactor = reproducibilityFactor(submission, cohort);

  return {
    raw_weight: base * sampleFactor * contextFactor * consistencyFactor * qualityFactor * freshFactor * reproFactor,
    quality_factor: qualityFactor,
    sample_factor: sampleFactor,
    context_factor: contextFactor,
    consistency_factor: consistencyFactor,
    freshness_factor: freshFactor,
    reproducibility_factor: reproFactor,
  };
}
