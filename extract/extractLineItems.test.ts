import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDemandFallback } from "../extract/extractLineItems";

test("fallback parser: Dolo 650 + qty and ORS boxes", () => {
  const items = parseDemandFallback("Dolo 650, 10 strips; ORS 50 boxes");
  assert.equal(items.length, 2);
  assert.equal(items[0].brand_name?.toLowerCase(), "dolo");
  assert.equal(items[0].strength, "650mg");
  assert.equal(items[0].quantity, 10);
  assert.equal(items[0].quantity_unit, "strip");
  assert.match(items[1].brand_name ?? items[1].molecule_hint ?? "", /ors/i);
  assert.equal(items[1].quantity, 50);
  assert.equal(items[1].quantity_unit, "pack");
});
