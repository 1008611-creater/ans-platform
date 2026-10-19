---
name: ans-eternal-pet-3d-pipeline
description: >-
  ANS (AI Never Stops) 宠物 3D 打印定制手办（拓竹 4 色 AMS .3MF / 光固化微浮雕 .STL / WJP 全彩树脂 .GLB）与电子永生手机桌宠全链路商业管线 Skill。
  涵盖：生前照片特征锁死 -> Image 2.5 正交 2x2 四视图 -> Tripo H3.1 四槽重建 -> Blender MCP 四足骨骼修复、四分区 PBR 材质、五态形态键 (Shape Keys) 烘焙 ->
  Blender MCP 防水微浮雕手办导出（含 UV 裂口焊接、0.75mm 毛发几何浮雕、底座 Ø26mm NFC 芯片暗槽、拓竹 Bambu Studio 4 色邻域平滑预分色 .3MF） ->
  手机端 9:16 口袋桌宠（Kajiya-Kay 多层体积毛发渲染）与朋友圈 AI 跨时空重逢合照生成。
  当用户需要将宠物照片制作为 3D 打印手办、手机/桌面 3D 纪念桌宠、定制纪念空间或 AI 跨时空合照时激活本技能。
metadata:
  version: "2.0.0"
---

# ANS 宠物 3D 打印定制手办 & 电子永生手机桌宠商业级全流程 (`ans-eternal-pet-3d-pipeline`)

本技能定义了 **ANS (`AI Never Stops`)** 面向宠物定制赛道的核心商业闭环：**「以实体 3D 打印手办（拓竹多色 `.3MF` / 光固化微浮雕 `.STL` / WJP 全彩树脂 `.GLB`）为高客单价主品，以底座 NFC 一碰唤醒『手机竖屏 3D 桌宠』+『朋友圈 AI 跨时空重逢合照』为高情绪价值赠品与私域裂变抓手」**。

---

## 零、三大产品与工程铁律（严禁违背）

1. **严禁擅自给用户的宠物起名字**：
   - 如果用户没有明确说出宠物的名字，**严禁自己编造名字**！界面与文案中统一使用温暖克制的称呼（如**「大宝贝」「它」**或品种名），把命名权 100% 留给主人。
2. **严禁拿 AI 原始模型直接交付网页或直接去 3D 打印（必翻车）**：
   - **网页端翻车点**：Tripo / Meshy / 混元 3D 导出的原始 GLB 是一整张 `Roughness=0.9` 的死塑料网格，且四足动物自动绑骨常把前腿误挂在头颈骨骼下；必须走 **阶段三（Blender MCP 骨骼拓扑精修 + 四分区 PBR + 五态 Shape Keys + WebGL Kajiya-Kay 体积毛发）**。
   - **3D 打印翻车点**：AI 模型的眉斑和毛发全在彩色贴图里，单色打印出来会变成“光滑塑料块”，且 UV 岛接缝处顶点未焊接（一细分就裂开），直接导出普通 `.3mf` 还会因贴图噪点产生上千个孤立碎色面导致拓竹 AMS 疯狂换料吐竹屎；必须走 **阶段四（Blender MCP 防水焊接 + 0.75mm 贴图转几何微浮雕 + 6 轮拓扑邻域平滑分色 `.3MF` + 底座 `Ø26mm` NFC 暗槽）**。
3. **产品交互遵循「移动端优先 + 零工程黑话」**：
   - 普通宠主极少用电脑，核心陪伴场景必须在 **手机端（9:16 竖屏口袋桌宠，支持贴在手办底座的 NFC 芯片一碰即开）**；
   - 界面严禁出现 `ACT-01`、`tripo::Spine_0` 等冰冷工程代码。

---

## 一、全链路 5 阶段标准管线（End-to-End Architecture）

```
[阶段 1: 多图特征拼接锁死与解剖级 3/4 主视图生成]
  用户 3~8 张生前照片 ──► 解剖特征锁死清单（双白眉斑/琥珀瞳色/颈部白月牙/肩部黑马鞍/体侧斜白带/四肢白靴/拱起白尾羽/银链项圈）
                      ──► 将正脸特写 + 左侧奔跑 + 右侧站姿 + 背尾特写拼合成 1 张 2×2 实拍拼图 (ref_running_composite.png，裁掉干扰背景小狗)
                      ──► ⚠️【核心避坑铁律】：非对称动态姿势（如奔跑/跳跃）严禁生成 2×2 四视图喂给 multiview-3d！（2D 模型在四宫格中会把长毛犬腿长压缩成柯基短腿、把弯曲前腿画成无关节棉花球，且左右视图手性镜像矛盾 + 正背视图透视遮挡会导致 3D 空间切割切出双肩肉瘤残肢！）
                      ──► 正确做法：使用 image2.5genskill (--ref ref_running_composite.png) 生成单张 1024×1024 纯白底「3/4 黄金侧斜角全身奔跑主视图」(running-hero-anatomical.png)，强制要求：
                          ① 地面到肘部腿长 = 肩高 48%~50%（修长矫健真狗比例，拒绝短腿化）；
                          ② 四条腿与四只脚掌在剪影中 100% 独立分离（中间必须有纯白 #FFFFFF 空气间隙），完整展现肩→肘→前臂→前腕(carpus)→前掌、大腿→膝(stifle)→小腿→后飞节(tarsus)→后跖骨(metatarsus)→后掌；
                          ③ 提交独立审查 Subagent 执行像素扫描线间距与犬科解剖复核（得分 ≥ 9.5/10 方可进入 3D 重建）。

[阶段 2: Tripo Studio 双轨最优参数重建 + 6 视角 Subagent 盲审门禁]
  解剖级基准图 ──┬─► 【轨道 A：骨骼桌宠轨 (P2.0 四边面满配 · 实测骨骼拓扑最优)】
               │      model: "Nexus-v2.0-20260801" (P2.0) | quad: true (22,085 真实四边面) | face_limit: 25000 | texture_quality: "detailed" (含 4K Color + 4K Normal + 4K MetallicRoughness)
               │      ──► animate_rig (rig_model_version: "v3.0-20260909") 自动生成 40 根四足骨骼（前肢原生挂在 Spine_2，自带独立耳骨/下颌骨/舌骨）
               │
               └─► 【轨道 B：3D打印奔跑手办轨 (H3.1 image-to-3d 超清雕刻几何 + 200万面拉满)】
                      调用 `tripo_studio_cli.py image-to-3d --auto-fix` | model: "v3.1-20260211" (H3.1) | geometry_quality: "detailed" | face_limit: 2000000 (实测产出 1,936,486 面 / 968,244 顶点！) | texture_quality: "detailed" (4K)
                      ──► 利用 H3.1 原生 3D 四足先验从单张解剖级主视图重建修长、四肢完全分离、带黑色肉垫与飞节的 193 万面超清雕塑
                      ──► 【强制门禁】：在 Blender MCP 中将 `rotation_mode` 设为 `'XYZ'` 标定尺寸后，渲染无底座 6 视角解剖检视卡 (`front / back / right_side / left_side / bottom_legs / three_quarter`)，交由独立 Subagent 盲审四肢比例、关节与脚掌分离度（≥ 9.5/10 方可导出打印件）。

[阶段 3: Blender MCP 数字桌宠精修 (scripts/refine_quadruped_blender_mcp.py)]
  Blender MCP (127.0.0.1:9876) ──► 1. 修复四足前肢骨骼父级（从 Head_0 重挂回 Spine_0 并清洗胸腿权重）
                               ──► 2. 拆分 4 大物理材质区（毛发 / 角膜 IOR 1.48 / 湿鼻 / 金属项圈）
                               ──► 3. 烘焙 5 个面部与呼吸形态键 (Smile_Pant / Ear_Perk / Eye_Blink / Chest_Breath / Tail_Fluff)
                               ──► 4. 烘焙 7 条四足 NLA 骨骼动画 + 蒙皮配饰，导出 malamute_pro.glb
                               ──► 5. 调用 render_glb_rig_morph_states.py 生成五态检视卡与三视角实机渲染图

[阶段 4: Blender MCP 3D 打印三路交付（三点自然着地力学配平 + Ø26mm NFC 底座）]
  Blender MCP ──► 1. Merge by Distance (0.08mm) 焊接全部 UV 接缝裂口 + 清洗前爪脚趾微小贴图色斑
              ──► 2. 三点自然着地配平（零突兀支撑柱）：通过微调俯仰角 (`pitch_rad`) 让右前伸爪、左后支撑爪与右后蹬地爪三点同时下沉 2.3mm 稳稳植入 6.5mm 椭圆倒角底座（仅左前爪自然腾空迈步，彻底告别胸口突兀的第五条腿圆锥支撑柱！），底座正下方中心布尔铣出 Ø26mm×1.2mm NFC 贴纸暗槽
              ──► 3. 三路工业格式一键导出：
                    ├─ ① 拓竹 Bambu Studio 4 色 AMS 预分色文件 (malamute_running_bambu_4color.3mf，面部 2 轮轻平滑保双白眉斑 + 身体 16 轮连续场平滑 + 孤岛吸收 + Metadata extruder 1~4 映射)
                    ├─ ② 光固化 SLA / FDM 防水雕刻文件 (malamute_running_sla_base.stl 带底座 / malamute_running_nobase.stl 纯奔跑主体)
                    └─ ③ WJP 白墨全彩树脂直喷文件 (malamute_running_h31_max.glb 含 193.6 万面超清几何与 4K 贴图，0 人工手绘成本)

[阶段 5: 手机端 9:16 口袋桌宠 + 朋友圈 AI 跨时空合照]
  ├─ 手机竖屏 3D 桌宠：Kajiya-Kay 各向异性高光 + 6 层 Shell Fur 体积毛发 + 触屏抚摸部位射线检测 + NFC 底座唤醒
  └─ 朋友圈裂变赠品：image2.5genskill (--ref 生前正脸照) 生成夕阳抚摸跨时空重逢拍立得合照 + 一键复制朋友圈走心文案
```

---

## 二、阶段四核心技术细节：为什么普通 AI 模型打印必翻车？我们如何解决？

### 1. 解决 UV 接缝裂口（非流形破面）与单色打印“变光滑塑料块”
- **问题根源**：AI 生成的 3D 模型在 UV 岛边界处顶点是断开的，且表面是平滑低模，眉斑和毛发全靠彩色贴图欺骗眼睛。一旦导出 `.stl` 做单色光固化或 FDM 打印，不仅表面裂开，连眉毛和胸毛也完全消失。
- **Blender MCP 标准解法**：
  1. 先对静态打印副本执行 `statue.shape_key_clear()`；
  2. 执行 `bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0003)` 将断开的 UV 边界顶点 100% 焊死为防水流形网格（Watertight Manifold）；
  3. 挂载 2 级 `SUBSURF` + `DISPLACE`（读取 4K 贴图亮度，`strength = 0.00075` 即 `0.75mm` 物理浮雕深度）+ 3 轮 `CORRECTIVE_SMOOTH`，把眉斑、胸前分界线和长毛簇真正雕刻成凹凸有致的实体几何起伏！

### 2. 解决拓竹 Bambu Studio `.3mf` 多色识别失败与“满身杂色碎面 / 疯狂换料吐竹屎”
- **问题根源**：
  1. 如果只按每个三角面的 UV 像素亮度做生硬阈值切分，毛发贴图里的阴影杂色会产生**几千个孤立的单三角面色块**，导致拓竹 AMS 在每一层都要频繁切换 4 次耗材，打印时间暴增 3 倍且表面像迷彩服一样斑驳；
  2. Bambu Studio / OrcaSlicer 导入外部 `.3mf` 时常忽略单网格的 `<basematerials>`，必须拆分为组件 (`<components>`) 并附带 `Metadata/model_settings.config` 的 `<metadata key="extruder" value="1..4"/>`。
- **Blender MCP 标准解法**：
  1. 在 `bmesh` 中构建全模型三角面共享边邻接表 (`adj`)，对初始 4 色分类（`1号哑光白` / `2号炭黑` / `3号琥珀暖棕` / `4号樱花粉舌头`）执行 **6 轮拓扑邻域多数投票平滑（Topological Majority Smoothing）**，彻底消灭孤立杂色碎面，让双白眉斑、黑脸罩、粉舌头与白胸毛形成干净连贯的色块；
  2. 将 4 个颜色区写入 `.3mf` 的 4 个子对象 (`object id="1..4"`)，通过父装配体 (`object id="5"`) 组合，并在 ZIP 包内写入 `Metadata/model_settings.config` 自动映射 `extruder="1..4"`。

### 3. 底座预留 `Ø26mm × 1.2mm` 标准 NFC 芯片暗槽
- 市售标准 NTAG213/215 NFC 圆形不干胶贴纸直径为 `25mm`、厚度约 `0.8mm`。
- 脚本在 `6.5mm` 厚的椭圆倒角底座正下方中心 (`z = 0..1.2mm`) 自动用布尔差集铣出一个 **`Ø26mm × 1.2mm` 的圆形沉孔暗槽**。打印完成后直接把 NFC 贴纸贴入沉孔内，底座放在桌面上完全平整不跷脚，手机一碰底座即可弹出手机竖屏桌宠页面。

---

## 三、配套自动化脚本与快速调用

### 1. Blender MCP 四足骨骼修复 + 四分区材质 + 五态 Shape Keys 精修
```bash
python3 /Users/eeo/Downloads/ans/.agents/skills/ans-eternal-pet-3d-pipeline/scripts/refine_quadruped_blender_mcp.py \
  --input-glb /path/to/tripo_rigged.glb \
  --output-glb /path/to/malamute_pro.glb \
  --render-dir /path/to/public/renders
```

### 2. Blender MCP 3D 打印三路文件导出（拓竹 4 色 `.3MF` + 光固化 `.STL` + NFC 底座暗槽）
```bash
python3 /Users/eeo/Downloads/ans/.agents/skills/ans-eternal-pet-3d-pipeline/scripts/export_watertight_3dprint_stl.py \
  --input-glb /path/to/malamute_pro.glb \
  --output-3mf /path/to/malamute_bambu_multicolor.3mf \
  --output-stl-base /path/to/malamute_3Dprint_sla.stl \
  --output-stl-nobase /path/to/malamute_3Dprint_nobase.stl \
  --output-render-sla /path/to/blender_3dprint_sla_resin.png \
  --output-render-bambu /path/to/blender_bambu_4color_preview.png \
  --height-mm 120
```

### 3. WebGL Kajiya-Kay 各向异性体积毛发与眼神光渲染配方
详见 [`references/webgl-fur-and-shader-recipe.md`](references/webgl-fur-and-shader-recipe.md)。

---

## 四、全局最优双轨管线与无上下文 Subagent 盲审门禁（Spec A1–A5）

经两位无上下文独立 Subagent（**3D 犬科解剖与几何审查员** + **零上下文全链路优化架构师**）两轮对抗式盲审验证，针对不对称动态姿势（如奔跑、跳跃）与桌宠绑骨，必须执行以下全局最优工程规范：

### 1. 动态手办为什么严禁用 2D AI 生成 2×2 四视图跑 `multiview-3d`？
- **根因（手性反转 + 正交视外壳冲突）**：2D 图像模型生成奔跑等不对称动作的 `2×2` 四视图时，极易将 `left` 与 `right` 槽位的迈腿前后手性画成镜像冲突（如左前腿在左视图向前、在右视图向后），且正面/背面正交投影中长毛遮挡腿部间隙，导致 `multiview-3d` 发生**正交视外壳相交坍缩（Visual Hull Carving Collapse）**，切出断脚桩或双肩畸形。
- **全局最优解法（Single-Hero `H3.1 Detailed` + Blender MCP 定向几何修正）**：
  1. 使用 `image2.5genskill` 结合多张生前全身照生成 **单张四肢 100% 完整分离、比例修长、无遮挡的 3/4 奔跑主视图**（经解剖盲审 $\ge 9.5/10$ 过线后去背）；
  2. 调用 `tripo_studio_cli.py image-to-3d --model v3.1-20260211 --geometry-quality detailed --face-limit 2000000 --texture-quality detailed --auto-fix` 直出 **193.6 万面超清几何网格**；
  3. **Blender MCP 五步精雕修正（`Spec A1–A5`）**：
     - **`Spec A1` 尾部横向羽流压缩（消除单图背侧球形膨胀）**：单视角 `image-to-3d` 会将看不见的尾巴背面膨胀成宽达 `50mm` 的圆球（松果状）。必须在 Blender MCP 中对尾部羽流区（`z > 0.060, x < -0.028`）执行**纯横向 $Y$ 轴双侧对称收敛（压缩比 `0.48×`，宽度从 `50.06mm` 收窄至 `~25mm` 窄于臀宽）+ 背尾根炭黑毛色过渡**，**严禁对四肢/臀部做 $X$ 轴位移或拉普拉斯平滑**，确保 4 只脚掌与后腿肌肉线条 100% 锐利原生；
     - **`Spec A2` 配件级高密度 3D 银色铁链项圈与圆环建模**：生前佩戴的金属铁链项圈与前胸圆环在 AI 体素重建中易糊入颈毛，必须在 Blender MCP 中沿颈部斜切面通过射线吸附生成 **44 节正交咬合的 3D 银色环链 (`Malamute_Silver_Collar_Mesh`) + 胸前垂挂圆环 (O-Ring)**，并合并导出至 `.STL` / `.3MF` / `.GLB`；
     - **`Spec A3` 拓竹 4 色 `.3MF` 地标锁定分色（Landmark-Locked Quantization）**：在邻域多数投票与碎岛清除（`< 40` 面）之前，必须先用 3D 空间球体/包围盒将**左右双眼黑瞳孔核心（`r <= 0.52mm`，2号炭黑）+ 琥珀虹膜环（`0.52mm < r <= 1.12mm`，3号琥珀暖棕）**以及**整片伸出舌叶（4号樱花粉）**加入 `locked_polys` 保护集，防止远端眼睛因三角面少被黑毛吞噬、或舌头上半部因高光泛白变成白斑；
     - **`Spec A4` Blender MCP 高速像素读写规范**：处理 4K 贴图（`4096×4096`）时，严禁使用 `list(base_img.pixels)`（耗时 `>15s`），必须使用 `numpy` 的 `base_img.pixels.foreach_get(arr)` 与 `foreach_set(arr)`（耗时 `<0.05s`）；操作 glTF 导入对象旋转前必须先设 `obj.rotation_mode = 'XYZ'`。
     - **`Spec A5` 零上下文 6 视角正交盲审门禁**：任何 3D 模型交付前必须渲染 `front / back / left_side / right_side / bottom_legs / hero_3_4` 六联正交审查图，交由无上下文 Subagent 逐项核验四肢、尾型、项圈与分色。

