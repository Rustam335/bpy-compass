# Stale tutorial sources

These files are uploaded to the `bpy-compass` Knowledge Base as **file sources** on purpose.
They contain Blender 2.7x–3.x era `bpy` code that no longer works, so that the KB build
detects real conflicts against the official release notes (see PROJECT_BRIEF §6).

**All four files were written for this project** in the style of the tutorials that still rank
on the web, because licenses of real third-party tutorials could not be confirmed
(PROJECT_BRIEF §12). They are released under the repository's MIT license.

**Why there is no "outdated" banner inside the files:** the first KB build (2026-09-19) used
versions of these files with an "Intentionally outdated, 2.7x style" header. Sanity Context read
the header, classified the content as history and reconciled it into the entries without
raising a single Issue. Real stale tutorials carry no such banner, so the files now read as
present-tense how-tos. The labeling lives here, in the README and in the DEV post instead.

| File | Stale patterns it asserts as current | Contradicted by |
|---|---|---|
| `add-objects-to-scene-with-python.md` | `scene.objects.link`, `obj.select = True`, `scene.objects.active`, `obj.layers`, `obj.hide`, `scene.update()`, `matrix * vector`, `bpy.data.lamps` | 2.80 release notes |
| `emissive-materials-with-python.md` | Principled sockets `Emission`, `Specular`, `Subsurface`, `Subsurface Color`, `Transmission`; `blend_method`, `show_transparent_back`; engine `BLENDER_EEVEE`; `eevee.use_bloom`; `light.cycles.cast_shadow` | 4.0, 4.2 release notes |
| `boolean-modifier-from-a-script.md` | override dict to `bpy.ops`, "exactly two solvers" FAST/EXACT, `use_auto_smooth`, `calc_normals`, `calc_normals_split` | 4.0, 4.1, 4.5, 5.0 release notes |
| `batch-export-obj-node-groups-fcurves.md` | `export_scene.obj`, `import_scene.obj`, `import_mesh.ply`, `NodeTree.inputs.new`, `NodeSocketFloatFactor`, `action.fcurves`, `action_group=`, `action.id_root`, `bone.layers`, `scene.node_tree`, `file_slots`, `base_path`, `Sequence`/`sequences`, `active_sequence_strip` | 4.0, 4.4, 5.0 release notes |
