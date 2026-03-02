function unique(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];
}

function clean(value) {
  return String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function bulletList(lines = [], fallback = "Non disponible pour l’instant", limit = 3) {
  const picked = unique(lines).slice(0, limit).map((line) => `• ${clean(line)}`);
  return picked.length ? picked.join("\n") : fallback;
}

function confidenceFromCoverage(items = [], unknowns = []) {
  const count = (items || []).filter(Boolean).length;
  const gaps = (unknowns || []).length;
  if (count >= 5 && gaps <= 1) return "lecture plutôt solide, mais encore dépendante des textes disponibles";
  if (count >= 3) return "lecture crédible, avec quelques zones encore prudentes";
  return "lecture préliminaire, à traiter comme une tendance plutôt qu’une certitude";
}

export function explainCharacterTheory(char = {}, profile = {}, theory = {}, unknowns = []) {
  const reading = unique([
    theory?.dominant?.[0] ? `ce qu'il apporte surtout : ${theory.dominant[0]}` : null,
    theory?.functions?.[0] ? `fonction clef : ${theory.functions[0]}` : null,
    theory?.planRole?.[0] ? `plan naturel : ${theory.planRole[0]}` : null,
  ]);

  const reasons = unique([
    theory?.effects?.length ? `effets repérés : ${theory.effects.slice(0, 4).join(", ")}` : null,
    theory?.functions?.[0] ? `fonction clef détectée : ${theory.functions[0]}` : null,
    theory?.composition?.brings?.[0] ? `apporte surtout : ${theory.composition.brings[0]}` : null,
    theory?.composition?.covers?.[0] ? `couvre surtout : ${theory.composition.covers[0]}` : null,
    theory?.stability ? `stabilité : ${theory.stability}` : null,
    theory?.conversion ? `conversion : ${theory.conversion}` : null,
    profile?.tags?.length ? `tags confirmés : ${profile.tags.slice(0, 3).join(", ")}` : null,
  ]);

  const cautions = unique([
    theory?.planRisks?.[0] || null,
    theory?.dependencies?.[0] || null,
    theory?.composition?.missing?.[0] ? `laisse encore manquer : ${theory.composition.missing[0]}` : null,
    unknowns?.[0] ? `zone floue : ${unknowns[0]}` : null,
  ]);

  return {
    reading: bulletList(reading, "• Lecture encore prudente avec les données actuelles", 3),
    reasons: bulletList(reasons, "• Justification encore limitée par la richesse de la fiche", 4),
    cautions: bulletList(cautions, "• Prudence majeure non détectée pour l’instant", 3),
    confidence: confidenceFromCoverage(reasons, unknowns),
  };
}

export function explainWeaponTheory(char = {}, weapon = {}, compatibility = {}) {
  const reading = unique([
    compatibility?.dominant?.[0] ? `ce qu'il apporte surtout : ${compatibility.dominant[0]}` : null,
    compatibility?.functions?.[0] ? `fonction clef : ${compatibility.functions[0]}` : null,
    compatibility?.planRole?.[0] ? `plan naturel : ${compatibility.planRole[0]}` : null,
  ]);

  const reasons = unique([
    compatibility?.deltaSummary?.positive?.length ? `accentue : ${compatibility.deltaSummary.positive.slice(0, 3).join(", ")}` : null,
    compatibility?.effects?.length ? `effets repérés : ${compatibility.effects.slice(0, 3).join(", ")}` : null,
    compatibility?.lines?.[0] ? `compatibilité clef : ${compatibility.lines[0]}` : null,
    compatibility?.composition?.brings?.[0] ? `apporte surtout : ${compatibility.composition.brings[0]}` : null,
  ]);

  const cautions = unique([
    compatibility?.deltaSummary?.negative?.length ? `sacrifie : ${compatibility.deltaSummary.negative.slice(0, 2).join(", ")}` : null,
    compatibility?.planRisks?.[0] || null,
    compatibility?.composition?.missing?.[0] ? `laisse encore manquer : ${compatibility.composition.missing[0]}` : null,
  ]);

  return {
    reading: bulletList(reading, "• Lecture d’arme encore prudente", 3),
    reasons: bulletList(reasons, "• Justification encore limitée sur cette arme", 4),
    cautions: bulletList(cautions, "• Aucun sacrifice clair détecté pour l’instant", 3),
    confidence: confidenceFromCoverage(reasons, []),
  };
}

export function explainBossTheory(boss = {}, reading = {}, theory = {}, completeness = []) {
  const readingLines = unique([
    theory?.demand?.[0] ? `demande dominante : ${theory.demand[0]}` : null,
    theory?.pace ? `rythme : ${theory.pace}` : null,
    theory?.usefulProfiles?.[0] ? `profil favorisé : ${theory.usefulProfiles[0]}` : null,
  ]);

  const reasons = unique([
    theory?.punishments?.[0] ? `punition clef : ${theory.punishments[0]}` : null,
    theory?.secureFirst?.[0] ? `à sécuriser : ${theory.secureFirst[0]}` : null,
    theory?.preserveForWindow?.[0] ? `à conserver : ${theory.preserveForWindow[0]}` : null,
    theory?.teamShape?.[0] ? `shape utile : ${theory.teamShape[0]}` : null,
  ]);

  const cautions = unique([
    theory?.dangerousPlans?.[0] ? `plan dangereux : ${theory.dangerousPlans[0]}` : null,
    theory?.avoid?.[0] ? `quand il a plus de mal : ${theory.avoid[0]}` : null,
    completeness?.find((line) => String(line || "").toLowerCase().includes("partiel") || String(line || "").toLowerCase().includes("non disponible")) ? `couverture : ${completeness.find((line) => String(line || "").toLowerCase().includes("partiel") || String(line || "").toLowerCase().includes("non disponible"))}` : null,
  ]);

  return {
    reading: bulletList(readingLines, "• Lecture boss encore prudente", 3),
    reasons: bulletList(reasons, "• Justification encore limitée par le guide disponible", 4),
    cautions: bulletList(cautions, "• Prudence majeure non détectée pour l’instant", 3),
    confidence: confidenceFromCoverage(reasons, cautions),
  };
}

export function explainComparePair(left = {}, right = {}, kind = "perso") {
  const leftReading = left?.functions?.[0] || left?.dominant?.[0] || left?.planRole?.[0] || null;
  const rightReading = right?.functions?.[0] || right?.dominant?.[0] || right?.planRole?.[0] || null;
  const reading = unique([
    leftReading ? `${kind === "arme" ? "arme 1" : "perso 1"} : ${leftReading}` : null,
    rightReading ? `${kind === "arme" ? "arme 2" : "perso 2"} : ${rightReading}` : null,
  ]);

  const reasons = unique([
    left?.composition?.brings?.[0] ? `${kind === "arme" ? "arme 1" : "perso 1"} apporte : ${left.composition.brings[0]}` : null,
    right?.composition?.brings?.[0] ? `${kind === "arme" ? "arme 2" : "perso 2"} apporte : ${right.composition.brings[0]}` : null,
    left?.planRisks?.[0] ? `${kind === "arme" ? "arme 1" : "perso 1"} a plus de mal quand : ${left.planRisks[0]}` : null,
    right?.planRisks?.[0] ? `${kind === "arme" ? "arme 2" : "perso 2"} a plus de mal quand : ${right.planRisks[0]}` : null,
  ]);

  const cautions = unique([
    left?.composition?.missing?.[0] ? `${kind === "arme" ? "arme 1" : "perso 1"} laisse encore manquer : ${left.composition.missing[0]}` : null,
    right?.composition?.missing?.[0] ? `${kind === "arme" ? "arme 2" : "perso 2"} laisse encore manquer : ${right.composition.missing[0]}` : null,
  ]);

  return {
    reading: bulletList(reading, "• Lecture comparative encore prudente", 3),
    reasons: bulletList(reasons, "• Justification comparative encore limitée", 4),
    cautions: bulletList(cautions, "• Aucune prudence comparative forte repérée", 3),
  };
}
