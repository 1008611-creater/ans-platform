# Output Template

Use this structure unless the user asks for a different format.

```markdown
# EPXXX 中外语双语转绘生产包

项目：
源视频：
源片参数：
目标时长：
目标语言/市场：
制作口径：
资料来源：

## 1. 核心剧情还原

用 2-5 段说明这一集发生了什么、每个冲突如何推进、结尾卡点是什么。不要写营销简介，要写制作团队能执行的剧情逻辑。

## 2. 本土化总原则

- 人名映射：
- 家族/机构/地点映射：
- 关系词处理：
- 必须替换的中文视觉元素：
- 目标市场表达风格：

## 3. 角色本土化表

| 原片功能 | 原片身份 | 本土化姓名 | 关系与设定 | 年龄感 | 声音方向 | 服装/连续性 |
| --- | --- | --- | --- | --- | --- | --- |

## 4. 时间轴拉片表（校对参考）

| Shot | 时间码 | 原片画面/构图 | 剧情功能 | 中文对白还原 | 目标语言对白 | 音频/表演锚点 | 本土化说明 | 穿帮风险 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 5. 目标语言制作脚本

### 场 1：地点 / 时间

人物：
动作：
情绪：
镜头节奏：
对白：

```text
Character: Target-language line.
```

本土化画面要求：
声音/字幕要求：

## 6. 转绘后分镜头提示词包

### 镜头总表

| Shot | 时间码 | 原片抽帧/音频锚点 | 转绘后剧情与对白 | 镜头功能 | 需生成帧 | 参考绑定/上传顺序 | 合并说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |

### 首帧 / 关键帧 / 尾帧 Image2 提示词

```text
画面职责：
参考绑定：
场景身份：
主体身份：
情绪：
光线：
镜头：
细节：
动作或变化：
负向约束：
```

### 全能参考生视频提示词

每条 copyable prompt 只保留以下三段：

```text
【基础设定】

【画面锚点与连接】

【声音】
```

参考图职责、上传顺序、限制说明写在镜头总表，不写进 copyable prompt body。

## 7. 支撑资产与转绘需求

人物资产：
场景资产：
道具资产：
UI/文字资产：

## 8. 穿帮与审核清单

- [ ] 叙事逻辑一致
- [ ] 目标时长合规
- [ ] 中文视觉信息全部替换
- [ ] 人物/服装/道具连续
- [ ] 口型和字幕可执行
- [ ] 每个需要生成的视频镜头都有首帧；动作转折、道具揭示、表情变化或承接剪辑处有关键帧/尾帧
- [ ] 每条生视频提示词都结合了抽帧图、对应音频和转绘后剧本
- [ ] 无平台水印、账号 ID、二维码、竞品 Logo

## 9. 技术校核摘要

视频参数：
ASR 文件：
镜头切分文件：
抽帧联系表：
校正说明：
```

## Compact Conversation Version

When the user asks to paste the answer directly into chat, keep the same sections but compress them:

1. episode info;
2. core story;
3. character localization;
4. timeline table;
5. production script;
6. shot-level frame and video prompts;
7. asset/risk checklist.

Prioritize usable shot prompts, dialogue, audio cues, and production constraints over long explanation. The timeline table is a QA reference, not the main deliverable.
