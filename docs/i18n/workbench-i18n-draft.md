# 工作模式（Workbench）i18n 草稿（评审用 · 未落库）

> **状态**：草稿。没有改任何代码、没有新增任何词条。
> **怎么审**：直接在本 PR 的 diff 里改英文（或留 inline suggestion）；或回复「同意」+ 要改的条目；也可以回复「这批先不做」。
> **范围**：`src/components/workspace/display-name-editor.tsx` —— 该文件**完全没有 i18n**，英文界面下 162 行中文原样显示。

## 命名空间与接线方式（建议）

新建 **`workbench`** 命名空间，并在 `src/i18n/request.ts` 现有的显式清单里加一行：

```ts
workbench: (await import(`@/../messages/workbench/${locale === "zh" ? "zh" : "en"}.json`)).default,
```

原因：该 loader 是**显式列举**命名空间的（不是扫目录），新增命名空间必须同时加两件事（文件 + 这一行）。

## 表 1：界面文案（106 条）

| 行 | 分类 | 现在的中文 | 建议 key | 建议英文 |
|---|---|---|---|---|
| 50 | 提示（toast） | `toast.error("昵称需为 2-40 个字符");` | `workbench.toast.nicknameLength` | Nickname must be 2-40 characters |
| 72 | 提示（toast） | `toast.error(`${result.message \|\| "修改失败"}${retry ? `（约 ${Math.ceil(retry / 60)} 分钟后可再次修改）` : ""}`);` | `workbench.toast.nicknameUpdateFailed` | Update failed |
| 75 | 提示（toast） | `toast.success("昵称已更新（30 天后可再次修改）");` | `workbench.toast.nicknameUpdated` | Nickname updated (next change in 30 days) |
| 79 | 提示（toast） | `if (isActive()) toast.error("修改失败，请稍后重试");` | `workbench.toast.retryLater` | Update failed, please try again later |
| 88 | 界面文案 | `<Pencil className="h-3 w-3" /> 改昵称` | `workbench.label.editNickname` | Edit nickname |
| 101 | 无障碍/悬停说明 | `aria-label="新昵称"` | `workbench.aria.nicknameInput` | New nickname |
| 104 | 界面文案 | `{saving ? "保存中…" : "保存"}` | `workbench.label.saving` | Saving… |
| 219 | 界面文案 | `const safeTitle = userPrompt.replace(/[<>]/g, "").slice(0, 48) \|\| "我的自定义网页应用";` | `workbench.default.webAppTitle` | My custom web app |
| 369 | 界面文案 | `const starter = buildLocalStarterHtml("我的第一个网页应用");` | `workbench.default.firstWebAppTitle` | My first web app |
| 372 | 界面文案 | `title: "新建空白草稿",` | `workbench.task.newBlankDraft` | New blank draft |
| 407 | 提示（toast） | `toast.success("已删除该记录");` | `workbench.toast.recordDeleted` | Record deleted |
| 413 | 提示（toast） | `toast.success("已清空个人记录");` | `workbench.toast.recordsCleared` | Your local records were cleared |
| 435 | 提示（toast） | `toast.info("请先登录账号后再领取每日签到算力积分 (+5分)");` | `workbench.toast.signInForCheckin` | Sign in to claim today's check-in points (+5) |
| 442 | 提示（toast） | `toast.success((data?.replyZh \|\| "已完成今日签到 (+5 积分)").slice(0, 80));` | `workbench.toast.checkinDone` | Today's check-in is done (+5 pts) |
| 444 | 提示（toast） | `toast.error("签到请求暂时未响应，请稍后重试");` | `workbench.toast.checkinNoResponse` | Check-in is not responding, please try again later |
| 473 | 界面文案 | `links: [{ labelZh: "📂 前往项目库创建正式立项", href: targetLink }],` | `workbench.link.createProject` | 📂 Create the real project in your library |
| 480 | 提示（toast） | `toast.success("已保存至本地记录");` | `workbench.toast.savedLocal` | Saved to your local records |
| 498 | 界面文案 | `: [{ labelZh: "📂 打开项目库查看", href: "/projects" }],` | `workbench.link.openProjects` | 📂 Open the project library |
| 505 | 提示（toast） | `toast.success("已存为项目草稿");` | `workbench.toast.savedProjectDraft` | Saved as a project draft |
| 507 | 提示（toast） | `toast.error("保存请求暂时未响应，请稍后重试");` | `workbench.toast.saveNoResponse` | Saving is not responding, please try again later |
| 526 | 界面文案 | `? "🕹️ 3D 抓娃娃机抽积分"` | `workbench.quickPrompt.claw` | 🕹️ Play the 3D claw machine |
| 528 | 界面文案 | `? "🎁 5 积分兑换周报模板"` | `workbench.quickPrompt.redeem` | 🎁 Redeem a market listing |
| 531 | 界面文案 | `: q.slice(0, 28) \|\| "我的自定义任务";` | `workbench.default.customTask` | My custom task |
| 553 | 界面文案 | `tag: runMode === "ask" ? "架构问答" : shouldIterateCurrent ? "增量迭代" : intent === "playground" ? "我的任务" : "快捷操作",` | `workbench.tag.archQA` | Architecture Q&A |
| 563 | 界面文案 | `summary: runMode === "ask" ? "正在分析当前代码与问题..." : "正在执行代码构建与差异对比...",` | `workbench.progress.analyzing` | Analysing the current code and question... |
| 621 | 界面文案 | `links: [{ labelZh: "🔐 登录账号调用云端模型算力", href: "/login?callbackUrl=%2Fworkspace" }],` | `workbench.link.signInForCompute` | 🔐 Sign in to use cloud model compute |
| 766 | 界面文案 | `title: `修改版：${activeTask.title.replace(/^[^\s]+\s*/, "")}`,` | `workbench.task.revisedTitle` | Revised: {title} |
| 786 | 提示（toast） | `toast.info("当前已是初始基准版本");` | `workbench.toast.alreadyBaseline` | This is already the initial baseline |
| 790 | 提示（toast） | `toast.success("已还原至上一版本代码");` | `workbench.toast.restoredPrevious` | Restored the previous version |
| 797 | 界面文案 | `title: `草稿：${activeTask.title.replace(/^[^\s]+\s*/, "")}`,` | `workbench.task.draftTitle` | Draft: {title} |
| 806 | 提示（toast） | `toast.success("已复制为个人草稿");` | `workbench.toast.copiedAsDraft` | Copied as your own draft |
| 832 | 提示（toast） | `toast.success("已下载文件");` | `workbench.toast.fileDownloaded` | File downloaded |
| 834 | 提示（toast） | `toast.error("下载失败，请点击复制");` | `workbench.toast.downloadFailed` | Download failed — use Copy instead |
| 844 | 提示（toast） | `toast.error("无法打开新窗口预览");` | `workbench.toast.previewWindowFailed` | Could not open the preview window |
| 850 | 提示（toast） | `toast.success("已唤起右下角 Agent 对话窗");` | `workbench.toast.agentOpened` | Opened the Agent chat in the bottom-right corner |
| 858 | 无障碍/悬停说明 | `aria-label="Agent 工作模式"` | `workbench.aria.workbench` | Agent work mode |
| 868 | 无障碍/悬停说明 | `title="唤起右下角 Agent 悬浮对话窗"` | `workbench.title.openAgentChat` | Open the Agent chat panel |
| 871 | 界面文案 | `🤖 Agent 对话` | `workbench.mode.agentChat` | 🤖 Agent chat |
| 874 | 界面文案 | `🛠️ 工作模式` | `workbench.mode.workbench` | 🛠️ Work mode |
| 878 | 无障碍/悬停说明 | `title="当前工作分支与沙盒环境"` | `workbench.title.branch` | Current branch and sandbox |
| 885 | 无障碍/悬停说明 | `aria-label="选择推理与代码生成模型"` | `workbench.aria.modelSelect` | Choose the model for reasoning and code generation |
| 897 | 无障碍/悬停说明 | `title="查看 3 步上手说明"` | `workbench.title.threeStepGuide` | Show the 3-step guide |
| 900 | 界面文案 | `📖 {showOnboardingGuide ? "收起" : "引导"}` | `workbench.label.collapse` | Hide |
| 910 | 界面文案 | `🪙 {livePoints} 积分` | `workbench.label.points` | 🪙 {points} pts |
| 913 | 界面文案 | `🎁 领算力` | `workbench.label.claimCompute` | 🎁 Claim compute |
| 916 | 界面文案 | `🔑 账本` | `workbench.label.ledger` | 🔑 Ledger |
| 930 | 界面文案 | `📖 Codex 工作模式 3 步流` | `workbench.guide.title` | 📖 Work mode in 3 steps |
| 944 | 界面文案 | `+ 新建空白` | `workbench.label.newBlank` | + New blank |
| 967 | 界面文案 | `📂 我的任务 ({userTasks.length})` | `workbench.label.myTasks` | 📂 My tasks ({count}) |
| 974 | 无障碍/悬停说明 | `title="清空全部本地任务"` | `workbench.title.clearTasks` | Clear all local tasks |
| 977 | 界面文案 | `清空` | `workbench.label.clear` | Clear |
| 985 | 界面文案 | `+ 新建` | `workbench.label.new` | + New |
| 991 | 界面文案 | `暂无个人任务，在中间输入指令即可开始` | `workbench.empty.tasks` | No personal tasks yet — type an instruction in the middle to start |
| 1025 | 无障碍/悬停说明 | `title="删除此记录"` | `workbench.title.deleteRecord` | Delete this record |
| 1026 | 无障碍/悬停说明 | `aria-label={`删除 ${t.title}`}` | `workbench.aria.deleteRecord` | Delete {title} |
| 1051 | 界面文案 | `📖 引导范例` | `workbench.label.guidedSamples` | 📖 Guided samples |
| 1090 | 无障碍/悬停说明 | `title="将当前作品保存至我的项目库"` | `workbench.title.saveToProjects` | Save this work to your project library |
| 1093 | 界面文案 | `🚀 存为项目` | `workbench.label.saveAsProject` | 🚀 Save as project |
| 1098 | 无障碍/悬停说明 | `title="每日签到领取 5 算力积分"` | `workbench.title.checkin` | Daily check-in: +5 compute points |
| 1101 | 界面文案 | `📅 签到 +5` | `workbench.label.checkin` | 📅 Check-in +5 |
| 1109 | 界面文案 | `📂 项目库` | `workbench.label.projects` | 📂 Projects |
| 1112 | 界面文案 | `🛒 工具市场` | `workbench.label.market` | 🛒 Market |
| 1142 | 界面文案 | `? "⚡ 运行中"` | `workbench.status.running` | ⚡ Running |
| 1144 | 界面文案 | `? "📖 引导范例"` | `workbench.status.guidedSample` | 📖 Guided sample |
| 1146 | 界面文案 | `? "💬 问答模式"` | `workbench.status.askMode` | 💬 Ask mode |
| 1147 | 界面文案 | `: "✓ 已应用变更"}` | `workbench.status.applied` | ✓ Changes applied |
| 1161 | 界面文案 | `填入输入框 ↓` | `workbench.label.fillIntoInput` | Fill into the input ↓ |
| 1184 | 界面文案 | `⚡ Agent 执行链路 · {activeTask.trace.length} 步` | `workbench.label.trace` | ⚡ Agent run trace · {count} steps |
| 1189 | 界面文案 | `{traceExpanded ? "收起 ▴" : "展开 ▾"}` | `workbench.label.expandTrace` | Expand ▾ |
| 1209 | 界面文案 | `{isViewingGuideSample ? "📖 范例产出说明" : activeTask.mode === "ask" ? "💬 Agent 解答" : "✓ 变更摘要"}` | `workbench.summary.sample` | 📖 Sample output notes |
| 1217 | 界面文案 | `复制为草稿` | `workbench.label.copyAsDraft` | Copy as draft |
| 1236 | 界面文案 | `查看 Diff →` | `workbench.label.viewDiff` | View diff → |
| 1250 | 界面文案 | `{lk.labelZh \|\| lk.title \|\| lk.labelEn \|\| "查看详情"} ↗` | `workbench.label.viewDetails` | View details |
| 1275 | 界面文案 | `基于当前文件迭代修改 <code className="text-[10px] text-emerald-300">({activeTask.artifactFile})</code>` | `workbench.label.iterateCurrent` | Iterate on the current file ({file}) |
| 1279 | 界面文案 | `{composerMode === "code" ? "⚡ 写代码模式" : "💬 提问模式"}` | `workbench.mode.codeShort` | ⚡ Code mode |
| 1290 | 界面文案 | `? `描述要对 ${activeTask.artifactFile} 做的修改（如：切换为浅色主题、增加导出 CSV 按钮），或直接提问...`` | `workbench.placeholder.iterate` | Describe the change to {file} (for example: switch to a light theme, add a CSV export button), or just ask... |
| 1291 | 界面文案 | `: "输入你要新建的网页、Python 脚本或农客松方案（Enter 执行）..."` | `workbench.placeholder.newTask` | Describe the web page, Python script or project brief you want (Enter to run)... |
| 1302 | 界面文案 | `const seedText = (promptInput \|\| activeTask.prompt \|\| "网页应用").trim();` | `workbench.default.seedText` | web app |
| 1327 | 无障碍/悬停说明 | `title="将简短想法扩充为结构化需求"` | `workbench.title.expandIdea` | Expand a short idea into a structured brief |
| 1331 | 提示（toast） | `toast.info("请先在输入框写下一句话想法，再点击补齐细节");` | `workbench.toast.needIdeaFirst` | Type a one-line idea first, then expand it |
| 1337 | 提示（toast） | `toast.success("已补齐结构化细节");` | `workbench.toast.detailsExpanded` | Expanded into structured details |
| 1341 | 界面文案 | `✨ 补齐细节` | `workbench.label.expandDetails` | ✨ Expand details |
| 1350 | 界面文案 | `["🎨 改浅色主题", "把当前页面配色改为清新浅色主题，并增加一个顶部状态横幅"],` | `workbench.quickPrompt.themeLabel` | 🎨 Light theme |
| 1351 | 界面文案 | `["🌐 新建图表页", "请用单文件 HTML5 + CSS + JS 写一个简洁好用的实验数据记录与折线图网页"],` | `workbench.quickPrompt.chartLabel` | 🌐 Chart page |
| 1352 | 界面文案 | `["🌾 农客松提纲", "帮我梳理一份中国农大农客松智慧农业参赛项目痛点、方案与分工提纲"],` | `workbench.quickPrompt.briefLabel` | 🌾 Project brief |
| 1377 | 无障碍/悬停说明 | `title="仅针对当前代码或需求提问分析，不覆盖文件"` | `workbench.title.askMode` | Ask about the current code or brief without overwriting files |
| 1384 | 界面文案 | `💬 提问` | `workbench.label.ask` | 💬 Ask |
| 1391 | 无障碍/悬停说明 | `title="生成或修改代码产物并生成 Diff 对比"` | `workbench.title.codeMode` | Generate or modify artifacts with a diff |
| 1394 | 界面文案 | `{running ? "⚡ 运行中..." : "⚡ 写代码"}` | `workbench.label.runningNow` | ⚡ Running... |
| 1406 | 界面文案 | `{ id: "preview", label: "👁️ 预览" },` | `workbench.tab.preview` | 👁️ Preview |
| 1407 | 界面文案 | `{ id: "diff", label: `± 变更 (+${activeDiff.additions} -${activeDiff.deletions})` },` | `workbench.tab.diff` | ± Changes (+{additions} -{deletions}) |
| 1408 | 界面文案 | `{ id: "code", label: "💻 源码" },` | `workbench.tab.code` | 💻 Code |
| 1409 | 界面文案 | `{ id: "terminal", label: "📟 终端" },` | `workbench.tab.terminal` | 📟 Terminal |
| 1438 | 界面文案 | `🖥️ 桌面` | `workbench.label.desktop` | 🖥️ Desktop |
| 1448 | 界面文案 | `📱 手机` | `workbench.label.mobile` | 📱 Mobile |
| 1456 | 无障碍/悬停说明 | `title="还原到修改前的上一版本代码"` | `workbench.title.restoreVersion` | Restore the previous version |
| 1459 | 界面文案 | `↩️ 还原上一版` | `workbench.label.restore` | ↩️ Restore previous |
| 1465 | 无障碍/悬停说明 | `title="重新加载预览画布"` | `workbench.title.reloadPreview` | Reload the preview canvas |
| 1468 | 界面文案 | `🔄 刷新` | `workbench.label.refresh` | 🔄 Refresh |
| 1474 | 提示（toast） | `toast.success("已复制内容");` | `workbench.toast.copied` | Copied |
| 1478 | 界面文案 | `📋 复制` | `workbench.label.copy` | 📋 Copy |
| 1485 | 界面文案 | `💾 下载` | `workbench.label.download` | 💾 Download |
| 1493 | 界面文案 | `🖥️ 新窗口 ↗` | `workbench.label.newWindow` | 🖥️ New window ↗ |
| 1583 | 无障碍/悬停说明 | `aria-label="源码编辑器"` | `workbench.aria.sourceEditor` | Source code editor |
| 1592 | 界面文案 | `<span>Agent 执行日志 · {activeTask.branch \|\| "ans-workspace/main"}</span>` | `workbench.label.executionLog` | Agent log · {branch} |
| 1597 | 界面文案 | `<div className="mb-1 text-[11px] font-bold text-emerald-300">当前任务执行步骤：</div>` | `workbench.label.currentTaskSteps` | Current task steps: |

## 表 2：运行时链路与回复（22 条）

这些是执行面板里用户**看得见**的步骤与回复（`⚡ Agent 执行链路`）。占位符沿用现有变量（`{file}` / `{additions}` / `{deletions}` / `{seconds}` / `{q}` / `{points}` …）。

| 行 | 分类 | 现在的中文 | 建议 key | 建议英文 |
|---|---|---|---|---|
| 290 | 运行时链路/回复 | ``[就绪] 工作台已打开 · 当前账号：${current}（可用积分：${points}）`,` | `workbench.trace.ready` | [Ready] Workbench open · {user} (available points: {points}) |
| 383 | 运行时链路/回复 | `"[1/2] agent.init_workspace → 初始化本地单文件沙盒 my-app.html",` | `workbench.trace.initWorkspace` | [1/2] agent.init_workspace → initialised local single-file sandbox my-app.html |
| 384 | 运行时链路/回复 | `"[2/2] agent.ready → 等待输入需求或直接编辑源码",` | `workbench.trace.readyForInput` | [2/2] agent.ready → waiting for a brief, or edit the source directly |
| 470 | 运行时链路/回复 | `"[agent.scaffold_project] 已在本地生成立项草稿并关联 /projects 创建入口",` | `workbench.trace.scaffoldProject` | [agent.scaffold_project] local project draft created and linked to the /projects entry point |
| 545 | 运行时链路/回复 | ``[1/4] agent.read_workspace → ${shouldIterateCurrent ? `读取当前产物 ${activeTask.artifactFile} (${contextBaseline.length} chars)` : "初始化工作区上下文"}`,` | `workbench.trace.readCurrentArtifact` | [1/4] agent.read_workspace → read current artifact {file} ({bytes} bytes) |
| 547 | 运行时链路/回复 | ``[3/4] agent.run_model_playground → 正在执行推理与构建...`,` | `workbench.trace.runningModel` | [3/4] agent.run_model_playground → reasoning and building... |
| 599 | 运行时链路/回复 | ``[1/4] agent.read_workspace → ${shouldIterateCurrent ? `读取 ${activeTask.artifactFile} 基准代码` : "创建本地沙盒环境"}`,` | `workbench.trace.readBaseline` | [1/4] agent.read_workspace → read baseline code of {file} |
| 600 | 运行时链路/回复 | ``[2/4] agent.plan_changes → 解析指令「${q.slice(0, 36)}」`,` | `workbench.trace.planChanges` | [2/4] agent.plan_changes → parsing instruction “{q}” |
| 602 | 运行时链路/回复 | `? `[3/4] agent.answer_query → 生成本地架构建议（未改动原文件）`` | `workbench.trace.answerQuery` | [3/4] agent.answer_query → local architecture advice (no file changed) |
| 603 | 运行时链路/回复 | `: `[3/4] agent.apply_patch → 写入变更 (+${localDiff.additions} -${localDiff.deletions} 行)`,` | `workbench.trace.applyPatch` | [3/4] agent.apply_patch → wrote changes (+{additions} -{deletions} lines) |
| 604 | 运行时链路/回复 | ``[4/4] agent.verify_output → 完成本地构建 (${elapsedSec}s)`,` | `workbench.trace.verifyOutput` | [4/4] agent.verify_output → local build finished ({seconds}s) |
| 617 | 运行时链路/回复 | `? `💡 针对「${q}」的本地解答：\n1. 当前文件为 ${runningTask.artifactFile}，可在右侧「💻 源码」或「± 变更」中直接检查结构。\n2. 切换到「⚡ 写代码」模式发送指令即可自动把修改应用到当前文件并查看 Diff 对比。\n3. 登录账号后可调用云端 ${` | `workbench.reply.localAnswer` | 💡 Local answer for “{q}”: 1. The current file is {file} — inspect its structure in the Code or Changes tab. 2. Switch to Write code mode and send an instruction to modify it. |
| 619 | 运行时链路/回复 | `? `已在当前文件 ${runningTask.artifactFile} 基础上完成增量修改（+${localDiff.additions} -${localDiff.deletions} 行），可点击右侧「± 变更」查看具体代码对比。`` | `workbench.reply.appliedChange` | Applied an incremental change on top of {file} (+{additions} -{deletions} lines). Open the Changes tab to review the diff. |
| 620 | 运行时链路/回复 | `: "当前为访客预览模式，已在右侧生成可交互草稿与代码变更记录。登录账号后可调用云端模型算力。",` | `workbench.reply.guestMode` | You are in guest preview mode: an interactive draft and change log were generated on the right. Sign in to use cloud model compute. |
| 640 | 运行时链路/回复 | `const reply = rawReply && rawReply !== "UNAUTHORIZED" ? rawReply : "已完成处理。";` | `workbench.reply.done` | Done. |
| 683 | 运行时链路/回复 | ``[1/4] agent.read_workspace → ${shouldIterateCurrent ? `加载 ${resolvedFile}` : "初始化新任务上下文"}`,` | `workbench.trace.loadFile` | [1/4] agent.read_workspace → loaded {file} |
| 685 | 运行时链路/回复 | ``[3/4] agent.write_artifact → ${resolvedFile} (+${computedDiff.additions} -${computedDiff.deletions} 行)`,` | `workbench.trace.writeArtifact` | [3/4] agent.write_artifact → {file} (+{additions} -{deletions} lines) |
| 712 | 运行时链路/回复 | ``[${new Date().toLocaleTimeString()}] ${data?.ok === false ? "⚠️ 状态提示" : "✓ 执行完成"} · +${computedDiff.additions} -${computedDiff.deletions}`,` | `workbench.trace.statusNotice` | [{time}] ⚠️ Status notice · +{additions} |
| 726 | 运行时链路/回复 | `"[1/3] agent.read_workspace → 已切换至本地离线沙盒",` | `workbench.trace.offlineSandbox` | [1/3] agent.read_workspace → switched to the offline local sandbox |
| 727 | 运行时链路/回复 | ``[2/3] agent.apply_patch → 生成 ${runningTask.artifactFile} (+${localDiff.additions} -${localDiff.deletions} 行)`,` | `workbench.trace.generateArtifact` | [2/3] agent.apply_patch → generated {file} (+{additions} -{deletions} lines) |
| 728 | 运行时链路/回复 | ``[3/3] agent.verify_output → 本地可编辑草稿就绪 (${elapsedSec}s)`,` | `workbench.trace.draftReady` | [3/3] agent.verify_output → local editable draft ready ({seconds}s) |
| 774 | 运行时链路/回复 | ``[agent.manual_edit] 从引导范例派为个人草稿 (+${forkedDiff.additions} -${forkedDiff.deletions} 行)`,` | `workbench.trace.forkSample` | [agent.manual_edit] forked from a guided sample into your own draft (+{additions} -{deletions} lines) |

## 不在本表里（另行决定）

| 块 | 行数 | 建议 |
|---|---|---|
| **生成产物 / 示例 HTML**（`buildLocalStarterHtml` 等模板里的中文，写进用户下载的产物） | 19 | 这是**用户可编辑的内容**，不是界面文案。建议先保持中文；若要做英文产物，应改成"按 locale 生成模板"，而不是迁 key。 |
| **预设示例数据**（`INITIAL_CODEX_TASKS` 的 title/tag/summary/trace） | 13 | 界面上已被明确标注为「📖 引导范例」，属于**范例内容**；可翻可不翻，建议与"范例是否双语"一起决定。 |
| 正则匹配里的中文关键词（如 `/亮色|浅色|白底/`） | 2 | 属于**指令解析**，不是文案：英文用户说 light theme 已能命中；建议保留并补英文关键词（已含 light/amber/gold）。 |

## 落地方式（批准后，纯机械）

1. 新增 `messages/workbench/{zh,en}.json`（本表 128 条）+ 在 `request.ts` 加一行；
2. `display-name-editor.tsx` 接入 `useTranslations("workbench")`，按表替换；
3. 跑全量单测（该文件相关用例 + i18n parity 契约）；
4. **加一条防回退规则**：给 `docs/authority/ledger.json` 增加 `A-AGENT-06`（`src/components/workspace/display-name-editor.tsx` 的中文字面量 `countMax`，上限 = 表外那 19+13+2 行的实际数量），这样以后新增硬编码中文会被守卫拦住。

## 量级与风险

- 128 条要翻（本表已给出建议英文），加上 34 条"表外"（产物模板 / 范例数据 / 正则）；
- 该文件同时是**工作模式主界面**，改动面比面板批更大 → 建议单独一批、单独 PR、跑完整门禁（含 build/a11y）。
