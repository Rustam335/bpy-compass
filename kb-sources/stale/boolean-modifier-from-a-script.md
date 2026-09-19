# Boolean union from a script and apply it

Operators like `modifier_apply` need a context: they act on the *active* object. When a script
runs from the text editor or from the command line there is no 3D viewport context, so you pass
an **override dictionary** as the first argument. This is the standard way to run any operator
from a script.

```python
import bpy

a = bpy.data.objects["A"]
b = bpy.data.objects["B"]

mod = a.modifiers.new("Union", 'BOOLEAN')
mod.operation = 'UNION'
mod.object = b
mod.solver = 'FAST'      # FAST or EXACT

override = {
    "object": a,
    "active_object": a,
    "selected_objects": [a],
    "selected_editable_objects": [a],
}
bpy.ops.object.modifier_apply(override, modifier=mod.name)

bpy.data.objects.remove(b)   # remove the cutter
```

## The two solvers

The boolean modifier has exactly two solvers:

| Solver | Identifier | Notes |
|---|---|---|
| Fast | `'FAST'` | BMesh based, no overlapping geometry |
| Exact | `'EXACT'` | Slower, handles coplanar faces |

There are only these two options; `mod.solver` accepts `'FAST'` or `'EXACT'` and nothing else.

## Cutting a hole (difference)

```python
mod.operation = 'DIFFERENCE'
mod.solver = 'FAST'
```

## Auto smooth after the boolean

Booleans leave hard edges. Turn on auto smooth on the mesh datablock so shading stays clean:

```python
import math
a.data.use_auto_smooth = True
a.data.auto_smooth_angle = math.radians(30)
a.data.calc_normals()
```

## Recomputing normals

After editing vertices call `mesh.calc_normals()` (or `mesh.calc_normals_split()` for custom
split normals) before reading `vertex.normal`, otherwise the values are stale.
