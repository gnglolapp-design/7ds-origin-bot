const REPLACEMENTS = new Map([
  ["gil thunder", "gilthunder"],
  ["dual swords", "Dual Swords"],
  ["épées jumelles", "Dual Swords"],
  ["epees jumelles", "Dual Swords"],
  ["sworddual", "Dual Swords"],
  ["rapière", "Rapier"],
  ["rapiere", "Rapier"],
  ["lance", "Lance"],
  ["book", "Book"],
  ["grimoire", "Book"],
  ["wand", "Wand"],
  ["baguette", "Wand"],
  ["axe", "Axe"],
  ["hache", "Axe"],
  ["shield", "Shield"],
  ["bouclier", "Shield"],
  ["sword shield", "Shield"],
  ["gauntlets", "Gauntlets"],
  ["gantelets", "Gauntlets"],
  ["cudgel", "Cudgel"],
  ["gourdin", "Cudgel"],
  ["staff", "Staff"],
  ["bâton", "Staff"],
  ["baton", "Staff"],
  ["greatsword", "Greatsword"],
  ["grande épée", "Greatsword"],
  ["grande epee", "Greatsword"],
  ["longsword", "Longsword"],
  ["épée longue", "Longsword"],
  ["epee longue", "Longsword"],
  ["nunchaku", "Nunchaku"],
  ["nunchucks", "Nunchaku"],
]);

const ATTRIBUTE_REPLACEMENTS = new Map([
  ["lightning", "Thunder"],
  ["thunder", "Thunder"],
  ["foudre", "Thunder"],
  ["cold", "Cold"],
  ["ice", "Cold"],
  ["glace", "Cold"],
  ["fire", "Fire"],
  ["feu", "Fire"],
  ["wind", "Wind"],
  ["vent", "Wind"],
  ["earth", "Earth"],
  ["terre", "Earth"],
  ["holy", "Holy"],
  ["light", "Holy"],
  ["lumiere", "Holy"],
  ["darkness", "Darkness"],
  ["dark", "Darkness"],
  ["tenebres", "Darkness"],
  ["physical", "Physical"],
  ["physics", "Physical"],
  ["physique", "Physical"],
]);

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function slugify(value) {
  return normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeNameKey(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

export function canonicalWeaponName(value) {
  const key = normalizeNameKey(value);
  return REPLACEMENTS.get(key) || value?.trim() || null;
}

export function normalizeAttribute(value) {
  const key = normalizeNameKey(value);
  return ATTRIBUTE_REPLACEMENTS.get(key) || value?.trim() || null;
}

export function cleanCharacterName(value) {
  const raw = String(value ?? "")
    .replace(/\s*[-|].*$/g, "")
    .replace(/\s+Build(?: Guide)?$/i, "")
    .replace(/\s+Guide$/i, "")
    .trim();

  if (!raw) return "";
  if (raw === raw.toLowerCase()) {
    return raw
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return raw;
}
