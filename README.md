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
- Baseline and bpy-compass share model, provider and temperature. The only difference is that
  the baseline has no MCP tools and no Knowledge Base outline.
- Every generated script is executed in headless Blender with `--factory-startup`, followed by
  the test case's assert script. Failures are stored and shown unedited.

## Repository layout

```
app/          page.tsx (chat + version picker) · eval/ · about/ · studio/ · api/chat/route.ts
lib/          model.ts · prompt.ts · context-mcp.ts · sanity.ts · rate-limit.ts · env.ts
sanity/       schemaTypes/ (apiChange, blenderVersion, testCase, evalRun) · seed/*.json
scripts/      eval.ts · seed-api-changes.ts · load-env.ts
kb-sources/   stale/ tutorials uploaded as KB file sources + ATTRIBUTION.md
public/       screenshots used on the About page
```

## Eval results

See `/eval` on the live app. The table is filled from real headless-Blender runs, including
failures, and is copied into the DEV post at publish time.

## License

MIT. The stale tutorials in `kb-sources/stale/` were written for this project; the official
release notes are © Blender Foundation and are read as website sources, not redistributed.
