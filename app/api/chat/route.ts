import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
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
  messages: z.array(z.custom<UIMessage>()).min(1),
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
  const { messages, version, mode } = parsed.data;

  if (mode === "stale") return streamStale(messages);

  if (!isSupportedVersion(version)) return jsonError(400, ASK_VERSION_MESSAGE);
  return streamCompass(messages, version);
}

async function streamCompass(messages: UIMessage[], version: string): Promise<Response> {
  const mcp = await connectContextMcp();
  try {
    const [tools, outline] = await Promise.all([mcp.tools(), fetchInitialContext()]);
    const result = streamText({
      model: createChatModel({ reasoningMaxTokens: REASONING_MAX_TOKENS }),
      system: buildSystemPrompt({ version, outline, knowledgeBaseId: env.sanity.knowledgeBases() || undefined }),
      messages: await convertToModelMessages(messages),
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

async function streamStale(messages: UIMessage[]): Promise<Response> {
  const result = streamText({
    model: createChatModel({ reasoningMaxTokens: STALE_REASONING_MAX_TOKENS }),
    system: buildStalePrompt(),
    messages: await convertToModelMessages(messages),
    temperature: TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    onError: ({ error }) => console.error("[api/chat:stale] stream error", error),
  });
  return result.toUIMessageStreamResponse();
}
