# Make an object glow: emissive materials with Python

Every material is node based. The Principled BSDF node has an **Emission** colour socket and
an **Emission Strength** socket, so you do not need a separate Emission shader for glow.

```python
import bpy

obj = bpy.context.active_object

mat = bpy.data.materials.new("Glow")
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes["Principled BSDF"]

bsdf.inputs["Base Color"].default_value = (0.1, 0.1, 0.1, 1)
bsdf.inputs["Emission"].default_value = (1.0, 0.4, 0.05, 1)
bsdf.inputs["Emission Strength"].default_value = 8.0
bsdf.inputs["Specular"].default_value = 0.2
bsdf.inputs["Subsurface"].default_value = 0.0
bsdf.inputs["Subsurface Color"].default_value = (0.8, 0.3, 0.2, 1)
bsdf.inputs["Transmission"].default_value = 0.0

obj.data.materials.append(mat)
```

The socket names on the Principled BSDF are `Base Color`, `Subsurface`, `Subsurface Color`,
`Metallic`, `Specular`, `Specular Tint`, `Roughness`, `Transmission`, `Emission`,
`Emission Strength` and `Alpha`. Index `inputs[...]` by these names rather than by number so
the script keeps working when sockets are reordered.

## Make it see-through

Set the blend mode so EEVEE renders the alpha channel:

```python
mat.blend_method = 'BLEND'          # OPAQUE, CLIP, HASHED or BLEND
mat.show_transparent_back = False
bsdf.inputs["Alpha"].default_value = 0.5
```

## Render with EEVEE

EEVEE is Blender's real-time render engine. Its identifier in the API is `BLENDER_EEVEE`;
the other engines are `CYCLES` and `BLENDER_WORKBENCH`:

```python
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.use_bloom = True        # makes the emission actually glow
scene.eevee.use_motion_blur = False
bpy.ops.render.render(write_still=True)
```

Bloom is what turns a bright emission colour into a halo, so always enable it for glow
effects. To stop a light from casting shadows in Cycles, set `light.cycles.cast_shadow = False`.
