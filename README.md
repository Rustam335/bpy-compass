# bpy-compass

Version-aware answers for Blender Python (`bpy`) scripting, grounded in a
[Sanity Context](https://www.sanity.io/docs/context) Knowledge Base built from official release
notes. Entry for the **DEV Sanity Challenge, Path One: Ship an Agent That Queries Real Content**.

A plain LLM answers from a memory that blends every Blender version together. bpy-compass answers
from a Knowledge Base whose conflicts a human has already resolved, cites each entry it read, and
warns when a popular pattern was removed, since which version, and what replaced it.

> **Sanity project ID:** _TODO_ · **Public dataset:** `production` · **Live app:** _TODO_

## How it works

```
Browser ── Next.js (App Router, Vercel)
              │  /api/chat  (server-only)
              ├── Vercel AI SDK ── OpenRouter ── pinned model + provider (lib/model.ts)
              └── MCP client ──► Sanity Context MCP (mode: knowledge_base)
                                     └── Knowledge Base "bpy-compass"
                                           ├── dataset source : *[_type=="apiChange"]
                                           ├── website source : official release notes / API docs
                                           └── file source    : deliberately stale tutorials

Local only:
scripts/eval.ts ─► agent + baseline ─► blender -b --python ─► evalRun documents in Sanity
```

Every answer has three blocks: **ANSWER** (script valid for the requested version),
**WATCH OUT** (deprecated patterns with version and replacement, each cited) and **SOURCES**
(Knowledge Base entry paths that were read).

## Getting started

```bash
yarn install --ignore-engines      # Node 22.16 locally; one transitive dep asks for >=22.20
cp .env.example .env.local         # fill in Sanity + OpenRouter values
yarn dev                           # http://localhost:3000, Studio at /studio
```

| Script | What it does |
|---|---|
| `yarn dev` / `yarn build` | Next.js app |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn schema:deploy` | Deploy Sanity schema |
| `yarn seed` | Seed `blenderVersion` + `apiChange` from `sanity/seed/*.json` |
| `yarn eval [--dry-run] [--only N]` | Run baseline vs bpy-compass in headless Blender, write `evalRun` docs |

The eval harness needs local Blender builds (`BLENDER_BIN_45`, `BLENDER_BIN_50`). Blender does not
run on Vercel; the site only displays stored results on `/eval`.

## Repository layout

```
app/          page.tsx (chat + version picker) · eval/ · about/ · studio/ · api/chat/route.ts
lib/          model.ts · prompt.ts · context-mcp.ts · sanity.ts · rate-limit.ts · env.ts
sanity/       schemaTypes/ (apiChange, blenderVersion, testCase, evalRun) · seed/
scripts/      eval.ts · seed-api-changes.ts
kb-sources/   stale/ tutorials uploaded as KB file sources + ATTRIBUTION.md
```

## Eval results

_Filled from real runs before publishing. See `/eval`._

## License

MIT
