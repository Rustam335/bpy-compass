/**
 * Sanity Context MCP connection (knowledge_base mode).
 *
 * Endpoint: https://api.sanity.io/v1/context/organizations/$ORG_ID/mcp/$MCP_NAME
 * Auth:     Authorization: Bearer $SANITY_ORG_TOKEN  (Context Viewer, server-only)
 *
 * KB-mode tools exposed by the endpoint: `initial_context` and `knowledge_base_read`.
 * Pitfall (PROJECT_BRIEF §4): the dataset must be a source *of the KB*, not of the MCP,
 * otherwise the endpoint serves GROQ tools and ignores the KB.
 *
 * Verified 2026-09-19 against the Sanity docs (docs/CONTEXT-SETUP.md has the links):
 *  - GET `<endpoint>/initial-context` returns the outline as text/plain (markdown).
 *  - `?mode=knowledge_base&knowledgeBases=kb...` overrides the endpoint's stored mode per request.
 *  - `knowledge_base_read` input is `{ knowledgeBase: string, paths: string[] }`, 1–20 paths.
 *  - An endpoint whose sources are all Knowledge Bases serves KB tools with no query params.
 */
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { env } from "./env";

export function contextMcpUrl(): URL {
  const url = new URL(
    `https://api.sanity.io/v1/context/organizations/${env.sanity.orgId()}/mcp/${env.sanity.contextMcpName()}`,
  );
  const kbs = env.sanity.knowledgeBases();
  if (kbs) {
    url.searchParams.set("mode", "knowledge_base");
    url.searchParams.set("knowledgeBases", kbs);
  }
  return url;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.sanity.orgToken()}` };
}

/** Open an MCP client over Streamable HTTP. Caller must `await client.close()` when done. */
export async function connectContextMcp(): Promise<MCPClient> {
  return createMCPClient({
    name: "bpy-compass",
    transport: { type: "http", url: contextMcpUrl().toString(), headers: authHeaders() },
  });
}

/**
 * Fetch the KB outline over plain HTTP so it can be inlined into the system prompt
 * (saves one tool call per answer). Returns an empty string on failure so the agent
 * can still call `initial_context` itself.
 */
export async function fetchInitialContext(): Promise<string> {
  const url = contextMcpUrl();
  url.pathname = `${url.pathname}/initial-context`;
  try {
    const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) {
      console.error(`[context-mcp] initial-context ${res.status} ${res.statusText}`);
      return "";
    }
    return await res.text();
  } catch (err) {
    console.error("[context-mcp] initial-context fetch failed", err);
    return "";
  }
}
