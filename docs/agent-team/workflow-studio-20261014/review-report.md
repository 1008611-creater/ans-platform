# Review Report

## 验收结论

FAIL。审查版本为 `c8b856f6`。发现 1 个 P2 交互问题（ISSUE-001）需修复；浏览器交互与移动端证据尚未补齐，不把类型检查或生产构建当作实际界面验收。

## 验收范围与证据

独立静态复核 task-spec.md、worker-report.md 与本轮 contract / graph / runtime / author editor / catalog projection / page integration。未修改业务代码、提交或部署。

实现方记录并由主控确认：typecheck、webpack production build（107 静态页）、相关 ESLint、7 个既有核心测试文件共 57 个用例、diff --check 通过。上述为实现方执行证据，不宣称本审查角色重新运行了这些命令。

本审查尝试运行仓库外 `independent-workflow-check.ts`，沙箱阻止 esbuild 子进程（spawn EPERM）；升级运行被用户中断，没有得到检查通过结果。这一失败仅作为独立执行限制，不作为业务故障。

## 逐项验收记录

| 验收项 | 结果 | 核对内容 |
| --- | --- | --- |
| AC-001 | FAIL | 普通定义进入真实工作室；未执行时不放假结果；结果安全文本 / Markdown、复制 / 导出有错误反馈。专注模式的 Radix 下拉 portal 存在 ISSUE-001；移动端未完成浏览器实测。 |
| AC-002 | 静态通过 | experience 严格有界；graph 拒绝重复阶段、未知 / 重复 / 漏绑定及逆向边；legacy 从拓扑生成；recipe exact compare 未放宽。动态核心检查见实现方记录。 |
| AC-003 | 静态通过 | 可视化修改复用原始对象，未知 config 与边保留；复杂插入 / 删除拒绝并引导高级 JSON；任何改动使校验失效；保存再次服务端校验；保存前 meta 校验与未保存退出保护存在。未完成本轮浏览器交互。 |
| AC-004 | 静态通过 | 服务器只从 listPublishedCatalog 找来源；不存在 / 不可用来源明确提示；登录 callback 保留 project；生成 seed 表述为方法草稿，不执行外部源码，不自动建立公开联动。 |
| AC-005 | 静态通过，实测有限 | 复用现有账号、收费、摘要幂等、防重复提交和只读恢复；新增 live poll 使用当前 run ref / terminal latch，修复预审发现的旧 RUNNING 覆盖 terminal 竞态；账号卸载 abort 和 alive 边界保留。beforeunload 提醒与持久运行记录仍在；未进行生产付费试跑。 |
| AC-006 | 静态通过 | 公开目录先核对精确发布 version 及人工批准，再解析 / 图校验 / recipe 校验；只返回 output / stage title / nodeCount，不返回 config 或 review。Hub 仍使用原 repeatable snapshot / exact binding，卡片复用同一展示。 |
| AC-007 | 部分完成 | 类型、lint、57 既有用例和生产构建由实现方完成；worker-report 明确本轮没有通用已登录工作室浏览器交互。不能将既有项目详情截图作为本轮新工作室证据。 |

## 问题摘要

ISSUE-001（P2）：专注全屏模式下模型、思考强度和额度来源的下拉菜单 portal 不在全屏元素内。

- `src/components/workflows/workflow-studio.tsx:59` 使用 section.requestFullscreen()。
- `src/components/ui/select.tsx:61` 默认 Radix Portal 挂载 document.body。
- WorkflowRunForm 的 SelectContent 没有指定工作室内部 container；原生全屏只呈现全屏元素及其后代，下拉菜单位于该子树之外。
- 应改为 CSS 专注模式，或让这些菜单 portal 到全屏工作室内；修复后核验展开、选择、Escape 返回与手机布局。

## 最终说明

没有发现本轮新增认证、扣费边界、任意 HTML 执行、用户输入自动持久化 / 公开或目录 config 泄漏。原始 HTML 已禁用，Markdown 图片只呈现替代文字，不自动向远端发图片请求。上述为源码核对结论；生产模型质量、真实付费运行、生产数据与上线状态均未验证。本报告不授权合并或部署。
