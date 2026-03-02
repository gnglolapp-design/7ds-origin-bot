import { getBoss, getCharacter, getScienceBoss, getScienceBossPhase, getScienceBossPhaseIndex } from "../lib/kv.js";
import { analyzeCharacterProfile } from "../lib/gameplay.js";
import { actionRow, stringSelect } from "../lib/components.js";
import { cid } from "../lib/ids.js";
import { update } from "../discord/responses.js";
import { readPublishedIndex } from "../assistant/evidence-reader.js";
import { assistantDigestLines, badgeLineFromRefs, familyInsightLines, refsLine } from "../assistant/presenters/evidence.js";
import { buildBossCrossReadingLines, buildBossPhaseDecisionLines, buildBossPhaseTeamDecisionLines, buildBossRecoveryLines, buildBossTeamFitLines, buildBossTeamWindowLines, buildBossWindowDecisionLines, getRelevantBossPhases } from "../lib/science-boss.js";
import { buildBossAdvice, buildCompoEvidence, buildTeamAdvice, buildTeamDecisionLines } from "../assistant/recommenders/compo.js";



function truncate(s, max=1024){
  if (s == null) return "";
  s = String(s);
  if (s.length <= max) return s;
  return s.slice(0, max-1) + "…";
}

// Deterministic, lightweight team analysis based on existing tags/orientations/roles.
// Visual split across multiple embeds for readability.

const ACCENT = 0xC99700;

function footerLine(scope, view, page, total = 2) {
  return `${scope} · ${view} · vue ${page}/${total}`;
}

function optMap(interaction) {
  const out = {};
  const subs = interaction?.data?.options || [];
  // slash with subcommands: data.options[0] is the subcommand
  const sub = subs[0];
  out.__sub = sub?.name || "";
  for (const o of sub?.options || []) out[o.name] = o.value;
  return out;
}

function normalize(v) {
  return String(v || "").toLowerCase();
}

function scoreFromTags(tags = []) {
  const t = tags.map(normalize);
  const s = { open:0, convert:0, stabilize:0, tempo:0, control:0, burst:0, sustain:0 };
  const has = (x) => t.includes(normalize(x));
  // Broad mapping (can be refined later)
  if (has("control") || has("stun") || has("shock") || has("paralysis") || has("debuff")) { s.open += 2; s.control += 2; }
  if (has("burst") || has("crit") || has("back attack") || has("aoe")) { s.convert += 2; s.burst += 2; }
  if (has("tank") || has("barrier") || has("support") || has("heal") || has("survie") || has("defense")) { s.stabilize += 2; s.sustain += 2; }
  if (has("mobilité") || has("mobility") || has("tempo") ) { s.tempo += 1; }
  return s;
}

function pickMax(scores, key) {
  let best = null;
  for (const p of scores) {
    if (!best || (p.s[key]||0) > (best.s[key]||0)) best = p;
  }
  return best;
}

function sumScores(scores) {
  const total = { open:0, convert:0, stabilize:0, tempo:0, control:0, burst:0, sustain:0 };
  for (const p of scores) for (const k of Object.keys(total)) total[k] += (p.s[k]||0);
  return total;
}

function classifyBalance(total) {
  const o = total.open, c = total.convert, st = total.stabilize;
  if (st >= 4 && c >= 4 && o >= 2) return "Équilibrée";
  if (c >= st + 3) return "Explosive mais fragile";
  if (st >= c + 3) return "Stable mais lente";
  if (o >= 4 && c >= 2) return "Contrôle / tempo";
  return "Mixte";
}

function makeEmbed(title, description, fields) {
  const embed = { title, description, color: ACCENT, fields: (fields||[]).filter(Boolean) };
  return embed;
}

function iconLine(label, value, icon) {
  return `${icon} **${label}** · ${value || "—"}`;
}

function field(name, value, inline=false) {
  if (!value) return null;
  return { name, value: truncate(String(value), 1024), inline };
}

function fmtList(items) {
  const clean = (items||[]).filter(Boolean);
  return clean.length ? clean.map(x=>`• ${x}`).join("\n") : "—";
}

function adviceList(lines = []) {
  const clean = (lines || []).filter(Boolean);
  return clean.length ? clean.map((x) => `• ${x}`).join("\n") : "—";
}


function compoAssistantField(scopedPublished = [], subject = 'cette équipe', limit = 8) {
  if (!scopedPublished?.length) return null;
  const lines = [
    ...familyInsightLines(scopedPublished, { limit: 3, subject }),
    ...assistantDigestLines(scopedPublished, { cardLimit: 2, contextLimit: 2, refsLimit: 3, includeBadges: true }),
  ];
  if (!lines.length) return null;
  return field('🧠 Lecture assistant', truncate(lines.join('\n'), 1024), false);
}

function compoBossScienceField(bossOverlay = null) {
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  if (!scienceBoss) return null;
  const lines = buildBossCrossReadingLines(scienceBoss, sciencePhases, bossOverlay?.team || null, bossOverlay?.sectionKey || null, 4);
  if (!lines.length) return null;
  return field('🧭 Lecture boss / phase', lines.map((x) => `• ${x}`).join('\n'), false);
}

function compoBossTeamField(bossOverlay = null) {
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const team = bossOverlay?.team || null;
  if (!scienceBoss || !team) return null;
  const phase = getRelevantBossPhases(sciencePhases, bossOverlay?.sectionKey || null, 1)[0] || null;
  const lines = [];
  if (phase?.name) lines.push(`• Phase la plus utile retenue : **${phase.name}**`);
  const decisions = buildBossPhaseDecisionLines(scienceBoss, sciencePhases, bossOverlay?.sectionKey || null, 1);
  if (decisions[0]) lines.push(`• Décision clé : ${decisions[0]}`);
  lines.push(...buildBossTeamFitLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 3).map((x) => `• ${x}`));
  if (!lines.length) return null;
  return field('🤝 Lecture équipe vs boss', lines.join('\n'), false);
}

function compoCriticalPhaseField(bossOverlay = null) {
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const team = bossOverlay?.team || null;
  if (!scienceBoss || !team) return null;
  const phase = getRelevantBossPhases(sciencePhases, bossOverlay?.sectionKey || null, 1)[0] || null;
  const lines = [];
  if (phase?.name) lines.push(`• Phase critique lue : **${phase.name}**`);
  if (phase?.priority_score) lines.push(`• Priorité réelle : **${phase.priority_score >= 7 ? 'critique' : phase.priority_score >= 5 ? 'haute' : phase.priority_score >= 3 ? 'moyenne' : 'basse'}**`);
  lines.push(...buildBossPhaseTeamDecisionLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 3).map((x) => `• ${x}`));
  if (!lines.length) return null;
  return field('🎯 Équipe vs phase critique', lines.join('\n'), false);
}


function compoWindowField(bossOverlay = null) {
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const team = bossOverlay?.team || null;
  if (!scienceBoss || !team) return null;
  const phase = getRelevantBossPhases(sciencePhases, bossOverlay?.sectionKey || null, 1)[0] || null;
  const lines = [];
  if (phase?.name) lines.push(`• Fenêtre lue sur : **${phase.name}**`);
  lines.push(...buildBossWindowDecisionLines(scienceBoss, sciencePhases, bossOverlay?.sectionKey || null, 2).map((x) => `• ${x}`));
  lines.push(...buildBossTeamWindowLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 2).map((x) => `• ${x}`));
  if (!lines.length) return null;
  return field('🎯 Fenêtre réelle vs équipe', lines.join('\n'), false);
}

function compoRecoveryField(bossOverlay = null) {
  const scienceBoss = bossOverlay?.science?.boss || null;
  const sciencePhases = bossOverlay?.science?.phases || [];
  const team = bossOverlay?.team || null;
  if (!scienceBoss || !team) return null;
  const lines = buildBossRecoveryLines(scienceBoss, sciencePhases, team, bossOverlay?.sectionKey || null, 4).map((x) => `• ${x}`);
  if (!lines.length) return null;
  return field('🔄 Reprise après pattern', lines.join('\n'), false);
}

async function buildTeamReport(kv, opts) {
  const picks = [];
  for (let i=1;i<=4;i++) {
    const slug = opts[`perso${i}`];
    if (!slug) continue;
    const char = await getCharacter(kv, slug);
    if (!char) continue;
    // optional weapon by name (string). If provided, try to match.
    const weaponName = opts[`arme${i}`];
    let weapon = null;
    if (weaponName && Array.isArray(char.weapons)) {
      weapon = char.weapons.find(w => String(w.name).toLowerCase() === String(weaponName).toLowerCase()) || null;
    }
    const profile = analyzeCharacterProfile(char);
    // If weapon specified, merge tags/orientations from that weapon analysis preferentially
    let tags = profile.tags || [];
    let orientations = profile.orientations || [];
    if (weaponName && profile.weapons?.length) {
      const wa = profile.weapons.find(x => String(x.name).toLowerCase() === String(weaponName).toLowerCase());
      if (wa) {
        tags = Array.from(new Set([...(wa.tags||[]), ...(tags||[])]));
        orientations = Array.from(new Set([...(wa.orientations||[]), ...(orientations||[])]));
      }
    }
    const s = scoreFromTags(tags);
    picks.push({
      slug,
      name: char.name || slug,
      roles: (char.roles||[]).join(" / ") || "Unknown",
      tags,
      orientations,
      weapon: weaponName || null,
      s,
      portrait: char?.images?.portrait || null,
    });
  }

  const total = sumScores(picks);
  const opener = pickMax(picks, "open");
  const converter = pickMax(picks, "convert");
  const stabilizer = pickMax(picks, "stabilize");
  const balance = classifyBalance(total);

  // gaps/priorities (simple deterministic)
  const gaps = [];
  if ((total.open||0) < 2) gaps.push("❗ Manque d'ouverture / contrôle simple");
  if ((total.convert||0) < 2) gaps.push("❗ Manque de dégâts réguliers / manque de quoi bien finir");
  if ((total.stabilize||0) < 2) gaps.push("❗ Manque de stabilisation / tenue");
  const deps = [];
  if (opener && (opener.s.open||0) >= 3 && (total.open||0) <= (opener.s.open||0)+1) deps.push("L'équipe dépend trop d'un seul perso pour bien démarrer");
  if (stabilizer && (stabilizer.s.stabilize||0) >= 3 && (total.stabilize||0) <= (stabilizer.s.stabilize||0)+1) deps.push("L'équipe dépend trop d'un seul perso pour garder le combat propre");
  if (converter && (converter.s.convert||0) >= 3 && (total.convert||0) <= (converter.s.convert||0)+1) deps.push("L'équipe dépend trop d'un seul perso pour faire ses gros dégâts");

  const weak = gaps[0] || (deps[0] ? `⚠️ ${deps[0]}` : "—");
  const saves = [];
  if ((total.control||0) >= 2) saves.push("L'équipe a des outils de contrôle");
  if ((total.sustain||0) >= 2) saves.push("Bonne marge de survie");
  if ((total.burst||0) >= 2) saves.push("Possible de faire de gros dégâts au bon moment");

  return { picks, total, opener, converter, stabilizer, balance, gaps, deps, weak, saves };
}

async function buildBossOverlay(kv, bossSlug, team) {
  const boss = await getBoss(kv, bossSlug);
  if (!boss) return { boss: null, team };
  const text = String(boss?.description || boss?.name || "");
  const norm = text.toLowerCase();
  const friction = [];
  if (norm.includes("stagger") || norm.includes("interrupt") || norm.includes("interruption")) friction.push("Fenêtres à sécuriser (interrupt / stagger)");
  if (norm.includes("multijoueur") || norm.includes("multiplayer")) friction.push("Coordination / pression en multi");
  if (norm.includes("bouclier") || norm.includes("shield")) friction.push("Gestion bouclier / objectifs");
  if (!friction.length) friction.push("Infos boss encore limitées");

  const moment = friction.some((f) => f.includes("bouclier")) ? "Début / Phase 1 (objectif)"
    : friction.some((f) => f.includes("Fenêtres")) ? "Fenêtres de burst / stagger"
    : "Progression (mix)";

  let exposed = null;
  for (const p of team.picks) {
    if (!exposed || (p.s.stabilize || 0) < (exposed.s.stabilize || 0)) exposed = p;
  }

  const scienceBoss = await getScienceBoss(kv, bossSlug);
  const phaseIndex = await getScienceBossPhaseIndex(kv);
  const phaseRows = Array.isArray(phaseIndex) ? phaseIndex.filter((entry) => String(entry?.boss_id || '') === String(bossSlug || '')) : [];
  const phases = [];
  for (const row of phaseRows) {
    const full = await getScienceBossPhase(kv, row?.phase_id);
    if (full) phases.push(full);
  }
  const preferred = getRelevantBossPhases(phases, null, 1)[0] || null;
  const sectionKey = preferred?.source_section_key || preferred?.phase_key || null;
  return { boss, friction, moment, exposed, science: { boss: scienceBoss, phases }, sectionKey, team };
}


function compoViewRow(state, current, hasBoss = false) {
  const options = [
    { label: "Équipe", value: "summary", default: current === "summary", emoji: "👥" },
    { label: "Analyse", value: "detail", default: current === "detail", emoji: "🧠" },
    ...(hasBoss ? [{ label: "Boss", value: "boss", default: current === "boss", emoji: "👹" }] : []),
  ];
  return actionRow([
    stringSelect({
      custom_id: cid("compo:view", state),
      placeholder: "Choisir une vue",
      options,
    }),
  ]);
}

function compactCompoState(opts) {
  const state = { s: opts.__sub || "analyser" };
  for (let i = 1; i <= 4; i++) {
    if (opts[`perso${i}`]) state[`p${i}`] = opts[`perso${i}`];
    if (opts[`arme${i}`]) state[`w${i}`] = opts[`arme${i}`];
  }
  if (opts.boss && String(opts.boss).toLowerCase() !== "information") state.b = opts.boss;
  return state;
}

function inflateCompoState(params) {
  const opts = { __sub: params.s || "analyser" };
  for (let i = 1; i <= 4; i++) {
    if (params[`p${i}`]) opts[`perso${i}`] = params[`p${i}`];
    if (params[`w${i}`]) opts[`arme${i}`] = params[`w${i}`];
  }
  if (params.b) opts.boss = params.b;
  return opts;
}
export async function buildCompoMessage(env, interaction, forcedView = null) {
  const opts = optMap(interaction);
  return await buildCompoPayload(env, opts, forcedView);
}

async function buildCompoPayload(env, opts, forcedView = null) {
  const sub = opts.__sub || "";
  const team = await buildTeamReport(env.GAME_DATA, opts);

  if (!team.picks.length) {
    return { content: "Aucun perso valide. Sélectionne au moins 2 persos.", flags: 64 };
  }

  const title = sub === "vs-boss" ? "Compo · analyse vs boss" : "Compo · analyse";
  const desc = sub === "vs-boss"
    ? "Vue rapide de l'équipe face au boss, sans inventer de conseil."
    : "Vue rapide de l'équipe, sans inventer de conseil.";

  const plan = [
    iconLine("Aide à bien démarrer", team.opener?.name || "—", "🚪"),
    iconLine("Fait les gros dégâts", team.converter?.name || "—", "💥"),
    iconLine("Garde le combat propre", team.stabilizer?.name || "—", "🛡️"),
  ].join("\n");

  const roster = team.picks.map((p, idx) => `${idx + 1}. **${p.name}**${p.weapon ? ` · ${p.weapon}` : ""}\n${p.roles}`).join("\n\n");

  const published = await readPublishedIndex(env.GAME_DATA);
  let bossOverlay = null;
  if (sub === "vs-boss" && opts.boss && String(opts.boss).toLowerCase() !== "information") {
    bossOverlay = await buildBossOverlay(env.GAME_DATA, opts.boss, team);
  }

  const evidence = buildCompoEvidence(team, published, bossOverlay?.boss || opts.boss || null, bossOverlay);
  const scopedPublished = evidence.refs;
  const lab = evidence.lab;
  const enrichedSaves = Array.from(new Set([...(team.saves || []), ...(lab.support || [])]));
  const enrichedGaps = Array.from(new Set([...(team.gaps || []), ...(lab.caution || [])]));

  const summary = makeEmbed(`${title} · équipe`, desc, [
    field("1) ✅ À faire d'abord", buildTeamDecisionLines(team, lab, bossOverlay).join("\n") || "—", false),
    scopedPublished.length ? field("2) 📊 Pourquoi ça tient", fmtList([
      badgeLineFromRefs(scopedPublished),
      refsLine(scopedPublished.slice(0, 3), 'Snapshots retenus', 3),
      ...lab.support.slice(0, 2),
      ...lab.caution.slice(0, 1),
    ]), false) : null,
    field("👥 Équipe", roster, false),
    field("🧭 Qui fait quoi", plan, true),
    field("⚖️ Équilibre de l'équipe", team.balance, true),
    field("🎮 Plan simple", adviceList(buildTeamAdvice(team, lab)), false),
    bossOverlay?.science?.boss ? compoBossScienceField(bossOverlay) : null,
    compoAssistantField(scopedPublished, bossOverlay?.boss ? 'cette équipe face à ce boss' : 'cette équipe'),
  ]);
  summary.footer = { text: footerLine("Compo", "équipe", 1, bossOverlay?.boss ? 3 : 2) };
  if (team.picks[0]?.portrait) summary.thumbnail = { url: team.picks[0].portrait };

  const detail = makeEmbed(`${title} · analyse`, "Points forts, vrais manques et sécurité générale de l'équipe.", [
    field("1) ✅ À faire d'abord", buildTeamDecisionLines(team, lab, bossOverlay).slice(0, 2).join("\n") || "—", false),
    scopedPublished.length ? field("2) 📊 Pourquoi ça tient", fmtList([
      badgeLineFromRefs(scopedPublished),
      refsLine(scopedPublished.slice(0, 3), 'Snapshots retenus', 3),
      ...lab.support.slice(0, 2),
    ]), false) : null,
    field("3) ⚠️ Prudence", fmtList([...lab.caution.slice(0, 2), team.weak].filter(Boolean)), false),
    field("❗ Ce qui manque vraiment", fmtList(enrichedGaps), false),
    field("🔗 Ce qu'il faut surveiller", fmtList(team.deps), false),
    field("🩹 Ce qui aide l'équipe à se remettre en place", fmtList(enrichedSaves), false),
    field("🔧 Quoi corriger en premier", adviceList(buildTeamAdvice(team, lab).slice(-2)), false),
    bossOverlay?.science?.boss ? compoBossTeamField(bossOverlay) : null,
    bossOverlay?.science?.boss ? compoCriticalPhaseField(bossOverlay) : null,
    bossOverlay?.science?.boss ? compoWindowField(bossOverlay) : null,
    bossOverlay?.science?.boss ? compoRecoveryField(bossOverlay) : null,
    compoAssistantField(scopedPublished, bossOverlay?.boss ? 'cette équipe face à ce boss' : 'cette équipe'),
  ]);

  detail.footer = { text: footerLine("Compo", "analyse", 2, sub === "vs-boss" ? 3 : 2) };

  let bossEmbed = null;
  if (sub === "vs-boss") {
    const bossName = bossOverlay?.boss?.name || opts.boss || "Boss";
    bossEmbed = makeEmbed(`${title} · boss`, "Face au boss : ce qui pose problème et ce qu'il faut garder.", [
      field("1) ✅ À faire d'abord", buildTeamDecisionLines(team, lab, bossOverlay).join("\n") || "—", false),
      (bossOverlay?.boss && lab.support.length) ? field("2) 📊 Pourquoi ça tient", fmtList([
        badgeLineFromRefs(scopedPublished),
        ...lab.support.slice(0, 1),
      ]), false) : null,
      field("3) ⚠️ Prudence", fmtList([
        ...(bossOverlay?.friction || []).slice(0, 1),
        ...lab.caution.slice(0, 1),
      ]), false),
      field("👹 Boss", bossName, true),
      field("⏱️ Moment le plus dangereux", bossOverlay?.moment || "—", true),
      field("🎯 Perso le plus exposé", bossOverlay?.exposed?.name || "—", true),
      field("🎮 Plan simple", adviceList(buildBossAdvice(team, bossOverlay, lab)), false),
      compoBossScienceField(bossOverlay),
      compoBossTeamField(bossOverlay),
      compoCriticalPhaseField(bossOverlay),
      compoWindowField(bossOverlay),
      compoRecoveryField(bossOverlay),
      field("🚨 Plus gros problème", fmtList(bossOverlay?.friction), false),
      compoAssistantField(scopedPublished, 'cette équipe face à ce boss'),
    ]);
    bossEmbed.footer = { text: footerLine("Compo", "boss", 3, 3) };
    if (bossOverlay?.boss?.images?.portrait) bossEmbed.thumbnail = { url: bossOverlay.boss.images.portrait };
  }

  const view = forcedView || ((sub === "vs-boss" && bossEmbed) ? "summary" : "summary");
  const embed = view === "detail" ? detail : (view === "boss" && bossEmbed ? bossEmbed : summary);

  return {
    embeds: [embed],
    components: [compoViewRow(compactCompoState(opts), view, Boolean(bossEmbed))],
    flags: 64,
  };
}

export async function handleCompoComponent(env, interaction, params) {
  const opts = inflateCompoState(params);
  const view = interaction?.data?.values?.[0] || "summary";
  return update(await buildCompoPayload(env, opts, view));
}
