import Image from "next/image";
import Link from "next/link";
import { NOT_IN_KB_MARKER } from "@/lib/prompt";

const SANITY_PROJECT_ID = "uuc8lnyk";
const DATASET = "production";
const KB_ID = "kbMlSqMSn4Q9";
const DATASET_QUERY_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2025-01-01/data/query/${DATASET}?query=*%5B_type%3D%3D%22apiChange%22%5D%7Bsymbol%2Ckind%2Creplacement%2C%22version%22%3AchangedIn-%3Eversion%7D`;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold tracking-tight">{children}</h2>;
}

export default function AboutPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">How bpy-compass works</h1>
      <p className="mt-3 text-ink-dim">
        The Blender Python API changes in every major release, and the internet is full of tutorials
        that no longer run. A plain LLM answers from a memory that blends every version together.
        bpy-compass answers from a Knowledge Base whose conflicts a human has already resolved.
      </p>

      <dl className="mt-6 grid gap-x-6 gap-y-2 rounded-md border border-line bg-panel p-4 font-mono text-xs sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-faint">Sanity project</dt>
        <dd>
          {SANITY_PROJECT_ID} · dataset {DATASET} ·{" "}
          <a href={DATASET_QUERY_URL} className="underline hover:text-accent">
            query it without a token
          </a>
        </dd>
        <dt className="text-ink-faint">Knowledge Base</dt>
        <dd>bpy-compass ({KB_ID}), served by Context MCP endpoint bpy-compass</dd>
        <dt className="text-ink-faint">Model</dt>
        <dd>z-ai/glm-5.3-flash via OpenRouter, provider novita, temperature 0</dd>
        <dt className="text-ink-faint">Code</dt>
        <dd>
          <a href="https://github.com/Rustam335/bpy-compass" className="underline hover:text-accent">
            github.com/Rustam335/bpy-compass
          </a>
        </dd>
      </dl>

      <H2>Pipeline</H2>
      <pre className="overflow-x-auto rounded-md border border-line bg-panel p-4 text-xs leading-relaxed">
{`Browser ── Next.js (App Router, Vercel)
              │  /api/chat  (server-only)
              ├── Vercel AI SDK ── OpenRouter ── pinned model + provider
              └── MCP client ──► Sanity Context MCP (mode: knowledge_base)
                                     └── Knowledge Base "bpy-compass"
                                           ├── dataset source : *[_type=="apiChange"]  (27 curated changes)
                                           ├── website source : release notes 2.80 · 3.6 · 4.0 · 4.1 · 4.2 · 4.4 · 4.5 · 5.0
                                           └── file source    : 4 deliberately stale tutorials

Local only:
scripts/eval.ts ─► agent + baseline ─► blender -b --python ─► evalRun documents in Sanity ─► /eval`}
      </pre>
      <p className="mt-3 text-sm text-ink-dim">
        The agent gets two tools from the endpoint: the Knowledge Base outline and{" "}
        <code className="rounded-sm border border-line bg-panel px-1">knowledge_base_read</code>. The
        outline is inlined into the system prompt, so a typical answer costs one read call.
      </p>

      <H2>Why structured content matters</H2>
      <p className="text-sm leading-relaxed">
        Every <code className="rounded-sm border border-line bg-panel px-1">apiChange</code> document
        records a symbol, the version it changed in, the kind of change and its replacement. That
        structure is what lets the agent say &ldquo;removed in 4.0, use{" "}
        <code className="rounded-sm border border-line bg-panel px-1">context.temp_override()</code>&rdquo;
        instead of guessing, and it is why the same question gets a different script on 4.2 and 5.0.
      </p>

      <H2>What the Knowledge Base build found</H2>
      <p className="text-sm leading-relaxed">
        Old-style tutorials were uploaded next to the official release notes on purpose. The build
        raised six critical conflicts. Four of them were facts that are true for different versions
        (the EEVEE identifier, the boolean solver names), so picking one side would have made the
        Knowledge Base wrong for the other version. They were resolved with version-scoped picks and
        three standing Instructions.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <figure>
          <Image
            src="/screenshots/issues-before-list-build3.jpg"
            alt="Sanity Context Issues tab listing six pending conflicts"
            width={1118}
            height={1092}
            className="rounded-md border border-line"
          />
          <figcaption className="mt-1.5 text-xs text-ink-faint">Issues tab after build 3: six pending conflicts.</figcaption>
        </figure>
        <figure>
          <Image
            src="/screenshots/issues-after-resolved.jpg"
            alt="Sanity Context Issues tab with all six conflicts resolved"
            width={1118}
            height={1092}
            className="rounded-md border border-line"
          />
          <figcaption className="mt-1.5 text-xs text-ink-faint">The same tab after resolving each conflict.</figcaption>
        </figure>
      </div>
      <figure className="mt-4">
        <Image
          src="/screenshots/entry-boolean-solvers-final.jpg"
          alt="Rebuilt Knowledge Base entry showing boolean solver identifiers by Blender version"
          width={1092}
          height={1114}
          className="rounded-md border border-line"
        />
        <figcaption className="mt-1.5 text-xs text-ink-faint">
          The rebuilt entry: solver values per version range, with the old form kept and labeled.
        </figcaption>
      </figure>
      <p className="mt-4 text-sm text-ink-dim">
        One lesson: tutorials that carry an &ldquo;intentionally outdated&rdquo; banner produce zero
        conflicts, because the build reads the banner and files them as history. Real stale tutorials
        have no banner, so neither do ours.
      </p>

      <H2>Honesty rules</H2>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>Every answer lists the Knowledge Base entries it read.</li>
        <li>
          If the Knowledge Base does not cover a question, the agent says so. When it covers only part
          of it, the rest may come from the model&apos;s own knowledge, but every such code section is
          marked <code>{NOT_IN_KB_MARKER}</code> inside the script and is never cited as a source.
        </li>
        <li>
          <Link href="/eval" className="underline hover:text-accent">
            Eval results
          </Link>{" "}
          come from real headless-Blender runs and are shown as they ran, including failures. Baseline
          and bpy-compass share the same model, provider, temperature, system prompt and user prompt;
          the only difference is that the baseline has no Knowledge Base.
        </li>
      </ul>
    </article>
  );
}
