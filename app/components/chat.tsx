"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, type FormEvent } from "react";
import { SUPPORTED_VERSIONS, type BlenderVersion } from "@/lib/prompt";

const EXAMPLES = [
  "Join two meshes with a boolean union and apply it.",
  "Link a new object to the scene.",
  "Set the emission color on a Principled BSDF node.",
] as const;

const transport = new DefaultChatTransport({ api: "/api/chat" });

function MessageParts({ message }: { message: UIMessage }) {
  return (
    <div className="space-y-2">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <pre key={i} className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {part.text}
            </pre>
          );
        }
        if (part.type.startsWith("tool-")) {
          const input = "input" in part ? JSON.stringify(part.input) : "";
          return (
            <div key={i} className="rounded border border-dashed border-zinc-300 px-2 py-1 font-mono text-xs text-zinc-500">
              {part.type.replace("tool-", "KB → ")} {input}
            </div>
          );
        }
        return null;
      })}
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
  const lastQuestion = [...compass.messages].reverse().find((m) => m.role === "user");

  function ask(text: string) {
    if (!text.trim() || isBusy) return;
    setShowStale(false);
    stale.setMessages([]);
    compass.sendMessage({ text: `Blender ${version} — ${text.trim()}` }, { body: { version, mode: "compass" } });
    setInput("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function revealStale() {
    if (!lastQuestion) return;
    setShowStale(true);
    if (stale.messages.length === 0) {
      const text = lastQuestion.parts.find((p) => p.type === "text")?.text ?? "";
      stale.sendMessage({ text }, { body: { mode: "stale" } });
    }
  }

  return (
    <section className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="version">Blender version</label>
          <select
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value as BlenderVersion)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 font-mono text-sm dark:border-zinc-700"
          >
            {SUPPORTED_VERSIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you want to script in bpy?"
            aria-label="Question"
            className="flex-1 rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isBusy ? "Reading KB…" : "Ask"}
          </button>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button type="button" onClick={() => ask(ex)} className="rounded-full border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </form>

      {compass.error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {compass.error.message}
        </p>
      )}

      <div className={showStale ? "grid gap-4 md:grid-cols-2" : ""}>
        <div className="space-y-4">
          {compass.messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-sm text-zinc-600 dark:text-zinc-400" : "rounded border border-zinc-200 p-4 dark:border-zinc-800"}>
              <MessageParts message={m} />
            </div>
          ))}
        </div>
        {showStale && (
          <aside className="rounded border border-amber-300 bg-amber-50/40 p-4 dark:bg-amber-950/20">
            <h2 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              What a stale tutorial would say
            </h2>
            {stale.messages.filter((m) => m.role === "assistant").map((m) => (
              <MessageParts key={m.id} message={m} />
            ))}
            {(stale.status === "submitted" || stale.status === "streaming") && (
              <p className="text-xs text-zinc-500">Generating…</p>
            )}
          </aside>
        )}
      </div>

      {lastQuestion && !isBusy && !showStale && (
        <button type="button" onClick={revealStale} className="text-sm underline">
          Show what a stale tutorial would say
        </button>
      )}
    </section>
  );
}
