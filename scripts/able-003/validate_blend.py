import bpy,json
from pathlib import Path
ROOT=Path.cwd(); OUT=ROOT/'assets/able-003'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'blender/able-rigged.blend'))
arm=bpy.data.objects['AbleRig']
assert len(arm.data.bones)==14
assert bpy.data.collections['01_SOURCE_NEUTRAL_UNMODIFIED'].hide_viewport
assert arm.animation_data.action.name=='jump','Blend must open ready to play jump'
report={'status':'PASS','blender':bpy.app.version_string,'editable_meshes':sum(o.type=='MESH' for o in bpy.data.collections['02_ABLE_CUSTOM_RIG'].objects),'bones':14,'source_reference_preserved':True,'samples':{}}
for name,frames in [('jump',[0,8,16,30,45,49,60,68,90]),('wave',[0,12,24,36,54,81,96,108])]:
    arm.animation_data.action=bpy.data.actions[name]
    samples=[]
    for frame in frames:
        bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
        joints={}
        for pb in arm.pose.bones:
            p=arm.matrix_world @ pb.matrix.translation
            joints[pb.name]=[p.x,p.z,-p.y]
        samples.append({'frame':frame,'time':frame/30,'joints_three_y_up':joints})
    report['samples'][name]=samples
(OUT/'reports/blend-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('BLEND_VALIDATION_PASS')
