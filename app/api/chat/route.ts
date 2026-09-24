import { convertToModelMessages, safeValidateUIMessages, stepCountIs, streamText, type ModelMessage, type UIMessage } from "ai";
import { z } from "zod";
import { connectContextMcp, fetchInitialContext } from "@/lib/context-mcp";
import { env } from "@/lib/env";
import {
  assertValidModelConfig,
  createChatModel,
  MAX_OUTPUT_TOKENS,
  MAX_STEPS,
  REASONING_MAX_TOKENS,
  STALE_REASONING_MAX_TOKENS,
  TEMPERATURE,
} from "@/lib/model";
import { buildStalePrompt, buildSystemPrompt, isSupportedVersion, ASK_VERSION_MESSAGE } from "@/lib/prompt";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

const BodySchema = z.object({
  // Shape-checked below with the AI SDK validator; zod only guarantees a non-empty array (issue #8).
  messages: z.array(z.unknown()).min(1),
  version: z.string().optional(),
  /** "compass" = KB-grounded answer (default); "stale" = what an old tutorial would say. */
  mode: z.enum(["compass", "stale"]).default("compass"),
});

function jsonError(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

export async function POST(req: Request): Promise<Response> {
  const limit = checkRateLimit(clientIp(req));
  if (!limit.ok) {
    return jsonError(429, "Too many requests, slow down.", { "Retry-After": String(limit.retryAfterSec) });
  }

  // Same guard as the eval harness: refuse to answer with an unpinned provider or a
  // non-exact model ID instead of silently producing non-reproducible output (issue #9).
  try {
    assertValidModelConfig();
  } catch (err) {
    console.error("[api/chat] invalid model configuration", err);
    return jsonError(503, "The model configuration on the server is invalid.");
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request body.");
  const { version, mode } = parsed.data;

  const messages = await toModelMessages(parsed.data.messages);
  if (!messages) return jsonError(400, "Malformed messages.");

  if (mode === "stale") return streamStale(messages);

  if (!isSupportedVersion(version)) return jsonError(400, ASK_VERSION_MESSAGE);
  return streamCompass(messages, version);
}

/**
 * Validate the UIMessage structure and convert it before any model call, so a malformed
 * body is a 400 instead of a crash inside the stream. Returns null when either step fails.
 */
async function toModelMessages(raw: unknown[]): Promise<ModelMessage[] | null> {
  const validated = await safeValidateUIMessages<UIMessage>({ messages: raw });
  if (!validated.success) {
    console.warn("[api/chat] rejected messages", validated.error.message);
    return null;
  }
  try {
    return await convertToModelMessages(validated.data);
  } catch (err) {
    console.warn("[api/chat] could not convert messages", err instanceof Error ? err.message : err);
    return null;
  }
}

async function streamCompass(messages: ModelMessage[], version: string): Promise<Response> {
  const mcp = await connectContextMcp();
  try {
    const [tools, outline] = await Promise.all([mcp.tools(), fetchInitialContext()]);
    const result = streamText({
      model: createChatModel({ reasoningMaxTokens: REASONING_MAX_TOKENS }),
      system: buildSystemPrompt({ version, outline, knowledgeBaseId: env.sanity.knowledgeBases() || undefined }),
      messages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onEnd: async () => {
        await mcp.close();
      },
      onError: ({ error }) => console.error("[api/chat] stream error", error),
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    await mcp.close();
    console.error("[api/chat] failed before streaming", err);
    return jsonError(502, "Knowledge Base is unavailable right now.");
  }
}

async function streamStale(messages: ModelMessage[]): Promise<Response> {
  const result = streamText({
    model: createChatModel({ reasoningMaxTokens: STALE_REASONING_MAX_TOKENS }),
    system: buildStalePrompt(),
    messages,
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    onError: ({ error }) => console.error("[api/chat:stale] stream error", error),
  });
  return result.toUIMessageStreamResponse();
}
