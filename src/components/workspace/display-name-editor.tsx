"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useSettingsRequest } from "@/components/settings/account-request";
import { detectIntentAndMatchTerms, upgradeToStructuredBrief } from "@/domain/vibehub/ans-site-optimizers";


export interface CodexWorkbenchProps {
  actorId: string;
  current: string;
  codexWorkbench?: boolean;
  points?: number;
  xp?: number;
  levelName?: string;
  runCount?: number;
  teamCount?: number;
  locale?: string;
  initialPrompt?: string;
}

import { INITIAL_CODEX_TASKS, type CodexTask } from "./codex-preset-tasks";

export function DisplayNameEditor(props: CodexWorkbenchProps) {
  if (props.codexWorkbench) {
    return <PiCodexWorkbench {...props} />;
  }
  return <LegacyDisplayNameEditor actorId={props.actorId} current={props.current} />;
}

function LegacyDisplayNameEditor(props: { actorId: string; current: string }) {
  const { data, status } = useSession();
  if (status !== "authenticated" || data?.user?.id !== props.actorId) return null;
  return <DisplayNameForm key={props.actorId} {...props} />;
}

function DisplayNameForm({ current, actorId }: { current: string; actorId: string }) {
  const { request, isActive } = useSettingsRequest(actorId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    const nickname = value.trim();
    if (nickname.length < 2 || nickname.length > 40) {
      toast.error("昵称需为 2-40 个字符");
      return;
    }
    if (nickname === current) { setOpen(false); return; }
    setSaving(true);
    try {
      const profile = await request<{ name?: string; username: string }>("/api/user/profile");
      if (!isActive()) return;
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-ans-actor": actorId },
        cache: "no-store", credentials: "same-origin",
        body: JSON.stringify({
          name: profile.name ?? nickname,
          username: profile.username,
          nickname,
        }),
      });
      const result = await response.json();
      if (!isActive()) return;
      if (!response.ok) {
        const retry = Number(response.headers.get("Retry-After") || 0);
        toast.error(`${result.message || "修改失败"}${retry ? `（约 ${Math.ceil(retry / 60)} 分钟后可再次修改）` : ""}`);
        return;
      }
      toast.success("昵称已更新（30 天后可再次修改）");
      setOpen(false);
      window.location.reload();
    } catch {
      if (isActive()) toast.error("修改失败，请稍后重试");
    } finally {
      if (isActive()) setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="ms-2 h-7 gap-1 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" /> 改昵称
      </Button>
    );
  }

  return (
    <span className="ms-2 inline-flex items-center gap-1.5 align-middle">
      <Input
        value={value}
        maxLength={40}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") setOpen(false); }}
        className="h-7 w-40 text-sm"
        aria-label="新昵称"
      />
      <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => void save()}>
        {saving ? "保存中…" : "保存"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setOpen(false)}>取消</Button>
    </span>
  );
}

function buildLocalStarterHtml(userPrompt: string): string {
  const safeTitle = userPrompt.replace(/[<>]/g, "").slice(0, 48) || "我的自定义网页应用";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #090d16; color: #f1f5f9; padding: 24px; line-height: 1.6; }
  .wrap { max-width: 680px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 24px; }
  .tag { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.4); border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
  h1 { font-size: 20px; margin-top: 10px; color: #ffffff; }
  p { font-size: 13px; color: #94a3b8; margin-top: 8px; }
  .stage { margin-top: 16px; padding: 16px; border-radius: 12px; background: #030712; border: 1px solid #374151; }
  button { margin-top: 14px; background: #10b981; color: #022c22; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 700; font-size: 13px; cursor: pointer; }
  button:hover { filter: brightness(1.08); }
</style>
</head>
<body>
  <div class="wrap">
    <span class="tag">本地草稿预览</span>
    <h1>${safeTitle}</h1>
    <p>需求描述：${safeTitle}</p>
    <div class="stage" id="outputBox">点击下方按钮测试交互，或切到顶部「💻 源码编辑」直接修改 HTML / CSS / JS 代码。</div>
    <button onclick="document.getElementById('outputBox').textContent = '✅ 交互测试成功！当前时间：' + new Date().toLocaleTimeString()">运行交互测试</button>
  </div>
</body>
</html>`;
}

function PiCodexWorkbench({
  actorId,
  current,
  points = 0,
  levelName = "Lv.1",
  initialPrompt = "",
}: CodexWorkbenchProps) {
  const storageKey = `ans:workspace:user-tasks:v1:${actorId || "guest"}`;
  const [userTasks, setUserTasks] = useState<CodexTask[]>([]);
  const [guideTasks, setGuideTasks] = useState<CodexTask[]>(INITIAL_CODEX_TASKS);
  const [activeId, setActiveId] = useState<string>(INITIAL_CODEX_TASKS[0].id);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [running, setRunning] = useState<boolean>(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code" | "terminal" | "tools">("preview");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[就绪] 工作台已打开 · 当前账号：${current}（可用积分：${points}）`,
  ]);
  const [livePoints, setLivePoints] = useState<number>(points);

  function readStoredUserTasks(): CodexTask[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CodexTask[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  }

  function saveUserTasks(next: CodexTask[]) {
    setUserTasks(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 20)));
    } catch {
      // ignore storage errors
    }
  }

  const allTasks = [...userTasks, ...guideTasks];
  const activeTask = allTasks.find(t => t.id === activeId) ?? guideTasks[0];
  const isViewingGuideSample = !userTasks.some(t => t.id === activeTask.id);
  const autoTriggeredPromptRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = readStoredUserTasks();
    if (stored.length > 0) {
      setUserTasks(stored);
      if (!initialPrompt || initialPrompt.trim().length === 0) {
        setActiveId(stored[0].id);
      }
    }
    const cleanInitial = initialPrompt?.trim() ?? "";
    const triggerKey = `${storageKey}:${cleanInitial}`;
    if (cleanInitial.length > 0 && autoTriggeredPromptRef.current !== triggerKey) {
      autoTriggeredPromptRef.current = triggerKey;
      void executeCodexTask(cleanInitial, "playground", stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const onExternalPrompt = (ev: Event) => {
      const detail = (ev as CustomEvent<{ prompt?: string }>).detail;
      const incoming = detail?.prompt?.trim();
      if (incoming) {
        setPromptInput(incoming);
        void executeCodexTask(incoming, "playground");
      }
    };
    window.addEventListener("ans:codex-prompt", onExternalPrompt);
    return () => window.removeEventListener("ans:codex-prompt", onExternalPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTasks, model, running]);

  function handleStartBlankTask() {
    const blankTask: CodexTask = {
      id: "user-draft-" + Date.now(),
      title: "新建空白草稿",
      tag: "我的草稿",
      model,
      status: "ready",
      prompt: "",
      trace: ["草稿已创建"],
      summary: "空白草稿已就绪。",
      artifactType: "html",
      artifactFile: "my-app.html",
      artifactCode: buildLocalStarterHtml("我的第一个网页应用"),
    };
    const baseTasks = userTasks.length > 0 ? userTasks : readStoredUserTasks();
    const next = [blankTask, ...baseTasks];
    saveUserTasks(next);
    setActiveId(blankTask.id);
    setCanvasTab("preview");
    setTimeout(() => document.getElementById("codex-composer-input")?.focus(), 50);
  }

  function handleDeleteUserTask(taskId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = userTasks.filter(t => t.id !== taskId);
    saveUserTasks(next);
    if (activeId === taskId) {
      setActiveId(next[0]?.id ?? guideTasks[0].id);
    }
    toast.success("已删除该记录");
  }

  function handleClearUserTasks() {
    saveUserTasks([]);
    setActiveId(guideTasks[0].id);
    toast.success("已清空个人记录");
  }

  async function executeCodexTask(
    customPrompt?: string,
    intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" = "playground",
    baseTasksOverride?: CodexTask[],
  ) {
    const q = (customPrompt ?? promptInput).trim();
    if (!q && intent === "playground") return;
    if (running) return;
    if (intent === "checkin") {
      setRunning(true);
      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pi_action", intent: "checkin", prompt: "", model }),
        });
        if (res.status === 401 || !res.ok) {
          toast.info("请先登录账号后再领取每日签到算力积分 (+5分)");
          return;
        }
        const data = await res.json();
        if (typeof data?.balancePoints === "number") {
          setLivePoints(data.balancePoints);
        }
        toast.success((data?.replyZh || "已完成今日签到 (+5 积分)").slice(0, 80));
      } catch {
        toast.error("签到请求暂时未响应，请稍后重试");
      } finally {
        setRunning(false);
      }
      return;
    }

    if (intent === "scaffold") {
      setRunning(true);
      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pi_action", intent: "scaffold", prompt: q || activeTask.title, model }),
        });
        const baseTasks = baseTasksOverride ?? (userTasks.length > 0 ? userTasks : readStoredUserTasks());
        if (res.status === 401 || !res.ok) {
          const targetLink = `/projects?title=${encodeURIComponent(activeTask.title)}&goal=${encodeURIComponent(activeTask.prompt || activeTask.title)}#new-project`;
          const savedTask: CodexTask = {
            ...activeTask,
            id: baseTasks.some(t => t.id === activeTask.id) ? activeTask.id : "user-saved-" + Date.now(),
            tag: "已存草稿",
            status: "completed",
            prompt: activeTask.prompt || activeTask.title,
            summary: "已保存至本地记录，点击下方入口可同步创建正式项目。",
            links: [{ labelZh: "📂 前往项目库创建正式立项", href: targetLink }],
          };
          const next = baseTasks.some(t => t.id === savedTask.id)
            ? baseTasks.map(t => (t.id === savedTask.id ? savedTask : t))
            : [savedTask, ...baseTasks];
          saveUserTasks(next);
          setActiveId(savedTask.id);
          toast.success("已保存至本地记录");
          return;
        }
        const data = await res.json();
        if (typeof data?.balancePoints === "number") {
          setLivePoints(data.balancePoints);
        }
        const rawReply = (data?.replyZh || data?.replyEn || "").trim();
        const savedTask: CodexTask = {
          ...activeTask,
          id: baseTasks.some(t => t.id === activeTask.id) ? activeTask.id : "user-saved-" + Date.now(),
          tag: "已立项",
          status: "completed",
          prompt: activeTask.prompt || activeTask.title,
          summary: rawReply || "已生成项目立项草稿。",
          links: Array.isArray(data?.links) && data.links.length > 0
            ? data.links
            : [{ labelZh: "📂 打开项目库查看", href: "/projects" }],
        };
        const next = baseTasks.some(t => t.id === savedTask.id)
          ? baseTasks.map(t => (t.id === savedTask.id ? savedTask : t))
          : [savedTask, ...baseTasks];
        saveUserTasks(next);
        setActiveId(savedTask.id);
        toast.success("已存为项目草稿");
      } catch {
        toast.error("保存请求暂时未响应，请稍后重试");
      } finally {
        setRunning(false);
      }
      return;
    }

    setRunning(true);
    const taskId = "user-task-" + Date.now();
    const shortTitle =
      intent === "claw"
        ? "🕹️ 3D 抓娃娃机抽积分"
        : intent === "redeem"
          ? "🎁 5 积分兑换周报模板"
          : q.slice(0, 28) || "我的自定义任务";
    const starterCode = buildLocalStarterHtml(q || shortTitle);
    const newTask: CodexTask = {
      id: taskId,
      title: shortTitle,
      tag: intent === "playground" ? "我的任务" : "快捷操作",
      model,
      status: "running",
      prompt: q || shortTitle,
      trace: [
        `正在请求模型 ${model} 处理需求...`,
      ],
      summary: "正在连接算力接口生成结果...",
      artifactType: "html",
      artifactFile: "my-output.html",
      artifactCode: starterCode,
    };
    const baseTasks = baseTasksOverride ?? (userTasks.length > 0 ? userTasks : readStoredUserTasks());
    const nextWithRunning = [newTask, ...baseTasks];
    saveUserTasks(nextWithRunning);
    setActiveId(taskId);
    if (customPrompt === undefined) setPromptInput("");
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 开始执行：${shortTitle} (${model})`,
    ]);

    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pi_action", intent, prompt: q, model }),
      });
      if (res.status === 401 || !res.ok) {
        const updated = nextWithRunning.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed" as const,
                trace: ["未登录状态：已生成本地可编辑 HTML 草稿"],
                summary:
                  "当前尚未登录，已在右侧生成本地可编辑草稿。登录后再次运行即可调用模型生成完整结果。",
                links: [{ labelZh: "🔐 登录账号调用模型算力", href: "/login?callbackUrl=%2Fworkspace" }],
                artifactType: "html" as const,
                artifactFile: "local-draft.html",
                artifactCode: starterCode,
              }
            : item,
        );
        saveUserTasks(updated);
        setCanvasTab("preview");
        return;
      }
      const data = await res.json();
      const rawReply = (data?.replyZh || data?.replyEn || "").trim();
      const reply = rawReply && rawReply !== "UNAUTHORIZED" ? rawReply : "已完成处理。";
      if (typeof data?.balancePoints === "number") {
        setLivePoints(data.balancePoints);
      }
      const codeMatch = reply.match(/```(html|python|py|tsx|ts|js|markdown|md|tex|sh)?\n([\s\S]*?)```/i);
      const fenceLang = (codeMatch?.[1] || "").toLowerCase();
      const extractedCode = codeMatch ? codeMatch[2].trim() : reply;
      const isHtml =
        fenceLang === "html" ||
        /<!DOCTYPE html>|<html[\s>]|<head[\s>]|<body[\s>]|<canvas[\s>]|<style[\s>]|<script[\s>]/i.test(extractedCode);
      const isPython =
        !isHtml &&
        (fenceLang === "python" || fenceLang === "py" || /^(?:from\s+\w+\s+import|import\s+\w+|def\s+\w+|@app\.)/m.test(extractedCode));
      const resolvedType: "html" | "python" | "markdown" = isHtml
        ? "html"
        : isPython
          ? "python"
          : "markdown";
      const resolvedFile =
        resolvedType === "html"
          ? "my-live-app.html"
          : resolvedType === "python"
            ? "script.py"
            : "document.md";

      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              trace: [
                `已完成调用（${data?.toolUsed || model}）`,
              ],
              summary: reply,
              links: Array.isArray(data?.links) ? data.links : [],
              artifactType: resolvedType,
              artifactFile: resolvedFile,
              artifactCode: extractedCode,
            }
          : item,
      );
      saveUserTasks(updated);
      setCanvasTab("preview");
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ 执行完成 (${data?.toolUsed || intent})`,
      ]);
    } catch {
      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              trace: ["已切换为本地草稿模式"],
              summary: "已生成本地可编辑草稿。",
              artifactType: "html" as const,
              artifactFile: "local-draft.html",
              artifactCode: starterCode,
            }
          : item,
      );
      saveUserTasks(updated);
    } finally {
      setRunning(false);
    }
  }

  function updateActiveCode(newCode: string) {
    if (userTasks.some(t => t.id === activeTask.id)) {
      saveUserTasks(userTasks.map(item => (item.id === activeTask.id ? { ...item, artifactCode: newCode } : item)));
    } else {
      const forkedTask: CodexTask = {
        ...activeTask,
        id: "user-fork-" + Date.now(),
        title: `修改版：${activeTask.title.replace(/^[^\s]+\s*/, "")}`,
        tag: "我的草稿",
        trace: ["已从引导范例另存为个人草稿"],
        summary: "基于引导范例修改的个人草稿，已自动保存在本地。",
        artifactCode: newCode,
      };
      const next = [forkedTask, ...userTasks];
      saveUserTasks(next);
      setActiveId(forkedTask.id);
    }
  }

  function forkActiveSampleToDraft() {
    const forkedTask: CodexTask = {
      ...activeTask,
      id: "user-fork-" + Date.now(),
      title: `草稿：${activeTask.title.replace(/^[^\s]+\s*/, "")}`,
      tag: "我的草稿",
      trace: ["已从引导范例复制为个人草稿"],
      summary: "已复制为个人草稿。",
    };
    const next = [forkedTask, ...userTasks];
    saveUserTasks(next);
    setActiveId(forkedTask.id);
    toast.success("已复制为个人草稿");
  }

  function downloadActiveHtml() {
    try {
      const mimeType =
        activeTask.artifactType === "html"
          ? "text/html;charset=utf-8"
          : activeTask.artifactType === "python"
            ? "text/x-python;charset=utf-8"
            : "text/markdown;charset=utf-8";
      const fallbackExt =
        activeTask.artifactType === "html"
          ? ".html"
          : activeTask.artifactType === "python"
            ? ".py"
            : ".md";
      const blob = new Blob([activeTask.artifactCode], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeTask.artifactFile || `${activeTask.id}${fallbackExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("已下载文件");
    } catch {
      toast.error("下载失败，请点击复制");
    }
  }

  function openFullscreenPreview() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("无法打开新窗口预览");
    }
  }

  function switchToFloatingChat() {
    window.dispatchEvent(new CustomEvent("ans:open-companion-chat", { detail: { draft: promptInput } }));
    toast.success("已唤起右下角 Agent 对话窗");
  }

  return (
    <div
      data-testid="pi-codex-workbench"
      aria-label="Agent 工作模式"
      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-700/80 bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              title="唤起右下角 Agent 悬浮对话窗"
              className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              🤖 Agent 对话
            </button>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-slate-950 shadow-sm">
              🛠️ 工作模式
            </span>
          </div>
          <select
            aria-label="选择推理与代码生成模型"
            value={model}
            onChange={e => setModel(e.target.value as typeof model)}
            className="rounded-xl border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
          >
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V4.1-Flash (0.5分)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 深度推理 (1分)</option>
            <option value="gpt-6-astra">🌟 GPT-6-Astra · 前端代码 (1分)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowOnboardingGuide(v => !v)}
            title="查看 3 步上手说明"
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            📖 {showOnboardingGuide ? "收起" : "引导"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
            👤 {current} · <strong className="text-amber-300">{levelName}</strong>
            {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
            🪙 {livePoints} 积分
          </span>
          <a href="/workspace/benefits" className="rounded-xl bg-emerald-500 px-2.5 py-1 font-black text-slate-950 transition hover:bg-emerald-400">
            🎁 领算力
          </a>
          <a href="/workspace/credits" className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-slate-800">
            🔑 账本
          </a>
        </div>
      </div>

      {/* Collapsible Onboarding Guide Banner */}
      {showOnboardingGuide && (
        <div
          data-testid="workbench-onboarding-guide"
          className="border-b border-slate-800 bg-slate-900/60 px-4 py-2.5 sm:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-300">
                📖 3 步上手
              </span>
              <span className="text-slate-300">
                <strong>① 写需求</strong>（底部输入）→
                <strong className="ml-1">② 看效果</strong>（右侧预览/改源码）→
                <strong className="ml-1">③ 存项目</strong>（一键保存立项）。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartBlankTask}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-black text-slate-950 hover:bg-emerald-400"
              >
                + 新建空白
              </button>
              <button
                type="button"
                onClick={() => setShowOnboardingGuide(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Studio Grid: Compact Task List (224px) | Prompt & Composer (340px) | Wide Live Canvas (1fr) */}
      <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[224px_340px_1fr]">
        {/* Left Column: User Records & Starter Examples */}
        <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/40 p-3 lg:border-r lg:border-b-0">
          <div className="space-y-3.5">
            {/* Section 1: Real User Tasks */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-400">
                  📂 我的记录 ({userTasks.length})
                </span>
                <div className="flex items-center gap-1">
                  {userTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearUserTasks}
                      title="清空全部本地记录"
                      className="rounded-lg border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartBlankTask}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    + 新建
                  </button>
                </div>
              </div>
              {userTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-2.5 py-2 text-center text-[11px] text-slate-500">
                  暂无个人记录
                </div>
              ) : (
                <div className="max-h-[210px] space-y-1 overflow-y-auto pr-0.5">
                  {userTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveId(t.id);
                        }
                      }}
                      className={`group flex w-full cursor-pointer items-center justify-between gap-1 rounded-xl border px-2.5 py-2 text-left transition ${
                        t.id === activeTask.id
                          ? "border-emerald-500/60 bg-emerald-500/15 text-white shadow-sm"
                          : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <span className="line-clamp-1 text-xs font-bold">{t.title}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="text-[10px] text-emerald-300">
                          {t.status === "running" ? "⚡" : "✓"}
                        </span>
                        <button
                          type="button"
                          onClick={e => handleDeleteUserTask(t.id, e)}
                          title="删除此记录"
                          aria-label={`删除 ${t.title}`}
                          className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 group-hover:inline-block"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Onboarding Sample Walkthroughs */}
            <div className="border-t border-slate-800/80 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-300/90">
                  📖 引导范例
                </span>
              </div>
              <div className="space-y-1">
                {guideTasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    title={t.summary}
                    className={`group w-full rounded-xl border px-2.5 py-2 text-left transition ${
                      t.id === activeTask.id
                        ? "border-amber-500/60 bg-amber-500/15 text-white shadow-sm"
                        : "border-slate-800/70 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="line-clamp-1 text-xs font-semibold">{t.title}</span>
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 opacity-75 group-hover:opacity-100">
                        {t.tag.replace("范例", "")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Quick Actions */}
            <div className="border-t border-slate-800/80 pt-3">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
                  title="将当前作品保存至我的项目库"
                  className="rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-2 py-1.5 text-center text-[11px] font-bold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  🚀 存为项目
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "checkin")}
                  title="每日签到领取 5 算力积分"
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  📅 签到 +5
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-800/80 pt-2.5 text-center text-[11px]">
            <a href="/projects" className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              📂 项目库
            </a>
            <a href="/market" className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              🛒 工具市场
            </a>
          </div>
        </aside>

        {/* Center Column: Prompt Context & Composer */}
        <section className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-3.5 sm:p-4 lg:border-r lg:border-b-0">
          <div className="space-y-2.5 overflow-y-auto">
            {/* Compact Task Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <span>{activeTask.tag}</span>
                  <span>·</span>
                  <span className="text-slate-400">{activeTask.model}</span>
                </div>
                <h2 className="mt-0.5 truncate text-sm font-extrabold text-white" title={activeTask.title}>
                  {activeTask.title}
                </h2>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                running
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : isViewingGuideSample
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}>
                {running ? "⚡ 生成中" : isViewingGuideSample ? "📖 范例" : "✓ 已保存"}
              </span>
            </div>

            {/* Prompt Bubble */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>{isViewingGuideSample ? "💡 范例指令" : "🧑 任务需求"}</span>
                {isViewingGuideSample && (
                  <button
                    type="button"
                    onClick={() => setPromptInput(activeTask.prompt)}
                    className="text-emerald-400 hover:underline"
                  >
                    填入输入框 ↓
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-100">
                {activeTask.prompt || <span className="text-slate-500">等待输入需求...</span>}
              </p>
            </div>

            {/* Guide Sample Compact Bar OR Real Task Output Summary */}
            {isViewingGuideSample ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <span className="truncate" title={activeTask.summary}>
                  {activeTask.summary}
                </span>
                <button
                  type="button"
                  onClick={forkActiveSampleToDraft}
                  className="shrink-0 rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 hover:bg-amber-300"
                >
                  复制为草稿
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3">
                <div className="mb-1 text-[11px] font-extrabold text-emerald-300">✓ 执行结果</div>
                <div className="max-h-[160px] overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">
                  {activeTask.summary}
                </div>
                {activeTask.links && activeTask.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeTask.links.map((lk, i) => (
                      <a
                        key={i}
                        href={lk.href}
                        title={lk.detail}
                        className="rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
                      >
                        {lk.labelZh || lk.title || lk.labelEn || "查看详情"} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Composer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeCodexTask();
            }}
            className="mt-3 rounded-2xl border border-slate-700/90 bg-slate-900 p-2.5 shadow-inner"
          >
            <textarea
              id="codex-composer-input"
              rows={3}
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="输入你要做的网页、脚本或农客松方案（Enter 发送）..."
              className="w-full resize-none bg-transparent text-xs leading-5 text-white placeholder:text-slate-500 focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void executeCodexTask();
                }
              }}
            />
            {(() => {
              const seedText = (promptInput || activeTask.prompt || "网页应用").trim();
              const cluster = detectIntentAndMatchTerms(seedText);
              return (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 rounded-xl border border-slate-800 bg-slate-950/80 px-2 py-1" data-testid="codex-intent-bridge">
                  <div className="flex flex-wrap items-center gap-1">
                    {cluster.terms.map(term => (
                      <button
                        key={term.slug}
                        type="button"
                        title={term.hint.zh}
                        onClick={() => {
                          setPromptInput(prev => {
                            const base = (prev || activeTask.prompt).trim();
                            if (!base) return term.appendText.zh;
                            return base.includes(term.appendText.zh) ? base : `${base}\n- ${term.appendText.zh}`;
                          });
                        }}
                        className="rounded-md border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-300"
                      >
                        + {term.label.zh}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    title="将简短想法扩充为结构化需求"
                    onClick={() => {
                      const rawIdea = (promptInput || activeTask.prompt).trim();
                      if (!rawIdea) {
                        toast.info("请先在输入框写下一句话想法，再点击补齐细节");
                        document.getElementById("codex-composer-input")?.focus();
                        return;
                      }
                      const upgraded = upgradeToStructuredBrief(rawIdea, "zh");
                      setPromptInput(upgraded);
                      toast.success("已补齐结构化细节");
                    }}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    ✨ 补齐细节
                  </button>
                </div>
              );
            })()}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-800 pt-2">
              <div className="flex flex-wrap gap-1">
                {[
                  ["🌐 写网页", "请用单文件 HTML5 + CSS + JS 写一个简洁好用的实验数据记录与折线图网页"],
                  ["🌾 农客松提纲", "帮我梳理一份中国农大农客松智慧农业参赛项目痛点、方案与分工提纲"],
                  ["📄 改摘要", "帮我润色一段农业遥感方向的中英文论文摘要，并列出修改原因"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPromptInput(sample)}
                    className="rounded-lg border border-slate-700/80 bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-300 hover:border-emerald-500/50 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={running}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
              >
                {running ? "⚡ 运行中..." : "⚡ 发送并运行"}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Wide Studio Live Preview / Code Editor / Logs / Quick Nav */}
        <section className="flex flex-col bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "preview", label: "👁️ 预览" },
                { id: "code", label: "💻 源码" },
                { id: "terminal", label: "📟 日志" },
                { id: "tools", label: "🧰 导航" },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCanvasTab(t.id as typeof canvasTab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    canvasTab === t.id ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <code className="ml-1.5 hidden rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-emerald-300 sm:inline-block">
                {activeTask.artifactFile}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewKey(k => k + 1)}
                title="重新加载预览画布"
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                🔄 刷新
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeTask.artifactCode);
                  toast.success("已复制内容");
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                📋 复制
              </button>
              <button
                type="button"
                onClick={downloadActiveHtml}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                💾 下载
              </button>
              {activeTask.artifactType === "html" && (
                <button
                  type="button"
                  onClick={openFullscreenPreview}
                  className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
                >
                  🖥️ 新窗口 ↗
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-3">
            {canvasTab === "preview" && (
              activeTask.artifactType === "html" ? (
                <iframe
                  key={`${activeTask.id}-${previewKey}`}
                  title="Live Artifact Preview"
                  srcDoc={activeTask.artifactCode}
                  sandbox="allow-scripts"
                  className="min-h-[540px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"
                />
              ) : activeTask.artifactType === "markdown" ? (
                <article className="min-h-[540px] flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-extrabold text-emerald-400">📄 生成文档预览 · {activeTask.title}</span>
                    <span className="text-[11px] text-slate-400">{activeTask.model}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{activeTask.artifactCode}</div>
                </article>
              ) : (
                <pre className="min-h-[540px] flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
                  {activeTask.artifactCode}
                </pre>
              )
            )}

            {canvasTab === "code" && (
              <textarea
                value={activeTask.artifactCode}
                onChange={e => updateActiveCode(e.target.value)}
                aria-label="源码编辑器"
                className="min-h-[540px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 focus:border-emerald-500 focus:outline-none"
              />
            )}

            {canvasTab === "terminal" && (
              <div className="min-h-[540px] flex-1 rounded-2xl border border-slate-800 bg-black p-4 font-mono text-xs leading-6 text-emerald-400">
                <div className="mb-2 border-b border-slate-800 pb-2 text-slate-400">会话操作日志</div>
                {terminalLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {canvasTab === "tools" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["⚡ 模型演练场", "/workspace/models", "多模型同屏对比输出"],
                  ["🎨 3D 个人简历站", "/market/resume-website", "一键生成 3D 作品集网页"],
                  ["🎬 Hypit 视频工作台", "/workflows/hypit", "视频脚本与分镜生成"],
                  ["🎨 CAUAI 无限画布 ↗", "https://hb.cauai.fun/", "无限画布多模态视觉与视频工作台"],
                  ["📚 VibeHub 教程库", "/vibe-hub", "AI 编程实战指南"],
                  ["🎁 算力福利中心", "/workspace/benefits", "抓娃娃与任务领积分"],
                  ["🛒 工具与工作流市场", "/market", "兑换科研与创作工具包"],
                  ["🤝 比赛组队大厅", "/teams", "创建或加入参赛队伍"],
                  ["📦 我的已购订单", "/market/orders", "查看已兑换工具交付物"],
                  ["🔑 算力账本与充值", "/workspace/credits", "查看积分流水与卡密兑换"],
                ].map(([title, href, desc]) => (
                  <a
                    key={href}
                    href={href}
                    className="group rounded-xl border border-slate-800 bg-slate-950/90 p-3 transition hover:border-emerald-500/50 hover:bg-slate-900"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300">{title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}