"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, type FormEvent } from "react";
import { buildUserPrompt, SUPPORTED_VERSIONS, type BlenderVersion } from "@/lib/prompt";
import { AnswerPanels } from "./answer";

const EXAMPLES = [
  "Join two meshes with a boolean union and apply it.",
  "Set the render engine to EEVEE and the boolean solver to the fast one.",
  "Set the emission color on a Principled BSDF node.",
  "Export the selected objects to OBJ.",
] as const;

const VERSION_NOTE: Record<BlenderVersion, string> = {
  "3.6": "LTS, last of the 3.x line",
  "4.2": "LTS, EEVEE Next arrives",
  "4.5": "LTS, current long-term release",
  "5.0": "EEVEE id and solver names change again",
};

const transport = new DefaultChatTransport({ api: "/api/chat" });

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function toolReads(message: UIMessage): string[] {
  const paths: string[] = [];
  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const input = "input" in part ? (part.input as { paths?: string[] } | undefined) : undefined;
    if (input?.paths) paths.push(...input.paths);
  }
  return paths;
}

function VersionRail({
  value,
  onChange,
  disabled,
}: {
  value: BlenderVersion;
  onChange: (v: BlenderVersion) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs text-ink-dim">Blender version the script must run on</legend>
      <div role="radiogroup" className="inline-flex overflow-hidden rounded-md border border-line-strong bg-panel">
        {SUPPORTED_VERSIONS.map((v) => {
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(v)}
              className={
                "px-4 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed " +
                (active
                  ? "bg-accent font-semibold text-accent-ink"
                  : "text-ink-dim hover:bg-panel-2 hover:text-ink")
              }
            >
              {v}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-faint">{VERSION_NOTE[value]}</p>
    </fieldset>
  );
}

function ReadingIndicator({ paths }: { paths: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-dim" aria-live="polite">
      <span className="inline-flex gap-1" aria-hidden="true">
        <span className="busy-dot h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="busy-dot h-1.5 w-1.5 rounded-full bg-accent [animation-delay:200ms]" />
        <span className="busy-dot h-1.5 w-1.5 rounded-full bg-accent [animation-delay:400ms]" />
      </span>
      {paths.length === 0 ? (
        <span>Choosing Knowledge Base entries</span>
      ) : (
        <>
          <span>Reading</span>
          {paths.map((p) => (
            <code key={p} className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px]">
              {p}
            </code>
          ))}
        </>
      )}
    </div>
  );
}

export function Chat() {
  const [version, setVersion] = useState<BlenderVersion>("4.5");
  const [input, setInput] = useState("");
  const [showStale, setShowStale] = useState(false);

  const compass = useChat({ id: "compass", transport });
  const stale = useChat({ id: "stale", transport });

  const isBusy = compass.status === "submitted" || compass.status === "streaming";
  const lastUser = [...compass.messages].reverse().find((m) => m.role === "user");
  const lastAssistant = [...compass.messages].reverse().find((m) => m.role === "assistant");
  const staleAnswer = [...stale.messages].reverse().find((m) => m.role === "assistant");
  const staleBusy = stale.status === "submitted" || stale.status === "streaming";

  function ask(text: string) {
    const q = text.trim();
    if (!q || isBusy) return;
    setShowStale(false);
    stale.setMessages([]);
    compass.setMessages([]);
    compass.sendMessage({ text: buildUserPrompt(version, q) }, { body: { version, mode: "compass" } });
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function revealStale() {
    if (!lastUser || staleBusy) return;
    setShowStale(true);
    if (!staleAnswer) {
      stale.setMessages([]);
      stale.sendMessage({ text: textOf(lastUser) }, { body: { mode: "stale" } });
    }
  }

  const answerText = lastAssistant ? textOf(lastAssistant) : "";
  const reads = lastAssistant ? toolReads(lastAssistant) : [];

  return (
    <section className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-panel p-4 sm:p-5">
        <VersionRail value={version} onChange={setVersion} disabled={isBusy} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you want to script? e.g. link a new object to the scene"
            aria-label="Your bpy question"
            className="min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-3 py-2.5 text-sm placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            {isBusy ? "Reading…" : `Ask for ${version}`}
          </button>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => ask(ex)}
                className="rounded-full border border-line px-3 py-1 text-ink-dim hover:border-line-strong hover:text-ink disabled:opacity-40"
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </form>

      {compass.error && (
        <div role="alert" className="rounded-md border border-bad/60 bg-bad/10 p-4 text-sm">
          <p className="font-semibold text-bad">The answer could not be generated.</p>
          <p className="mt-1 text-ink-dim">
            {compass.error.message.includes("429")
              ? "Too many questions in one minute from this address. Wait a moment and ask again."
              : "The Knowledge Base or the model did not respond. Ask again; if it keeps failing, the service is down."}
          </p>
        </div>
      )}

      {!lastUser && !compass.error && (
        <div className="rounded-lg border border-dashed border-line px-5 py-8 text-sm text-ink-dim">
          <p>
            Pick the version you are scripting for, then ask. Every answer comes back as a script
            valid for that version, a list of patterns that stopped working and when, and the
            Knowledge Base entries it was read from.
          </p>
          <p className="mt-3 text-ink-faint">
            Try the same question on 4.2 and 5.0 to see the answer change.
          </p>
        </div>
      )}

      {lastUser && (
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            <span className="text-ink-faint">You asked: </span>
            {textOf(lastUser)}
          </p>

          {isBusy && !answerText && <ReadingIndicator paths={reads} />}

          <div className={showStale ? "grid gap-4 lg:grid-cols-2" : ""}>
            {answerText && <AnswerPanels text={answerText} streaming={isBusy} />}

            {showStale && (
              <aside className="rounded-md border border-warn/50 bg-warn/5">
                <header className="border-b border-warn/40 px-3 py-1.5 text-xs font-semibold text-warn">
                  What a stale tutorial would say
                </header>
                <div className="px-4 py-3">
                  {staleAnswer ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[13px] leading-relaxed">
                      {textOf(staleAnswer).replace(/```(?:python)?\n?/g, "")}
                    </pre>
                  ) : staleBusy ? (
                    <p className="text-xs text-ink-dim">Recalling the 2.7x-era way…</p>
                  ) : stale.error ? (
                    <p className="text-xs text-bad">
                      The comparison could not be generated ({stale.error.message.includes("429") ? "rate limit" : "model error"}).
                      Click the button again.
                    </p>
                  ) : (
                    <p className="text-xs text-ink-dim">The model returned nothing this time. Click the button again.</p>
                  )}
                  <p className="mt-3 text-xs text-ink-faint">
                    Generated from the model&apos;s memory on purpose, without the Knowledge Base. Compare
                    it with the Watch out list on the left.
                  </p>
                </div>
              </aside>
            )}
          </div>

          {!isBusy && answerText && (!showStale || (!staleBusy && !staleAnswer)) && (
            <button
              type="button"
              onClick={revealStale}
              className="text-sm text-ink-dim underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              Show what a stale tutorial would say
            </button>
          )}
        </div>
      )}
    </section>
  );
}
