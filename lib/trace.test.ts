import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTraceEvent } from "./trace";

test("applyTraceEvent inserts then updates a stage in place", () => {
  const first = applyTraceEvent([], {
    type: "stage",
    id: "extract",
    label: "Reading demand",
    status: "running",
    detail: "Starting…",
  });
  assert.equal(first.length, 1);
  assert.equal(first[0].status, "running");

  const next = applyTraceEvent(first, {
    type: "stage",
    id: "extract",
    label: "Reading demand",
    status: "done",
    detail: "Found 2 line items",
  });
  assert.equal(next.length, 1);
  assert.equal(next[0].status, "done");
  assert.equal(next[0].detail, "Found 2 line items");
});

test("applyTraceEvent keeps candidates when a later event omits them", () => {
  const withCands = applyTraceEvent([], {
    type: "stage",
    id: "resolve:0",
    label: "Matching “doloo”",
    status: "running",
    detail: "Searching similar names",
    candidates: [{ label: "paracetamol 650 mg tablet", score: 0.9 }],
  });
  const done = applyTraceEvent(withCands, {
    type: "stage",
    id: "resolve:0",
    label: "Matching “doloo”",
    status: "done",
    detail: "Picked paracetamol",
  });
  assert.equal(done[0].candidates?.length, 1);
  assert.equal(done[0].candidates?.[0].label, "paracetamol 650 mg tablet");
});
