import { COUNTRIES, type TypedDemandQuery } from "@/lib/types";

/** The only v1 input: a typed demand string plus a country for alias routing. */
export function parseTypedQuery(input: {
  text?: unknown;
  country?: unknown;
}): TypedDemandQuery {
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const raw =
    typeof input.country === "string" ? input.country.trim().toUpperCase() : "IN";
  const country = (COUNTRIES as readonly string[]).includes(raw) ? raw : "IN";
  return { text, country };
}

export function assertNonEmptyQuery(query: TypedDemandQuery): void {
  if (!query.text) {
    throw new Error("Demand text is required");
  }
}
