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
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
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
