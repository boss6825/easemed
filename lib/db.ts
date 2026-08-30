import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { seedIfEmpty } from "@/lib/seed";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "easemed.db");

let instance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS molecules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inn_name TEXT NOT NULL,
  usan_name TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  molecule_id INTEGER NOT NULL,
  strength TEXT NOT NULL,
  form TEXT NOT NULL,
  pack_size TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  FOREIGN KEY (molecule_id) REFERENCES molecules(id)
);

CREATE TABLE IF NOT EXISTS aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  normalized_text TEXT NOT NULL,
  molecule_id INTEGER,
  product_id INTEGER,
  alias_type TEXT NOT NULL,
  country TEXT NOT NULL,
  FOREIGN KEY (molecule_id) REFERENCES molecules(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  sku_name TEXT NOT NULL,
  unit_price REAL,
  currency TEXT NOT NULL DEFAULT 'INR',
  moq INTEGER,
  available_qty INTEGER,
  lead_days INTEGER,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS rxnav_cache (
  query TEXT PRIMARY KEY,
  rxcui TEXT,
  inn_name TEXT,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aliases_text ON aliases(normalized_text);
CREATE INDEX IF NOT EXISTS idx_aliases_country ON aliases(country, normalized_text);
CREATE INDEX IF NOT EXISTS idx_products_molecule ON products(molecule_id);
CREATE INDEX IF NOT EXISTS idx_sp_product ON supplier_products(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alias_unique
  ON aliases(normalized_text, country, COALESCE(molecule_id, 0), COALESCE(product_id, 0));
`;

export function dbPath(): string {
  return DB_PATH;
}

export function openDb(file = DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function getDb(): Database.Database {
  if (!instance) {
    instance = openDb();
    seedIfEmpty(instance);
  }
  return instance;
}

export function resetDbFile(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = DB_PATH + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}
