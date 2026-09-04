---
name: ai-video-champion-handoff
description: name: ai-video-champion-handoff
---

---
name: ai-video-champion-handoff
description: AI 短剧五冠军的总控说明与统一交接契约。用户需要判断当前该用哪位冠军、五个冠军分别做什么、何时接手、交付什么，或需要在冠军之间交接项目、资产和连续性事实时使用；下级 Skill 只能在用户明确批准后调用。
---

# AI 短剧冠军 Skill 统一交接契约

这是一份共享数据契约，不负责写剧本、生成资产或调用模型。五个冠军 Skill 构成唯一正式生产链，必须读取并遵守本文件；稳定字段名保留为机器接口，用户可见标签必须使用中文。

## 四个权威交接对象

### `project_state`（项目状态）

每次交接都必须携带同一个对象，不得另起一套“当前状态”字段：

```yaml
project_state:
  project_id: "稳定项目编号"
  title: "项目名称"
  source_version: "剧本或上游材料版本"
  stage: "剧本|资产|拆镜|导演提示|生成|剪辑|交付"
  approved_gates: ["已确认的阶段"]
  decisions: ["创作者已拍板的事实"]
  blockers: ["阻塞项；没有则为空数组"]
  next_action: "唯一下一动作"
```

### `asset_manifest`（资产清单）

资产只能用稳定 `asset_id` 交接，禁止用文件名或聊天顺序代替：

```yaml
asset_manifest:
  - asset_id: "稳定资产编号"
    category: "角色|状态|场景|道具|参考图|音频|视频"
    name: "用户可读名称"
    version: "资产版本"
    source: "上传|念念画布生成|外部导入"
    status: "候选|待确认|已确认|淘汰"
    dependencies: ["依赖的 asset_id"]
    approved_by_user: false
```

### `continuity_ledger`（连续性台账）

只记录已确认事实；每条锁定必须能定位到场次或镜头：

```yaml
continuity_ledger:
  - lock_id: "稳定锁定编号"
    scope: "场次或镜头编号"
    characters: ["asset_id"]
    wardrobe_state: "服装、妆发、伤口、年龄状态"
    prop_state: "道具位置、朝向、损坏状态"
    spatial_state: "人物、镜头、地标的相对位置"
    lighting_state: "光源方向、色温、反差"
    camera_state: "轴线、焦段、运动方向"
    audio_state: "对白、环境声、音乐连续性"
    source: "用户确认|已验收片段|剧本事实"
```

### `accepted_clip`（已验收片段）

只有用户确认或质量门通过后才能写入；生成任务刚完成时仍是候选片段：

```yaml
accepted_clip:
  clip_id: "稳定片段编号"
  shot_id: "镜头编号"
  task_id: "念念画布任务编号"
  asset_id: "注册到资产库的视频资产编号"
  duration_seconds: 15
  status: "候选|已验收|返工|淘汰"
  acceptance_note: "验收结论"
  rejection_reason: "返工原因；已验收时为空"
  parent_clip_id: "替换片段编号；没有则为空"
  continuity_snapshot: "写入片段时的连续性台账版本"
```

### `canvas_group_contract`（念念画布分组与连接合同）

念念画布只允许使用系统默认的五个顶层分组：`分镜`、`角色`、`场景`、`道具`、`声音`。项目分类、集数、镜头组和视频段只能作为这五组下的子组，不得新建自定义顶层分组。

```yaml
canvas_group_contract:
  top_level_groups: ["分镜", "角色", "场景", "道具", "声音"]
  custom_top_level_groups: false
  shot_subgroups:
    - group_id: "分镜/第1集/镜头组1"
      shot_ids: ["镜头编号"]
      video_node_ids: ["视频节点编号"]
      referenced_assets:
        - asset_id: "稳定资产编号"
          role: "首帧|角色|场景|道具|声音|参考"
          source_group: "角色|场景|道具|声音"
          linked: true
```

角色、场景、道具和声音资产保留在各自默认分组；凡被视频生产消费的资产，必须同时挂接到对应的`分镜`子组，并与视频节点、镜头编号和参考职责建立可回读的连接。画布不支持多父级时使用连接关系或资产引用，不重复上传制造第二份资产。缺少任一必需连接时，生产节点保持未就绪，不得提交视频任务。

## 任务选人

| 用户现在要解决什么 | 该用的冠军 | 交付到哪里 |
|---|---|---|
| “这些小说、参考图、导演资料里哪些规则能用？” | `knowledge-card-skill` | `knowledge_brief`，交给后续冠军 |
| “把创意/小说变成能拍的剧本，或改人物、结构、对白。” | `screenwriter` | 剧本、故事圣经、`project_state` |
| “剧本定了，确定导演基调、人物长相和关键道具。” | `chaoge-assets-trial` | 创作基准、角色/道具和 `asset_manifest` |
| “按剧本和资产逐镜头拍，决定机位、走位和镜头节奏。” | `shotlist-builder` | `shotlist`、连续性草案 |
| “提示词效果不稳，角色表演、物理、镜头或连续性要修。” | `hell-grind` | 最终提示词、锁定后的 `continuity_ledger` |

不要为了“看起来完整”跳过上游：没有资料事实先用知识卡；没有可拍剧本先用编剧；没有已确认角色与关键道具不拆镜；没有拆镜事实不做提示质控。

## 五个 Skill 的职责边界与交接

| Skill | 只负责 | 必须读取 | 必须输出 |
|---|---|---|---|
| `knowledge-card-skill` | 按需检索用户提供的资料，形成有来源的知识简报 | 当前任务与已确认事实 | `knowledge_brief`；不改写项目、资产或连续性事实 |
| `screenwriter` | 故事、人物、场次、对白和可拍摄剧本 | `project_state`、适用的 `knowledge_brief` | 更新后的 `project_state`、剧本、故事圣经 |
| `chaoge-assets-trial` | 角色/状态/关键道具参考资产 | `project_state`、剧本 | 更新后的 `project_state`、`asset_manifest` |
| `shotlist-builder` | 场次拆镜、空间走位、镜头和视频提示计划 | `project_state`、剧本、`asset_manifest` | 更新后的 `project_state`、`shotlist`、待写入的 `continuity_ledger` |
| `hell-grind` | 表演微动作、镜头运动、物理与提示质量控制 | `project_state`、`shotlist`、`asset_manifest`、`continuity_ledger` | 更新后的 `project_state`、最终图像/视频提示、锁定后的 `continuity_ledger` |

生成和剪辑节点还必须读入 `continuity_ledger`，并在任务完成后产生候选 `accepted_clip`；未验收片段不得反向成为连续性事实。

## 统一交接规则

1. 不复制字段：下游只引用上游对象，更新时保留未改变字段。
2. 不静默猜测：缺少 `project_id`、`asset_id`、版本或用户确认状态时暂停并指出缺口。
3. 不越权生成：五个冠军只编译计划和提示；图片/视频必须提交到念念画布任务链，由服务器登记任务、状态和资产。
4. 不丢失失败信息：`blockers`、`rejection_reason` 和返工版本必须保留。
5. 用户看到的阶段名、按钮、表格列、交付说明全部用中文；`project_state` 等稳定机器字段、模型名、文件扩展名和代码标识不翻译。
6. 正式链路外的 15 个下级 Skill 均为 `approval_required`：在读取或调用任一项之前，先向用户说明具体 Skill、用途和本次原因，等待明确批准；不得由总路由自动分派。
7. 进入念念画布生成前，必须先验证 `canvas_group_contract`：只存在五个默认顶层分组、视频素材已归入分镜子组、视频节点与镜头及全部参考资产均已连接；否则停在画布准备门，不把“已上传”当作“已连接”。

## 完整链路

```text
剧本输入
→ knowledge-card-skill
→ screenwriter
→ chaoge-assets-trial
→ shotlist-builder
→ hell-grind
→ 念念画布图像/视频生成任务
→ 候选片段
→ 连续性与质量验收
→ accepted_clip
→ 剪辑、声音、字幕、导出与交付
```
