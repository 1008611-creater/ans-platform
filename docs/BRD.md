# ANS 业务需求文档（BRD）

> 历史业务设计。当前以 [2026-10-05 权威总纲](./ANS平台方向与落地路线图.md) 为准；保留事实、来源、私密和版本原则，不把未来领域当成本期任务。

> 状态：v1.1 决策稿（2026-09-26）  
> 下一版本验证：[V0.2 十人验证](./V0.2-十人验证.md)  
> 作用：把学生项目包落成业务能力、数据、流程、成本和治理规则  
> 上游：[市场需求文档](./MRD.md)、[产品需求文档](./PRD.md)  
> 架构基线：[架构说明](./architecture.md)、[ADR 0001](./adr/0001-workflow-dag.md)、[ADR 0002](./adr/0002-workflow-ai-review.md)

## 1. 业务目标

在不破坏现有校园社区的前提下，新增“项目—运行—成果”业务闭环。

业务目标：

- 让用户从同一次事实输入产生多份相互一致的材料。
- 让每一次生成可追踪、可重试、可退费、可回滚。
- 让公开行为继续受现有审核和审计体系约束。
- 让新增能力服从现有分层，不在页面或 Route Handler 中复制业务规则。

## 2. 业务能力地图

| 能力 | 当前基础 | 本期变化 |
| --- | --- | --- |
| 身份 | 用户、角色、昵称、邀请 | 不新增公开个人档案 |
| 内容供给 | Prompt、Template、Workflow | 增加官方项目包清单和示例 |
| 执行 | Run、WorkflowRun、额度流水 | V0.2 先固定事实快照；V0.3 再绑定真实运行和额度流水 |
| 成果 | 无独立对象 | 新增 Project、Artifact、ArtifactVersion |
| 协作 | Team、TeamMember | 先支持项目级团队可见 |
| 治理 | 审核、举报、AuditLog | 扩展到成果公开和敏感信息阻断 |
| 集成 | 模型池、BYOK | 不新增外部写入型集成 |

## 3. 领域模型

现有模型继续承担原职责。本期新增模型使用以下最小契约：

```text
Project
  id, owner_id, team_id?, title, goal_type, status, visibility, created_at, updated_at

ProjectFact
  id, project_id, key, value, evidence_url?, confirmation_state, updated_by, updated_at

Artifact
  id, project_id, workflow_run_id, kind, title, visibility, current_version

ArtifactVersion
  id, artifact_id, version, content_json, content_markdown, fact_snapshot_hash,
  created_by, created_at
```

约束：

- `goal_type` 只允许 `career`、`contest`、`portfolio`。
- `visibility` 只允许 `private`、`team`、`public`，默认 `private`。
- `confirmation_state` 只允许 `missing`、`unconfirmed`、`confirmed`。
- 成果版本只追加，不允许原地更新内容。
- 删除项目采用归档，不物理删除运行、流水和审计记录。
- 公共广场只索引 `public` 且审核通过的成果版本。

不把项目事实塞进 `User`，避免用户资料膨胀和跨项目串联。

## 4. 服务边界

按现有目录扩展：

```text
contracts/projects.ts       输入输出契约
domain/projects/            状态、可见性和版本规则
server/projects/            持久化、权限和事务
server/workflows/           复用 DAG 验证、执行和审核
server/quota/               复用预检、扣减、退费和流水
```

新增聚合入口：

```text
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
POST   /api/projects/:id/facts
POST   /api/projects/:id/runs
GET    /api/projects/:id/artifacts/:artifactId
POST   /api/artifacts/:id/versions
POST   /api/artifacts/:id/publication-request
GET    /api/projects/:id/export
```

所有响应继续使用现有 `{ ok, data, requestId }` 或 `{ ok, error, requestId }` 信封。服务端重新校验身份、项目权限、工作流发布状态和额度，不信任客户端计算的价格或可见性。

## 5. 运行规则

V0.2 当前执行的是缩短路径：

```text
校验项目权限和事实
  → 固定事实快照
  → 生成官方成果草稿
  → 追加成果版本
```

这条路径只证明项目、事实、版本和导出闭环。它不产生 WorkflowRun，也不扣减额度。

V0.3 再恢复完整路径：

```text
读取已发布 WorkflowVersion
  → 校验项目权限和事实
  → 估算额度
  → 原子预扣
  → 写入 QUEUED 运行
  → 按 DAG 拓扑执行
  → 校验输出结构
  → 写入成果草稿
  → 成功结算或失败退费
```

- 只有 `PUBLISHED` 工作流版本可以运行。
- 输入快照在创建运行时固定，后续修改事实不影响历史运行。
- 幂等键沿用现有思路，重复提交不能产生两次扣费。
- 节点继续遵守最多 50 个节点、单节点 120 秒、最多 3 次重试的限制。
- 输出结构不合格视为失败并退费，不能保存成成功成果。
- 长任务必须可取消；取消前已产生的供应商成本按实际结算规则入账。
- 原始供应商请求、响应和密钥不进入普通日志。

## 6. 官方工作流合同

每条官方工作流必须声明：

- 稳定 ID、目标用户、用途和预计时长。
- JSON 输入 Schema 与必填规则。
- 输出 Schema、Markdown 模板和示例。
- 额度上限、模型档位和失败提示。
- 使用的事实字段，以及是否允许“暂无”。
- 审核记录和版本号。

项目包编排只调用这 8 个稳定 ID：

```text
project-facts
resume-bullets
readme-draft
project-one-pager
contest-mvp
pitch-outline
defense-qa
project-retrospective
```

改变输出含义必须发布新版本，不能覆盖旧运行引用的版本。

## 7. 数据质量规则

| 规则 | 阻断级别 | 结果 |
| --- | --- | --- |
| 输出缺必填字段 | 硬阻断 | 运行失败并退费 |
| 出现输入中不存在的量化结果 | 硬阻断 | 成果不能确认 |
| 敏感信息匹配高风险规则 | 硬阻断 | 不能申请公开 |
| 来源或 AI 辅助声明缺失 | 硬阻断 | 不能申请公开 |
| 语言不清晰或结构松散 | 软提示 | 用户可保存私密草稿 |
| 模型评价分较低 | 软提示 | 不单独决定公开结果 |

敏感信息规则至少覆盖手机号、证件号、邮箱、访问令牌、私有仓库地址和明显的密钥格式。自动规则不能替代人工审核。

## 8. 成本与额度

- 平台额度和 BYOK 使用同一运行记录，但成本来源必须分开。
- 运行前显示上限；无法估算时显示“未知”并要求用户确认。
- 官方工作流设置单次上限，超过上限的模型或重试配置不能发布。
- 失败退费写入 `QuotaLedger`，与原扣减通过引用 ID 关联，且只能发生一次。
- 团队可见项目仍消耗操作者本人的额度；本期不重做团队额度分配。
- 管理报表只展示聚合数量和点数，不展示成果正文。

## 9. 安全、隐私与合规

- 私密和团队内容默认不进搜索索引、示例、推荐语料和错误日志。
- 团队可见必须同时满足项目授权和有效 `TeamMember` 身份。
- 成员离开后立即失去访问；历史审计保留操作者 ID。
- 管理员支持查看必须使用独立、有理由、有时限的审计动作。
- 导出链接只对当前授权用户短期有效，不使用永久公开 URL。
- 公开内容保留作者昵称、来源、引用和 AI 辅助标识。
- 用户申请删除账号时，公开成果下线，财务、额度、安全和审计记录按法定或安全需要保留。

## 10. 观测与运营

新增事件：

```text
project_created
project_run_submitted
project_run_finished
artifact_saved
artifact_confirmed
artifact_exported
publication_requested
```

事件属性限于 ID、类型、状态、耗时、点数和错误类别。每周检查完成率、成功率、失败原因、额度消耗和审核积压。连续两周达不到 [MRD](./MRD.md) 门槛时，停止扩展功能并复盘供给质量。

## 11. 迁移与兼容

- 新增表通过 Prisma migration 交付，不修改历史运行的含义。
- 旧模板 `Run`、`WorkflowRun`、收藏和团队接口保持兼容。
- 项目功能使用新增页面和 API，不强制把旧内容迁移成项目。
- 回滚时隐藏新入口并停止新 API；已写入的新表保留，待后续迁移处理。
- 发布前执行空库迁移、迁移差异检查、权限测试和备份恢复演练。

## 12. 实施切片

| 切片 | 内容 | 完成定义 |
| --- | --- | --- |
| B1 | 契约、模型和权限 | 私密项目 CRUD 与越权测试通过 |
| B2 | 事实卡和快照 | 历史运行不受后续编辑影响 |
| B3 | 官方工作流接入 | V0.2 已完成 8 条草稿生成；真实运行和失败退费留到 V0.3 |
| B4 | 成果版本和导出 | 版本不可变，导出无越权 |
| B5 | 确认和公开审核 | 未确认或高风险内容不能公开 |
| B6 | 试点观测 | 指标可按周复核且不含敏感正文 |

V0.2 只依赖已经完成的私密项目、事实快照、草稿生成、版本和导出。十人验证通过后，才继续完成真实运行、退费、公开审核和 30 人试点。

## 13. 业务验收

- 用户可从同一事实源生成至少简历条目、README 和一页介绍。
- 任意历史成果都能追溯到工作流版本、输入快照和额度流水。
- 非授权用户、已离开成员和普通审核者不能读取私密成果。
- 重复点击、并发提交、失败重试和取消不发生重复扣费。
- 公开路径延续 AI 初审、人工复核、禁止自审和全量审计。
- 现有账号、模板、工作流、收藏、团队和额度回归测试无新增失败。
