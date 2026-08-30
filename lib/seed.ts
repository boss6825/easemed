import type Database from "better-sqlite3";
import { compact, normalize, normalizeStrength } from "./normalize";
import { MOLECULES, SUPPLIERS, type SupplierKind } from "./catalog";

function addAlias(
  insert: Database.Statement,
  text: string,
  moleculeId: number | null,
  productId: number | null,
  aliasType: string,
  country: string,
) {
  const n = normalize(text);
  if (!n) return;
  try {
    insert.run(n, moleculeId, productId, aliasType, country);
  } catch {
    // unique index skip
  }
  const c = compact(text);
  if (c !== n) {
    try {
      insert.run(c, moleculeId, productId, aliasType, country);
    } catch {
      // unique
    }
  }
}

function basePrice(form: string, strength: string): number {
  const formBase: Record<string, number> = {
    tablet: 16,
    capsule: 22,
    syrup: 48,
    injection: 95,
    other: 32,
  };
  let price = formBase[form] ?? 25;
  const mg = parseFloat(strength);
  if (!Number.isNaN(mg) && /mg/i.test(strength) && mg >= 500) price *= 1.25;
  if (/g\b/i.test(strength) && mg >= 1) price *= 1.8;
  return price;
}

function jitter(productId: number, supplierId: number): number {
  return 0.82 + ((productId * 13 + supplierId * 17) % 40) / 100;
}

function kindMult(kind: SupplierKind): number {
  if (kind === "generic_depot") return 0.52;
  if (kind === "manufacturer") return 1.18;
  if (kind === "cf") return 0.94;
  return 1.0;
}

export function seedAll(db: Database.Database): void {
  const insertMol = db.prepare(
    "INSERT INTO molecules (inn_name, usan_name) VALUES (?, ?)",
  );
  const insertProd = db.prepare(
    `INSERT INTO products (molecule_id, strength, form, pack_size, country)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertAlias = db.prepare(
    `INSERT INTO aliases (normalized_text, molecule_id, product_id, alias_type, country)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertSup = db.prepare(
    `INSERT INTO suppliers (name, country, contact_email, contact_phone, notes)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertOffer = db.prepare(
    `INSERT INTO supplier_products
      (supplier_id, product_id, sku_name, unit_price, currency, moq, available_qty, lead_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const productIds: {
    id: number;
    moleculeId: number;
    inn: string;
    strength: string;
    form: string;
    pack_size: string | null;
    country: string;
  }[] = [];
  const supplierMeta: { id: number; kind: SupplierKind; country: string }[] =
    [];

  const tx = db.transaction(() => {
    for (const m of MOLECULES) {
      const molInfo = insertMol.run(m.inn, m.usan ?? null);
      const moleculeId = Number(molInfo.lastInsertRowid);

      addAlias(insertAlias, m.inn, moleculeId, null, "generic", "GLOBAL");
      if (m.usan) {
        addAlias(insertAlias, m.usan, moleculeId, null, "generic", "US");
        addAlias(insertAlias, m.usan, moleculeId, null, "generic", "GLOBAL");
      }
      for (const syn of m.synonyms ?? []) {
        addAlias(insertAlias, syn, moleculeId, null, "synonym", "GLOBAL");
      }
      for (const b of m.brandsIN ?? []) {
        addAlias(insertAlias, b, moleculeId, null, "brand", "IN");
      }
      for (const b of m.brandsUS ?? []) {
        addAlias(insertAlias, b, moleculeId, null, "brand", "US");
        addAlias(insertAlias, b, moleculeId, null, "brand", "GLOBAL");
      }

      for (const prod of m.products) {
        const country = prod.country ?? "IN";
        const info = insertProd.run(
          moleculeId,
          prod.strength,
          prod.form,
          prod.pack_size ?? null,
          country,
        );
        const productId = Number(info.lastInsertRowid);
        productIds.push({
          id: productId,
          moleculeId,
          inn: m.inn,
          strength: prod.strength,
          form: prod.form,
          pack_size: prod.pack_size ?? null,
          country,
        });

        addAlias(
          insertAlias,
          `${m.inn} ${prod.strength}`,
          moleculeId,
          productId,
          "generic",
          country,
        );
        addAlias(
          insertAlias,
          `${m.inn} ${prod.strength} ${prod.form}`,
          moleculeId,
          productId,
          "generic",
          country,
        );
        if (m.usan) {
          addAlias(
            insertAlias,
            `${m.usan} ${prod.strength}`,
            moleculeId,
            productId,
            "generic",
            country === "IN" ? "US" : country,
          );
        }

        const brands =
          country === "US" ? (m.brandsUS ?? []) : (m.brandsIN ?? []);
        const strengthBare = prod.strength.replace(/\s+/g, "");
        const strengthNoUnit = normalizeStrength(prod.strength).replace(
          /(mg|mcg|g|ml|iu|%)$/i,
          "",
        );
        for (const b of brands) {
          addAlias(
            insertAlias,
            `${b} ${prod.strength}`,
            moleculeId,
            productId,
            "brand",
            country,
          );
          addAlias(
            insertAlias,
            `${b} ${strengthBare}`,
            moleculeId,
            productId,
            "brand",
            country,
          );
          if (strengthNoUnit && /^\d+(\.\d+)?$/.test(strengthNoUnit)) {
            addAlias(
              insertAlias,
              `${b} ${strengthNoUnit}`,
              moleculeId,
              productId,
              "brand",
              country,
            );
          }
        }

        // Extra INN-only aliases that hospitals type (ORS, NS, RL)
        if (m.inn === "oral rehydration salts") {
          addAlias(insertAlias, "ors", moleculeId, productId, "synonym", "IN");
        }
      }
    }

    for (const s of SUPPLIERS) {
      const info = insertSup.run(
        s.name,
        s.country,
        s.contact_email,
        s.contact_phone,
        s.notes,
      );
      supplierMeta.push({
        id: Number(info.lastInsertRowid),
        kind: s.kind,
        country: s.country,
      });
    }

    for (const prod of productIds) {
      const eligible = supplierMeta.filter((s) => s.country === prod.country);
      if (eligible.length === 0) continue;

      const count = 2 + (prod.id % 3); // 2–4
      const picked: typeof eligible = [];
      const depot = eligible.find((s) => s.kind === "generic_depot");
      if (depot && prod.country === "IN") picked.push(depot);

      for (let i = 0; picked.length < count; i++) {
        const s = eligible[(prod.id * 3 + i * 5) % eligible.length];
        if (!picked.some((p) => p.id === s.id)) picked.push(s);
        if (i > 20) break;
      }

      for (const s of picked) {
        const currency = prod.country === "IN" ? "INR" : "USD";
        let price =
          basePrice(prod.form, prod.strength) *
          kindMult(s.kind) *
          jitter(prod.id, s.id);
        if (currency === "USD") price = price / 18;
        price = Math.round(price * 100) / 100;

        const moq =
          s.kind === "generic_depot" ? 10 : s.kind === "manufacturer" ? 20 : 5;
        const lead =
          s.kind === "cf" ? 1 : s.kind === "manufacturer" ? 5 : 3;
        const avail = 40 + ((prod.id * s.id) % 400);

        const sku = `${prod.inn} ${prod.strength} ${prod.form}${
          prod.pack_size ? ` ${prod.pack_size}` : ""
        }`;

        insertOffer.run(
          s.id,
          prod.id,
          sku,
          price,
          currency,
          moq,
          avail,
          lead,
        );
      }
    }
  });

  tx();
}

export function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare("SELECT COUNT(*) AS c FROM molecules").get() as {
    c: number;
  };
  if (row.c === 0) seedAll(db);
}
