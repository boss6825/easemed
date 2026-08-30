import { getDb } from "@/lib/db";
import { normalize } from "@/lib/normalize";

type CacheRow = { query: string; rxcui: string | null; inn_name: string | null };

/**
 * Thin RxNav helper. Used ONLY after a local catalog miss.
 * Network failure → return null and continue with local-only resolution.
 */
export async function lookupRxNavInn(
  name: string,
): Promise<{ rxcui: string; innName: string } | null> {
  const q = normalize(name);
  if (!q) return null;

  const db = getDb();
  const cached = db
    .prepare("SELECT query, rxcui, inn_name FROM rxnav_cache WHERE query = ?")
    .get(q) as CacheRow | undefined;
  if (cached) {
    if (!cached.rxcui || !cached.inn_name) return null;
    return { rxcui: cached.rxcui, innName: cached.inn_name };
  }

  const put = db.prepare(
    "INSERT OR REPLACE INTO rxnav_cache (query, rxcui, inn_name, fetched_at) VALUES (?, ?, ?, ?)",
  );

  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) {
      put.run(q, null, null, new Date().toISOString());
      return null;
    }
    const json = (await res.json()) as {
      idGroup?: { rxnormId?: string[] };
    };
    const rxcui = json.idGroup?.rxnormId?.[0];
    if (!rxcui) {
      put.run(q, null, null, new Date().toISOString());
      return null;
    }

    const rel = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=IN`,
      { signal: AbortSignal.timeout(3500) },
    );
    let innName = name;
    if (rel.ok) {
      const related = (await rel.json()) as {
        relatedGroup?: {
          conceptGroup?: { tty?: string; conceptProperties?: { name?: string }[] }[];
        };
      };
      const inn = related.relatedGroup?.conceptGroup
        ?.find((g) => g.tty === "IN")
        ?.conceptProperties?.[0]?.name;
      if (inn) innName = inn;
    }

    put.run(q, rxcui, innName, new Date().toISOString());
    return { rxcui, innName };
  } catch {
    return null;
  }
}
