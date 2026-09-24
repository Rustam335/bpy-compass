import assert from "node:assert/strict";
import { test } from "node:test";
import { checkContract, checkWatchOut, mentions, parseSources, splitBlocks } from "../lib/eval-contract";

const ANSWER = `ANSWER — valid for Blender 4.5

    import bpy
    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"

WATCH OUT
- \`scene.render.engine = "BLENDER_EEVEE"\` stopped working in 4.2; use \`"BLENDER_EEVEE_NEXT"\`. [source: render_import_export]
- \`obj.select = True\` was removed in 2.80; use \`obj.select_set(True)\`. [source: api_breaking_changes/blender_280]

SOURCES
- render_import_export
- api_breaking_changes/blender_280
`;

test("splits the three blocks", () => {
  const b = splitBlocks(ANSWER);
  assert.ok(b.answer.startsWith("ANSWER") && !b.answer.includes("WATCH OUT"));
  assert.ok(b.watchOut?.startsWith("WATCH OUT") && !b.watchOut.includes("SOURCES"));
  assert.ok(b.sources?.startsWith("SOURCES"));
  assert.deepEqual(splitBlocks("```python\nprint(1)\n```"), { answer: "```python\nprint(1)\n```", watchOut: null, sources: null });
});

test("mentions() reduces seed symbols to their key token and matches spelling variants", () => {
  const w = "- `obj.select = True` removed in 2.80; use `obj.select_set(True)` or select set.\n- use the @ operator instead of matrix * vector";
  assert.ok(mentions(w, "bpy.types.Object.select"));
  assert.ok(mentions(w, "bpy.types.Object.select_set / select_get"));
  assert.ok(mentions(w, "@ operator (PEP 465)"));
  assert.ok(mentions(w, "mathutils.Matrix.__mul__"));
  assert.ok(!mentions(w, "bpy.types.Scene.objects.link"));
  assert.ok(mentions('use "BLENDER_EEVEE_NEXT" in 4.2', 'bpy.types.RenderSettings.engine == "BLENDER_EEVEE"'));
  assert.ok(mentions("the Smooth by Angle modifier or the sharp_edge attribute", "bpy.ops.object.shade_smooth_by_angle (4.2+) / sharp_edge attribute"));
  assert.ok(mentions("pass a context override dictionary to bpy.ops", "bpy.ops.<op>(override_dict, ...)"));
  assert.ok(mentions('set inputs["Emission Strength"]', 'inputs["Emission Color"] and inputs["Emission Strength"]'));
});

test("checkWatchOut reports the missing symbol and the missing replacement separately", () => {
  const { watchOut } = splitBlocks(ANSWER);
  assert.deepEqual(checkWatchOut(watchOut, [{ symbol: 'bpy.types.RenderSettings.engine == "BLENDER_EEVEE"', replacement: '"BLENDER_EEVEE_NEXT"' }]), []);
  assert.deepEqual(checkWatchOut(watchOut, [{ symbol: "bpy.types.Mesh.calc_normals", replacement: "(none) normals are computed lazily" }]), [
    "WATCH OUT does not mention bpy.types.Mesh.calc_normals.",
  ]);
  assert.deepEqual(checkWatchOut(watchOut, [{ symbol: "bpy.types.Object.select", replacement: "bpy.types.Object.hide_viewport / hide_set" }]), [
    "WATCH OUT does not name the replacement for bpy.types.Object.select (bpy.types.Object.hide_viewport / hide_set).",
  ]);
  assert.deepEqual(checkWatchOut(null, [{ symbol: "x.y" }]), ["No WATCH OUT block in the answer."]);
  assert.deepEqual(checkWatchOut(null, []), []);
});

test("parseSources reads bullet paths and treats none as empty", () => {
  assert.deepEqual(parseSources(splitBlocks(ANSWER).sources), ["render_import_export", "api_breaking_changes/blender_280"]);
  assert.deepEqual(parseSources("SOURCES\n- none"), []);
  assert.deepEqual(parseSources("SOURCES\n- `mesh_data_bmesh` — normals section"), ["mesh_data_bmesh"]);
});

test("checkContract cross-checks SOURCES against the paths actually read", () => {
  const expected = [{ symbol: 'bpy.types.RenderSettings.engine == "BLENDER_EEVEE"', replacement: '"BLENDER_EEVEE_NEXT"' }];
  const ok = checkContract({ answer: ANSWER, expected, readPaths: ["render_import_export", "api_breaking_changes/blender_280", "extra"] });
  assert.deepEqual(ok, { watchOutPassed: true, sourcesPassed: true, failures: [] });

  const notRead = checkContract({ answer: ANSWER, expected, readPaths: ["render_import_export"] });
  assert.equal(notRead.sourcesPassed, false);
  assert.deepEqual(notRead.failures, ['SOURCES lists "api_breaking_changes/blender_280", which was not read from the Knowledge Base.']);

  const baseline = checkContract({ answer: ANSWER, expected, readPaths: null });
  assert.deepEqual(baseline, { watchOutPassed: true, sourcesPassed: null, failures: [] });

  const noSources = checkContract({ answer: ANSWER.replace(/- render_import_export\n- api_breaking_changes\/blender_280\n$/, "- none\n"), expected, readPaths: ["x"] });
  assert.deepEqual(noSources.failures, ["SOURCES lists no Knowledge Base entry."]);
});
