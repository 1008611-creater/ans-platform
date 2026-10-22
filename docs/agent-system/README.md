# ANS 全站 Agent 与垂直子 Agent（产品设计 · 2026-10-22）

> 目标：学生从「冒出需求」到「需求被解决」的每一步，都由 Agent 走完；
> 老板点进任何一个界面，先看到的是**能看懂的详情图**，而不是一堆表格和按钮。

配套图（可交互 HTML，直接用浏览器打开）：

- [全站 Agent 与垂直子 Agent 架构](./ans-agent-architecture.html) — 组件、边界、计费与证据链
- [学生从想法到解决的最短路径](./ans-agent-journey.html) — 8 步主路径与授权/结算分支

## 一、现状（已经有的，不是从零开始）

| 已有能力 | 代码位置 | 说明 |
|---|---|---|
| 单一 Agent 入口 | `src/components/mascot/dino-guide.tsx` + `use-companion-agent.ts` | 任意页面右下角小恐龙，NDJSON 事件流 |
| Agent 接口 | `src/app/api/mascot/agent/route.ts` | `quote` / `execute` / `status` 三个动作 |
| 工具注册表 | `src/server/companion/tools.ts` 的 `AGENT_TOOLS` | current_page / site_help / search_projects / search_workflows / my_projects / my_tasks / credits / claim_daily_benefit / play_claw_arcade / scaffold_project_draft / redeem_market_item |
| 报价与授权 | `prepareAgentQuote` + ticket + `ANS_MODEL_BILLING_POLICY` | 先报价、一次性授权、可撤销 |
| 计量与结算 | `codex-gateway.ts` `meteredResponses` | 预留 → 上游 → 按回执结算 → 对账 |
| 详情图 | archify（architecture / workflow / sequence / lifecycle / dataflow） | 自包含可交互 HTML，本目录两张即样例 |

**缺口**：现在是「一个通用 Agent + 一堆平铺工具」，没有领域分工、没有领域详情图、也没有把"走完全程"作为成功判据。

## 二、目标形态

### 1 个全站 Agent（Orchestrator）

只做四件事，不抢子 Agent 的活：

1. **接住需求**：读当前页面上下文（`current_page`）+ 用户一句话；
2. **选对子 Agent**：按页面路由表决定由谁接手（见下表）；
3. **管钱与授权**：统一报价、一次性授权、跨子 Agent 共用一套账；
4. **保证有结果**：子 Agent 失败时由它决定「换个工具重试 / 换子 Agent / 诚实告知」。

### 7 个垂直子 Agent

| 子 Agent | 入口页面 | 专属工具（新增） | 交付的详情图 | 成功判据 |
|---|---|---|---|---|
| 项目 Agent | /explore, /projects | search_projects、compare_projects、draft_project_plan | 技术栈图、项目对比表、路线图 | 学生选定 1 个项目并拿到下一步动作 |
| Hub Agent | /hubs | list_hubs、explain_hub_chain | Hub 关系图（架构） | 学生进入正确的 Hub 链 |
| 社区 Agent | /community | search_threads、summarize_thread | 讨论脉络图（时序） | 学生的问题在社区已有答案或被提出 |
| 竞赛 Agent | /competitions | agri_rules_lookup、check_eligibility、submit_application | 赛程与资格流程图（工作流/生命周期） | 报名状态推进到下一节点 |
| 市场 Agent | /market | list_listings、explain_product_scope、prepare_purchase | 交付物与边界图（数据流） | 学生清楚买到什么、怎么交付 |
| 工作台 Agent | /workspace | run_workflow、read_run_status、render_artifact | 执行时序图 + 产出物预览 | 任务跑到终态并拿到产物 |
| 治理 Agent | 发布相关 | gitflow_status、open_pr、check_gates、deploy_plan | gitflow 图、发布门禁图（工作流） | PR 合并 + 发布成功 + 回滚入口在手 |

> 每个子 Agent = 一份**领域提示词** + 一个**工具白名单** + 一个**详情图模板** + 一条**成功判据**。
> 没有成功判据的子 Agent 不许上线 —— 否则又变成"聊完就散"。

## 三、交互机制（这条路必须被走完）

1. **接住**：学生在任何页面说一句话，或点页面上的快捷动作；页面上下文自动成为输入。
2. **不问废话**：默认不问。只有缺**关键参数**（比如竞赛报名缺组别）时才问，且**只问一个**。
3. **先算钱**：给出"本轮预计不超过 N 积分"，一次性授权可记住，随时可撤销。
4. **出计划**：子 Agent 用一句话说明"我要做哪几步"，然后直接开始，不等确认。
5. **自己动手**：调专属工具读真实数据、写草稿、跑构建；**不编造**。
6. **留证据**：产出物统一渲染成详情图（架构 / gitflow / 时序 / 生命周期），点进去能下钻。
7. **过门禁**：自检 + 项目门禁（typecheck / 测试 / 权威账本）；不绿不交付。
8. **交付与结算**：结果交到手上（草稿 / 文件 / PR），按上游回执结算，可对账。

失败时**必须诚实**：说明哪一步没成、有没有花钱、下一步能做什么（现有 `agent-turn-status` 已按这个原则做）。

## 四、落地分期

### P0（1–2 天，可独立验证）
- 路由表 + 子 Agent 注册表（`src/server/companion/subagents.ts`）：领域 → 工具白名单 → 详情图模板 → 成功判据；
- 全站 Agent 只做路由，工具集按子 Agent 收窄（**先把「工作台 Agent」接通**，因为它的成功判据最硬：任务到终态）；
- 详情图渲染工具 `render_diagram`（封装 archify，产物落 `public/artifacts/`）。

### P1（3–5 天）
- 补齐项目 / 竞赛 / 市场三个子 Agent 的专属工具与详情图；
- 「一次授权记住」扩到跨子 Agent；
- 详情图作为**页面级首屏**：每个领域页顶部放该领域的架构图/流程图（学生先看懂再动手）。

### P2（1–2 周）
- 治理 Agent（gitflow / PR / 发布门禁）对外开放给有权限的同学；
- 详情图从"结果"升级为"过程"：执行中实时刷新当前步骤的时序图。

## 五、门禁与风险

| 风险 | 处理 |
|---|---|
| 计费错乱 | 所有子 Agent 共用 `prepareAgentQuote` + ticket，禁止各自算钱 |
| 工具越权 | 每个子 Agent 只拿白名单工具；私有数据仍需 `privateAccess` 显式授权 |
| 静默回退 | 详情图与门禁结果随 PR 一起留档；权威账本 `A-AGENT-*` 条目守护 |
| 上游不稳 | 已加可观测性日志 + 模型不可用时的诚实文案（#199/#202/#203） |
| 磁盘/容量 | 发布前磁盘守卫（A-RELEASE-03） |

## 六、验收方式

每个子 Agent 上线前必须给出：

1. 一段**真实对话录屏/截图**：从一句话到拿到结果；
2. 一张**详情图 HTML**（本目录格式），能点开、能下钻；
3. 一条**成功判据的自动化检查**（例如工作台 Agent：任务状态到 `SETTLED` 且产物存在）。
