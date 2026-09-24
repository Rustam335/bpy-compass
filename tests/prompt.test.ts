import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBaselinePrompt, buildSystemPrompt, buildUserPrompt, NOT_IN_KB_MARKER, OUTPUT_FORMAT } from "../lib/prompt";

test("baseline and compass prompts differ only in the Knowledge Base rules and outline", () => {
  const compass = buildSystemPrompt({ version: "4.5", outline: "- entry_a\n- entry_b", knowledgeBaseId: "kb1" });
  const baseline = buildBaselinePrompt("4.5");

  for (const p of [compass, baseline]) {
    assert.ok(p.includes("The user targets Blender 4.5."));
    assert.ok(p.includes(OUTPUT_FORMAT), "shared output contract");
    assert.ok(p.includes("official release notes are ground truth") || p.includes("Official release notes are ground truth"));
  }
  assert.ok(compass.includes("knowledge_base_read") && compass.includes("entry_a") && compass.includes("kb1"));
  assert.ok(!baseline.includes("knowledge_base_read") && !baseline.includes("entry_a") && !baseline.includes("kb1"));
  assert.ok(baseline.includes("No Knowledge Base tools are available"));
});

test("grounding policy is explicit mixed grounding with the marker", () => {
  const compass = buildSystemPrompt({ version: "5.0" });
  assert.ok(!compass.includes("ONLY from the Knowledge Base"));
  assert.ok(compass.includes(NOT_IN_KB_MARKER));
});

test("user prompt matches what the chat UI sends", () => {
  assert.equal(buildUserPrompt("4.2", "Set the engine"), "Blender 4.2 — Set the engine");
});
