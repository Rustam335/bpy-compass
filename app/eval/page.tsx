import { MODEL_ID, PROVIDER, TEMPERATURE } from "@/lib/model";
import { fetchEvalRuns, type EvalRunDoc } from "@/lib/sanity";

export const revalidate = 300;

type Row = {
  testCaseId: string;
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
      question: run.question,
      targetVersion: run.targetVersion,
    };
    const key = run.contender === "baseline" ? "baseline" : "compass";
    if (!row[key]) rows.set(run.testCaseId, { ...row, [key]: run });
  }
  return [...rows.values()];
}

function Cell({ run }: { run?: EvalRunDoc }) {
  if (!run) return <td className="px-3 py-2 text-zinc-400">—</td>;
  const firstErrorLine = run.stderr?.split("\n").find((l) => l.trim())?.slice(0, 80);
  return (
    <td className="px-3 py-2 align-top">
      <span className={run.passed ? "text-green-600" : "text-red-600"}>
        {run.passed ? "✅ pass" : "❌ fail"}
      </span>
      {!run.passed && firstErrorLine && (
        <div className="mt-1 font-mono text-xs text-zinc-500">{firstErrorLine}</div>
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
        <h1 className="text-2xl font-semibold">Eval: plain LLM vs bpy-compass</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Each generated script was executed in headless Blender locally. Results are stored in
          Sanity and shown here unedited, including failures.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-3">
        <div><dt className="text-zinc-500">model</dt><dd>{MODEL_ID}</dd></div>
        <div><dt className="text-zinc-500">provider (pinned)</dt><dd>{PROVIDER || "not set"}</dd></div>
        <div><dt className="text-zinc-500">temperature</dt><dd>{TEMPERATURE}</dd></div>
      </dl>

      {loadError && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Could not load eval runs: {loadError}
        </p>
      )}

      {!loadError && rows.length === 0 && (
        <p className="text-sm text-zinc-500">No eval runs yet. Run <code>yarn eval</code> locally.</p>
      )}

      {rows.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Plain LLM</th>
              <th className="px-3 py-2">bpy-compass</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.testCaseId} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{row.question}</td>
                <td className="px-3 py-2 font-mono">{row.targetVersion}</td>
                <Cell run={row.baseline} />
                <Cell run={row.compass} />
              </tr>
            ))}
            <tr className="font-semibold">
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
