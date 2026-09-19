import { defineField, defineType } from "sanity";

/** One eval question. `assertScript` runs after the generated script inside headless Blender. */
export const testCase = defineType({
  name: "testCase",
  title: "Test case",
  type: "document",
  fields: [
    defineField({ name: "order", title: "Order", type: "number", description: "Row number in the eval table" }),
    defineField({ name: "question", title: "Question", type: "text", rows: 2, validation: (r) => r.required() }),
    defineField({
      name: "targetVersion",
      title: "Target version",
      type: "reference",
      to: [{ type: "blenderVersion" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "expectApiChanges",
      title: "Expected API changes",
      type: "array",
      of: [{ type: "reference", to: [{ type: "apiChange" }] }],
      description: "The traps a stale answer would fall into.",
    }),
    defineField({
      name: "assertScript",
      title: "Assert script",
      type: "code",
      options: { language: "python" },
      description: "Appended after the generated script. Must raise on failure.",
    }),
  ],
  preview: {
    select: { question: "question", version: "targetVersion.version", order: "order" },
    prepare: ({ question, version, order }) => ({
      title: `${order ?? "-"}. ${question}`,
      subtitle: `target ${version ?? "?"}`,
    }),
  },
});
