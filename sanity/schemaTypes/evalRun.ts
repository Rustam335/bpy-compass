import { defineField, defineType } from "sanity";

/** Result of running one contender on one test case in headless Blender. Written by scripts/eval.ts only. */
export const evalRun = defineType({
  name: "evalRun",
  title: "Eval run",
  type: "document",
  readOnly: true,
  fields: [
    defineField({ name: "runId", title: "Run ID", type: "string", description: "All documents of one `yarn eval` invocation share this." }),
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
    defineField({ name: "passed", title: "Passed", type: "boolean", description: "Blender run and output contract both OK.", validation: (r) => r.required() }),
    defineField({ name: "blenderPassed", title: "Script ran in Blender", type: "boolean" }),
    defineField({ name: "watchOutPassed", title: "WATCH OUT names the expected API changes", type: "boolean" }),
    defineField({ name: "sourcesPassed", title: "SOURCES only lists entries that were read", type: "boolean", description: "Unset for the baseline (no Knowledge Base)." }),
    defineField({ name: "failures", title: "Failure reasons", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "stderr", title: "stderr", type: "text" }),
    defineField({ name: "blenderBuild", title: "Blender build", type: "string" }),
    defineField({ name: "modelId", title: "Model ID", type: "string", validation: (r) => r.required() }),
    defineField({ name: "provider", title: "Provider", type: "string", validation: (r) => r.required() }),
    defineField({ name: "temperature", title: "Temperature", type: "number" }),
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
