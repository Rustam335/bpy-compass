/**
 * Eval harness: baseline (no tools) vs bpy-compass (KB tools) on every `testCase`,
 * executed in headless Blender, results written to Sanity as `evalRun` documents.
 *
 *   yarn eval                 run everything and write results
 *   yarn eval --dry-run       run, print, do not write to Sanity
 *   yarn eval --only 3        run only test case #3 (by `order`)
 *
 * Runs locally only (Blender is not available on Vercel).
 */
import "./load-env";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { connectContextMcp, fetchInitialContext } from "../lib/context-mcp";
import { env } from "../lib/env";
import {
  assertValidModelConfig,
  MAX_OUTPUT_TOKENS,
  MAX_STEPS,
  MODEL_ID,
  openRouterRouting,
  PROVIDER,
  REASONING_MAX_TOKENS,
  TEMPERATURE,
  type Contender,
} from "../lib/model";
import { buildBaselinePrompt, buildSystemPrompt } from "../lib/prompt";
import { fetchTestCases, writeClient, type TestCaseDoc } from "../lib/sanity";

const BLENDER_TIMEOUT_MS = 120_000;

type RunResult = {
  script: string;
  rawAnswer: string;
  passed: boolean;
  stderr: string;
  blenderBuild: string;
};

/* ---------- CLI ---------- */

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const onlyIdx = argv.indexOf("--only");
  const only = onlyIdx >= 0 ? Number(argv[onlyIdx + 1]) : undefined;
  return { dryRun, only };
}

/* ---------- LLM ---------- */

function model() {
  return createOpenRouter({ apiKey: env.openrouter.apiKey() }).chat(MODEL_ID, {
    ...openRouterRouting(),
    reasoning: { max_tokens: REASONING_MAX_TOKENS },
  });
}

async function askBaseline(tc: TestCaseDoc): Promise<string> {
  const { text } = await generateText({
    model: model(),
    system: buildBaselinePrompt(tc.targetVersion),
    prompt: tc.question,
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });
  return text;
}

async function askCompass(tc: TestCaseDoc, outline: string): Promise<string> {
  const mcp = await connectContextMcp();
  try {
    const { text } = await generateText({
      model: model(),
      system: buildSystemPrompt({ version: tc.targetVersion, outline }),
      prompt: `Blender ${tc.targetVersion} — ${tc.question}`,
      tools: await mcp.tools(),
      stopWhen: stepCountIs(MAX_STEPS),
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    return text;
  } finally {
    await mcp.close();
  }
}

/**
 * Pull the python script out of an answer. Accepts either a fenced ```python block
 * (baseline) or the 4-space-indented block under "ANSWER" (bpy-compass format).
 */
export function extractScript(answer: string): string {
  const fenced = answer.match(/```(?:python|py)?\s*\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trimEnd();

  const answerBlock = answer.split(/\n(?:WATCH OUT|SOURCES)\b/)[0];
  const indented = answerBlock
    .split("\n")
    .filter((line) => line.startsWith("    "))
    .map((line) => line.slice(4));
  return indented.join("\n").trim();
}

/* ---------- Blender ---------- */

function blenderBinFor(version: string): string {
  const major = version.split(".")[0];
  const bin = major === "5" ? env.blender.bin50() : env.blender.bin45();
  if (!bin) throw new Error(`No Blender binary configured for ${version} (BLENDER_BIN_45 / BLENDER_BIN_50).`);
  return bin;
}

function blenderBuild(bin: string): string {
  const out = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return out.stdout?.split("\n")[0]?.trim() || "unknown";
}

async function runInBlender(bin: string, script: string, assertScript?: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "bpy-compass-"));
  const file = path.join(dir, "case.py");
  const body = [script, "", "# ---- assertions ----", assertScript ?? ""].join("\n");
  await writeFile(file, body, "utf8");

  const out = spawnSync(bin, ["-b", "--factory-startup", "--python-exit-code", "1", "--python", file], {
    encoding: "utf8",
    timeout: BLENDER_TIMEOUT_MS,
    // Test cases that write files read this path instead of inventing one.
    env: { ...process.env, BPY_OUT_OBJ: path.join(dir, "out.obj") },
  });
  return { passed: out.status === 0, stderr: (out.stderr ?? "") + (out.error ? `\n${out.error.message}` : "") };
}

/* ---------- Orchestration ---------- */

async function evaluate(tc: TestCaseDoc, contender: Contender, outline: string): Promise<RunResult> {
  const rawAnswer = contender === "baseline" ? await askBaseline(tc) : await askCompass(tc, outline);
  const script = extractScript(rawAnswer);
  if (!script) {
    return { script, rawAnswer, passed: false, stderr: "No python script found in answer.", blenderBuild: "n/a" };
  }
  const bin = blenderBinFor(tc.targetVersion);
  const { passed, stderr } = await runInBlender(bin, script, tc.assertScript);
  return { script, rawAnswer, passed, stderr, blenderBuild: blenderBuild(bin) };
}

function evalRunDoc(tc: TestCaseDoc, contender: Contender, r: RunResult, runId: string) {
  return {
    _id: `evalRun-${runId}-${tc._id}-${contender}`,
    _type: "evalRun",
    testCase: { _type: "reference", _ref: tc._id },
    contender,
    script: { _type: "code", language: "python", code: r.script },
    rawAnswer: r.rawAnswer,
    passed: r.passed,
    stderr: r.stderr.slice(0, 4000),
    blenderBuild: r.blenderBuild,
    modelId: MODEL_ID,
    provider: PROVIDER,
    ranAt: new Date().toISOString(),
  };
}

async function main() {
  const { dryRun, only } = parseArgs(process.argv.slice(2));
  assertValidModelConfig();

  const all = await fetchTestCases({ fresh: true });
  const cases = only ? all.filter((_, i) => i + 1 === only) : all;
  if (cases.length === 0) throw new Error("No test cases found in Sanity.");

  const outline = await fetchInitialContext();
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const client = dryRun ? null : writeClient();

  console.log(`model=${MODEL_ID} provider=${PROVIDER} temperature=${TEMPERATURE} cases=${cases.length}`);

  for (const [i, tc] of cases.entries()) {
    for (const contender of ["baseline", "bpy-compass"] as const) {
      const r = await evaluate(tc, contender, outline);
      console.log(`#${i + 1} [${tc.targetVersion}] ${contender.padEnd(11)} ${r.passed ? "PASS" : "FAIL"}  ${tc.question}`);
      if (!r.passed) console.log(`   ${r.stderr.split("\n").find((l) => l.trim()) ?? ""}`);
      if (client) await client.createOrReplace(evalRunDoc(tc, contender, r, runId));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
