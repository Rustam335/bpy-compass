import { failureReason, passRate, provenance, selectRun, type EvalRow, type SelectedRun } from "@/lib/eval-runs";
import { fetchEvalRuns, fetchTestCases, type EvalRunDoc } from "@/lib/sanity";

export const revalidate = 300;

function Cell({ run }: { run?: EvalRunDoc }) {
  if (!run) return <td className="px-3 py-2 text-ink-faint">not run</td>;
  const reason = failureReason(run);
  return (
    <td className="px-3 py-2 align-top">
      <span className={run.passed ? "text-green-600" : "text-red-600"}>
        {run.passed ? "✅ pass" : "❌ fail"}
      </span>
      {!run.passed && reason && (
        <div className="mt-1 font-mono text-xs text-ink-faint">{reason.slice(0, 120)}</div>
      )}
    </td>
  );
}

function PassRateCell({ rows, contender }: { rows: EvalRow[]; contender: EvalRunDoc["contender"] }) {
  const r = passRate(rows, contender);
  return (
    <td className="px-3 py-2">
      {r.passed}/{r.available}
      {r.missing > 0 && <span className="ml-1 font-normal text-ink-faint">({r.missing} not run)</span>}
    </td>
  );
}

function list(values: string[], fallback = "—"): string {
  return values.length ? values.join(", ") : fallback;
}

export default async function EvalPage() {
  let selected: SelectedRun | null = null;
  let loadError: string | null = null;
  try {
    const [runs, testCases] = await Promise.all([fetchEvalRuns(), fetchTestCases()]);
    selected = selectRun(runs, testCases.map((tc) => ({ _id: tc._id, order: tc.order, question: tc.question, targetVersion: tc.targetVersion })));
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load eval runs";
  }

  const rows = selected?.rows ?? [];
  const meta = provenance(rows);

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Eval: plain LLM vs bpy-compass</h1>
        <p className="mt-3 max-w-3xl text-ink-dim">
          A row passes only when the generated script runs in headless Blender, in the exact build
          matching the test case&apos;s target version ({list(meta.builds, "one build per version")}),
          with a factory startup file and the test case&apos;s assert script, <em>and</em> the answer
          keeps its contract: WATCH OUT names every API change the test case expects, and SOURCES
          lists only Knowledge Base entries the agent actually read. Results are stored in Sanity
          and shown here unedited, including failures. Both contenders get the same model, settings,
          output contract and user prompt; the only difference is that the baseline has no Knowledge
          Base (no tools, no outline, no KB rules). Failed rows show the first failure reason.
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-3 rounded-md border border-line bg-panel p-4 font-mono text-xs sm:grid-cols-4">
        <div><dt className="text-ink-faint">model</dt><dd>{list(meta.models)}</dd></div>
        <div><dt className="text-ink-faint">provider (pinned, no fallback)</dt><dd>{list(meta.providers)}</dd></div>
        <div><dt className="text-ink-faint">temperature</dt><dd>{list(meta.temperatures)}</dd></div>
        <div>
          <dt className="text-ink-faint">run</dt>
          <dd>{selected ? `${selected.runId}${selected.complete ? "" : " (partial)"}` : "—"}</dd>
        </div>
      </dl>
      <p className="text-xs text-ink-faint">
        Provenance is read from the displayed run records, never from the server&apos;s current configuration.
        {meta.mixed && <strong className="ml-1 text-bad">This run mixes more than one model, provider or temperature.</strong>}
        {selected && !selected.complete && (
          <span className="ml-1">No run covers every test case with both contenders yet; showing the newest run, missing cells are marked &ldquo;not run&rdquo;.</span>
        )}
      </p>

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
                <td className="px-3 py-2 text-ink-faint">{row.order ?? i + 1}</td>
                <td className="px-3 py-2">{row.question}</td>
                <td className="px-3 py-2 font-mono text-accent">{row.targetVersion}</td>
                <Cell run={row.baseline} />
                <Cell run={row.compass} />
              </tr>
            ))}
            <tr className="bg-panel font-semibold">
              <td className="px-3 py-2" colSpan={3}>Pass rate (of results available)</td>
              <PassRateCell rows={rows} contender="baseline" />
              <PassRateCell rows={rows} contender="bpy-compass" />
            </tr>
          </tbody>
        </table>
      )}
    </article>
  );
}
