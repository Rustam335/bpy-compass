# bpy-compass

Version-aware answers for Blender Python (`bpy`) scripting, grounded in a
[Sanity Context](https://www.sanity.io/docs/ai/sanity-context) Knowledge Base built from official
release notes. Entry for the **DEV Sanity Challenge, Path One: Ship an Agent That Queries Real
Content**.

A plain LLM answers from a memory that blends every Blender version together. bpy-compass answers
from a Knowledge Base whose conflicts a human has already resolved, cites each entry it read, and
warns when a popular pattern was removed, since which version, and what replaced it.

> **Live app:** https://bpy-compass.vercel.app (no login)
> **Sanity project ID:** `uuc8lnyk` · **Public dataset:** `production` (read without token)
> **Knowledge Base:** `bpy-compass` (`kbMlSqMSn4Q9`) · **MCP endpoint:** `bpy-compass`

Try it: pick **4.2** and **5.0** and ask *"Set the render engine to EEVEE and set the boolean
modifier solver to the fast one."* The two answers differ (`BLENDER_EEVEE_NEXT`/`FAST` vs
`BLENDER_EEVEE`/`FLOAT`), and each one explains why, with citations. A keyword search cannot do that.

## How it works

```
Browser ── Next.js (App Router, Vercel)
              │  /api/chat  (server-only)
              ├── Vercel AI SDK ── OpenRouter ── z-ai/glm-5.3-flash, provider pinned (lib/model.ts)
              └── MCP client ──► Sanity Context MCP (mode: knowledge_base)
                                     └── Knowledge Base "bpy-compass"
                                           ├── dataset source : *[_type=="apiChange"]  (27 curated changes)
                                           ├── website source : release notes 2.80 · 3.6 · 4.0 · 4.1 · 4.2 · 4.4 · 4.5 · 5.0
                                           └── file source    : 4 deliberately stale tutorials (kb-sources/stale)

Local only:
scripts/eval.ts ─► agent + baseline ─► blender -b --python ─► evalRun documents in Sanity ─► /eval
```

Every answer has three blocks: **ANSWER** (script valid for the requested version),
**WATCH OUT** (deprecated patterns with version and replacement, each cited) and **SOURCES**
(Knowledge Base entry paths that were read). If the Knowledge Base does not cover a question, the
agent says so instead of guessing.

### What the Knowledge Base build found

Uploading old-style tutorials next to the official release notes made the build raise **6 Critical
conflicts** (EEVEE identifier, boolean solver names, `calc_normals` removal, ...). Four of them were
facts that are *true for different versions*, so "pick a side" was the wrong tool. They were
resolved with version-scoped picks plus standing Instructions. The before/after screenshots and the
full story are on the live app's [How it works](https://bpy-compass.vercel.app/about) page.

One lesson worth repeating: stale tutorials that carry an "intentionally outdated" banner produce
**zero** conflicts, because the build reads the banner and files them as history. Real stale
tutorials have no banner, so neither do ours (see `kb-sources/stale/ATTRIBUTION.md`).

## Getting started

```bash
yarn install --ignore-engines      # Node 22.16 locally; one transitive dep asks for >=22.20
cp .env.example .env.local         # fill in Sanity + OpenRouter values
yarn dev                           # http://localhost:3000, Studio at /studio
```

| Script | What it does |
|---|---|
| `yarn dev` / `yarn build` | Next.js app |
| `yarn typecheck` | `next typegen && tsc --noEmit` |
| `yarn test` | Unit tests for the prompt, rate limiter, eval CLI parsing, contract checks and run selection |
| `yarn schema:deploy` | Deploy Sanity schema |
| `yarn seed` | Seed `blenderVersion`, `apiChange` and `testCase` from `sanity/seed/*.json` |
| `yarn eval [--dry-run] [--only N]` | Run baseline vs bpy-compass in headless Blender, write `evalRun` docs |

The eval harness needs one local Blender build per target version used by the test cases
(`BLENDER_BIN_36`, `BLENDER_BIN_42`, `BLENDER_BIN_45`, `BLENDER_BIN_50`; portable zips from
download.blender.org work). Each build is checked with `blender --version` before the run, so a
test case targeting 4.2 can only execute in Blender 4.2. Blender does not run on Vercel; the site only displays stored
results on `/eval`.

### Eval rules (so the numbers mean something)

- Exact model ID, one pinned provider (`allow_fallbacks: false`), temperature 0. All three are
  constants in `lib/model.ts` and printed on `/eval`.
- Baseline and bpy-compass share model, provider, temperature, output contract and user prompt.
  The system prompt differs only in the Knowledge Base: the compass gets the KB tools, the KB
  outline and the rules for using them; the baseline is told it has no Knowledge Base
  (`buildBaselinePrompt` in `lib/prompt.ts` is `buildSystemPrompt` with `knowledgeBase: false`).
- Grounding policy: answers are grounded in the Knowledge Base first. Code the KB does not back is
  allowed, but must start with a `# NOT in Knowledge Base:` comment and is never cited as a source.
- Every generated script is executed in headless Blender with `--factory-startup`, followed by
  the test case's assert script. Failures are stored and shown unedited.
- A result passes only if the script ran **and** the answer kept its contract (issue #2):
  WATCH OUT must name every `apiChange` the test case expects (old symbol and replacement,
  keyword match, see `lib/eval-contract.ts`), and SOURCES must list at least one Knowledge Base
  entry and only entries that were actually passed to `knowledge_base_read` in that answer. The
  three verdicts (`blenderPassed`, `watchOutPassed`, `sourcesPassed`) and the failure reasons are
  stored on each `evalRun`; the SOURCES check does not apply to the baseline.
- One exact Blender build per target version (4.2.23 LTS, 4.5.14 LTS, 5.0.1). The harness runs
  `blender --version` for every target before the first LLM call and aborts on a mismatch, and
  each `evalRun` records the build that executed it (issue #1).
- `/eval` shows one run: the newest `runId` that has both contenders for every test case (issues
  #4, #5). Results from different runs are never paired; if no run is complete, the newest one is
  shown flagged as partial, with missing cells marked "not run" and left out of the pass-rate
  denominator. Model, provider and temperature on the page are read from the displayed records,
  and a run mixing configurations is flagged (issue #6).

## Repository layout

```
app/          page.tsx (chat + version picker) · eval/ · about/ · studio/ · api/chat/route.ts
lib/          model.ts · prompt.ts · context-mcp.ts · sanity.ts · rate-limit.ts · env.ts
              eval-contract.ts (WATCH OUT / SOURCES checks) · eval-runs.ts (run selection for /eval)
tests/        node:test suites for the pure helpers (`yarn test`)
sanity/       schemaTypes/ (apiChange, blenderVersion, testCase, evalRun) · seed/*.json
scripts/      eval.ts · seed-api-changes.ts · load-env.ts
kb-sources/   stale/ tutorials uploaded as KB file sources + ATTRIBUTION.md
public/       screenshots used on the About page
```

## Eval results

See `/eval` on the live app. The table is filled from real headless-Blender runs, including
failures, and is copied into the DEV post at publish time. Current run: baseline 11/12,
bpy-compass 12/12, with the 4.2 case executed in Blender 4.2.23 LTS.

## Contributors

- [Rustam335](https://github.com/Rustam335): author.
- [kiky217](https://github.com/kiky217) (KY): independent code review before publication. Filed
  issues #1 to #13, covering the eval harness (exact Blender build per target, contract checks,
  run pairing, `--only`, temp files), the API route (message validation, model-config guard,
  rate limiter) and the grounding policy. Every issue was fixed and is referenced in the commits.

## License

MIT. The stale tutorials in `kb-sources/stale/` were written for this project; the official
release notes are © Blender Foundation and are read as website sources, not redistributed.
