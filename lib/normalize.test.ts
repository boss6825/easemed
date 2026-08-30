import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compact,
  normalize,
  normalizeStrength,
  similarity,
  strengthsMatch,
} from "./normalize";

test("normalize collapses case, space, punctuation", () => {
  assert.equal(normalize("  Dolo-650  "), "dolo 650");
  assert.equal(compact("Dolo 650mg"), "dolo650mg");
});

test("strength matching treats 650mg and 650 mg as equal", () => {
  assert.equal(normalizeStrength("650 mg"), "650mg");
  assert.equal(strengthsMatch("650MG", "650 mg"), true);
});

test("similarity is 1 for identical strings", () => {
  assert.equal(similarity("paracetamol", "paracetamol"), 1);
  assert.ok(similarity("paracetamol", "paracetmol") > 0.8);
});
