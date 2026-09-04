# 原创AI视频资产清单合同

## 建立规则

按角色服装/伤妆状态、重复空间、剧情关键道具和视频段落起点去重。先建所有 `P0`，再按实际镜头消费决定 `P1/P2`。每个资产只有一种职责，不为同一人物生成多张互相竞争的身份卡。

## 最小清单

```json
{
  "project_id": "...",
  "source_type": "novel | script | original_idea",
  "assets": [
    {
      "asset_id": "A_CHAR_NCY_HOME_01",
      "kind": "character | scene | prop | first_frame | storyboard",
      "asset_stage": "identity_master | character_sheet | scene | prop | first_frame | storyboard",
      "priority": "P0 | P1 | P2",
      "purpose": "...",
      "source_basis": ["source fact or screenplay locator"],
      "creative_fill": ["only original design choices"],
      "required_shot_ids": ["S01-A"],
      "continuity_state": "...",
      "depends_on": ["asset_id"],
      "reference_role": "what downstream may reference and what it may not",
      "generation_mode": "text_to_image | image_to_image",
      "aspect_ratio": "16:9 | 9:16",
      "resolution": "2k",
      "generation_prompt": "...",
      "negative_prompt": "... or null",
      "lifecycle_state": "planned | prompt_ready | submitted | downloaded | qa_pending | accepted | rejected | blocked",
      "qa_status": "prepared | accepted | rejected",
      "used_by_shots": ["S01-A"]
    }
  ]
}
```

## 状态版本

同一人不同服装、伤妆、年龄或无法由视频自然完成的状态必须拆成独立 `asset_id`，但都回指同一通过的身份母图。相同空间的昼夜或布置变化仅在空间几何不变时作为该场景状态卡；几何改变则建立新场景卡。道具状态变化只在剧本规定的时点发生。

## 命名

使用 `A_{KIND}_{ROLE/SPACE}_{STATE}_{NN}`，例如：`A_CHAR_NCY_HOME_01`、`A_SCENE_NING_BEDROOM_NIGHT_01`、`A_PROP_ART_LEDGER_CLOSED_01`、`A_FF_S01_A_01`。名称只用于清单和引用，不进入生成画面文字。

## 资产包完成条件

本段视频所需的每个 P0 资产必须为 `accepted`；首帧若需要图生视频也必须为 `accepted`。P1/P2 未生成时只能声明未使用，不得用不存在的资产 ID 或计划图冒充参考图。
