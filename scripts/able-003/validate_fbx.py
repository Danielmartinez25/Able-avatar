"""Inspect the prepared FBX by reimporting into a fresh Blender scene (not Cascadeur)."""
import bpy,json,math
from pathlib import Path
ROOT=Path.cwd(); OUT=ROOT/'assets/able-003'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(OUT/'exchange/able-for-cascadeur.fbx'),automatic_bone_orientation=False)
armatures=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
assert len(armatures)==1, f'Expected 1 armature, got {len(armatures)}'
arm=armatures[0]
assert len(arm.data.bones)==14, f'Expected 14 bones, got {len(arm.data.bones)}'
clips=[a.name for a in bpy.data.actions]
assert any('jump' in n for n in clips) and any('wave' in n for n in clips),clips
arm.animation_data.action=None
if arm.animation_data:
    for track in arm.animation_data.nla_tracks: track.mute=True
for pb in arm.pose.bones: pb.location=(0,0,0);pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0);pb.scale=(1,1,1)
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
coords=[obj.matrix_world @ v.co for obj in meshes for v in obj.data.vertices]
lo=[min(p[i] for p in coords) for i in range(3)];hi=[max(p[i] for p in coords) for i in range(3)]
assert abs((hi[2]-lo[2])-2.4650929546)<.001,(lo,hi)
report={'test':'Blender FBX export -> fresh Blender FBX import ONLY','status':'PASS','bones':len(arm.data.bones),'meshes':len(meshes),'actions':clips,'bounds_blender_z_up':{'min':lo,'max':hi},'cascadeur_test':'NOT_RUN: no installed application detected'}
(OUT/'reports/fbx-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
