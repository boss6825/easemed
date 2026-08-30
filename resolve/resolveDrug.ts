import OpenAI from "openai";
import { getDb } from "@/lib/db";
import {
  compact,
  normalize,
  similarity,
  strengthsMatch,
  tokens,
} from "@/lib/normalize";
import type { TraceCandidate, TraceFn } from "@/lib/trace";
import { lookupRxNavInn } from "@/resolve/rxnav";
import {
  CONFIDENCE_THRESHOLD,
  type LineItem,
  type ResolveCandidate,
  type ResolvedLine,
} from "@/lib/types";

type AliasRow = {
  id: number;
  normalized_text: string;
  molecule_id: number | null;
  product_id: number | null;
  alias_type: string;
  country: string;
};

type MoleculeRow = { id: number; inn_name: string; usan_name: string | null };
type ProductRow = {
  id: number;
  molecule_id: number;
  strength: string;
  form: string;
  pack_size: string | null;
  country: string;
};

const COUNTRY_FALLBACK = ["GLOBAL", "US", "UK", "CA", "IN"];

function countryRank(aliasCountry: string, requested: string): number {
  if (aliasCountry === requested) return 0;
  if (aliasCountry === "GLOBAL") return 1;
  if (requested === "IN" && aliasCountry === "US") return 2;
  return 3;
}

function productLabel(p: ProductRow, inn: string): string {
  return `${inn} ${p.strength} ${p.form}${p.pack_size ? ` (${p.pack_size})` : ""}`;
}

function getMolecule(id: number): MoleculeRow | undefined {
  return getDb()
    .prepare("SELECT id, inn_name, usan_name FROM molecules WHERE id = ?")
    .get(id) as MoleculeRow | undefined;
}

function getProduct(id: number): ProductRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, molecule_id, strength, form, pack_size, country FROM products WHERE id = ?",
    )
    .get(id) as ProductRow | undefined;
}

function productsFor(moleculeId: number): ProductRow[] {
  return getDb()
    .prepare(
      "SELECT id, molecule_id, strength, form, pack_size, country FROM products WHERE molecule_id = ?",
    )
    .all(moleculeId) as ProductRow[];
}

function searchStrings(item: LineItem): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const n = normalize(s);
    if (n && !out.includes(n)) out.push(n);
    const c = compact(s);
    if (c && !out.includes(c)) out.push(c);
  };
  if (item.brand_name && item.strength) {
    push(`${item.brand_name} ${item.strength}`);
    push(`${item.brand_name} ${item.strength.replace(/mg$/i, "")}`);
  }
  if (item.molecule_hint && item.strength) {
    push(`${item.molecule_hint} ${item.strength}`);
  }
  push(item.brand_name);
  push(item.molecule_hint);
  push(item.raw_text);
  return out;
}

function exactAliases(queries: string[], country: string): AliasRow[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, normalized_text, molecule_id, product_id, alias_type, country FROM aliases WHERE normalized_text = ?",
  );
  const rows: AliasRow[] = [];
  const seen = new Set<number>();
  for (const q of queries) {
    for (const row of stmt.all(q) as AliasRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  rows.sort(
    (a, b) =>
      countryRank(a.country, country) - countryRank(b.country, country) ||
      (b.product_id ? 1 : 0) - (a.product_id ? 1 : 0),
  );
  return rows;
}

function fuzzyAliases(queries: string[], country: string): ResolveCandidate[] {
  const db = getDb();
  const toks = new Set<string>();
  for (const q of queries) {
    for (const t of tokens(q)) if (t.length >= 3) toks.add(t);
    if (q.length >= 3) toks.add(q.split(" ")[0]);
  }
  if (toks.size === 0) return [];

  const like = db.prepare(
    `SELECT id, normalized_text, molecule_id, product_id, alias_type, country
     FROM aliases WHERE normalized_text LIKE ? LIMIT 80`,
  );
  const scored = new Map<string, ResolveCandidate>();

  for (const t of toks) {
    const rows = like.all(`%${t}%`) as AliasRow[];
    for (const row of rows) {
      const molId = row.molecule_id ?? getProduct(row.product_id ?? 0)?.molecule_id;
      if (!molId) continue;
      const mol = getMolecule(molId);
      if (!mol) continue;
      let best = 0;
      for (const q of queries) {
        best = Math.max(
          best,
          similarity(q, row.normalized_text),
          row.normalized_text.includes(q) ? 0.82 : 0,
          q.includes(row.normalized_text) && row.normalized_text.length > 3
            ? 0.8
            : 0,
        );
      }
      if (countryRank(row.country, country) === 0) best += 0.06;
      else if (row.country === "GLOBAL") best += 0.02;
      best = Math.min(best, 0.99);
      if (best < 0.45) continue;

      const prod = row.product_id ? getProduct(row.product_id) : undefined;
      const key = prod ? `product:${prod.id}` : `molecule:${molId}`;
      const label = prod
        ? productLabel(prod, mol.inn_name)
        : mol.inn_name;
      const prev = scored.get(key);
      if (!prev || best > prev.score) {
        scored.set(key, {
          key,
          kind: prod ? "product" : "molecule",
          molecule_id: molId,
          product_id: prod?.id ?? null,
          label,
          score: best,
        });
      }
    }
  }

  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}

function pickProduct(
  moleculeId: number,
  item: LineItem,
  country: string,
): ProductRow | null {
  const list = productsFor(moleculeId);
  if (!list.length) return null;

  const scored = list.map((p) => {
    let s = 0;
    if (p.country === country) s += 3;
    else if (p.country === "GLOBAL") s += 1;
    if (item.strength && strengthsMatch(item.strength, p.strength)) s += 8;
    if (item.form && item.form === p.form) s += 3;
    return { p, s };
  });
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (!best) return null;
  if (item.strength && !strengthsMatch(item.strength, best.p.strength)) {
    const anyStrength = scored.find((x) =>
      strengthsMatch(item.strength, x.p.strength),
    );
    if (anyStrength) return anyStrength.p;
    return best.p;
  }
  return best.p;
}

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function llmPick(
  item: LineItem,
  candidates: ResolveCandidate[],
): Promise<string | "NONE"> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      pick: { type: "string" },
    },
    required: ["pick"],
  } as const;

  const allowed = candidates.map((c) => c.key);
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Pick exactly one candidate key for this extracted drug line, or NONE. You MUST pick from the provided IDs. Never invent a drug name or a new ID.",
      },
      {
        role: "user",
        content: JSON.stringify({
          line: item,
          candidates: candidates.map((c) => ({
            key: c.key,
            label: c.label,
            score: c.score,
          })),
          allowed,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "pick_candidate", strict: true, schema },
    },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) return "NONE";
  const parsed = JSON.parse(raw) as { pick: string };
  const pick = (parsed.pick || "NONE").trim();
  if (pick === "NONE") return "NONE";
  if (allowed.includes(pick)) return pick;
  return "NONE";
}

function finish(
  item: LineItem,
  mol: MoleculeRow | null,
  product: ProductRow | null,
  status: ResolvedLine["status"],
  confidence: number,
  note: string | null,
  candidates: ResolveCandidate[],
): ResolvedLine {
  const form =
    item.form ??
    (product?.form === "tablet" ||
    product?.form === "capsule" ||
    product?.form === "syrup" ||
    product?.form === "injection" ||
    product?.form === "other"
      ? product.form
      : null);
  return {
    ...item,
    form,
    confidence,
    molecule_id: mol?.id ?? null,
    molecule_name: mol?.inn_name ?? null,
    product_id: product?.id ?? null,
    product_label: product && mol ? productLabel(product, mol.inn_name) : null,
    status,
    match_note: note,
    candidates,
  };
}

function fromCandidate(
  item: LineItem,
  cand: ResolveCandidate,
  status: ResolvedLine["status"],
  confidence: number,
  note: string,
  candidates: ResolveCandidate[],
  country: string,
): ResolvedLine {
  const mol = getMolecule(cand.molecule_id);
  if (!mol) {
    return finish(item, null, null, "unmatched", 0.2, "Candidate vanished", candidates);
  }
  let product = cand.product_id ? getProduct(cand.product_id) ?? null : null;
  if (!product) product = pickProduct(mol.id, item, country);
  const strengthOk =
    !item.strength || !product || strengthsMatch(item.strength, product.strength);
  let st = status;
  let conf = confidence;
  if (!product || !strengthOk) {
    st = "needs_review";
    conf = Math.min(conf, 0.68);
  }
  if (conf < CONFIDENCE_THRESHOLD) st = "needs_review";
  return finish(item, mol, product, st, conf, note, candidates);
}

function asTraceCandidates(cands: ResolveCandidate[]): TraceCandidate[] {
  return cands.map((c) => ({ label: c.label, score: c.score }));
}

async function resolveOne(
  item: LineItem,
  country: string,
  index: number,
  onTrace?: TraceFn,
): Promise<ResolvedLine> {
  const id = `resolve:${index}`;
  const label = `Matching “${item.brand_name || item.raw_text}”`;
  const stage = async (
    status: "running" | "done" | "error",
    detail: string,
    candidates?: TraceCandidate[],
  ) => {
    await onTrace?.({
      type: "stage",
      id,
      label,
      status,
      detail,
      candidates,
    });
  };

  const queries = searchStrings(item);

  await stage("running", "Looking up exact catalog names");
  const exact = exactAliases(queries, country);
  if (exact.length) {
    const best = exact[0];
    const molId =
      best.molecule_id ?? getProduct(best.product_id ?? 0)?.molecule_id;
    if (molId) {
      const mol = getMolecule(molId)!;
      const product = best.product_id
        ? getProduct(best.product_id) ?? pickProduct(molId, item, country)
        : pickProduct(molId, item, country);
      const conf = best.product_id ? 0.95 : product ? 0.9 : 0.72;
      const status =
        conf >= CONFIDENCE_THRESHOLD && product ? "resolved" : "needs_review";
      await stage(
        "done",
        `Exact alias “${best.normalized_text}” → ${
          product ? productLabel(product, mol.inn_name) : mol.inn_name
        }`,
      );
      return finish(
        item,
        mol,
        product,
        status,
        conf,
        `Exact alias "${best.normalized_text}" (${best.alias_type}, ${best.country})`,
        [],
      );
    }
  }

  await stage("running", "Searching similar names in the catalog");
  const fuzzy = fuzzyAliases(queries, country);
  if (fuzzy.length) {
    await stage(
      "running",
      `Found ${fuzzy.length} similar name${fuzzy.length === 1 ? "" : "s"}`,
      asTraceCandidates(fuzzy),
    );
  }

  if (fuzzy.length === 1 && fuzzy[0].score >= 0.72) {
    const line = fromCandidate(
      item,
      fuzzy[0],
      fuzzy[0].score >= CONFIDENCE_THRESHOLD ? "resolved" : "needs_review",
      fuzzy[0].score,
      "Fuzzy match (single candidate)",
      fuzzy,
      country,
    );
    await stage(
      "done",
      `Closest name → ${line.product_label || line.molecule_name || "needs review"}`,
      asTraceCandidates(fuzzy),
    );
    return line;
  }

  if (fuzzy.length > 1 && hasOpenAI()) {
    await stage(
      "running",
      "Picking among similar names",
      asTraceCandidates(fuzzy),
    );
    try {
      const pick = await llmPick(item, fuzzy);
      if (pick !== "NONE") {
        const cand = fuzzy.find((c) => c.key === pick);
        if (cand) {
          const line = fromCandidate(
            item,
            cand,
            "resolved",
            Math.max(0.82, cand.score),
            "LLM picked from local candidates (no new name)",
            fuzzy,
            country,
          );
          await stage(
            "done",
            `Picked ${line.product_label || line.molecule_name || cand.label}`,
            asTraceCandidates(fuzzy),
          );
          return line;
        }
      }
    } catch {
      // continue
    }
  }

  if (fuzzy.length && fuzzy[0].score >= 0.55) {
    const line = fromCandidate(
      item,
      fuzzy[0],
      "needs_review",
      fuzzy[0].score,
      fuzzy.length > 1
        ? "Ambiguous fuzzy match — confirm before sourcing"
        : "Low-confidence fuzzy match",
      fuzzy,
      country,
    );
    await stage(
      "done",
      `Needs review → ${line.product_label || line.molecule_name || fuzzy[0].label}`,
      asTraceCandidates(fuzzy),
    );
    return line;
  }

  const hint = item.molecule_hint || item.brand_name || item.raw_text;
  if (hint) {
    await stage("running", "Checking RxNav for a generic name");
    const rx = await lookupRxNavInn(hint);
    if (rx?.innName) {
      const retry = exactAliases(
        [normalize(rx.innName), compact(rx.innName)],
        country,
      );
      if (retry[0]?.molecule_id) {
        const mol = getMolecule(retry[0].molecule_id)!;
        const product = pickProduct(mol.id, item, country);
        await stage(
          "done",
          `RxNav mapped to ${rx.innName}`,
        );
        return finish(
          item,
          mol,
          product,
          product ? "resolved" : "needs_review",
          0.78,
          `RxNav mapped to ${rx.innName} (rxcui ${rx.rxcui})`,
          [],
        );
      }
    }
  }

  await stage(
    "done",
    "No catalog match",
    fuzzy.length ? asTraceCandidates(fuzzy) : undefined,
  );
  return finish(
    item,
    null,
    null,
    "unmatched",
    Math.min(item.confidence, 0.25),
    "No local catalog match",
    fuzzy,
  );
}

export async function resolveLineItems(
  items: LineItem[],
  country: string,
  onTrace?: TraceFn,
): Promise<ResolvedLine[]> {
  const out: ResolvedLine[] = [];
  for (let i = 0; i < items.length; i++) {
    out.push(await resolveOne(items[i], country, i, onTrace));
  }
  return out;
}

export async function resolveDrug(
  item: LineItem,
  country: string,
): Promise<ResolvedLine> {
  return resolveOne(item, country, 0);
}
