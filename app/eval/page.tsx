import { MODEL_ID, PROVIDER, TEMPERATURE } from "@/lib/model";
import { fetchEvalRuns, type EvalRunDoc } from "@/lib/sanity";

export const revalidate = 300;

type Row = {
  testCaseId: string;
  order: number;
  question: string;
  targetVersion: string;
  baseline?: EvalRunDoc;
  compass?: EvalRunDoc;
};

/** Keep only the newest run per (testCase, contender), then pivot into one row per test case. */
function pivotLatest(runs: EvalRunDoc[]): Row[] {
  const rows = new Map<string, Row>();
  for (const run of runs) {
    const row = rows.get(run.testCaseId) ?? {
      testCaseId: run.testCaseId,
      order: run.testCaseOrder ?? Number.MAX_SAFE_INTEGER,
      question: run.question,
      targetVersion: run.targetVersion,
    };
    const key = run.contender === "baseline" ? "baseline" : "compass";
    if (!row[key]) rows.set(run.testCaseId, { ...row, [key]: run });
  }
  return [...rows.values()].sort((a, b) => a.order - b.order);
}

function Cell({ run }: { run?: EvalRunDoc }) {
  if (!run) return <td className="px-3 py-2 text-ink-faint">—</td>;
  const firstErrorLine = run.stderr?.split("\n").find((l) => l.trim())?.slice(0, 80);
  return (
    <td className="px-3 py-2 align-top">
      <span className={run.passed ? "text-green-600" : "text-red-600"}>
        {run.passed ? "✅ pass" : "❌ fail"}
      </span>
      {!run.passed && firstErrorLine && (
        <div className="mt-1 font-mono text-xs text-ink-faint">{firstErrorLine}</div>
      )}
    </td>
  );
}

export default async function EvalPage() {
  let rows: Row[] = [];
  let loadError: string | null = null;
  try {
    rows = pivotLatest(await fetchEvalRuns());
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load eval runs";
  }

  const passCount = (key: "baseline" | "compass") => rows.filter((r) => r[key]?.passed).length;

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Eval: plain LLM vs bpy-compass</h1>
        <p className="mt-3 max-w-3xl text-ink-dim">
          Each generated script was executed in headless Blender (4.5.14 LTS and 5.0.1) with a
          factory startup file, followed by the test case&apos;s assert script. Results are stored
          in Sanity and shown here unedited, including failures. The only difference between the two
          contenders is that the baseline has no Knowledge Base tools and no outline. Failed rows
          show the first error line from Blender.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-3 rounded-md border border-line bg-panel p-4 font-mono text-xs sm:grid-cols-3">
        <div><dt className="text-ink-faint">model</dt><dd>{MODEL_ID}</dd></div>
        <div><dt className="text-ink-faint">provider (pinned, no fallback)</dt><dd>{PROVIDER || "not set"}</dd></div>
        <div><dt className="text-ink-faint">temperature</dt><dd>{TEMPERATURE}</dd></div>
      </dl>

      {loadError && (
        <p className="rounded-md border border-bad/60 bg-bad/10 p-3 text-sm text-bad">
          Could not load eval runs: {loadError}
        </p>
      )}

      {!loadError && rows.length === 0 && (
        <p className="text-sm text-ink-dim">No eval runs yet. Run <code>yarn eval</code> locally to fill this table.</p>
      )}

      {rows.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs text-ink-dim">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Plain LLM</th>
              <th className="px-3 py-2">bpy-compass</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.testCaseId} className="border-b border-line">
                <td className="px-3 py-2 text-ink-faint">{row.order === Number.MAX_SAFE_INTEGER ? i + 1 : row.order}</td>
                <td className="px-3 py-2">{row.question}</td>
                <td className="px-3 py-2 font-mono text-accent">{row.targetVersion}</td>
                <Cell run={row.baseline} />
                <Cell run={row.compass} />
              </tr>
            ))}
            <tr className="bg-panel font-semibold">
              <td className="px-3 py-2" colSpan={3}>Pass rate</td>
              <td className="px-3 py-2">{passCount("baseline")}/{rows.length}</td>
              <td className="px-3 py-2">{passCount("compass")}/{rows.length}</td>
            </tr>
          </tbody>
        </table>
      )}
    </article>
  );
}
