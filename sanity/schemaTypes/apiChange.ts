import { defineField, defineType } from "sanity";

export const API_CHANGE_KINDS = ["removed", "renamed", "behavior", "added"] as const;
export const API_AREAS = ["python-api", "modeling", "shading", "animation", "render", "io"] as const;

/**
 * One curated bpy API change. This is the structured backbone of the Knowledge Base:
 * symbol + version + replacement is what lets the agent say "removed in 4.0, use X".
 */
export const apiChange = defineType({
  name: "apiChange",
  title: "API change",
  type: "document",
  fields: [
    defineField({
      name: "symbol",
      title: "Symbol",
      type: "string",
      description: 'Fully qualified, e.g. "bpy.types.Scene.objects.link"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: { list: [...API_CHANGE_KINDS], layout: "radio" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "changedIn",
      title: "Changed in",
      type: "reference",
      to: [{ type: "blenderVersion" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "replacement",
      title: "Replacement",
      type: "string",
      description: 'e.g. "collection.objects.link". Leave empty for pure removals.',
    }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3, validation: (r) => r.required() }),
    defineField({
      name: "before",
      title: "Before (old form)",
      type: "code",
      options: { language: "python" },
    }),
    defineField({
      name: "after",
      title: "After (current form)",
      type: "code",
      options: { language: "python" },
    }),
    defineField({ name: "sourceUrl", title: "Source URL", type: "url", validation: (r) => r.required() }),
    defineField({
      name: "area",
      title: "Area",
      type: "string",
      options: { list: [...API_AREAS] },
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { symbol: "symbol", kind: "kind", version: "changedIn.version" },
    prepare: ({ symbol, kind, version }) => ({
      title: symbol,
      subtitle: `${kind} in ${version ?? "?"}`,
    }),
  },
});
