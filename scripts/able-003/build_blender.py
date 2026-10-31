"""ABLE-003: reproducible rig/animation authoring on copies of the neutral GLB."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT = Path.cwd()
OUT = ROOT / 'assets/able-003'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(OUT / 'source/able-neutral.glb'))
imported = list(scene.objects)
source = bpy.data.collections.new('01_SOURCE_NEUTRAL_UNMODIFIED')
scene.collection.children.link(source)
for obj in imported:
    for collection in list(obj.users_collection): collection.objects.unlink(obj)
    source.objects.link(obj)
source.hide_render = True
source.hide_viewport = True
rig_collection = bpy.data.collections.new('02_ABLE_CUSTOM_RIG')
scene.collection.children.link(rig_collection)
meshes = []
for original in imported:
    if original.type != 'MESH': continue
    obj = original.copy(); obj.data = original.data.copy()
    rig_collection.objects.link(obj)
    obj.parent = None; obj.matrix_world = original.matrix_world.copy()
    obj.name = original.name + '_rig'
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)
    meshes.append(obj)

arm_data = bpy.data.armatures.new('Able_Custom_A_Skeleton')
arm = bpy.data.objects.new('AbleRig', arm_data)
rig_collection.objects.link(arm)
arm.show_in_front = True
arm['anatomy'] = 'Stylized letter A. No humanoid mapping, pelvis, neck or invented legs.'
arm['source_units'] = '1 source unit = 1 Blender meter; verify FBX unit metadata in Cascadeur.'
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None, deform=True):
    b = arm_data.edit_bones.new(name); b.head = head; b.tail = tail; b.use_deform = deform
    if parent: b.parent = arm_data.edit_bones[parent]
    return b
bone('root', (0,0,0), (0,0,.25))
bone('body_base', (0,0,.95), (0,0,1.45), 'root')
bone('body_upper', (0,0,1.45), (0,0,2.25), 'body_base')
bone('face_anchor', (0,-.51,1.22), (0,-.51,1.42), 'body_upper')
for side, suffix in [(-1,'R'),(1,'L')]:
    theta = side*.28
    def arm_point(y, z):
        return (side*.72 - y*math.sin(theta), -(.35+z), 1.25-.12+y*math.cos(theta))
    shoulder, middle, hand = arm_point(0,0), arm_point(-.17,.02), arm_point(-.37,.22)
    bone('arm_base.'+suffix, shoulder, middle, 'body_upper')
    bone('arm_mid.'+suffix, middle, hand, 'arm_base.'+suffix)
    bone('hand.'+suffix, hand, Vector(hand)+Vector((0,-.12,-.03)), 'arm_mid.'+suffix)
    bone('foot_mount.'+suffix, (side*.61,-.18,.59), (side*.61,-.18,.39), 'root')
    bone('foot.'+suffix, (side*.61,-.18,.39), (side*.61,-.4,.39), 'foot_mount.'+suffix)
bpy.ops.object.mode_set(mode='OBJECT')
for name, names in {
    'Main': ['root','body_base','body_upper'],
    'Arms': [n for n in arm_data.bones.keys() if n.startswith(('arm_','hand.'))],
    'Feet': [n for n in arm_data.bones.keys() if n.startswith('foot')],
    'Face': ['face_anchor'],
}.items():
    collection = arm_data.collections.new(name)
    for name in names: collection.assign(arm_data.bones[name])
for pb in arm.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb['control_note'] = 'FK control; editable keyframes. No auto-rig dependency.'

def assign(obj, vertex, weights):
    for name, weight in weights.items():
        if weight <= 0: continue
        vg = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
        vg.add([vertex.index], weight, 'REPLACE')

for obj in meshes:
    for vertex in obj.data.vertices:
        z = (obj.matrix_world @ vertex.co).z
        name = obj.name
        if name.startswith('body_shell'):
            upper = max(0,min(1,(z-1.05)/.85)); upper=upper*upper*(3-2*upper)
            support = max(0,min(1,(.85-z)/.45))*.8
            assign(obj,vertex,{'root':support,'body_base':(1-support)*(1-upper),'body_upper':(1-support)*upper})
        elif name.startswith('arm_'):
            suffix = 'R' if name.startswith('arm_R') else 'L'
            if '_hand' in name: assign(obj,vertex,{'hand.'+suffix:1})
            else:
                joint = arm_data.bones['arm_mid.'+suffix].head_local.z
                bend = max(0,min(1,(joint+.16-z)/.32))
                assign(obj,vertex,{'arm_base.'+suffix:1-bend,'arm_mid.'+suffix:bend})
        elif name.startswith('foot_'):
            assign(obj,vertex,{'foot.'+('R' if name.startswith('foot_R') else 'L'):1})
        elif name.startswith(('screen','brow','eye_','mouth')): assign(obj,vertex,{'face_anchor':1})
        else: assign(obj,vertex,{'body_base':1})
    modifier = obj.modifiers.new('Able_Skin','ARMATURE'); modifier.object = arm
    obj.parent = arm
    # parent identity: rig is at world origin, preserving every neutral vertex.
    if obj.name.startswith(('eye_stroke','mouth_stroke')):
        obj['reference_only'] = True
        obj.hide_render = True
        obj.hide_set(True)

# Socket preserves the exact source screen coordinate system for the R3F face.
face_source = next(o for o in imported if o.name == 'face_anchor')
socket = bpy.data.objects.new('face_socket',None); rig_collection.objects.link(socket)
socket.parent = arm; socket.parent_type='BONE'; socket.parent_bone='face_anchor'
bpy.context.view_layer.update()
socket.matrix_world = face_source.matrix_world.copy()
socket.empty_display_type='ARROWS'; socket.empty_display_size=.12
socket['purpose']='Procedural digital face mount, with source screen transform preserved.'

# Artist-readable FK actions, sampled at 30 fps for deterministic interchange.
def reset_pose():
    for pb in arm.pose.bones:
        pb.location=(0,0,0); pb.rotation_quaternion=(1,0,0,0); pb.scale=(1,1,1)
def rotate_world(name, axis, angle):
    pb=arm.pose.bones[name]; basis=pb.bone.matrix_local.to_quaternion()
    pb.rotation_quaternion=basis.inverted() @ Quaternion(Vector(axis),angle) @ basis

def smooth(a,b,t):
    v=max(0,min(1,(t-a)/(b-a))); return v*v*(3-2*v)
def bump(a,b,t): return math.sin(math.pi*max(0,min(1,(t-a)/(b-a))))

actions=[]
for action_name, end in [('jump',90),('wave',108)]:
    action=bpy.data.actions.new(action_name); action.use_fake_user=True
    arm.animation_data_create(); arm.animation_data.action=action
    for frame in range(end+1):
        reset_pose(); t=frame/30
        if action_name=='jump':
            anticipation=bump(0,.5,t); landing=bump(1.5,1.82,t)
            p=max(0,min(1,(t-.53)/.97))
            flight=4*p*(1-p)*.68 if .53<=t<=1.5 else 0
            rebound=bump(1.82,2.25,t)*.1
            root=arm.pose.bones['root']; root.location=root.bone.matrix_local.to_3x3().inverted() @ Vector((0,0,flight+rebound))
            arm.pose.bones['body_base'].scale.y=1-.12*anticipation-.16*landing+.035*bump(.53,1.5,t)
            rotate_world('body_base',(0,1,0),.045*bump(.53,1.5,t))
            for suffix,sign in [('R',1),('L',-1)]:
                angle=sign*(.22*anticipation+1.0*bump(.53,1.5,t)-.08*landing)
                rotate_world('arm_base.'+suffix,(0,1,0),angle)
                rotate_world('arm_mid.'+suffix,(0,1,0),sign*.18*bump(.53,1.5,t))
                rotate_world('foot.'+suffix,(1,0,0),-.15*bump(.53,1.5,t))
        else:
            envelope=smooth(.12,.65,t)*(1-smooth(2.85,3.55,t))
            rotate_world('arm_base.R',(0,1,0),2.0*envelope)
            rotate_world('arm_mid.R',(0,1,0),(.18+math.sin((t-.6)*9)*.22)*envelope)
            rotate_world('hand.R',(0,1,0),math.sin((t-.6)*9+.25)*.26*envelope)
            rotate_world('body_base',(0,1,0),-.055*envelope)
            rotate_world('body_upper',(0,1,0),-.035*envelope)
            rotate_world('body_upper',(0,0,1),.055*envelope*math.sin(t*2))
            rotate_world('arm_base.L',(0,1,0),-.10*envelope)
        for pb in arm.pose.bones:
            pb.keyframe_insert('location',frame=frame,group=pb.name)
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
            pb.keyframe_insert('scale',frame=frame,group=pb.name)
    actions.append(action)
    action['authored_in']='Blender 4.5 FK; NOT Cascadeur output'
    action['description']='Anticipation, flight, landing, secondary bounce' if action_name=='jump' else 'Raised arm, elbow/wrist overlap, subtle body inclination'

arm.animation_data.action=None; reset_pose(); scene.frame_set(0)
scene.frame_start=0; scene.frame_end=108
for frame,label in [(0,'REST / jump start'),(16,'TAKEOFF'),(30,'APEX'),(45,'LANDING'),(55,'REBOUND'),(90,'jump end'),(108,'wave end')]: scene.timeline_markers.new(label,frame=frame)

text=bpy.data.texts.new('READ_ME_ABLE_003')
text.write('ABLE is a stylized letter A. Source collection is hidden and preserved.\n14-bone custom FK rig, with root-attached feet.\nSelect AbleRig > Pose Mode; actions jump/wave in Action Editor.\nDigital face reference meshes are hidden in rig collection; face_socket receives R3F face.\nAnimations authored in Blender. Cascadeur exchange has NOT been performed.\nNo fur/material refinement.\n')
for obj in bpy.context.selected_objects: obj.select_set(False)
arm.select_set(True); bpy.context.view_layer.objects.active=arm
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=5
        area.spaces.active.region_3d.view_location=Vector((0,0,1.3))
        area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),math.pi/2)

blend_path=OUT/'blender/able-rigged.blend'
arm.animation_data.action=actions[0]; reset_pose(); scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
arm.animation_data.action=None; reset_pose(); scene.frame_set(0)
export_meshes=[o for o in meshes if not o.get('reference_only')]
def select_export():
    for obj in scene.objects: obj.select_set(False)
    for obj in [arm,socket]+export_meshes: obj.hide_set(False); obj.select_set(True)
    bpy.context.view_layer.objects.active=arm
select_export()
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/able-003/able-rigged.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_skins=True,export_def_bones=True,export_rest_position_armature=True,export_extras=True)
select_export()
bpy.ops.export_scene.fbx(filepath=str(OUT/'exchange/able-for-cascadeur.fbx'),use_selection=True,object_types={'ARMATURE','MESH','EMPTY'},add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=True,bake_anim_use_nla_strips=False,apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',axis_forward='-Z',axis_up='Y')
report={'blender':bpy.app.version_string,'bones':list(arm.data.bones.keys()),'meshes':len(export_meshes),'source_meshes':len(meshes),'actions':[{'name':a.name,'range':list(a.frame_range)} for a in actions],'fps':30,'face_socket':list(socket.matrix_world.translation),'cascadeur':{'status':'NOT_RUN','reason':'No installation found in PATH, standard install directories or Windows uninstall registry. No subscription activated.'},'notes':['Neutral mesh topology preserved; weights added to copies. No retopology or fur refinement.','Body and arms have custom skin weights; feet are rooted independently for floor support.','No face morph animation exported: R3F face mounts to face_socket.','FBX includes both actions for manual Cascadeur rig/import evaluation.']}
(OUT/'reports/blender-build.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('ABLE_003_BUILD_COMPLETE',json.dumps(report))

