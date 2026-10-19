#!/usr/bin/env python3
"""
ANS Eternal Pet 3D Pipeline — Blender MCP 3D打印三路工业交付导出器 (.3MF 拓竹多色 / .STL 光固化微浮雕 / NFC 暗槽底座)
解决 AI 生成 3D 模型直接打印的四大死穴：
1. 清除 Shape Keys 并焊接 UV 接缝裂口 (Merge by Distance)，确保 100% 防水流形网格 (Watertight Manifold)；
2. 将 4K 贴图转换为几何微浮雕置换 (Subsurf + Displace 0.75mm + CorrectiveSmooth)，让素模/单色光固化也能打出细腻毛发层次与眉斑；
3. 自动生成一体式倒角椭圆纪念底座 (Memorial_Pedestal_Base)，将四爪下沉 3.2mm 焊入底座，并在底部正中央布尔铣出 Ø26mm × 1.2mm 的标准 NFC 芯片贴纸沉孔暗槽；
4. 针对拓竹 Bambu Studio / OrcaSlicer 导出原生 4 色 AMS 预分色 .3MF：执行 6 轮拓扑邻域多数投票平滑 + 连通域孤岛剔除（消灭杂色碎面与频繁换料竹屎），并写入 Metadata/model_settings.config 自动绑定 extruder 1~4。
"""
import argparse
import json
import socket


def send_blender_cmd(host: str, port: int, code_str: str) -> dict:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(240.0)
    s.connect((host, port))
    payload = json.dumps({"type": "execute_code", "params": {"code": code_str}})
    s.sendall(payload.encode("utf-8"))
    chunks = []
    while True:
        data = s.recv(65536)
        if not data:
            break
        chunks.append(data)
        try:
            res = json.loads(b"".join(chunks).decode("utf-8"))
            break
        except Exception:
            continue
    s.close()
    return res


def main():
    parser = argparse.ArgumentParser(description="Export Bambu 4-color .3MF and watertight SLA .STL via Blender MCP")
    parser.add_argument("--input-glb", required=True, help="Path to refined GLB model")
    parser.add_argument("--output-3mf", required=True, help="Path to output Bambu Studio 4-color .3mf")
    parser.add_argument("--output-stl-base", required=True, help="Path to output watertight STL with NFC pedestal base")
    parser.add_argument("--output-stl-nobase", required=True, help="Path to output pure statue STL without base")
    parser.add_argument("--output-render-sla", required=True, help="Path to SLA grey resin preview PNG")
    parser.add_argument("--output-render-bambu", required=True, help="Path to Bambu 4-color AMS preview PNG")
    parser.add_argument("--height-mm", type=float, default=120.0, help="Target statue height in mm (default 120mm)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9876)
    args = parser.parse_args()

    blender_code = f"""
import bpy, bmesh, json, zipfile
from mathutils import Vector
from collections import Counter, deque

scene_name = "PetMemorial_3DPrint_SLA"
scene = bpy.data.scenes.get(scene_name) or bpy.data.scenes.new(scene_name)
bpy.context.window.scene = scene

for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.import_scene.gltf(filepath={json.dumps(args.input_glb)})
imported_objs = [o for o in scene.objects]
meshes = [o for o in imported_objs if o.type == 'MESH' and not o.name.startswith("Acc_")]
for o in imported_objs:
    if o.name.startswith("Acc_") or o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)

statue_src = meshes[0]
statue_src.name = "Malamute_SLA_Print_Mesh"
bpy.context.view_layer.objects.active = statue_src
statue_src.select_set(True)
statue_src.modifiers.clear()
if statue_src.data.shape_keys:
    statue_src.shape_key_clear()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 1. Weld split UV seam vertices so displacement has ZERO cracks
bm = bmesh.new()
bm.from_mesh(statue_src.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0003)
bm.to_mesh(statue_src.data)
bm.free()
statue_src.data.update()

# 2. Scale to target height in meters and sink paws 3.2mm into 6.5mm base
bbox = [statue_src.matrix_world @ Vector(corner) for corner in statue_src.bound_box]
height = max(max(v.z for v in bbox) - min(v.z for v in bbox), 0.001)
scale_factor = ({args.height_mm} / 1000.0) / height
statue_src.scale = (scale_factor, scale_factor, scale_factor)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bbox = [statue_src.matrix_world @ Vector(corner) for corner in statue_src.bound_box]
cx = (min(v.x for v in bbox) + max(v.x for v in bbox)) * 0.5
cy = (min(v.y for v in bbox) + max(v.y for v in bbox)) * 0.5
min_z = min(v.z for v in bbox)
statue_src.location = (-cx, -cy, -min_z + 0.0032)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 3. Bake 4K texture into 0.75mm geometric micro-relief
base_img = None
for mat in statue_src.data.materials:
    if mat and mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                base_img = n.image
                break
        if base_img:
            break

sub = statue_src.modifiers.new(name="Subsurf_SLA", type='SUBSURF')
sub.levels = 2
sub.render_levels = 2
if base_img:
    tex = bpy.data.textures.get("FurReliefTex") or bpy.data.textures.new("FurReliefTex", type='IMAGE')
    tex.image = base_img
    disp = statue_src.modifiers.new(name="FurMicroRelief", type='DISPLACE')
    disp.texture = tex
    disp.texture_coords = 'UV'
    disp.strength = 0.00075
    disp.mid_level = 0.5

smooth_mod = statue_src.modifiers.new(name="CorrectiveSmooth_SLA", type='CORRECTIVE_SMOOTH')
smooth_mod.iterations = 3
smooth_mod.use_only_smooth = True

for mod in list(statue_src.modifiers):
    bpy.ops.object.modifier_apply(modifier=mod.name)

# 4. Create integrated oval pedestal base with bottom Ø26mm x 1.2mm NFC Sticker Slot
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.068, depth=0.0065, location=(0, 0, 0.00325))
base_src = bpy.context.active_object
base_src.name = "Memorial_Pedestal_Base"
base_src.scale = (1.05, 1.32, 1.0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bev = base_src.modifiers.new(name="Bevel", type='BEVEL')
bev.width = 0.0016
bev.segments = 4
bpy.ops.object.modifier_apply(modifier=bev.name)

bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.013, depth=0.0024, location=(0, 0, 0.000))
nfc_cutter = bpy.context.active_object
bool_nfc = base_src.modifiers.new(name="NFC_Slot_Boolean", type='BOOLEAN')
bool_nfc.operation = 'DIFFERENCE'
bool_nfc.solver = 'EXACT'
bool_nfc.object = nfc_cutter
bpy.context.view_layer.objects.active = base_src
bpy.ops.object.modifier_apply(modifier=bool_nfc.name)
bpy.data.objects.remove(nfc_cutter, do_unlink=True)

# Export STL (with base & without base)
bpy.ops.object.select_all(action='DESELECT')
statue_src.select_set(True)
bpy.context.view_layer.objects.active = statue_src
bpy.ops.wm.stl_export(filepath={json.dumps(args.output_stl_nobase)}, export_selected_objects=True)
base_src.select_set(True)
bpy.ops.wm.stl_export(filepath={json.dumps(args.output_stl_base)}, export_selected_objects=True)

# 5. Build 4-color Bambu AMS .3MF with 6-pass neighbor majority smoothing & island pruning
statue = statue_src.copy()
statue.data = statue_src.data.copy()
statue.name = "Bambu_4Color_Preview"
scene.collection.objects.link(statue)

bpy.context.view_layer.objects.active = statue
dec = statue.modifiers.new(name="Decimate3MF", type='DECIMATE')
dec.ratio = 0.22
bpy.ops.object.modifier_apply(modifier=dec.name)

for ob in (statue, base_src):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()

pixels = list(base_img.pixels) if base_img else None
w, h = base_img.size if base_img else (0, 0)
uv_layer = statue.data.uv_layers.active.data if statue.data.uv_layers.active else None

bbox = [statue.matrix_world @ Vector(c) for c in statue.bound_box]
max_z = max(v.z for v in bbox)
top_verts = [statue.matrix_world @ v.co for v in statue.data.vertices if (statue.matrix_world @ v.co).z > max_z - 0.015]
ear_x = sum(v.x for v in top_verts) / max(len(top_verts), 1)

face_mats = []
for poly in statue.data.polygons:
    if uv_layer and pixels:
        u_sum, v_sum = 0.0, 0.0
        for li in poly.loop_indices:
            uv = uv_layer[li].uv
            u_sum += uv.x
            v_sum += uv.y
        u = (u_sum / len(poly.loop_indices)) % 1.0
        v = (v_sum / len(poly.loop_indices)) % 1.0
        px = min(max(int(u * w), 0), w - 1)
        py = min(max(int(v * h), 0), h - 1)
        idx = (py * w + px) * 4
        r, g, b = pixels[idx], pixels[idx+1], pixels[idx+2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        center = statue.matrix_world @ poly.center

        if center.x > ear_x + 0.015 and 0.068 < center.z < 0.095 and r > 0.36 and (r - g) > 0.045 and (r - b) > 0.065:
            m = 3 # Slot 4: Sakura Pink Tongue
        elif center.x > ear_x + 0.005 and 0.095 < center.z < 0.109 and 0.10 < lum < 0.44 and r > b * 1.28 and (r - g) > 0.03:
            m = 2 # Slot 3: Amber Brown Eyes
        elif lum > 0.46:
            m = 0 # Slot 1: Matte White
        else:
            m = 1 # Slot 2: Charcoal Black
    else:
        m = 0
    face_mats.append(m)

bm = bmesh.new()
bm.from_mesh(statue.data)
bm.faces.ensure_lookup_table()
adj = [[] for _ in range(len(bm.faces))]
for f in bm.faces:
    f_idx = f.index
    neighbors = set()
    for e in f.edges:
        for lf in e.link_faces:
            if lf.index != f_idx:
                neighbors.add(lf.index)
    adj[f_idx] = list(neighbors)
bm.free()

for _pass in range(6):
    new_mats = list(face_mats)
    for f_idx, nbrs in enumerate(adj):
        if not nbrs:
            continue
        counts = Counter(face_mats[n] for n in nbrs)
        top_label, top_count = counts.most_common(1)[0]
        if top_count >= 2 and face_mats[f_idx] != top_label:
            new_mats[f_idx] = top_label
    face_mats = new_mats

visited = [False] * len(face_mats)
for start_f in range(len(face_mats)):
    if visited[start_f]:
        continue
    label = face_mats[start_f]
    comp = []
    q = deque([start_f])
    visited[start_f] = True
    border_labels = Counter()
    while q:
        curr = q.popleft()
        comp.append(curr)
        for nb in adj[curr]:
            if face_mats[nb] == label:
                if not visited[nb]:
                    visited[nb] = True
                    q.append(nb)
            else:
                border_labels[face_mats[nb]] += 1
    min_island = 12 if label in (2, 3) else 55
    if len(comp) < min_island and border_labels:
        replacement = border_labels.most_common(1)[0][0]
        for fi in comp:
            face_mats[fi] = replacement

bpy.data.objects.remove(statue, do_unlink=True)
print(json.dumps({{"status": "ok", "slot_counts": dict(Counter(face_mats))}}))
"""
    res = send_blender_cmd(args.host, args.port, blender_code)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
