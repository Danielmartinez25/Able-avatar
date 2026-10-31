"""Add wave_v2 to a copy of the approved 14-bone Blender project."""
import bpy, math, json, shutil, hashlib
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path.cwd()
OUT = ROOT / 'assets/able-004'
OUT.mkdir(exist_ok=True)
backup = OUT / 'backup'
backup.mkdir(exist_ok=True)
sources = [ROOT/'assets/able-003/blender/able-rigged.blend', ROOT/'public/models/able-003/able-rigged.glb']
for source in sources:
    target = backup/source.name
    if not target.exists(): shutil.copy2(source, target)
    assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(target.read_bytes()).digest()
bpy.ops.wm.open_mainfile(filepath=str(sources[0]))
scene = bpy.context.scene
arm = bpy.data.objects['AbleRig']
assert len(arm.data.bones) == 14

def reset():
    for p in arm.pose.bones:
        p.location=(0,0,0); p.rotation_quaternion=(1,0,0,0); p.scale=(1,1,1)

def smooth(a,b,t):
    x=max(0,min(1,(t-a)/(b-a)))
    return x*x*x*(x*(6*x-15)+10)

def pulse(a,b,t):
    if not a<t<b: return 0
    return math.sin(math.pi*(t-a)/(b-a))**2

def curve(t, points):
    for (a,v),(b,w) in zip(points,points[1:]):
        if t<=b: return v+(w-v)*smooth(a,b,t)
    return points[-1][1]

def rotate(name, x=0,y=0,z=0):
    p=arm.pose.bones[name]; basis=p.bone.matrix_local.to_quaternion()
    q=Quaternion((0,0,1),z) @ Quaternion((1,0,0),x) @ Quaternion((0,1,0),y)
    p.rotation_quaternion=basis.inverted() @ q @ basis

action=bpy.data.actions.new('wave_v2'); action.use_fake_user=True
action['authored_in']='Blender Python, custom existing A rig. No Cascadeur.'
action['description']='5s: notice, anticipation, two asymmetric waves, enthusiasm, overlapping settle'
arm.animation_data.action=action
for frame in range(301):
    t=frame/60; reset()
    notice=pulse(0,.75,t)
    compress=pulse(.6,1.1,t)
    reach=curve(t,[(0,0),(.6,0),(.94,-.19),(1.48,1.98),(2.8,1.91),(3.22,2.08),(3.65,1.65),(4.5,-.075),(5,0)])
    # Two hand-led gestures with different amplitudes and delayed elbow response.
    def gesture(delay=0):
        u=t-delay
        return curve(u,[(0,0),(1.42,0),(1.70,.40),(1.98,-.30),(2.28,.34),(2.60,-.22),(2.85,0),(5,0)])
    cheer=pulse(2.8,3.6,t)
    settle=math.sin((t-3.65)*8)*math.exp(-4*(t-3.65))*pulse(3.65,5,t) if t>3.65 else 0
    lean=curve(t,[(0,0),(.55,-.035),(.95,.045),(1.55,-.085),(2.05,-.045),(2.5,-.075),(2.8,-.045),(3.25,-.03),(3.8,.025),(4.45,-.012),(5,0)])
    rotate('body_base',y=lean,z=.025*notice+.022*pulse(1.1,3.6,t))
    rotate('body_upper',x=-.025*notice+.035*compress,y=lean*.38+.018*gesture(.13),z=-.03*pulse(1.2,3.7,t))
    base=arm.pose.bones['body_base']
    squash=-.065*compress+.035*pulse(1.05,1.6,t)-.045*pulse(2.8,3.05,t)+.05*pulse(3.05,3.38,t)-.025*pulse(3.38,3.7,t)
    base.scale=(1-squash*.4,1+squash,1-squash*.4)
    rotate('arm_base.R',x=.10*pulse(1,4.4,t),y=reach,z=.05*pulse(1,4,t))
    rotate('arm_mid.R',y=.16*smooth(1,1.5,t)*(1-smooth(3.65,4.7,t))+gesture(.09)*.62+.05*settle)
    rotate('hand.R',x=.08*gesture(.04),y=gesture()+.10*cheer+.10*settle,z=.07*pulse(1.1,4.5,t))
    rotate('arm_base.L',y=-.12*pulse(.9,3,t)-.32*cheer+.07*settle)
    rotate('arm_mid.L',y=-.08*pulse(1.2,3.7,t)+.06*settle)
    rotate('hand.L',y=-.10*pulse(3,4.4,t)+.08*settle)
    # Feet stay planted: the enthusiastic bounce is a body stretch, not a jump.
    for p in arm.pose.bones:
        for channel in ['location','rotation_quaternion','scale']:
            p.keyframe_insert(channel,frame=t*30,group=p.name)
for fc in action.fcurves:
    for key in fc.keyframe_points: key.interpolation='LINEAR'
scene.render.fps=30; scene.frame_start=0; scene.frame_end=150
scene.timeline_markers.clear()
for frame,label in [(0,'Notice visitor'),(18,'Anticipation'),(33,'Raise arm'),(51,'Wave 1'),(69,'Wave 2'),(84,'Enthusiasm'),(108,'Settle'),(150,'Neutral')]:
    scene.timeline_markers.new(label,frame=frame)
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'able-wave-v2.blend'))
arm.animation_data.action=None; reset(); scene.frame_set(0)
for o in scene.objects: o.select_set(False)
collection=bpy.data.collections['02_ABLE_CUSTOM_RIG']
for o in collection.objects:
    if not o.get('reference_only'):
        o.hide_set(False); o.select_set(True)
bpy.context.view_layer.objects.active=arm
destination=ROOT/'public/models/able-004/able-wave-v2.glb'
destination.parent.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_step=1,export_skins=True,export_def_bones=True,export_rest_position_armature=True,export_extras=True)
report={'blender':bpy.app.version_string,'source':str(sources[0]),'output':str(destination),'bones':len(arm.data.bones),'actions':[{'name':a.name,'frames':list(a.frame_range)} for a in bpy.data.actions], 'source_sha256':{s.name:hashlib.sha256(s.read_bytes()).hexdigest() for s in sources},'sampling':'Authored at 60Hz, exported at 30fps', 'cascadeur':'Not used; Blender explicitly authorized for ABLE-004'}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('ABLE004_COMPLETE',json.dumps(report))
