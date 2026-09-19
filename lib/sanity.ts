/**
 * Sanity clients and GROQ queries.
 * - `readClient()`: public dataset, CDN, no token. Safe for server components.
 * - `writeClient()`: project write token. Scripts only (eval, seed). Never import in app/.
 */
import { createClient, type SanityClient } from "@sanity/client";
import { env } from "./env";

export const API_VERSION = "2025-09-01";

let cachedReadClient: SanityClient | null = null;

/** Public read client (CDN, no token). Created lazily so importing this module never throws at build time. */
export function readClient(): SanityClient {
  if (cachedReadClient) return cachedReadClient;
  const projectId = process.env.SANITY_PROJECT_ID ?? process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) throw new Error("SANITY_PROJECT_ID is not set.");
  cachedReadClient = createClient({
    projectId,
    dataset: process.env.SANITY_DATASET ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: API_VERSION,
    useCdn: true,
    perspective: "published",
  });
  return cachedReadClient;
}

export function writeClient(): SanityClient {
  return createClient({
    projectId: env.sanity.projectId(),
    dataset: env.sanity.dataset(),
    apiVersion: API_VERSION,
    useCdn: false,
    token: env.sanity.writeToken(),
  });
}

/* ---------- Types mirrored from sanity/schemaTypes ---------- */

export type ApiChangeKind = "removed" | "renamed" | "behavior" | "added";
export type ApiArea = "python-api" | "modeling" | "shading" | "animation" | "render" | "io";

export interface TestCaseDoc {
  _id: string;
  question: string;
  targetVersion: string;
  assertScript?: string;
  expectApiChanges?: { symbol: string; replacement?: string }[];
}

export interface EvalRunDoc {
  _id: string;
  testCaseId: string;
  testCaseOrder: number | null;
  question: string;
  targetVersion: string;
  contender: "baseline" | "bpy-compass";
  passed: boolean;
  stderr?: string;
  blenderBuild?: string;
  modelId: string;
  provider: string;
  ranAt: string;
}

/* ---------- Queries ---------- */

export const TEST_CASES_QUERY = /* groq */ `
*[_type == "testCase"] | order(order asc, _createdAt asc) {
  _id, question, "assertScript": assertScript.code,
  "targetVersion": targetVersion->version,
  "expectApiChanges": expectApiChanges[]->{ symbol, replacement }
}`;

export const LATEST_EVAL_RUNS_QUERY = /* groq */ `
*[_type == "evalRun"] | order(ranAt desc) {
  _id, contender, passed, stderr, blenderBuild, modelId, provider, ranAt,
  "testCaseId": testCase._ref,
  "testCaseOrder": testCase->order,
  "question": testCase->question,
  "targetVersion": testCase->targetVersion->version
}`;

/** Scripts pass `{ fresh: true }` to bypass the CDN so a just-seeded assert is used immediately. */
export async function fetchTestCases(opts: { fresh?: boolean } = {}): Promise<TestCaseDoc[]> {
  const client = opts.fresh ? readClient().withConfig({ useCdn: false }) : readClient();
  return client.fetch<TestCaseDoc[]>(TEST_CASES_QUERY);
}

export async function fetchEvalRuns(): Promise<EvalRunDoc[]> {
  return readClient().fetch<EvalRunDoc[]>(LATEST_EVAL_RUNS_QUERY);
}
