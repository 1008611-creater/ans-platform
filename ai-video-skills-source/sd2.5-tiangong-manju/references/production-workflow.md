# 天宫漫剧生产工作流

## 项目目录约定

每部天宫漫剧在工作区 `outputs/` 下建独立项目目录：

```
outputs/<项目名>_tiangong/
├── 00_champion_node_contract.md   # 节点封装合同（逐段入口/交付/验收/硬停点）
├── 01_input_packet.md             # 用户输入编译包
├── 02_knowledge_brief.md          # S1 输出
├── 03-05_screenwriter_*.md        # S2 剧本、故事圣经、分集结构
├── 06-14_asset_*.md               # S3 P0/P0A/P1/P2 与验收记录
├── asset_manifest.yaml            # 唯一资产清单
├── assets/characters|props|scenes/
├── 15+_shotlist_*.html            # S4 分镜页
├── continuity_ledger.yaml         # 连续性台账（S5 锁定）
├── prompts/video/                 # S5 I2V 图生视频提示词（6段/集）
├── assets/keyframes/              # S5 首帧/承接帧图
├── receipts/                      # 渠道回执
└── project_state.yaml             # 项目状态（段间交接）
```

三剧共用证据台账（`outputs/三剧制作证据台账.md`）照常追加：验收通过、明确阻塞、需要裁决三种结果必须先记台账再交接。

## 整剧闭环顺序

1. **一集样片闭环先行**：S1→S5 全链走通一集，候选片段验收 + 真实末状态确认后，才扩展其余集数。
2. 单集内部：先出该集全部关键资产（缺什么补什么，走 S3 增量批次），再拆镜，再按 6 段 30s 拆分出提示词。
3. 每集产出：提示词文件夹（6 个 .md）+ 资产图文件夹（角色/场景/道具/首帧），用户自行上传到 Dola 渠道。

## 出图渠道

- **默认渠道**：Midjourney（用户 2026-08-24 拍板）。三要素方法论见 [midjourney-workflow.md](midjourney-workflow.md)；MJ 提示词规则见 `design-xianxia-celestial-shots/references/midjourney-celestial-palace-rules.md`。提交流程由用户自行探索，主控产出可直接复制的 prompt+参数+参考图清单。
- 画幅对应：场景/巨构 `--ar 16:9`；竖版建立镜头/人物背影 `--ar 9:16`；超宽 `--ar 21:9`。
- **兜底渠道**：OpenLux `gpt-image-2-c`（`openlux-imagegen` Skill，用户已授予长期授权），无 MJ 渠道或需要本地直接出图（角色 3D 国漫母板等结构化定妆图）时使用。
- 兜底调用方式：`python scripts/generate_image.py --prompt "..." --size 1024x1536 --quality high --out output.png`；角色定妆图 1024x1536（3:4 竖版），场景母图 1024x1536（3:4 竖版），道具档案 1024x1024（方形）；一次一张，耗时 30-75 秒，超时 ≥300s。

## 视频交付方式

- **本 Skill 不直接提交视频生成任务**
- S5 产出两样东西交给用户：
  1. 提示词文件夹：每集 6 个 `.md` 文件（6 段 × 30s = 3 分钟）
  2. 资产图文件夹：已验收的角色/场景/道具/首帧图
- 用户自行上传到 Dola 渠道调用 Seedance 2.5 模型生成视频
- 用户回传视频后做候选验收

## 抖音发布规格

- 9:16 竖屏，单集 3 分钟（180s），拆为 6 段 30s；开篇 3 秒内出现冲突事实；每集结尾强钩子。
- 纯净底片（无字幕无 BGM）生成，配音/字幕/BGM 在剪映后期叠加，保证可改。
- AI 生成内容按平台要求做标识；不使用未授权 IP 元素。
- 发布前敏感信息检查：不泄露内部成本、提示词工程细节、渠道信息。

## 与原五冠军链的关系

- 本 Skill 是**天宫漫剧项目专属**的总控冠军；其他项目（含诛仙台续作、三剧）仍走原五冠军链，不受影响。
- 本 Skill 内部各段的工作段与验收门蒸馏自五冠军 2026-08 版本；五冠军升级时，只迁移仍然成立的判断规则，不自动覆盖本 Skill。
- 原 `sd2.5skill` 兼容入口、`hell-grind` Seedance 2.5 交付工作段、`chinese-celestial-palace`、`design-xianxia-celestial-shots`、`design-seedance-celestial-motion` 均作为本 Skill 的下级参考源继续存在，不被替代或改名。

## 断点续跑

用户说"继续"时：只读回查 `01_input_packet.md`、`project_state.yaml`、`asset_manifest.yaml`、`continuity_ledger.yaml`、最近台账，核对当前段位与最早缺口，报告"当前段位 / 当前准备执行的最小动作 / 预期可验收效果"后再动手。不凭聊天记忆推进。
