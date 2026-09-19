import { defineField, defineType } from "sanity";

/** Result of running one contender on one test case in headless Blender. Written by scripts/eval.ts only. */
export const evalRun = defineType({
  name: "evalRun",
  title: "Eval run",
  type: "document",
  readOnly: true,
  fields: [
    defineField({
      name: "testCase",
      title: "Test case",
      type: "reference",
      to: [{ type: "testCase" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "contender",
      title: "Contender",
      type: "string",
      options: { list: ["baseline", "bpy-compass"] },
      validation: (r) => r.required(),
    }),
    defineField({ name: "script", title: "Generated script", type: "code", options: { language: "python" } }),
    defineField({ name: "rawAnswer", title: "Raw answer", type: "text" }),
    defineField({ name: "passed", title: "Passed", type: "boolean", validation: (r) => r.required() }),
    defineField({ name: "stderr", title: "stderr", type: "text" }),
    defineField({ name: "blenderBuild", title: "Blender build", type: "string" }),
    defineField({ name: "modelId", title: "Model ID", type: "string", validation: (r) => r.required() }),
    defineField({ name: "provider", title: "Provider", type: "string", validation: (r) => r.required() }),
    defineField({ name: "ranAt", title: "Ran at", type: "datetime", validation: (r) => r.required() }),
  ],
  preview: {
    select: { contender: "contender", passed: "passed", question: "testCase.question", ranAt: "ranAt" },
    prepare: ({ contender, passed, question, ranAt }) => ({
      title: `${passed ? "PASS" : "FAIL"} · ${contender}`,
      subtitle: `${question ?? ""} · ${ranAt ?? ""}`,
    }),
  },
});
