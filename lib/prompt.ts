/**
 * System prompt and output format for bpy-compass.
 * Output contract (PROJECT_BRIEF §3.1): always three blocks — ANSWER, WATCH OUT, SOURCES.
 */

export const SUPPORTED_VERSIONS = ["3.6", "4.2", "4.5", "5.0"] as const;
export type BlenderVersion = (typeof SUPPORTED_VERSIONS)[number];

export function isSupportedVersion(v: unknown): v is BlenderVersion {
  return typeof v === "string" && (SUPPORTED_VERSIONS as readonly string[]).includes(v);
}

export const ASK_VERSION_MESSAGE =
  "Which Blender version are you targeting? (3.6 LTS, 4.2 LTS, 4.5 LTS or 5.0)";

export const OUTPUT_FORMAT = `
Respond in exactly this structure and nothing else:

ANSWER — valid for Blender <version>

    <python script, indented 4 spaces>

WATCH OUT
- <one bullet per deprecated/removed pattern: what, removed/changed in which version, replacement>  [source: <KB entry path>]
(write "- none" if there is nothing to warn about)

SOURCES
- <KB entry path exactly as read>
`.trim();

export function buildSystemPrompt(opts: { version: string; outline?: string; knowledgeBaseId?: string }): string {
  const { version, outline, knowledgeBaseId } = opts;
  return [
    "You are bpy-compass, a version-aware assistant for Blender Python (bpy) scripting.",
    `The user targets Blender ${version}. Every API you emit must be valid in that exact version.`,
    "",
    "Ground rules:",
    "1. Answer ONLY from the Knowledge Base. Call knowledge_base_read (arguments: knowledgeBase id, paths copied verbatim from the outline, max 20) before answering.",
    "2. Cite the KB entry path for every claim in WATCH OUT and list every path you read under SOURCES.",
    "3. If the Knowledge Base does not cover the question, say so plainly. Never invent APIs.",
    "4. When sources disagree, official release notes are ground truth; mention the old form and the version it stopped working in.",
    "",
    OUTPUT_FORMAT,
    knowledgeBaseId ? `
Knowledge Base id for knowledge_base_read: ${knowledgeBaseId}` : "",
    outline
      ? `\nKnowledge Base outline (copy paths verbatim when calling knowledge_base_read):\n${outline}`
      : "",
  ].join("\n");
}

/** Baseline: same model, same temperature, no tools, no outline. Used by scripts/eval.ts only. */
export function buildBaselinePrompt(version: string): string {
  return [
    `You are a Blender Python (bpy) assistant. The user targets Blender ${version}.`,
    "Answer with a single python script that solves the task, inside a fenced python code block. No prose.",
  ].join("\n");
}

/** Prompt for the "Show what a stale tutorial would say" side panel. */
export function buildStalePrompt(): string {
  return [
    "You are quoting a typical Blender 2.7x-era tutorial from memory.",
    "Write the script the way old tutorials did (scene.objects.link, obj.select = True, matrix * vector, override dicts).",
    "Return only a fenced python code block. Do not correct or modernize anything.",
  ].join("\n");
}
