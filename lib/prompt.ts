/**
 * System prompt and output format for bpy-compass.
 * Output contract (PROJECT_BRIEF §3.1): always three blocks — ANSWER, WATCH OUT, SOURCES.
 *
 * Grounding policy (issue #11): explicit mixed grounding. Every answer is grounded in the
 * Knowledge Base first; any code the KB does not back is allowed but must be marked with a
 * `# NOT in Knowledge Base:` comment line, and is never cited as if it were from the KB.
 *
 * Baseline vs bpy-compass (issue #3): both contenders get the same identity, version line,
 * output contract and user prompt. The only difference is the Knowledge Base: the compass
 * gets the KB tools, the outline and the rules that describe how to use them; the baseline is
 * told it has none and answers from its own knowledge.
 */

export const SUPPORTED_VERSIONS = ["3.6", "4.2", "4.5", "5.0"] as const;
export type BlenderVersion = (typeof SUPPORTED_VERSIONS)[number];

export function isSupportedVersion(v: unknown): v is BlenderVersion {
  return typeof v === "string" && (SUPPORTED_VERSIONS as readonly string[]).includes(v);
}

export const ASK_VERSION_MESSAGE =
  "Which Blender version are you targeting? (3.6 LTS, 4.2 LTS, 4.5 LTS or 5.0)";

/** Marker a code section must start with when the Knowledge Base does not back it. */
export const NOT_IN_KB_MARKER = "# NOT in Knowledge Base:";

export const OUTPUT_FORMAT = `
Respond in exactly this structure and nothing else:

ANSWER — valid for Blender <version>

    <python script, indented 4 spaces; sections not backed by the Knowledge Base start with the comment line '${NOT_IN_KB_MARKER} <what>'>

WATCH OUT
- <one bullet per deprecated/removed pattern: what, removed/changed in which version, replacement>  [source: <KB entry path, or "memory" when no entry was read>]
(write "- none" if there is nothing to warn about)

SOURCES
- <KB entry path exactly as read>
(write "- none" if no Knowledge Base entry was read)
`.trim();

const KNOWLEDGE_BASE_RULES = [
  "1. Ground the answer in the Knowledge Base: call knowledge_base_read (arguments: knowledgeBase id, paths copied verbatim from the outline, max 20) before answering, and prefer what you read over what you remember.",
  "2. Cite the KB entry path for every claim in WATCH OUT and list every path you read under SOURCES.",
  "3. If the Knowledge Base does not cover the question, say so plainly. Never invent APIs.",
  `   If it covers only part of the question, you may still write the rest from general knowledge, but every code section that is not backed by an entry you read MUST begin with its own comment line \`${NOT_IN_KB_MARKER} <what>\` placed INSIDE the indented script, directly above that section (never as a block after the script), and must not be cited in WATCH OUT as if it were.`,
  "4. When sources disagree, official release notes are ground truth; mention the old form and the version it stopped working in.",
];

const NO_KNOWLEDGE_BASE_RULES = [
  "1. No Knowledge Base tools are available in this session. Answer from your own knowledge of the Blender Python API. Never invent APIs.",
  "2. In WATCH OUT, name what changed and in which version, with [source: memory]. Write \"- none\" under SOURCES, since no Knowledge Base entry was read.",
  "3. Official release notes are ground truth; mention the old form and the version it stopped working in.",
];

export interface SystemPromptOptions {
  version: string;
  outline?: string;
  knowledgeBaseId?: string;
  /** false = baseline contender: same contract, no Knowledge Base. Default true. */
  knowledgeBase?: boolean;
}

export function buildSystemPrompt(opts: SystemPromptOptions): string {
  const { version, outline, knowledgeBaseId, knowledgeBase = true } = opts;
  const rules = knowledgeBase ? KNOWLEDGE_BASE_RULES : NO_KNOWLEDGE_BASE_RULES;
  return [
    "You are bpy-compass, a version-aware assistant for Blender Python (bpy) scripting.",
    `The user targets Blender ${version}. Every API you emit must be valid in that exact version.`,
    "",
    "Ground rules:",
    ...rules,
    "",
    OUTPUT_FORMAT,
    knowledgeBase && knowledgeBaseId ? `\nKnowledge Base id for knowledge_base_read: ${knowledgeBaseId}` : "",
    knowledgeBase && outline
      ? `\nKnowledge Base outline (copy paths verbatim when calling knowledge_base_read):\n${outline}`
      : "",
  ].join("\n");
}

/** Baseline: identical prompt minus the Knowledge Base. Used by scripts/eval.ts only. */
export function buildBaselinePrompt(version: string): string {
  return buildSystemPrompt({ version, knowledgeBase: false });
}

/** User message as the chat UI sends it, so eval and production ask the same way. */
export function buildUserPrompt(version: string, question: string): string {
  return `Blender ${version} — ${question}`;
}

/** Prompt for the "Show what a stale tutorial would say" side panel. */
export function buildStalePrompt(): string {
  return [
    "You are quoting a typical Blender 2.7x-era tutorial from memory, for a side-by-side comparison.",
    "Write the script exactly the way old tutorials did: scene.objects.link, obj.select = True, scene.objects.active, matrix * vector, override dicts passed to bpy.ops, 'BLENDER_EEVEE', solver 'FAST', mesh.use_auto_smooth.",
    "Start writing the code immediately. Return only one fenced python code block, under 40 lines, with short comments. Do not correct, modernize, warn or explain.",
  ].join("\n");
}
