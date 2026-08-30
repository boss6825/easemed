/** Lowercase, collapse space, strip punctuation — used for alias identity. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compact form with no spaces, for aliases like "dolo650". */
export function compact(input: string): string {
  return normalize(input).replace(/\s+/g, "");
}

/** Canonical strength: "650 mg" / "650MG" → "650mg". */
export function normalizeStrength(input: string): string {
  return input
    .toLowerCase()
    .replace(/µ/g, "u")
    .replace(/\s+/g, "")
    .replace(/micrograms?/, "mcg")
    .replace(/mcg/, "mcg")
    .replace(/i\.?u\.?/, "iu");
}

export function strengthsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizeStrength(a);
  const nb = normalizeStrength(b);
  if (na === nb) return true;
  const stripUnit = (s: string) => s.replace(/(mg|mcg|g|ml|iu|%)$/i, "");
  return stripUnit(na) === stripUnit(nb) && stripUnit(na).length > 0;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = Math.min(
        row[j] + 1,
        prev + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export function similarity(a: string, b: string): number {
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length, 1);
}

const STOP = new Set([
  "mg",
  "ml",
  "mcg",
  "iu",
  "tab",
  "tabs",
  "tablet",
  "tablets",
  "cap",
  "caps",
  "capsule",
  "capsules",
  "syrup",
  "inj",
  "injection",
  "strip",
  "strips",
  "bottle",
  "bottles",
  "vial",
  "vials",
  "pack",
  "packs",
  "box",
  "boxes",
  "unit",
  "units",
  "of",
  "and",
  "the",
]);

export function tokens(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t));
}
