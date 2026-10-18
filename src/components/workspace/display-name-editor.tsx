"use client";

import { useEffect, useState } from "react";
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

import { INITIAL_CODEX_TASKS, type CodexTask, type CodexTaskLink } from "./codex-preset-tasks";

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
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(true);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [running, setRunning] = useState<boolean>(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code" | "terminal" | "tools">("preview");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[就绪] 工作台已打开 · 当前账号：${current}（可用积分：${points}）`,
  ]);
  const [livePoints, setLivePoints] = useState<number>(points);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CodexTask[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserTasks(parsed);
          setActiveId(parsed[0].id);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

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

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      void executeCodexTask(initialPrompt.trim(), "playground");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartBlankTask() {
    const blankTask: CodexTask = {
      id: "user-draft-" + Date.now(),
      title: "新建空白网页/代码草稿",
      tag: "我的草稿",
      model,
      status: "ready",
      prompt: "在下方输入框填写你的需求，或在右侧「源码编辑」中直接编写代码。",
      trace: ["等待输入需求并点击「运行」"],
      summary: "这是一个干净的空白草稿。你可以在下方输入需求让模型生成代码，也可以直接切到右侧「💻 源码编辑」自己写代码并实时预览。",
      artifactType: "html",
      artifactFile: "my-app.html",
      artifactCode: buildLocalStarterHtml("我的第一个网页应用"),
    };
    const next = [blankTask, ...userTasks];
    saveUserTasks(next);
    setActiveId(blankTask.id);
    setCanvasTab("preview");
    setTimeout(() => document.getElementById("codex-composer-input")?.focus(), 50);
  }

  async function executeCodexTask(customPrompt?: string, intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" = "playground") {
    const q = (customPrompt ?? promptInput).trim();
    if (!q && intent === "playground") return;
    if (running) return;
    setRunning(true);
    const taskId = "user-task-" + Date.now();
    const shortTitle =
      intent === "checkin"
        ? "📅 每日签到领积分"
        : intent === "claw"
          ? "🕹️ 3D 抓娃娃机抽积分"
          : intent === "redeem"
            ? "🎁 5 积分兑换周报模板"
            : intent === "scaffold"
              ? `🚀 立项保存：${q.slice(0, 20) || activeTask.title}`
              : q.slice(0, 28) || "我的自定义任务";
    const newTask: CodexTask = {
      id: taskId,
      title: shortTitle,
      tag: intent === "playground" ? "我的任务" : "快捷操作",
      model,
      status: "running",
      prompt: q || shortTitle,
      trace: [
        `正在请求模型 ${model} 处理你的需求...`,
      ],
      summary: "正在连接算力接口生成结果，请稍候...",
      artifactType: activeTask.artifactType,
      artifactFile: "my-output.html",
      artifactCode: activeTask.artifactCode,
    };
    const nextWithRunning = [newTask, ...userTasks];
    saveUserTasks(nextWithRunning);
    setActiveId(taskId);
    if (!customPrompt) setPromptInput("");
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
      if (res.status === 401) {
        const fallbackHtml = buildLocalStarterHtml(q || shortTitle);
        const updated = nextWithRunning.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed" as const,
                trace: ["未登录状态：已在浏览器本地生成可编辑 HTML 草稿"],
                summary:
                  "当前尚未登录账号，已先根据你的描述在右侧生成一份本地可编辑的网页草稿。登录账号后再次点击运行，即可调用真实模型算力生成完整代码。",
                links: [{ labelZh: "🔐 登录账号调用真实模型算力", href: "/login?callbackUrl=%2Fworkspace" }],
                artifactType: "html" as const,
                artifactFile: "local-draft.html",
                artifactCode: fallbackHtml,
              }
            : item,
        );
        saveUserTasks(updated);
        setCanvasTab("preview");
        return;
      }
      const data = await res.json();
      const reply = (data?.replyZh || data?.replyEn || "执行完成。").trim();
      if (typeof data?.balancePoints === "number") {
        setLivePoints(data.balancePoints);
      }
      const codeMatch = reply.match(/```(?:html|python|tsx|ts|js|markdown|tex|sh)?\n([\s\S]*?)```/i);
      const extractedCode = codeMatch ? codeMatch[1].trim() : reply;
      const isHtml = /<!DOCTYPE html>|<html|<canvas|<style/i.test(extractedCode);

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
              artifactType: isHtml ? ("html" as const) : item.artifactType,
              artifactFile: isHtml ? "my-live-app.html" : item.artifactFile,
              artifactCode: isHtml ? extractedCode : item.artifactCode,
            }
          : item,
      );
      saveUserTasks(updated);
      if (isHtml) setCanvasTab("preview");
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ 执行完成 (${data?.toolUsed || intent})`,
      ]);
    } catch {
      const fallbackHtml = buildLocalStarterHtml(q || shortTitle);
      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              trace: ["已切换为本地草稿模式"],
              summary: "已为你生成本地可编辑草稿，可直接在右侧「源码编辑」中修改或稍后重试。",
              artifactType: "html" as const,
              artifactFile: "local-draft.html",
              artifactCode: fallbackHtml,
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
      setGuideTasks(prev => prev.map(item => (item.id === activeTask.id ? { ...item, artifactCode: newCode } : item)));
    }
  }

  function downloadActiveHtml() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeTask.artifactFile || `${activeTask.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("已下载源码文件");
    } catch {
      toast.error("下载失败，请点击复制源码");
    }
  }

  function openFullscreenPreview() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("无法打开新窗口预览");
    }
  }

  function switchToFloatingChat() {
    window.dispatchEvent(new CustomEvent("ans:open-companion-tab", { detail: { tab: "pi" } }));
    toast.success("已打开右下角小恐龙对话窗");
  }

  return (
    <div data-testid="pi-codex-workbench" className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              💬 悬浮对话窗
            </button>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-slate-950 shadow-sm">
              🛠️ 个人工作台
            </span>
          </div>
          <select
            aria-label="选择推理与代码生成模型"
            value={model}
            onChange={e => setModel(e.target.value as typeof model)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
          >
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V4.1-Flash · 日常主力 (0.5分/次)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 复杂逻辑与论文 (1分/次)</option>
            <option value="gpt-6-astra">🌟 GPT-6-Astra · 网页与前端代码 (1分/次)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowOnboardingGuide(v => !v)}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            📖 {showOnboardingGuide ? "收起新手引导" : "展开新手引导"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
            👤 {current} · <strong className="text-amber-300">{levelName}</strong>
            {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
            💰 真实余额: {livePoints} 积分
          </span>
          <a href="/workspace/benefits" className="rounded-xl bg-emerald-500 px-3 py-1 font-black text-slate-950 transition hover:bg-emerald-400">
            🎁 领免费积分
          </a>
          <a href="/workspace/credits" className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-slate-800">
            🔑 账本 / 充值
          </a>
        </div>
      </div>

      {/* Collapsible Zero-AI-Flavor Onboarding Guide Banner */}
      {showOnboardingGuide && (
        <div
          data-testid="workbench-onboarding-guide"
          className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-bold text-amber-300">
                📖 新手引导 · 3 步用起来
              </span>
              <span className="text-slate-300">
                <strong>① 写需求：</strong>在中间底部输入框直接用大白话写你要做的网页、脚本或比赛方案 →
                <strong className="ml-1">② 看效果：</strong>右侧实时预览或切到「源码编辑」手改代码 →
                <strong className="ml-1">③ 存项目：</strong>满意后点左侧「保存为我的立项项目」。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartBlankTask}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-black text-slate-950 hover:bg-emerald-400"
              >
                + 新建我的空白任务
              </button>
              <button
                type="button"
                onClick={() => setShowOnboardingGuide(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                知道了 ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Workbench Grid */}
      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[260px_1fr_1.15fr]">
        {/* Left Column: Real User Tasks vs Official Onboarding Samples */}
        <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/50 p-3.5 lg:border-r lg:border-b-0">
          <div className="space-y-4">
            {/* Section 1: Real User Tasks */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-400">
                  📂 我的真实记录 ({userTasks.length})
                </span>
                <button
                  type="button"
                  onClick={handleStartBlankTask}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  + 新建空白
                </button>
              </div>
              {userTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                  还没有你自己的运行记录。在中间底部输入需求点击「运行」，或点上方「+ 新建空白」开始你的真实项目。
                </div>
              ) : (
                <div className="space-y-1.5">
                  {userTasks.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition ${
                        t.id === activeTask.id
                          ? "border-emerald-500/60 bg-emerald-500/15 text-white shadow-sm"
                          : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300">{t.tag}</span>
                        <span className="text-slate-400">{t.status === "running" ? "⚡ 生成中" : "✓ 我的记录"}</span>
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs font-bold">{t.title}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Onboarding Sample Walkthroughs */}
            <div className="border-t border-slate-800 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-300/90">
                  📖 新手引导范例 (点击体验效果)
                </span>
              </div>
              <div className="space-y-1.5">
                {guideTasks.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full rounded-xl border p-2 text-left transition ${
                      t.id === activeTask.id
                        ? "border-amber-500/60 bg-amber-500/15 text-white shadow-sm"
                        : "border-slate-800/70 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-semibold text-amber-300">
                        引导范例 {idx + 1}
                      </span>
                      <span>{t.tag}</span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs font-semibold">{t.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Real Account Actions */}
            <div className="border-t border-slate-800 pt-3">
              <span className="text-[11px] font-extrabold text-slate-400">⚡ 常用实权操作</span>
              <div className="mt-2 grid gap-1.5">
                <button
                  type="button"
                  onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
                  className="rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-2 text-left text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  🚀 保存当前内容到「我的项目」
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "checkin")}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  📅 今日签到领算力 (+5分)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3 text-[11px]">
            <a href="/projects" className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              📂 我的项目库
            </a>
            <a href="/market" className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              🛒 工具市场
            </a>
          </div>
        </aside>

        {/* Center Column: Task Context & Prompt Input */}
        <section className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <div className="space-y-3 overflow-y-auto">
            {isViewingGuideSample && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <span>📖 当前正在预览<strong>【新手引导范例】</strong>，并非你的历史记录。</span>
                <button
                  type="button"
                  onClick={handleStartBlankTask}
                  className="rounded-lg bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300"
                >
                  切换到我的空白草稿 →
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div>
                <span className="text-[11px] font-bold text-emerald-400">
                  {isViewingGuideSample ? "新手引导示范案例" : "我的工作任务"} · {activeTask.model}
                </span>
                <h2 className="mt-0.5 text-base font-extrabold text-white">{activeTask.title}</h2>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                {running ? "⚡ 生成中..." : isViewingGuideSample ? "📖 引导范例" : "✓ 已保存"}
              </span>
            </div>

            {/* User Prompt Bubble */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-bold text-slate-400">
                {isViewingGuideSample ? "💡 示范提问写法（可点下方按钮照着写）" : "🧑 我的输入需求"}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-100">{activeTask.prompt}</p>
            </div>

            {/* Output Summary */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-3.5">
              <div className="mb-1 text-xs font-extrabold text-emerald-300">
                {isViewingGuideSample ? "📖 范例说明" : "✓ 输出结果说明"}
              </div>
              <div className="whitespace-pre-wrap text-xs leading-6 text-slate-200">{activeTask.summary}</div>
              {activeTask.links && activeTask.links.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeTask.links.map((lk, i) => (
                    <a
                      key={i}
                      href={lk.href}
                      className="rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200 hover:bg-indigo-500/30"
                    >
                      {lk.labelZh || lk.labelEn} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Composer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeCodexTask();
            }}
            className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-inner"
          >
            <textarea
              id="codex-composer-input"
              rows={3}
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="在这里输入你真正想做的任务：比如「写一个番茄钟倒计时网页」「帮我列一份农客松参赛答辩提纲」..."
              className="w-full resize-none bg-transparent text-xs leading-5 text-white placeholder:text-slate-500 focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void executeCodexTask();
                }
              }}
            />
            {(() => {
              const cluster = detectIntentAndMatchTerms(promptInput || activeTask.prompt);
              return (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2" data-testid="codex-intent-bridge">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-300">
                      💡 提问小助手：觉得写得太简略？可点右侧帮你补齐细节
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const upgraded = upgradeToStructuredBrief(promptInput || activeTask.prompt, "zh");
                        setPromptInput(upgraded);
                        toast.success("已帮你补充需求细节，可直接修改后点击运行");
                      }}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      ✨ 帮我把需求写得更具体
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">常用补充项：</span>
                    {cluster.terms.map(term => (
                      <button
                        key={term.slug}
                        type="button"
                        title={term.hint.zh}
                        onClick={() => {
                          setPromptInput(prev => {
                            const base = (prev || activeTask.prompt).trim();
                            return base.includes(term.appendText.zh) ? base : `${base}\n- ${term.appendText.zh}`;
                          });
                        }}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-300"
                      >
                        + {term.label.zh}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
              <div className="flex flex-wrap gap-1">
                {[
                  ["🌐 试写网页", "请用单文件 HTML5 + CSS + JS 写一个简洁好用的实验数据记录与折线图网页"],
                  ["🌾 农客松提纲", "帮我梳理一份中国农大农客松智慧农业参赛项目痛点、方案与分工提纲"],
                  ["📄 论文润色", "帮我润色一段农业遥感方向的中英文论文摘要，并列出修改原因"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPromptInput(sample)}
                    className="rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={running}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-1.5 text-xs font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
              >
                {running ? "⚡ 正在运行..." : "⚡ 发送并运行"}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Live Preview / Code Editor / Terminal / Quick Tools Canvas */}
        <section className="flex flex-col bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "preview", label: "👁️ 实时预览" },
                { id: "code", label: "💻 源码编辑" },
                { id: "terminal", label: "📟 运行日志" },
                { id: "tools", label: "🧰 站内导航" },
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
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewKey(k => k + 1)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                🔄 刷新预览
              </button>
              <button
                type="button"
                onClick={downloadActiveHtml}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                💾 下载文件
              </button>
              <button
                type="button"
                onClick={openFullscreenPreview}
                className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
              >
                🖥️ 新窗口打开 ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeTask.artifactCode);
                  toast.success("已复制源码");
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                📋 复制源码
              </button>
            </div>
          </div>

          <div className="flex-1 p-4">
            {canvasTab === "preview" && (
              activeTask.artifactType === "html" ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-400">
                    <span>
                      {isViewingGuideSample ? "📖 引导范例实时预览" : "🟢 我的草稿实时预览"} · <code className="text-emerald-300">{activeTask.artifactFile}</code>
                    </span>
                    <button type="button" onClick={() => setCanvasTab("code")} className="text-emerald-400 hover:underline">
                      打开源码编辑器修改 →
                    </button>
                  </div>
                  <iframe
                    key={`${activeTask.id}-${previewKey}`}
                    title="Live Artifact Preview"
                    srcDoc={activeTask.artifactCode}
                    sandbox="allow-scripts"
                    className="min-h-[520px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                    <span>📄 代码/文档预览 · <code className="text-emerald-300">{activeTask.artifactFile}</code></span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{activeTask.artifactType.toUpperCase()}</span>
                  </div>
                  <pre className="max-h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-200">
                    {activeTask.artifactCode}
                  </pre>
                </div>
              )
            )}

            {canvasTab === "code" && (
              <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>正在编辑: <strong className="text-emerald-300">{activeTask.artifactFile}</strong>（修改后切回「👁️ 实时预览」立刻生效）</span>
                  <span>{activeTask.artifactCode.split("\n").length} 行</span>
                </div>
                <textarea
                  value={activeTask.artifactCode}
                  onChange={e => updateActiveCode(e.target.value)}
                  className="min-h-[520px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {canvasTab === "terminal" && (
              <div className="min-h-[520px] rounded-2xl border border-slate-800 bg-black p-4 font-mono text-xs leading-6 text-emerald-400">
                <div className="mb-2 border-b border-slate-800 pb-2 text-slate-400">真实操作记录（仅记录当前会话操作）</div>
                {terminalLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {canvasTab === "tools" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ["⚡ 模型演练场", "/workspace/models", "对比测试 DeepSeek 与 GPT 模型输出"],
                  ["🎨 3D 个人简历站生成", "/market/resume-website", "生成可独立部署的 3D 个人作品集网页"],
                  ["🎬 Hypit 视频工作台", "/workflows/hypit", "视频脚本与分镜制作工具"],
                  ["🎭 Toonflow 短剧工坊 ↗", "https://toonflow.cauai.fun", "小说转分镜与漫剧创作站点"],
                  ["📚 VibeHub 教程库", "/vibe-hub", "AI 编程入门教程与实战指南"],
                  ["🎁 算力福利中心", "/workspace/benefits", "做任务、玩抓娃娃机免费领积分"],
                  ["🛒 工具与工作流市场", "/market", "用积分兑换现成科研与创作工具"],
                  ["🤝 比赛组队大厅", "/teams", "创建或加入参赛队伍"],
                  ["📦 我的已购订单", "/market/orders", "查看已兑换的工具包交付物"],
                  ["🔑 算力账本与卡密充值", "/workspace/credits", "查看真实积分流水、兑换卡密"],
                ].map(([title, href, desc]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 transition hover:border-emerald-500/50 hover:bg-slate-900"
                  >
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{desc}</div>
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