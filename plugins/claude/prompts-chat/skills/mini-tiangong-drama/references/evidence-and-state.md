# 小而美交接与证据状态

## 事实类型

| 标记 | 含义 | 是否可供下游消费 |
|---|---|---|
| `source_fact` | 原文明确事实，有章节定位 | 可以 |
| `adaptation_keep` | 为辨识度保留的原作内容 | 可以 |
| `adaptation_merge` | 多个原作事件合并 | 可以，需注明影响范围 |
| `adaptation_trim` | 为容量删减 | 可以，需证明不破坏因果 |
| `影视化补强` | 为可拍性新增动作/对白/承接 | 可以，但不能冒充原文 |
| `unverified` | 证据不足或冲突未决 | 不可以 |
| `candidate` | 候选资产或候选片段 | 不可以 |
| `accepted` | 通过用户或质量门确认 | 可以 |

## project_state 最小字段

```yaml
project_state:
  project_id: "稳定编号"
  title: "剧名"
  source_version: "小说/剧本版本"
  stage: "蒸馏|结构|剧本|资产|分镜|视频|验收"
  approved_gates: []
  decisions: []
  blockers: []
  next_action: "唯一下一动作"
```

## asset_manifest 最小字段

```yaml
asset_manifest:
  - asset_id: "A01"
    category: "角色|状态|场景|道具|首帧"
    name: "用户可读名称"
    version: "v1"
    status: "候选|待确认|已确认|淘汰"
    source_basis: "章节或剧本场次"
    dependencies: []
    reference_role: "锁身份|锁空间|锁道具状态|锁首帧"
    approved_by_user: false
```

## continuity_ledger 最小字段

```yaml
continuity_ledger:
  - lock_id: "L01"
    scope: "集/场/镜头"
    wardrobe_state: "服装与状态"
    prop_state: "道具位置与变化"
    spatial_state: "站位、轴线、地标"
    lighting_state: "主光方向与色温"
    audio_state: "对白、环境声、音乐"
    source: "剧本事实|用户确认|已验收片段"
```

## 交接硬规则

1. 只有 `source_fact`、已确认改编决策和 `accepted` 资产可成为连续性事实。
2. 缺少章节依据、版本号、asset_id 或用户裁决时，写入 `blockers`，不猜测。
3. 候选不覆盖既有事实；返工保留 `rejection_reason` 和最早失败变量。
4. 每次交接只保留一个 `next_action`，不把多个未排序愿望当计划。
5. 真实出图、视频生成、重做和发布必须另行取得当次授权。
