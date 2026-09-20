/** Server-only environment access with fail-fast validation. Never import from client components. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  sanity: {
    projectId: () => required("SANITY_PROJECT_ID"),
    dataset: () => process.env.SANITY_DATASET ?? "production",
    /** Only for scripts/eval.ts and scripts/seed-api-changes.ts. */
    writeToken: () => required("SANITY_WRITE_TOKEN"),
    orgId: () => required("SANITY_ORG_ID"),
    /** Organization token with "Context Viewer" permission. Server-only. */
    orgToken: () => required("SANITY_ORG_TOKEN"),
    contextMcpName: () => required("SANITY_CONTEXT_MCP_NAME"),
    /** Optional: comma-separated KB ids when using ?mode=knowledge_base explicitly. */
    knowledgeBases: () => process.env.SANITY_KNOWLEDGE_BASES ?? "",
  },
  openrouter: {
    apiKey: () => required("OPENROUTER_API_KEY"),
  },
  blender: {
    /**
     * Exact Blender build per supported target version, e.g. "4.2" -> BLENDER_BIN_42.
     * scripts/eval.ts refuses to run a test case in any other build (see #1).
     */
    binFor: (targetVersion: string) => {
      const name = `BLENDER_BIN_${targetVersion.replace(".", "")}`;
      return { name, path: process.env[name] ?? "" };
    },
  },
};
