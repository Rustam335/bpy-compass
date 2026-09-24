import assert from "node:assert/strict";
import { test } from "node:test";
import { passRate, provenance, runIdOf, selectRun, type TestCaseRef } from "../lib/eval-runs";
import type { EvalRunDoc } from "../lib/sanity";

const CASES: TestCaseRef[] = [
  { _id: "testCase-a", order: 1, question: "A?", targetVersion: "4.5" },
  { _id: "testCase-b", order: 2, question: "B?", targetVersion: "5.0" },
];

function doc(runId: string, testCaseId: string, contender: EvalRunDoc["contender"], passed: boolean, extra: Partial<EvalRunDoc> = {}): EvalRunDoc {
  return {
    _id: `evalRun-${runId}-${testCaseId}-${contender}`,
    runId,
    testCaseId,
    testCaseOrder: null,
    question: "",
    targetVersion: "",
    contender,
    passed,
    modelId: "m",
    provider: "p",
    temperature: 0,
    ranAt: `${runId}T00:00:00Z`,
    ...extra,
  };
}

test("runIdOf reads the field, or the legacy _id layout", () => {
  assert.equal(runIdOf({ _id: "x", runId: "r1" }), "r1");
  assert.equal(runIdOf({ _id: "evalRun-2026-09-20T18-14-13-718Z-testCase-eevee-engine-42-bpy-compass" }), "2026-09-20T18-14-13-718Z");
  assert.equal(runIdOf({ _id: "something-else" }), null);
});

test("selectRun never pairs results from different runs: a partial newer run does not win", () => {
  const complete = [
    doc("2026-09-01", "testCase-a", "baseline", true),
    doc("2026-09-01", "testCase-a", "bpy-compass", true),
    doc("2026-09-01", "testCase-b", "baseline", false),
    doc("2026-09-01", "testCase-b", "bpy-compass", true),
  ];
  const partial = [doc("2026-09-02", "testCase-a", "baseline", true)];
  const picked = selectRun([...partial, ...complete], CASES);
  assert.equal(picked?.runId, "2026-09-01");
  assert.equal(picked?.complete, true);
  assert.equal(picked?.rows.length, 2);
  assert.equal(picked?.rows[1].baseline?.passed, false);
});

test("selectRun falls back to the newest run, flagged partial, when none is complete", () => {
  const runs = [doc("2026-09-02", "testCase-a", "baseline", true), doc("2026-09-01", "testCase-b", "bpy-compass", true)];
  const picked = selectRun(runs, CASES);
  assert.equal(picked?.runId, "2026-09-02");
  assert.equal(picked?.complete, false);
  assert.equal(picked?.rows[1].compass, undefined);
  assert.equal(selectRun([], CASES), null);
});

test("passRate counts only available results and reports missing cells", () => {
  const runs = [doc("r", "testCase-a", "baseline", true), doc("r", "testCase-a", "bpy-compass", true), doc("r", "testCase-b", "bpy-compass", false)];
  const rows = selectRun(runs, CASES)!.rows;
  assert.deepEqual(passRate(rows, "baseline"), { passed: 1, available: 1, missing: 1 });
  assert.deepEqual(passRate(rows, "bpy-compass"), { passed: 1, available: 2, missing: 0 });
});

test("provenance comes from the records and flags mixed configurations", () => {
  const same = selectRun([doc("r", "testCase-a", "baseline", true, { blenderBuild: "Blender 4.5.14" }), doc("r", "testCase-a", "bpy-compass", true, { blenderBuild: "n/a" })], CASES)!.rows;
  assert.deepEqual(provenance(same), { models: ["m"], providers: ["p"], temperatures: ["0"], builds: ["Blender 4.5.14"], mixed: false });

  const mixed = selectRun([doc("r", "testCase-a", "baseline", true), doc("r", "testCase-a", "bpy-compass", true, { modelId: "other" })], CASES)!.rows;
  assert.equal(provenance(mixed).mixed, true);
  assert.deepEqual(provenance(mixed).models, ["m", "other"]);
});
