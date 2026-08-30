import { getDb } from "@/lib/db";
import type { ResolvedLine, SupplierOffer } from "@/lib/types";

type OfferRow = {
  supplier_id: number;
  supplier_name: string;
  country: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  product_id: number;
  sku_name: string;
  unit_price: number | null;
  currency: string;
  moq: number | null;
  available_qty: number | null;
  lead_days: number | null;
  inn_name: string;
  strength: string;
  form: string;
  pack_size: string | null;
};

function toOffer(row: OfferRow, labelOverride?: string): SupplierOffer {
  return {
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    country: row.country,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    notes: row.notes,
    product_id: row.product_id,
    product_label:
      labelOverride ??
      `${row.inn_name} ${row.strength} ${row.form}${
        row.pack_size ? ` (${row.pack_size})` : ""
      }`,
    sku_name: row.sku_name,
    unit_price: row.unit_price,
    currency: row.currency,
    moq: row.moq,
    available_qty: row.available_qty,
    lead_days: row.lead_days,
  };
}

const SELECT = `
  SELECT
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.country,
    s.contact_email,
    s.contact_phone,
    s.notes,
    sp.product_id,
    sp.sku_name,
    sp.unit_price,
    sp.currency,
    sp.moq,
    sp.available_qty,
    sp.lead_days,
    m.inn_name,
    p.strength,
    p.form,
    p.pack_size
  FROM supplier_products sp
  JOIN suppliers s ON s.id = sp.supplier_id
  JOIN products p ON p.id = sp.product_id
  JOIN molecules m ON m.id = p.molecule_id
`;

export function matchSuppliers(lines: ResolvedLine[]): SupplierOffer[] {
  const db = getDb();
  const byProduct = db.prepare(`${SELECT} WHERE sp.product_id = ? ORDER BY sp.unit_price ASC`);
  const byMolecule = db.prepare(
    `${SELECT} WHERE p.molecule_id = ? ORDER BY sp.unit_price ASC`,
  );
  const byName = db.prepare(
    `${SELECT} WHERE lower(m.inn_name) = lower(?) ORDER BY sp.unit_price ASC`,
  );

  const offers: SupplierOffer[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let rows: OfferRow[] = [];
    if (line.product_id) {
      rows = byProduct.all(line.product_id) as OfferRow[];
    }
    if (!rows.length && line.molecule_id) {
      rows = byMolecule.all(line.molecule_id) as OfferRow[];
    }
    if (!rows.length && line.molecule_name) {
      rows = byName.all(line.molecule_name) as OfferRow[];
    }

    const label = line.product_label ?? line.molecule_name ?? line.raw_text;
    for (const row of rows) {
      const key = `${row.supplier_id}:${row.product_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      offers.push(toOffer(row, label));
    }
  }

  return offers;
}

export function buildRfq(lines: ResolvedLine[], offers: SupplierOffer[]): string {
  const date = new Date().toISOString().slice(0, 10);
  const body = lines
    .map((l, i) => {
      const name =
        l.product_label ||
        [l.molecule_name, l.strength, l.form].filter(Boolean).join(" ") ||
        l.raw_text;
      const qty =
        l.quantity != null
          ? `${l.quantity} ${l.quantity_unit ?? "unit"}`
          : "qty TBC";
      return `${i + 1}. ${name}  —  ${qty}${
        l.brand_name ? `  (requested as ${l.brand_name})` : ""
      }`;
    })
    .join("\n");

  const contacts = [
    ...new Map(
      offers.map((o) => [
        o.supplier_id,
        `${o.supplier_name}  <${o.contact_email ?? "n/a"}>  ${o.contact_phone ?? ""}`,
      ]),
    ).values(),
  ].join("\n");

  return `RFQ — EaseMed hospital procurement
Date: ${date}

Please quote supply of the following (including unit price, MOQ, available qty, lead time, and GST):

${body || "(no lines)"}

Reply to the requesting facility. Suggested distributors from catalog:

${contacts || "(no matched suppliers)"}
`;
}

export function sourceLines(lines: ResolvedLine[]): {
  offers: SupplierOffer[];
  rfq: string;
} {
  const offers = matchSuppliers(lines);
  return { offers, rfq: buildRfq(lines, offers) };
}
