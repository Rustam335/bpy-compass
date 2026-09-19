# Add objects to the scene with Python

The cleanest way to create geometry from a script is to build the mesh datablock yourself,
wrap it in an object, and link the object to the scene. Objects that are not linked to the
scene are invisible, so `scene.objects.link` is the one call you must never forget.

```python
import bpy

verts = [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
         (-1, -1,  1), (1, -1,  1), (1, 1,  1), (-1, 1,  1)]
faces = [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4),
         (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]

mesh = bpy.data.meshes.new("CubeMesh")
mesh.from_pydata(verts, [], faces)
mesh.update()

obj = bpy.data.objects.new("Cube", mesh)

scene = bpy.context.scene
scene.objects.link(obj)       # link the object to the scene

obj.select = True             # select it
scene.objects.active = obj    # make it the active object

scene.update()                # refresh the scene after changing data
```

## Selecting and hiding objects

Selection is a boolean property on the object. Hiding works the same way:

```python
for ob in scene.objects:
    ob.select = (ob.type == 'MESH')

ob.hide = True          # hide in the viewport
ob.hide_render = True   # hide in renders
```

## Layers

Every scene has 20 layers. Move an object to layer 2 by setting the second flag:

```python
obj.layers = [i == 1 for i in range(20)]
```

## Vertex positions in world space

`matrix_world` is a 4x4 matrix. Multiply it with a vertex coordinate to get the world-space
position:

```python
for v in mesh.vertices:
    world_co = obj.matrix_world * v.co
    print(world_co)
```

## Lamps

Lights are called lamps in the API. Add a point lamp like this:

```python
lamp_data = bpy.data.lamps.new("Key", type='POINT')
lamp = bpy.data.objects.new("Key", lamp_data)
scene.objects.link(lamp)
```

`scene.objects.link`, `obj.select = True` and `scene.objects.active` are the three calls you
will use in almost every Blender script.
