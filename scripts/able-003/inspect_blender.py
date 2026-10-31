import bpy, json
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path('assets/able-003/source/able-neutral.glb').resolve()))
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(obj.name, tuple(round(v,3) for v in obj.matrix_world.translation))
print('GLTF_OPTIONS', [p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties if 'anim' in p.identifier or 'rest' in p.identifier or 'visible' in p.identifier])
