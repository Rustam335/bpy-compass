/**
 * Pure helpers for the /eval page: pick one eval run to display and describe its provenance.
 *
 * Issue #4: results from different runs are never mixed. The page shows the newest run that
 * has both contenders for every current test case; if no run is complete, the newest run is
 * shown and flagged as partial.
 * Issue #6: model, provider and temperature come from the displayed records, not from the
 * constants currently loaded on the server.
 */
import type { EvalRunDoc } from "./sanity";

export type Contender = EvalRunDoc["contender"];

export interface EvalRow {
  testCaseId: string;
  order: number | null;
  question: string;
  targetVersion: string;
  baseline?: EvalRunDoc;
  compass?: EvalRunDoc;
}

export interface SelectedRun {
  runId: string;
  ranAt: string;
  rows: EvalRow[];
  /** Both contenders present for every test case. */
  complete: boolean;
}

export interface TestCaseRef {
  _id: string;
  order: number | null;
  question: string;
  targetVersion: string;
}

/** Runs written before `runId` was a field carry it inside their _id. */
const LEGACY_RUN_ID = /^evalRun-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-/;

export function runIdOf(run: Pick<EvalRunDoc, "_id" | "runId">): string | null {
  return run.runId ?? LEGACY_RUN_ID.exec(run._id)?.[1] ?? null;
}

function rowsFor(testCases: TestCaseRef[], runs: EvalRunDoc[]): EvalRow[] {
  return testCases.map((tc) => {
    const ofCase = runs.filter((r) => r.testCaseId === tc._id);
    return {
      testCaseId: tc._id,
      order: tc.order,
      question: tc.question,
      targetVersion: tc.targetVersion,
      baseline: ofCase.find((r) => r.contender === "baseline"),
      compass: ofCase.find((r) => r.contender === "bpy-compass"),
    };
  });
}

/**
 * Group runs by runId (newest first by ranAt) and pick the newest complete one, else the
 * newest one at all. Returns null when there are no runs.
 */
export function selectRun(runs: EvalRunDoc[], testCases: TestCaseRef[]): SelectedRun | null {
  const byRun = new Map<string, EvalRunDoc[]>();
  for (const run of runs) {
    const id = runIdOf(run);
    if (!id) continue;
    byRun.set(id, [...(byRun.get(id) ?? []), run]);
  }
  const candidates = [...byRun.entries()]
    .map(([runId, docs]) => {
      const rows = rowsFor(testCases, docs);
      const ranAt = docs.map((d) => d.ranAt).sort().at(-1) ?? "";
      const complete = rows.length > 0 && rows.every((r) => r.baseline && r.compass);
      return { runId, ranAt, rows, complete };
    })
    .sort((a, b) => b.ranAt.localeCompare(a.ranAt));
  return candidates.find((c) => c.complete) ?? candidates[0] ?? null;
}

export interface PassRate {
  passed: number;
  /** Test cases that have a result for this contender. */
  available: number;
  /** Test cases with no result for this contender (not run). */
  missing: number;
}

/** Issue #5: the denominator counts only results that exist; missing cells are reported, not failed. */
export function passRate(rows: EvalRow[], contender: Contender): PassRate {
  const key = contender === "baseline" ? "baseline" : "compass";
  const present = rows.map((r) => r[key]).filter((r): r is EvalRunDoc => Boolean(r));
  return { passed: present.filter((r) => r.passed).length, available: present.length, missing: rows.length - present.length };
}

export interface Provenance {
  models: string[];
  providers: string[];
  temperatures: string[];
  builds: string[];
  /** More than one model, provider or temperature among the displayed records. */
  mixed: boolean;
}

function distinct(values: (string | number | null | undefined)[]): string[] {
  return [...new Set(values.filter((v) => v !== null && v !== undefined && v !== "").map(String))].sort();
}

export function provenance(rows: EvalRow[]): Provenance {
  const docs = rows.flatMap((r) => [r.baseline, r.compass]).filter((d): d is EvalRunDoc => Boolean(d));
  const models = distinct(docs.map((d) => d.modelId));
  const providers = distinct(docs.map((d) => d.provider));
  const temperatures = distinct(docs.map((d) => d.temperature));
  const builds = distinct(docs.map((d) => d.blenderBuild)).filter((b) => b !== "n/a");
  return { models, providers, temperatures, builds, mixed: models.length > 1 || providers.length > 1 || temperatures.length > 1 };
}
