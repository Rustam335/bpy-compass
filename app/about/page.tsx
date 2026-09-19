export default function AboutPage() {
  return (
    <article className="prose prose-zinc max-w-none dark:prose-invert">
      <h1>How bpy-compass works</h1>
      <p>
        The Blender Python API changes in every major release, and the internet is full of tutorials
        that no longer run. A plain LLM answers from a memory that blends every version together.
        bpy-compass answers from a Knowledge Base whose conflicts a human has already resolved.
      </p>

      <h2>Pipeline</h2>
      <pre>
{`Browser ── Next.js (App Router, Vercel)
              │  /api/chat  (server-only)
              ├── Vercel AI SDK ── OpenRouter ── pinned model + provider
              └── MCP client ──► Sanity Context MCP (mode: knowledge_base)
                                     └── Knowledge Base "bpy-compass"
                                           ├── dataset source : *[_type=="apiChange"]
                                           ├── website source : official release notes / API docs
                                           └── file source    : deliberately stale tutorials

Local only:
scripts/eval.ts ─► agent + baseline ─► blender -b --python ─► evalRun documents in Sanity`}
      </pre>

      <h2>Why structured content matters</h2>
      <p>
        Every <code>apiChange</code> document records a symbol, the version it changed in, the kind of
        change and its replacement. That structure is what lets the agent say &ldquo;removed in 4.0,
        use <code>context.temp_override()</code>&rdquo; instead of guessing.
      </p>

      <h2>Honesty rules</h2>
      <ul>
        <li>Every answer lists the Knowledge Base entries it read.</li>
        <li>If the Knowledge Base does not cover a question, the agent says so.</li>
        <li>Eval results are shown as they ran, including failures.</li>
      </ul>

      {/* TODO: Sanity project ID + public dataset link, KB Issues screenshots before/after. */}
    </article>
  );
}
