/**
 * Renders the agent's three-block answer (ANSWER / WATCH OUT / SOURCES) as three panels.
 * Works on partial text while streaming: whatever block has started is shown.
 */

export type ParsedAnswer = {
  heading: string;
  code: string;
  watchOut: string[];
  sources: string[];
  /** Text that did not fit the contract (e.g. "the KB does not cover this"). */
  prose: string;
};

function extractCode(block: string): string {
  const fenced = block.match(/```(?:python|py)?\s*\n([\s\S]*?)(```|$)/);
  if (fenced) return fenced[1].replace(/\s+$/, "");
  const indented = block
    .split("\n")
    .filter((line) => line.startsWith("    ") || line.trim() === "")
    .map((line) => line.slice(4));
  return indented.join("\n").trim();
}

function bullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim())
    .filter((l) => l && l.toLowerCase() !== "none");
}

export function parseAnswer(text: string): ParsedAnswer {
  const answerIdx = text.indexOf("ANSWER");
  if (answerIdx < 0) return { heading: "", code: "", watchOut: [], sources: [], prose: text.trim() };

  const afterAnswer = text.slice(answerIdx);
  const [answerBlock, rest = ""] = afterAnswer.split(/\nWATCH OUT\b/);
  const [watchBlock, sourcesBlock = ""] = rest.split(/\nSOURCES\b/);

  const headingLine = answerBlock.split("\n")[0] ?? "";
  const heading = headingLine.replace(/^ANSWER\s*[—-]?\s*/, "").trim();
  const preface = text.slice(0, answerIdx).trim();

  return {
    heading,
    code: extractCode(answerBlock.split("\n").slice(1).join("\n")),
    watchOut: bullets(watchBlock),
    sources: bullets(sourcesBlock),
    prose: preface,
  };
}

/** Turn `[source: a, b]` suffixes and backtick spans into markup. */
function WatchOutItem({ text }: { text: string }) {
  const m = text.match(/^([\s\S]*?)\s*\[source:\s*([^\]]+)\]\s*$/);
  const body = m ? m[1] : text;
  const sources = m ? m[2].split(",").map((s) => s.trim()) : [];
  const parts = body.split(/(`[^`]+`)/g);
  return (
    <li className="rich">
      {parts.map((p, i) =>
        p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>,
      )}
      {sources.length > 0 && (
        <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
          {sources.map((s) => (
            <span key={s} className="rounded-sm border border-line px-1.5 font-mono text-[11px] text-ink-faint">
              {s}
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

export function AnswerPanels({ text, streaming }: { text: string; streaming: boolean }) {
  const a = parseAnswer(text);
  const nothingYet = !a.code && a.watchOut.length === 0 && a.sources.length === 0 && !a.prose;

  if (nothingYet) {
    return streaming ? null : <p className="text-sm text-ink-dim">The agent returned an empty answer. Ask again.</p>;
  }

  return (
    <div className="space-y-3">
      {a.prose && <p className="rich whitespace-pre-wrap text-sm leading-relaxed">{a.prose}</p>}

      {a.code && (
        <section className="overflow-hidden rounded-md border border-line bg-panel">
          <header className="flex items-center justify-between border-b border-line bg-panel-2 px-3 py-1.5 text-xs">
            <span className="font-semibold">Answer</span>
            {a.heading && <span className="font-mono text-accent">{a.heading}</span>}
          </header>
          <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed">
            <code>
              {a.code.split("\n").map((line, i) =>
                line.includes("NOT in Knowledge Base") ? (
                  <span key={i} className="block bg-warn/10 text-warn">
                    {line}
                  </span>
                ) : (
                  <span key={i} className="block">
                    {line}
                  </span>
                ),
              )}
            </code>
          </pre>
          {a.code.includes("NOT in Knowledge Base") && (
            <p className="border-t border-line bg-warn/5 px-4 py-2 text-xs text-warn">
              Highlighted sections are not backed by a Knowledge Base entry. They come from the model&apos;s
              general knowledge and were not verified against release notes.
            </p>
          )}
        </section>
      )}

      {a.watchOut.length > 0 && (
        <section className="rounded-md border border-line bg-panel">
          <header className="flex items-center gap-2 border-b border-line bg-panel-2 px-3 py-1.5 text-xs font-semibold">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-sm bg-warn" />
            Watch out
          </header>
          <ul className="list-disc space-y-2 px-4 py-3 pl-8 text-sm leading-relaxed">
            {a.watchOut.map((w, i) => (
              <WatchOutItem key={i} text={w} />
            ))}
          </ul>
        </section>
      )}

      {a.sources.length > 0 && (
        <section className="rounded-md border border-line bg-panel">
          <header className="border-b border-line bg-panel-2 px-3 py-1.5 text-xs font-semibold">
            Knowledge Base entries read
          </header>
          <ul className="flex flex-wrap gap-1.5 px-4 py-3">
            {a.sources.map((s) => (
              <li key={s} className="rounded-sm border border-line-strong bg-bg px-2 py-0.5 font-mono text-xs">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
