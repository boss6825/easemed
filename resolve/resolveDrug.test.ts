import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDemandFallback } from "../extract/extractLineItems";
import { resolveLineItems } from "./resolveDrug";

test("Dolo 650 resolves to paracetamol 650mg tablet", async () => {
  const items = parseDemandFallback("Dolo 650, 10 strips");
  const lines = await resolveLineItems(items, "IN");
  assert.equal(lines.length, 1);
  assert.equal(lines[0].molecule_name, "paracetamol");
  assert.ok(lines[0].product_label?.includes("650"));
  assert.equal(lines[0].status, "resolved");
});

test("typo brand emits similar-name candidates on the trace", async () => {
  const items = parseDemandFallback("dol 650, 10 strips");
  const details: string[] = [];
  let similarCount = 0;
  const lines = await resolveLineItems(items, "IN", async (event) => {
    if (event.type !== "stage") return;
    if (event.detail) details.push(event.detail);
    if (event.candidates?.length) similarCount = event.candidates.length;
  });
  assert.equal(lines.length, 1);
  assert.ok(
    details.some((d) => /similar/i.test(d)),
    `expected a similar-name stage, got: ${details.join(" | ")}`,
  );
  assert.ok(similarCount > 0, "expected similar-name candidates on the trace");
});
