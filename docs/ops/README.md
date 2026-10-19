# ANS (AI Never Stops) 核心运维、商业计费与生态台账归档目录

本目录存放 ANS (`AI Never Stops`, `https://ans.cauai.fun`) 平台及全矩阵子站的**商业计费总表、服务器拓扑运维手册、上游 AI 渠道台账**的 Git 版本控制基线（脱敏版），并与飞书在线云文档保持双向同步。

---

## 一、飞书在线云文档总入口（按优先级 P0 → P2）

| 优先级 | 文档名称 | 飞书在线云文档链接 | 仓库本地归档文件 |
| :--- | :--- | :--- | :--- |
| **P0** | **《ANS 全站积分定价、成本核算与毛利率总表（v3 含会员 1.2x~1.5x 算力膨胀）》** | [https://narcb9vct6.feishu.cn/wiki/OcX7wkPaYiOrPdkevmFcSaqBnbg](https://narcb9vct6.feishu.cn/wiki/OcX7wkPaYiOrPdkevmFcSaqBnbg) | [`ANS-全站积分定价与毛利率总表-20261019.md`](./ANS-全站积分定价与毛利率总表-20261019.md) |
| **P1** | **《ANS 全站服务器拓扑与运维急救手册（2026-10）》** | [https://my.feishu.cn/wiki/KPMvwxQ4LiREbkkJauUcj4NcnFh](https://my.feishu.cn/wiki/KPMvwxQ4LiREbkkJauUcj4NcnFh) | [`ANS-全站服务器拓扑与运维急救手册-20261020.md`](./ANS-全站服务器拓扑与运维急救手册-20261020.md) |
| **P2** | **《ANS 上游渠道台账与产品矩阵规范（2026-10）》** | [https://my.feishu.cn/wiki/DSCOwQZz8iWeVHkZ5WdcFBGvnth](https://my.feishu.cn/wiki/DSCOwQZz8iWeVHkZ5WdcFBGvnth) | [`ANS-上游渠道台账与产品矩阵规范-20261020.md`](./ANS-上游渠道台账与产品矩阵规范-20261020.md) |

---

## 二、GitHub 仓库归档目录说明

1. **ANS 主站全量源码与计费中枢**：
   - [`src/server/commerce/catalog.ts`](../../src/server/commerce/catalog.ts) — VibePlan 会员套餐（`1.21x ~ 1.50x` 算力积分膨胀）与单次充值包定义
   - [`src/server/quota/`](../../src/server/quota/) — ANS 统一算力积分账本（`User.quotaPoints` + `QuotaLedger`）
   - [`src/server/voice/service.ts`](../../src/server/voice/service.ts) — 小恐龙 Mimo V2.5 TTS 语音计费（1 积分/次，失败自动退回）
   - [`src/server/visual-model-jobs/`](../../src/server/visual-model-jobs/) & [`src/server/visual-four-view-jobs/`](../../src/server/visual-four-view-jobs/) — Tripo 3D 建模（20 积分/次）与 OpenLux 4K 正交四视图（5 积分/次）
2. **生态子站生产源码与基础设施配置归档（[`ecosystem-sites-archive/`](../../ecosystem-sites-archive/)）**：
   - [`hb-infinite-canvas-api/`](../../ecosystem-sites-archive/hb-infinite-canvas-api/) — `hb.cauai.fun` 无限画布后端（OpenLux `image2` / `image2.5sunburst` + 火山方舟 `sd2.5` / `sd2` / `sd2fast` + ANS 统一积分桥）
   - [`ans-exam-quota-bridge/`](../../ecosystem-sites-archive/ans-exam-quota-bridge/) — 跨站算力积分核销桥（`127.0.0.1:4318`）
   - [`image2-cauai/`](../../ecosystem-sites-archive/image2-cauai/) — `image2.cauai.fun` 案例库与生图工作台（`haika-niannian` 生产源码）
   - [`zsm-photo-shoot/`](../../ecosystem-sites-archive/zsm-photo-shoot/) — `zsm.cauai.fun` 知微影像 AI 合影站（`kaogong` 生产源码）
   - [`infra-systemd-nginx/`](../../ecosystem-sites-archive/infra-systemd-nginx/) — 核心节点 Nginx 站点配置归档
3. **自研 AI 视频、视觉与 UI 基线 Skills（[`ai-video-skills-source/`](../../ai-video-skills-source/)）**：
   - 完整归档 `ans-ui-ux-baseline`、`ans-brand-film-live-tour`、`ans-hyperframes-launch-video`、`ans-p5-brush-cartoon-animation`、`ans-eternal-pet-3d-pipeline`、`mg-styles-15`、`oil-ui`、`oil-frontend`、`oil-cover`、`oil-visual` 等 14 套核心 Skill。
