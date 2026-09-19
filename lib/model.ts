/**
 * Single source of truth for the LLM configuration.
 * Displayed on /eval and quoted in the DEV post. Do not scatter these constants.
 *
 * Rules (PROJECT_BRIEF §8):
 *  - exact model ID only (no `openrouter/auto`, `:free`, `~...latest`)
 *  - provider pinned, fallbacks off
 *  - baseline and bpy-compass share model, provider and temperature
 */

const FORBIDDEN_MODEL_PATTERNS = [
  /^openrouter\/auto$/,
  /^openrouter\/free$/,
  /:free$/,
  /^~/,
  /latest$/,
];

export const MODEL_ID: string = process.env.OPENROUTER_MODEL ?? "z-ai/glm-5.3-flash";
export const PROVIDER: string = process.env.OPENROUTER_PROVIDER ?? "";
export const TEMPERATURE = 0;

/** Max tool-loop steps for one answer (cost guard). */
export const MAX_STEPS = 5;
/** Max output tokens per answer (cost guard). Reasoning tokens count against this budget. */
export const MAX_OUTPUT_TOKENS = 4096;
/** Cap on reasoning tokens so the answer text always has room (the pinned provider cannot disable reasoning). */
export const REASONING_MAX_TOKENS = 2048;
/** Stale mode is pure recall; a small cap keeps it fast. */
export const STALE_REASONING_MAX_TOKENS = 512;

export type Contender = "baseline" | "bpy-compass";

export function assertValidModelConfig(): void {
  if (FORBIDDEN_MODEL_PATTERNS.some((re) => re.test(MODEL_ID))) {
    throw new Error(
      `OPENROUTER_MODEL "${MODEL_ID}" is not an exact model ID. See PROJECT_BRIEF §8.`,
    );
  }
  if (!PROVIDER) {
    throw new Error(
      "OPENROUTER_PROVIDER is empty. Pin one provider so eval results are reproducible.",
    );
  }
}

/** OpenRouter provider-routing block: pin to one provider, no fallbacks. */
export function openRouterRouting() {
  return {
    provider: {
      order: [PROVIDER],
      allow_fallbacks: false,
    },
  };
}
