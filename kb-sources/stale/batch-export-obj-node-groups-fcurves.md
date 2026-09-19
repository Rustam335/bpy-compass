# Batch export OBJ, build a node group, and read animation curves

## 1. Export every selected mesh as its own OBJ

The OBJ exporter is a Python add-on that registers `bpy.ops.export_scene.obj`:

```python
import bpy, os

out_dir = bpy.path.abspath("//export")
os.makedirs(out_dir, exist_ok=True)

for ob in bpy.context.selected_objects:
    if ob.type != 'MESH':
        continue
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.export_scene.obj(
        filepath=os.path.join(out_dir, ob.name + ".obj"),
        use_selection=True,
        use_materials=False,
    )
```

Import works the same way with `bpy.ops.import_scene.obj(filepath=...)`. PLY uses
`bpy.ops.import_mesh.ply` and `bpy.ops.export_mesh.ply`.

## 2. Create a geometry node group with sockets

Sockets on a node group live in the `inputs` and `outputs` collections of the tree:

```python
group = bpy.data.node_groups.new("MyGroup", 'GeometryNodeTree')

group.inputs.new('NodeSocketGeometry', "Geometry")
group.inputs.new('NodeSocketFloatFactor', "Scale")
group.outputs.new('NodeSocketGeometry', "Geometry")

gi = group.nodes.new('NodeGroupInput')
go = group.nodes.new('NodeGroupOutput')
group.links.new(gi.outputs["Geometry"], go.inputs["Geometry"])
```

Use `group.inputs.remove(socket)` and `group.inputs.move(from_index, to_index)` to manage them.

## 3. Read the animation curves of an object

An Action holds a flat list of F-Curves in `action.fcurves`:

```python
ob = bpy.context.active_object
action = ob.animation_data.action
for fc in action.fcurves:
    print(fc.data_path, fc.array_index, len(fc.keyframe_points))

fc = action.fcurves.new("location", index=2, action_group="Object Transforms")
fc.keyframe_points.insert(1, 0.0)
```

`action.id_root` tells you which datablock type the action animates.

## 4. Put bones on a layer

Armature bones are organised in 32 fixed layers:

```python
arm = bpy.data.armatures["Armature"]
for bone in arm.bones:
    bone.layers = [i == 0 for i in range(32)]
```

## 5. Compositor nodes

The compositor tree hangs off the scene:

```python
scene = bpy.context.scene
scene.use_nodes = True
tree = scene.node_tree
out = tree.nodes.new('CompositorNodeOutputFile')
out.base_path = "//renders"
out.file_slots[0].path = "beauty_"
```

## 6. Video sequencer strips

Strips are `Sequence` objects in `scene.sequence_editor.sequences`:

```python
for s in scene.sequence_editor.sequences:
    print(type(s).__name__, s.frame_start)
active = bpy.context.active_sequence_strip
```
