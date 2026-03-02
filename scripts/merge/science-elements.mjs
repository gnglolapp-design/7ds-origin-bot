import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeJSON } from '../lib/fs-utils.mjs';

const ELEMENTS = [
  { element_id: 'fire', label: 'Fire', aliases: ['fire', 'feu'] },
  { element_id: 'cold', label: 'Cold', aliases: ['cold', 'ice', 'glace'] },
  { element_id: 'earth', label: 'Earth', aliases: ['earth', 'terre'] },
  { element_id: 'lightning', label: 'Lightning', aliases: ['lightning', 'thunder', 'foudre'] },
  { element_id: 'wind', label: 'Wind', aliases: ['wind', 'vent'] },
  { element_id: 'physical', label: 'Physical', aliases: ['physical', 'physique'] },
  { element_id: 'holy', label: 'Holy', aliases: ['holy', 'light', 'lumiere'] },
  { element_id: 'darkness', label: 'Darkness', aliases: ['darkness', 'dark', 'tenebres'] },
];

export function buildScienceElements() {
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    items: ELEMENTS,
  };
}

export function writeScienceElements(root = process.cwd()) {
  const outputPath = path.join(root, 'data', 'compiled', 'science-elements.json');
  const payload = buildScienceElements();
  writeJSON(outputPath, payload);
  return payload;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const payload = writeScienceElements();
  console.log(`OK science-elements: ${payload.items.length}`);
}
