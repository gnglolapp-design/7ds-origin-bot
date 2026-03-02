import { buildCuratedBossGuides } from './boss-guide-curated.mjs';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pickOriginImage(originBosses, entry) {
  const target = new Set([normalize(entry.slug), normalize(entry.name)]);
  const match = (originBosses || []).find((boss) => target.has(normalize(boss.slug)) || target.has(normalize(boss.name)));
  return match?.images?.portrait || null;
}

export function mergeBosses({ origin, hideout }) {
  const curated = buildCuratedBossGuides(hideout);
  const hideoutSources = hideout?.boss_guide?.source_urls || [];

  return curated
    .map((entry) => ({
      ...entry,
      images: {
        portrait: entry.images?.portrait || pickOriginImage(origin?.bosses || [], entry),
      },
      sources: {
        seven_origin: null,
        hideout: hideoutSources,
      },
    }))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
