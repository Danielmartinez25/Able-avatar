import bpy, json
from pathlib import Path
ROOT=Path.cwd(); OUT=ROOT/'assets/able-004'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'able-wave-v2.blend'))
arm=bpy.data.objects['AbleRig']
assert len(arm.data.bones)==14
assert arm.animation_data.action.name=='wave_v2'
assert bpy.data.collections['01_SOURCE_NEUTRAL_UNMODIFIED'].hide_viewport
samples=[]
for frame in [0,9,18,28,33,44,51,60,69,78,84,96,108,120,135,150]:
    bpy.context.scene.frame_set(frame); bpy.context.view_layer.update()
    joints={}
    for p in arm.pose.bones:
        v=arm.matrix_world @ p.matrix.translation
        joints[p.name]=[v.x,v.z,-v.y]
    samples.append({'time':frame/30,'joints':joints})
(OUT/'blender-validation.json').write_text(json.dumps({'status':'PASS','bones':14,'active_action':'wave_v2','samples':samples},indent=2),encoding='utf8')
# Fresh import verifies that the exported delivery remains a usable Blender asset.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/able-004/able-wave-v2.glb'))
shapes={p.custom_shape for o in bpy.context.scene.objects if o.type=='ARMATURE' for p in o.pose.bones if p.custom_shape}
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in shapes]
assert len(meshes)==21,[(o.name,o in shapes) for o in bpy.context.scene.objects if o.type=='MESH']
assert any('wave_v2' in a.name for a in bpy.data.actions)
(OUT/'glb-reimport.json').write_text(json.dumps({'status':'PASS','character_meshes':len(meshes),'importer_bone_shapes':[o.name for o in shapes],'actions':[a.name for a in bpy.data.actions]},indent=2),encoding='utf8')
print('ABLE004_BLEND_REOPEN_AND_GLB_IMPORT_PASS')
