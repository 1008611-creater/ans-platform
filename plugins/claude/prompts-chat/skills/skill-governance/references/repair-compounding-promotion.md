# 修复后复利晋级

当用户要求把一次已经验证有效的第二遍修复沉淀进对应 Skill 路由时，使用本文件。它是提示词正文和晋级合同的唯一权威来源；不要把全文复制到其他 Skill。

## 目录

1. 使用边界
2. 可复制提示词
3. 晋级决定
4. 固定产物
5. 离线验收样例
6. 真实使用观察与机器化门

## 1. 使用边界

- 只在用户人工触发后执行，不自动监听所有任务。
- 先复核实际第一遍、第二遍和最终证据，再决定是否沉淀。
- 不把一次偶然成功、未验证猜测或临时环境事实升级成永久规则。
- 优先修改最窄的现有 owner；不要创建重复 Skill。
- 能由机器稳定判断的规则优先进入 test、lint、preflight 或 audit。
- 沉淀本身不授权重新生成内容、付费 Provider、生产部署、DNS、删除数据、余额账本或外部发布。

## 2. 可复制提示词

```text
请把这次已经验证有效的修复沉淀到对应的 skill 路由中，不要让“第一遍没做好、第二遍找到根因后做好”的经验只停留在当前聊天。

先复核实际过程和最终证据，然后完成以下工作：

1. 说明第一遍为什么会自然做错：是 skill 路由、Source of Truth、入口、版本、素材、执行顺序、真实 Preview、验收标准，还是把中间状态误判为完成。
2. 说明第二遍依靠什么证据定位根因，并区分代码/结构证据、集成证据和真实交付证据。
3. 提炼一条“如果提前执行，就能在第一次交付前发现问题”的检查或执行规则。
4. 在以下决定中只选一个：
   - no_promotion：证据不足、偶然事件或没有可复用规律；
   - project：只适用于当前项目；
   - domain：适用于同类任务；
   - global：已在多个不同领域验证；
   - machine_gate：能够稳定由 test、lint、preflight 或 audit 判断。
5. 只修改最窄、最权威的位置；不要重复已有规则，不要用全局治理覆盖项目或领域专业合同。
6. 写入的规则必须说明：触发条件、权威输入、正确顺序、真实 Preview/质量门、完成证据、停止条件、授权边界和必要回滚。
7. 检查与新规则冲突的旧入口、旧服务器、旧域名、旧路径、旧 Provider 事实和旧 Source of Truth。确认过期的更新或删除；仍有历史价值的明确标为“历史信息，不得作为当前入口”。
8. 如果修改了 Skill，检查 frontmatter 触发、reference 路径和冲突内容，运行 quick_validate，并对实际修改运行 post-coding-review。
9. 最后按固定产物格式报告：根因、关键证据、前置检查、晋级决定、实际修改、冲突清理、验证等级、下次触发点、未晋级内容。

约束：
- 不要只输出复盘报告；确认可复用后要实际修改对应 skill/reference/test。
- 不要写事故流水账。
- 不要保存密码、Cookie、授权码、API Key、SSH 私钥、临时 URL、一次性 task ID 或其他凭据。
- 不要把未验证猜测或单次抽卡升级为永久规则。
- 没有可复用规律时明确选择 no_promotion，不要为了完成任务强行修改 Skill。
- 不得因沉淀自动启动付费生成、部署生产、修改 DNS、删除数据、修改账本或扩大原任务范围。
```

## 3. 晋级决定

按以下优先顺序选择一个 owner：

1. `machine_gate`：规则客观、稳定、可离线或低风险检测。
2. `project`：依赖当前项目的服务器、素材合同、页面入口、业务约束或用户偏好。
3. `domain`：在同类任务中可复用，但不应影响其他领域。
4. `global`：至少在多个不同项目或领域得到真实证据支持。
5. `no_promotion`：证据不足、一次性波动、无法归因或不会复现。

若机器门禁需要专业领域语义，由领域/项目 Skill 说明规则，机器门禁负责执行；不要把二者视为互斥的重复文档。最终 `promotion_decision` 仍记录为 `machine_gate`，并列出其权威领域 owner。

## 4. 固定产物

每次执行必须返回：

```text
根因:
关键证据:
前置检查:
晋级决定: no_promotion | project | domain | global | machine_gate
权威 owner:
实际修改:
冲突清理:
验证等级: structural | integrated | real_delivery
下次触发点:
未晋级内容:
未授权且未执行的副作用:
```

验证等级只声明已获得的最高等级：

- `structural`：文件、schema、静态合同或离线检查通过。
- `integrated`：真实组件间路径通过，但没有最终用户/Provider 交付。
- `real_delivery`：授权范围内的最终产物、回执、QA 和交付均已读回。

## 5. 离线验收样例

### RC-WEB-UI

事实：网站图片写了 `object-fit: contain`，但真实页面仍裁切；第二遍通过计算样式、图片与容器矩形和正式页面截图定位为布局约束问题。

期望：`promotion_decision=machine_gate`，权威 owner 是当前项目网站 Skill，机器门禁负责检查矩形越界。不得修改 AI 视频全局 Skill，不得自动部署生产。

### RC-AI-VIDEO

事实：第一遍人物/服装漂移；第二遍通过权威参考图职责、提示词合同和真实输出 QA 确认根因。

期望：`promotion_decision=domain`，权威 owner 是对应 AI 视频专业 Skill，其 prompt contract 或 QA gate 承载规则。不得因沉淀自动重新付费生成；单次抽卡差异不得晋级全局默认。

### RC-TRANSIENT

事实：一次网络或 Provider 波动自行恢复，没有稳定复现、明确根因或可归因修复。

期望：`promotion_decision=no_promotion`，权威 owner 为空，只保留任务记录；不得创建永久 Skill 规则、重启服务或切换 Provider。

## 6. 真实使用观察与机器化门

人工触发版本上线后，观察接下来的 3–5 次真实第二遍修复。使用现有 `skill-use-log.md` 或当前项目的非秘密记忆记录：

```text
task:
selected_owner:
promotion_decision:
evidence_level:
over_promoted: true | false
under_promoted: true | false
rework_reduced_next_time: true | false | unknown
machine_decidable_candidate:
```

只有同类检查在真实任务中重复证明客观、稳定、低风险后，才进入选择性机器化。主观审美、单次 Provider 质量、临时网络波动和用户一次性偏好继续由专业 Skill 与真实 Preview 判断。

阶段 3/4 的状态必须诚实标注：建立观察机制不等于完成 3–5 次真实观察；写出机器化候选不等于验证或上线机器门禁。
