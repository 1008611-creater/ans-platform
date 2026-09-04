---
name: feishu-skill-router
description: name: feishu-skill-router
---

---
name: feishu-skill-router
description: Route Feishu/Lark tasks to the narrowest workflow for account and session identification, document or wiki creation and editing, visual organization of AI instructions, permissions and sharing, drive capacity, and local-file upload or collaboration. Use when the user mentions 飞书、Lark、文档、知识库、云盘、空间、账号、权限、分享、上传或需要把内容沉淀到飞书。
---

# 飞书技能路由

## 核心职责

把飞书相关任务收拢到一个按需路由。只在任务命中本 Skill 时读取本文件；根据当前可见账号、页面和用户目标选择最窄的工作流，再做云端回读。不要把所有飞书能力一次性加载成一段上下文。

面向用户的最小路由始终写成：

```text
当前飞书证据 -> 飞书任务中文分类 -> 具体章节 -> 云端回读与交付
```

## 路由决策

先识别当前登录账号和可见会话，再按用户意图选择一个主章节；只有当前结果确实依赖另一章节时才加载一个直接依赖。

| 用户目标 | 主章节 |
| --- | --- |
| 查当前账号、切换账号、确认归属 | `references/feishu-workflows.md#账号与会话` |
| 新建、复制、写入或保存文档 | `references/feishu-workflows.md#文档创建与保存` |
| 整理 AI 指令、学习卡、目录、表格或路由图 | `references/feishu-workflows.md#内容整理与可视化` |
| 用知识库页面与多维表格共同治理 Skill | `references/feishu-workflows.md#知识库与多维表格治理` |
| 追加内容、修正文档、确认粘贴结果 | `references/feishu-workflows.md#编辑与内容沉淀` |
| 查所有者、编辑权、分享或权限 | `references/feishu-workflows.md#权限与分享` |
| 查空间、容量、使用量或剩余量 | `references/feishu-workflows.md#云盘空间与账号信息` |
| 上传或沉淀 DOCX、XLSX、PPTX、PDF | `references/feishu-workflows.md#本地文件与飞书协作` |

## 执行合同

1. 复用当前已连接的 Codex 内置浏览器和已打开的飞书标签页；使用可见页面、DOM 快照和截图定位，不读取 Cookie、本地存储、密码、令牌或会话文件。
2. 账号切换后重新确认账号、文档所有者和权限；不能把旧企业账号的页面或权限当成当前个人账号的结果。
3. 点击、填充、粘贴、上传或保存后必须回读实际页面。页面打开、HTTP 成功或工具返回 `pasted` 只能证明动作发出，不能证明内容已经保存。
4. 对富文本、表格、链接、路由图和大段粘贴，至少用 DOM 关键文本回读；DOM 不足以证明视觉完整时再截图检查。
5. 对多维表格的单选、多选、状态、集群、价值等级、路由状态和来源类型字段，输入框内出现文字不代表选项已提交。逐条回读字段的实际已选标签或记录详情；任一必填治理字段仍显示“请选择选项”、空值或未保存状态时，停止批量导入，先修复单条记录的选项提交路径。
6. 默认追加或创建新版本，保护用户明确保留的旧文档；删除、覆盖、改权限、公开分享和上传敏感内容需要用户明确授权，且只做请求范围内的对象。
7. 生成新的 Office 文件先路由到对应文件 Skill 或 OfficeCLI，再单独验证本地文件、上传结果和飞书云端可访问性。
8. 交付时只报告真实结果：账号归属、文档链接、关键章节、云端保存状态、空间数字或文件可打开状态；不输出隐私、密钥、令牌、临时签名 URL 或私人聊天原文。
9. 当面向他人的 Skill 学习文档需要展示 GitHub 或官网项目时，读取 `references/feishu-workflows.md#真实来源视觉卡`，并使用 `assets/project-source-card.html` 生成可追溯的项目来源卡；不要把用户参考图、带水印转载图或不完整裁切图当成项目证据。

## 失败边界

若当前账号不明、页面无权编辑、云端回读失败或目标对象不确定，先保留已验证状态并提出一个最小必要问题；不要用猜测继续写入。若只是富文本粘贴未生效，重新定位编辑区域并以小块内容写入，再回读，不要重复大段粘贴造成重复正文。

详细步骤、检查项和真实失败模式见 [feishu-workflows.md](references/feishu-workflows.md)。只加载与当前任务直接相关的章节。
