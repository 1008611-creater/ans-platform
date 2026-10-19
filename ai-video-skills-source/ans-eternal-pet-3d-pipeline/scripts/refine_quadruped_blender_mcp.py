#!/usr/bin/env python3
"""
Blender MCP Production Refinement Pipeline for Pet Memorial ('Lanfeng' Alaskan Malamute)
Executes inside live Blender 5.2.2 LTS via TCP 127.0.0.1:9876 in isolated scene 'PetMemorial_Malamute_v2'.
"""
import json
import socket
import sys

BLENDER_CODE = r'''
import bpy
import bmesh
import json
import math
from mathutils import Vector, Euler, Quaternion
from pathlib import Path

SCENE_NAME = "PetMemorial_Malamute_v2"
RAW_RIGGED_GLB = "/Users/eeo/Downloads/ans/pet-memorial/public/models/malamute_rigged.glb"
OUT_PRO_GLB = "/Users/eeo/Downloads/ans/pet-memorial/public/models/malamute_pro.glb"
OUT_BLEND = "/Users/eeo/Downloads/ans/pet-memorial/assets/malamute_pro.blend"
RENDER_DIR = Path("/Users/eeo/Downloads/ans/pet-memorial/public/renders")
RENDER_DIR.mkdir(parents=True, exist_ok=True)
Path(OUT_BLEND).parent.mkdir(parents=True, exist_ok=True)

# 1. Switch to isolated scene PetMemorial_Malamute_v2 and clear only its objects
sc = bpy.data.scenes.get(SCENE_NAME)
if sc is None:
    sc = bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = sc
sc.unit_settings.system = 'METRIC'
sc.unit_settings.scale_length = 1.0

for obj in list(sc.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

# 2. Import raw rigged GLB from Tripo
bpy.ops.import_scene.gltf(filepath=RAW_RIGGED_GLB)
arm = next((o for o in sc.objects if o.type == 'ARMATURE'), None)
mesh_obj = next((o for o in sc.objects if o.type == 'MESH'), None)
if not arm or not mesh_obj:
    raise RuntimeError("Armature or Mesh missing after importing malamute_rigged.glb")

mesh_obj.name = "Malamute_Body"
arm.name = "Malamute_Armature"

# Clear any broken raw animation data on Armature
if arm.animation_data:
    arm.animation_data_clear()

# 3. Fix topological defect in Tripo quadruped skeleton:
# Reparent Front Left Leg (bone_26) and Front Right Leg (bone_30) from tripo::Head_0 to tripo::Spine_0
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
ebones = arm.data.edit_bones
spine_bone = ebones.get("tripo::Spine_0")
for leg_root_name in ("bone_26", "bone_30"):
    lb = ebones.get(leg_root_name)
    if lb and spine_bone:
        lb.parent = spine_bone
        lb.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')

# 4. Clean skinning weights so Head_0 / Head_1 never pull chest or front legs
vg_map = {vg.name: vg.index for vg in mesh_obj.vertex_groups}
head0_idx = vg_map.get("tripo::Head_0")
spine0_idx = vg_map.get("tripo::Spine_0")
fl_idx = vg_map.get("bone_26")
fr_idx = vg_map.get("bone_30")

if head0_idx is not None and spine0_idx is not None:
    for v in mesh_obj.data.vertices:
        # In local mesh coords, z < 0.50 is below the neck base (chest & legs)
        if v.co.z < 0.50:
            w_head = 0.0
            for g in v.groups:
                if g.group == head0_idx:
                    w_head = g.weight
                    break
            if w_head > 0.0:
                mesh_obj.vertex_groups[head0_idx].remove([v.index])
                # Reassign weight to Spine_0 or front leg root depending on z
                target_vg = spine0_idx
                if v.co.z < 0.36 and v.co.x > 0.02:
                    target_vg = fl_idx if (v.co.y >= 0 and fl_idx is not None) else (fr_idx if fr_idx is not None else spine0_idx)
                mesh_obj.vertex_groups[target_vg].add([v.index], w_head, 'ADD')

# 5. Gentle low-pass smoothing on mesh to remove SDF stair-stepping while preserving UV & silhouette
bm = bmesh.new()
bm.from_mesh(mesh_obj.data)
bm.verts.ensure_lookup_table()
# Smooth only non-boundary vertices with gentle factor
smooth_verts = [v for v in bm.verts if not v.is_boundary and v.co.z > 0.04]
for _ in range(2):
    bmesh.ops.smooth_vert(bm, verts=smooth_verts, factor=0.25, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(mesh_obj.data)
bm.free()
mesh_obj.data.update()
for poly in mesh_obj.data.polygons:
    poly.use_smooth = True

# 6. Multi-Material PBR Separation (Fur Coat, Glossy Eyes Cornea, Moist Nose, Silver Chain Collar)
orig_mat = mesh_obj.data.materials[0]
orig_mat.name = "Malamute_Coat_Fur"
# Extract baseColor image texture from original Tripo material
base_tex_img = None
if orig_mat.use_nodes:
    for n in orig_mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image:
            base_tex_img = n.image
            break
        elif n.type == 'BSDF_PRINCIPLED':
            n.inputs['Metallic'].default_value = 0.0
            n.inputs['Roughness'].default_value = 0.84
            if 'Sheen Weight' in n.inputs:
                n.inputs['Sheen Weight'].default_value = 0.42
            if 'Sheen Roughness' in n.inputs:
                n.inputs['Sheen Roughness'].default_value = 0.65

def clone_textured_mat(name, rough, metal, ior=1.45, sheen=0.0):
    m = orig_mat.copy()
    m.name = name
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Metallic'].default_value = metal
                n.inputs['Roughness'].default_value = rough
                if 'IOR' in n.inputs:
                    n.inputs['IOR'].default_value = ior
                if 'Sheen Weight' in n.inputs:
                    n.inputs['Sheen Weight'].default_value = sheen
    return m

mat_eyes = clone_textured_mat("Malamute_Cornea_Eyes", rough=0.06, metal=0.0, ior=1.48)
mat_nose = clone_textured_mat("Malamute_Wet_Nose", rough=0.18, metal=0.0, ior=1.45)
mat_collar = clone_textured_mat("Malamute_Silver_Collar", rough=0.22, metal=0.86, ior=1.50)

mesh_obj.data.materials.clear()
mesh_obj.data.materials.append(orig_mat)   # slot 0: Fur
mesh_obj.data.materials.append(mat_eyes)   # slot 1: Eyes
mesh_obj.data.materials.append(mat_nose)   # slot 2: Nose
mesh_obj.data.materials.append(mat_collar) # slot 3: Silver Collar

# Assign material slots to polygons based on anatomical coordinates
eye_l_center = Vector((0.395, 0.048, 0.768))
eye_r_center = Vector((0.395, -0.044, 0.768))
nose_center = Vector((0.495, 0.002, 0.718))

for poly in mesh_obj.data.polygons:
    c = poly.center
    if (c - eye_l_center).length < 0.034 or (c - eye_r_center).length < 0.034:
        poly.material_index = 1
    elif (c - nose_center).length < 0.038:
        poly.material_index = 2
    elif 0.14 < c.x < 0.30 and 0.45 < c.z < 0.62 and abs(c.y) < 0.16 and c.z < (0.58 - (c.x - 0.16) * 0.35):
        # Neck collar band area
        poly.material_index = 3
    else:
        poly.material_index = 0

# 7. Author 5 Real Expressive Morph Targets (Shape Keys) on Malamute_Body
if mesh_obj.data.shape_keys:
    mesh_obj.shape_key_clear()

sk_basis = mesh_obj.shape_key_add(name="Basis", from_mix=False)

# (1) Smile_Pant: Open lower jaw & lift mouth corners for joyful panting smile
sk_smile = mesh_obj.shape_key_add(name="Smile_Pant", from_mix=False)
for i, v in enumerate(mesh_obj.data.vertices):
    co = sk_basis.data[i].co
    # Lower jaw & tongue region: forward of x=0.31, below upper snout z=0.695, above neck z=0.58
    if co.x > 0.31 and 0.58 < co.z < 0.698 and abs(co.y) < 0.085:
        t = min(1.0, max(0.0, (co.x - 0.31) / 0.14))
        sk_smile.data[i].co = co + Vector((-0.006 * t, 0.0, -0.028 * t))
    # Mouth corners / cheeks lift slightly
    elif 0.30 < co.x < 0.42 and 0.68 < co.z < 0.74 and 0.04 < abs(co.y) < 0.10:
        t = min(1.0, (co.x - 0.30) / 0.10)
        sk_smile.data[i].co = co + Vector((0.0, (0.008 if co.y > 0 else -0.008) * t, 0.012 * t))

# (2) Ear_Perk: Alert upward & forward ear perk
sk_ears = mesh_obj.shape_key_add(name="Ear_Perk", from_mix=False)
for i, v in enumerate(mesh_obj.data.vertices):
    co = sk_basis.data[i].co
    if co.z > 0.79 and 0.20 < co.x < 0.38 and abs(co.y) > 0.03:
        t = min(1.0, (co.z - 0.79) / 0.12)
        sk_ears.data[i].co = co + Vector((0.016 * t, (0.006 if co.y > 0 else -0.006) * t, 0.028 * t))

# (3) Eye_Blink: Gentle peaceful eyelid close
sk_blink = mesh_obj.shape_key_add(name="Eye_Blink", from_mix=False)
for i, v in enumerate(mesh_obj.data.vertices):
    co = sk_basis.data[i].co
    dl = (co - eye_l_center).length
    dr = (co - eye_r_center).length
    d = min(dl, dr)
    if d < 0.042:
        t = (1.0 - d / 0.042) ** 1.5
        sk_blink.data[i].co = co + Vector((0.004 * t, 0.0, -0.018 * t))

# (4) Chest_Breath: Deep warm chest & ruff breathing expansion
sk_breath = mesh_obj.shape_key_add(name="Chest_Breath", from_mix=False)
for i, v in enumerate(mesh_obj.data.vertices):
    co = sk_basis.data[i].co
    if -0.18 < co.x < 0.30 and 0.30 < co.z < 0.68:
        tx = 1.0 - abs(co.x - 0.06) / 0.25
        tz = 1.0 - abs(co.z - 0.48) / 0.20
        w = max(0.0, tx) * max(0.0, tz)
        if w > 0:
            n = v.normal
            sk_breath.data[i].co = co + Vector((n.x * 0.014 * w, n.y * 0.020 * w, -0.010 * w))

# (5) Tail_Fluff: Joyful plumed tail lift & fluff expansion
sk_tail = mesh_obj.shape_key_add(name="Tail_Fluff", from_mix=False)
for i, v in enumerate(mesh_obj.data.vertices):
    co = sk_basis.data[i].co
    if co.x < -0.32 and co.z > 0.22:
        t = min(1.0, (-0.32 - co.x) / 0.16)
        sk_tail.data[i].co = co + Vector((0.015 * t, v.normal.y * 0.018 * t, 0.036 * t))

# Ensure all shape key values default to 0.0
for kb in mesh_obj.data.shape_keys.key_blocks:
    kb.value = 0.0

# 8. Build 4 Clean Beveled 3D Accessories in Blender and skin them to the Armature
def make_pbr_mat(name, rgba, rough=0.35, metal=0.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emission and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return m

mat_gold = make_pbr_mat("Acc_Gold_PBR", (0.96, 0.78, 0.32, 1.0), rough=0.18, metal=0.92, emission=(0.96, 0.78, 0.32, 1.0), emission_strength=0.18)
mat_pink = make_pbr_mat("Acc_Pink_PBR", (0.96, 0.44, 0.62, 1.0), rough=0.38, metal=0.05)
mat_halo = make_pbr_mat("Acc_Halo_PBR", (1.0, 0.90, 0.62, 1.0), rough=0.15, metal=0.2, emission=(1.0, 0.86, 0.50, 1.0), emission_strength=1.6)
mat_scarf = make_pbr_mat("Acc_Scarf_PBR", (0.82, 0.18, 0.16, 1.0), rough=0.82, metal=0.0)

def bind_accessory_to_bone(obj, bone_name):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    obj.parent = arm
    mod = obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm

# Accessory 1: Acc_StarTag (Chest collar star locket at x=0.295, y=0.0, z=0.475)
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.032, depth=0.010, location=(0.298, 0.0, 0.472), rotation=(0.0, math.radians(72), 0.0))
star_obj = bpy.context.active_object
star_obj.name = "Acc_StarTag"
bm = bmesh.new()
bm.from_mesh(star_obj.data)
for v in bm.verts:
    ang = math.atan2(v.co.y, v.co.x)
    idx = int(round((ang + math.pi) / (2 * math.pi / 10))) % 10
    if idx % 2 == 1:
        v.co.x *= 0.52
        v.co.y *= 0.52
bm.to_mesh(star_obj.data)
bm.free()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
star_obj.data.materials.append(mat_gold)
bind_accessory_to_bone(star_obj, "tripo::Spine_0")

# Accessory 2: Acc_PinkWindmill (Right collar pinwheel at x=0.255, y=-0.135, z=0.555)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.014, location=(0.255, -0.138, 0.555))
hub_obj = bpy.context.active_object
hub_obj.data.materials.append(mat_gold)
blades = [hub_obj]
for k in range(6):
    ang = k * (math.pi / 3.0)
    dy = 0.026 * math.cos(ang)
    dz = 0.026 * math.sin(ang)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.255 - 0.008, -0.138 + dy, 0.555 + dz))
    bl = bpy.context.active_object
    bl.scale = (0.004, 0.022, 0.010)
    bl.rotation_euler = (ang + 0.35, 0.25, 0.0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bl.data.materials.append(mat_pink if k % 2 == 0 else mat_gold)
    blades.append(bl)
bpy.ops.object.select_all(action='DESELECT')
for o in blades:
    o.select_set(True)
bpy.context.view_layer.objects.active = hub_obj
bpy.ops.object.join()
hub_obj.name = "Acc_PinkWindmill"
bind_accessory_to_bone(hub_obj, "tripo::Head_0")

# Accessory 3: Acc_WarmHalo (Floating golden halo above head at x=0.31, y=0.0, z=0.955)
bpy.ops.mesh.primitive_torus_add(
    align='WORLD',
    location=(0.315, 0.0, 0.955),
    rotation=(0.0, math.radians(-8), 0.0),
    major_radius=0.095,
    minor_radius=0.0085,
    major_segments=36,
    minor_segments=12,
)
halo_obj = bpy.context.active_object
halo_obj.name = "Acc_WarmHalo"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
halo_obj.data.materials.append(mat_halo)
bind_accessory_to_bone(halo_obj, "tripo::Head_1")

# Accessory 4: Acc_RedBandana (Sculpted warm red neck scarf around neck ruff)
bpy.ops.mesh.primitive_torus_add(
    align='WORLD',
    location=(0.205, 0.0, 0.535),
    rotation=(0.0, math.radians(52), 0.0),
    major_radius=0.145,
    minor_radius=0.022,
    major_segments=32,
    minor_segments=12,
)
scarf_obj = bpy.context.active_object
scarf_obj.name = "Acc_RedBandana"
bm = bmesh.new()
bm.from_mesh(scarf_obj.data)
for v in bm.verts:
    # Pull front bib of bandana forward/downward into triangular kerchief point
    if v.co.x > 0.24 and abs(v.co.y) < 0.09:
        factor = (1.0 - abs(v.co.y) / 0.09) * min(1.0, (v.co.x - 0.24) / 0.08)
        v.co.z -= 0.065 * factor
        v.co.x += 0.028 * factor
bm.to_mesh(scarf_obj.data)
bm.free()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
scarf_obj.data.materials.append(mat_scarf)
bind_accessory_to_bone(scarf_obj, "tripo::Spine_0")

# 9. Author 7 Anatomically Grounded Quadruped NLA Actions on Malamute_Armature
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'
    pb.location = (0, 0, 0)
    pb.rotation_euler = (0, 0, 0)
    pb.scale = (1, 1, 1)

def reset_pose():
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)

def bake_clip(name, frame_end, pose_fn):
    act = bpy.data.actions.new(name=name)
    act.use_fake_user = True
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    reset_pose()
    key_bones = [
        "tripo::Root", "tripo::Spine_0", "tripo::Head_0", "tripo::Head_1", "tripo::Head_2",
        "bone_20", "bone_21", "bone_26", "bone_27", "bone_28",
        "bone_30", "bone_31", "bone_32",
        "tripo::1_Left_Limb_0", "tripo::1_Left_Limb_1",
        "tripo::0_Right_Limb_0", "tripo::0_Right_Limb_1",
        "bone_34", "tripo::1_Right_Limb_0"
    ]
    pbs = {bname: arm.pose.bones.get(bname) for bname in key_bones if arm.pose.bones.get(bname)}
    for f in range(1, frame_end + 1):
        sc.frame_set(f)
        reset_pose()
        phase = (f - 1) / float(frame_end - 1) * (2.0 * math.pi)
        pose_fn(pbs, phase, f, frame_end)
        for pb in pbs.values():
            pb.keyframe_insert(data_path="rotation_euler", frame=f)
            pb.keyframe_insert(data_path="location", frame=f)
    # Push to NLA track so glTF exporter exports all 7 clips cleanly
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name=name, start=1, action=act)
    strip.name = name
    arm.animation_data.action = None

# Clip 1: Idle_Breathe (Calm breathing, gentle head look, soft tail sway, feet planted)
def anim_idle(pbs, ph, f, total):
    pbs["tripo::Spine_0"].rotation_euler = (0.0, 0.025 * math.sin(ph), 0.015 * math.cos(ph))
    pbs["tripo::Head_0"].rotation_euler = (0.02 * math.sin(ph), 0.035 * math.cos(ph), 0.04 * math.sin(ph))
    pbs["tripo::Head_1"].rotation_euler = (0.045 * math.sin(ph), 0.02 * math.cos(ph), 0.03 * math.sin(ph))
    pbs["tripo::Head_2"].rotation_euler = (0.0, 0.04 * (0.5 + 0.5 * math.sin(ph * 2)), 0.0)
    pbs["bone_34"].rotation_euler = (0.14 * math.sin(ph * 2), 0.05 * math.cos(ph), 0.16 * math.sin(ph * 2))
    pbs["tripo::1_Right_Limb_0"].rotation_euler = (0.18 * math.cos(ph * 2), 0.0, 0.18 * math.sin(ph * 2))

# Clip 2: Walk_Trot (Balanced diagonal trot gait, steady head, no front-leg-head bug!)
def anim_walk(pbs, ph, f, total):
    s = math.sin(ph * 2)
    c = math.cos(ph * 2)
    pbs["tripo::Spine_0"].rotation_euler = (0.02 * s, 0.025 * abs(c), 0.02 * s)
    pbs["tripo::Head_0"].rotation_euler = (0.0, -0.03 * abs(c), 0.02 * s)
    # Front Left + Rear Right pair vs Front Right + Rear Left pair (rotation around local Y/Z swing)
    pbs["bone_26"].rotation_euler = (0.0, 0.24 * s, 0.0)
    pbs["bone_27"].rotation_euler = (0.0, max(0.0, -0.22 * c), 0.0)
    pbs["bone_30"].rotation_euler = (0.0, -0.24 * s, 0.0)
    pbs["bone_31"].rotation_euler = (0.0, max(0.0, 0.22 * c), 0.0)
    pbs["tripo::1_Left_Limb_0"].rotation_euler = (0.0, -0.22 * s, 0.0)
    pbs["tripo::1_Left_Limb_1"].rotation_euler = (0.0, max(0.0, 0.18 * c), 0.0)
    pbs["tripo::0_Right_Limb_0"].rotation_euler = (0.0, 0.22 * s, 0.0)
    pbs["tripo::0_Right_Limb_1"].rotation_euler = (0.0, max(0.0, -0.18 * c), 0.0)
    pbs["bone_34"].rotation_euler = (0.22 * s, 0.08, 0.20 * c)

# Clip 3: Run_Bound (Joyful bounding canter with tail high)
def anim_run(pbs, ph, f, total):
    s = math.sin(ph * 2)
    c = math.cos(ph * 2)
    pbs["tripo::Spine_0"].rotation_euler = (0.0, 0.08 * s, 0.0)
    pbs["tripo::Head_0"].rotation_euler = (0.0, -0.06 * s, 0.0)
    pbs["bone_26"].rotation_euler = (0.0, 0.34 * s, 0.0)
    pbs["bone_30"].rotation_euler = (0.0, 0.34 * math.sin(ph * 2 + 0.5), 0.0)
    pbs["tripo::1_Left_Limb_0"].rotation_euler = (0.0, -0.32 * s, 0.0)
    pbs["tripo::0_Right_Limb_0"].rotation_euler = (0.0, -0.32 * math.sin(ph * 2 + 0.5), 0.0)
    pbs["bone_34"].rotation_euler = (0.30 * c, 0.16, 0.26 * s)

# Clip 4: Head_Tilt (Curious head tilt while all 4 paws remain 100% planted)
def anim_tilt(pbs, ph, f, total):
    tilt = math.sin(ph)
    pbs["tripo::Head_0"].rotation_euler = (0.14 * tilt, 0.05 * abs(tilt), 0.08 * tilt)
    pbs["tripo::Head_1"].rotation_euler = (0.28 * tilt, -0.04 * abs(tilt), 0.10 * tilt)
    pbs["bone_20"].rotation_euler = (0.15 * abs(tilt), 0.0, 0.0)
    pbs["bone_21"].rotation_euler = (-0.15 * abs(tilt), 0.0, 0.0)
    pbs["bone_34"].rotation_euler = (0.20 * math.sin(ph * 2), 0.06, 0.18 * math.cos(ph * 2))

# Clip 5: Shake_Paw (Right front paw lifts warmly to greet owner)
def anim_paw(pbs, ph, f, total):
    lift = math.sin(ph * 0.5) # smooth arch from 0 -> 1 -> 0 across clip
    wave = math.sin(ph * 3) * lift
    pbs["tripo::Spine_0"].rotation_euler = (0.0, -0.05 * lift, 0.0)
    pbs["tripo::Head_0"].rotation_euler = (0.06 * lift, 0.06 * lift, -0.05 * lift)
    pbs["bone_30"].rotation_euler = (0.06 * lift, -0.52 * lift + 0.10 * wave, 0.0)
    pbs["bone_31"].rotation_euler = (0.0, 0.28 * lift + 0.12 * wave, 0.0)
    pbs["bone_34"].rotation_euler = (0.26 * math.sin(ph * 3), 0.10 * lift, 0.24 * math.cos(ph * 3))

# Clip 6: Play_Bow (Front chest bows down playfully, tail wags fast)
def anim_bow(pbs, ph, f, total):
    bow = math.sin(ph * 0.5)
    pbs["tripo::Spine_0"].rotation_euler = (0.0, 0.22 * bow, 0.0)
    pbs["tripo::Head_0"].rotation_euler = (0.0, -0.26 * bow, 0.05 * math.sin(ph * 2))
    pbs["bone_26"].rotation_euler = (0.0, 0.36 * bow, 0.0)
    pbs["bone_27"].rotation_euler = (0.0, -0.32 * bow, 0.0)
    pbs["bone_30"].rotation_euler = (0.0, 0.36 * bow, 0.0)
    pbs["bone_31"].rotation_euler = (0.0, -0.32 * bow, 0.0)
    pbs["bone_34"].rotation_euler = (0.38 * math.sin(ph * 4), 0.20 * bow, 0.34 * math.cos(ph * 4))

# Clip 7: Rest_Watch (Peaceful settled posture with slow breathing)
def anim_rest(pbs, ph, f, total):
    pbs["tripo::Spine_0"].rotation_euler = (0.0, 0.04 + 0.015 * math.sin(ph), 0.0)
    pbs["tripo::Head_0"].rotation_euler = (0.03 * math.sin(ph), 0.08, 0.04 * math.cos(ph))
    pbs["tripo::Head_1"].rotation_euler = (0.05 * math.sin(ph), 0.06, 0.0)
    pbs["bone_34"].rotation_euler = (0.08 * math.sin(ph), -0.05, 0.08 * math.cos(ph))

bake_clip("Idle_Breathe", 48, anim_idle)
bake_clip("Walk_Trot", 40, anim_walk)
bake_clip("Run_Bound", 32, anim_run)
bake_clip("Head_Tilt", 48, anim_tilt)
bake_clip("Shake_Paw", 48, anim_paw)
bake_clip("Play_Bow", 48, anim_bow)
bake_clip("Rest_Watch", 48, anim_rest)

reset_pose()
sc.frame_set(1)
bpy.context.view_layer.update()

# 10. Select only Armature + Mesh + 4 Accessories and export production GLB
export_objs = [arm, mesh_obj, star_obj, hub_obj, halo_obj, scarf_obj]
bpy.ops.object.select_all(action='DESELECT')
for o in export_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm

bpy.ops.export_scene.gltf(
    filepath=OUT_PRO_GLB,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=False,
    export_morph=True,
    export_skins=True,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_extras=True,
)

# 11. Render 4 Diagnostic Camera Views in Blender (EEVEE / Workbench high-contrast studio preview)
# Create studio lights & camera in PetMemorial_Malamute_v2 for inspection renders
world = bpy.data.worlds.get("MemorialStudioWorld") or bpy.data.worlds.new("MemorialStudioWorld")
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.09, 0.09, 0.11, 1.0)
    bg.inputs[1].default_value = 0.85
sc.world = world

for l_name, loc, energy in [
    ("KeyLight", (1.6, -1.8, 1.6), 180.0),
    ("FillLight", (-1.5, -1.2, 1.1), 90.0),
    ("RimLight", (-1.2, 1.6, 1.5), 140.0),
]:
    ld = bpy.data.lights.new(l_name, 'AREA')
    ld.energy = energy
    ld.size = 1.5
    lo = bpy.data.objects.new(l_name, ld)
    sc.collection.objects.link(lo)
    lo.location = loc
    lo.rotation_euler = (Vector((0.0, 0.0, 0.45)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

cam_data = bpy.data.cameras.new("DiagCam")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("DiagCam", cam_data)
sc.collection.objects.link(cam_obj)
sc.camera = cam_obj

sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in sc.render.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
sc.render.resolution_x = 960
sc.render.resolution_y = 720
sc.render.resolution_percentage = 100

target_center = Vector((0.0, 0.0, 0.46))
for view_name, cam_pos, focus_pt in [
    ("overview_3_4", (1.25, -1.35, 0.82), Vector((0.0, 0.0, 0.46))),
    ("closeup_surface", (0.85, -0.68, 0.72), Vector((0.26, 0.0, 0.66))),
    ("low_angle_grounding", (1.15, -1.25, 0.14), Vector((0.0, 0.0, 0.34))),
]:
    cam_obj.location = Vector(cam_pos)
    cam_obj.rotation_euler = (focus_pt - cam_obj.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = str(RENDER_DIR / f"blender_{view_name}.png")
    bpy.ops.render.render(write_still=True)

print(json.dumps({
    "status": "ok",
    "out_glb": OUT_PRO_GLB,
    "materials": [m.name for m in mesh_obj.data.materials],
    "shape_keys": [k.name for k in mesh_obj.data.shape_keys.key_blocks],
    "accessories": [o.name for o in [star_obj, hub_obj, halo_obj, scarf_obj]],
    "nla_tracks": [t.name for t in arm.animation_data.nla_tracks],
}, ensure_ascii=False))
'''

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(120.0)
    s.connect(("127.0.0.1", 9876))
    payload = {"type": "execute_code", "params": {"code": BLENDER_CODE}}
    s.sendall(json.dumps(payload).encode("utf-8"))
    chunks = []
    while True:
        try:
            d = s.recv(65536)
            if not d:
                break
            chunks.append(d)
            raw = b"".join(chunks).decode("utf-8")
            obj = json.loads(raw)
            print(raw)
            break
        except json.JSONDecodeError:
            continue
    s.close()

if __name__ == "__main__":
    main()
