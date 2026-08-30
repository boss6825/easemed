import { resetDbFile, getDb } from "../lib/db";

const reset = process.argv.includes("--reset");
if (reset) {
  resetDbFile();
}

const db = getDb();

const mols = db.prepare("SELECT COUNT(*) AS c FROM molecules").get() as { c: number };
const prods = db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number };
const aliases = db.prepare("SELECT COUNT(*) AS c FROM aliases").get() as { c: number };
const sups = db.prepare("SELECT COUNT(*) AS c FROM suppliers").get() as { c: number };
const offers = db.prepare("SELECT COUNT(*) AS c FROM supplier_products").get() as {
  c: number;
};

console.log("EaseMed catalog ready");
console.log(`  molecules:          ${mols.c}`);
console.log(`  products:           ${prods.c}`);
console.log(`  aliases:            ${aliases.c}`);
console.log(`  suppliers:          ${sups.c}`);
console.log(`  supplier_products:  ${offers.c}`);
