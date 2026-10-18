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

function PiCodexWorkbench({
  actorId,
  current,
  points = 0,
  levelName = "Lv.1",
  initialPrompt = "",
}: CodexWorkbenchProps) {
  const [tasks, setTasks] = useState<CodexTask[]>(INITIAL_CODEX_TASKS);
  const [activeId, setActiveId] = useState<string>(INITIAL_CODEX_TASKS[0].id);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [running, setRunning] = useState<boolean>(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "code" | "terminal" | "tools">("preview");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[00:00.01] $ pi-codex init --mode=work --sandbox=ans-cloud-v2",
    "[00:00.08] ✓ Connected to ANS Compute Cluster (DeepSeek-V3 / GPT-6.1-Sol / Qwen-Coder)",
    "[00:00.12] ✓ Mounted live HTML5/Canvas preview sandbox & artifact editor",
  ]);
  const [livePoints, setLivePoints] = useState<number>(points);

  const activeTask = tasks.find(t => t.id === activeId) ?? tasks[0];

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      void executeCodexTask(initialPrompt.trim(), "playground");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeCodexTask(customPrompt?: string, intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" | "market" = "playground") {
    const q = (customPrompt ?? promptInput).trim();
    if (!q && intent === "playground") return;
    if (running) return;
    setRunning(true);
    const taskId = "task-" + Date.now();
    const shortTitle =
      intent === "checkin"
        ? "📅 灵龙实权代办：每日签到领积分"
        : intent === "claw"
          ? "🕹️ 灵龙实权代办：3D 抓娃娃机搏锦鲤"
          : intent === "redeem"
            ? "🎁 灵龙实权代办：5 积分秒兑周报模板"
            : intent === "scaffold"
              ? "🚀 灵龙实权代办：一键立项存为我的项目"
              : "⚡ " + (q.slice(0, 26) || "Codex 工程任务");
    const newTask: CodexTask = {
      id: taskId,
      title: shortTitle,
      tag: intent === "playground" ? "Codex Agent" : "Pi Action",
      model,
      status: "running",
      prompt: q || shortTitle,
      trace: [
        "⏳ [1/3] workspace.parse_intent — 正在解析工程需求与上下文...",
        `⏳ [2/3] llm.invoke(${model}) — 正在流式生成结构化代码与产物...`,
      ],
      summary: "正在调度 ANS Pi-Codex 引擎执行任务，请稍候...",
      artifactType: activeTask.artifactType,
      artifactFile: activeTask.artifactFile,
      artifactCode: activeTask.artifactCode,
    };
    setTasks(prev => [newTask, ...prev]);
    setActiveId(taskId);
    if (!customPrompt) setPromptInput("");
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] $ pi-codex exec --intent=${intent} --model=${model} "${(q || intent).slice(0, 48)}"`,
    ]);

    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pi_action", intent, prompt: q, model }),
      });
      const data = await res.json();
      const reply = (data?.replyZh || data?.replyEn || "执行完成。").trim();
      if (typeof data?.balancePoints === "number") {
        setLivePoints(data.balancePoints);
      }
      const codeMatch = reply.match(/```(?:html|python|tsx|ts|js|markdown|tex|sh)?\n([\s\S]*?)```/i);
      const extractedCode = codeMatch ? codeMatch[1].trim() : reply;
      const isHtml = /<!DOCTYPE html>|<html|<canvas|<style/i.test(extractedCode);

      setTasks(prev =>
        prev.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed",
                trace: [
                  "✓ [1/3] workspace.parse_intent — 任务意图与上下文校验通过",
                  `✓ [2/3] llm.invoke(${data?.toolUsed || model}) — 实权动作已完成`,
                  "✓ [3/3] canvas.sync_artifact — 产物已同步至右侧画布",
                ],
                summary: reply,
                links: Array.isArray(data?.links) ? data.links : [],
                artifactType: isHtml ? "html" : item.artifactType,
                artifactFile: isHtml ? "codex-live-app.html" : item.artifactFile,
                artifactCode: isHtml ? extractedCode : item.artifactCode,
              }
            : item,
        ),
      );
      if (isHtml) setCanvasTab("preview");
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✓ Completed (${data?.toolUsed || intent})`,
      ]);
    } catch {
      setTasks(prev =>
        prev.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed",
                summary: "⚠️ 网络请求波动，已为你保留当前右侧工程画布产物，可直接编辑或重试。",
              }
            : item,
        ),
      );
    } finally {
      setRunning(false);
    }
  }

  function updateActiveCode(newCode: string) {
    setTasks(prev => prev.map(item => (item.id === activeTask.id ? { ...item, artifactCode: newCode } : item)));
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
      toast.success("已下载单文件应用源码！");
    } catch {
      toast.error("下载失败，请先复制源码");
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
    toast.success("已唤起右下角小恐龙【💬 聊天模式】伴随窗！");
  }

  return (
    <div data-testid="pi-codex-workbench" className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
      {/* Top Codex IDE Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-950 p-1 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              💬 聊天模式 (悬浮窗)
            </button>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-slate-950 shadow-sm">
              🛠️ 工作模式 · Pi-Codex 工作台
            </span>
          </div>
          <select
            aria-label="选择 Codex 推理与编码模型"
            value={model}
            onChange={e => setModel(e.target.value as typeof model)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
          >
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V4.1-Flash · 极速工程主力 (0.5分)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 架构与学术精修 (1分)</option>
            <option value="gpt-6-astra">🌟 GPT-6-Astra · 全栈代码生成 (1分)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
            👤 {current} · <strong className="text-amber-300">{levelName}</strong>
            {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-300">
            💰 算力: {livePoints} 积分
          </span>
          <a href="/workspace/benefits" className="rounded-xl bg-emerald-500 px-3 py-1 font-black text-slate-950 transition hover:bg-emerald-400">
            🎁 领 100~150 分
          </a>
          <a href="/workspace/credits" className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-slate-800">
            🔑 API Key / 充值
          </a>
        </div>
      </div>

      {/* 3-Column OpenAI Codex / Cursor Workbench Grid */}
      <div className="grid min-h-[660px] grid-cols-1 lg:grid-cols-[260px_1fr_1.15fr]">
        {/* Left Column: Task Queue & 1-Click Engineering Presets */}
        <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/50 p-3.5 lg:border-r lg:border-b-0">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">Codex 任务线程 ({tasks.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setCanvasTab("preview");
                    document.getElementById("codex-composer-input")?.focus();
                  }}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  + 新建任务
                </button>
              </div>
              <div className="space-y-1.5">
                {tasks.map(t => (
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
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-emerald-300">{t.tag}</span>
                      <span className="text-slate-400">{t.status === "running" ? "⚡ 执行中" : "🟢 已就绪"}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-1 text-xs font-bold">{t.title}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">⚡ 快捷工程动作</span>
              <div className="mt-2 grid gap-1.5">
                <button
                  type="button"
                  onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
                  className="rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-2.5 py-2 text-left text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  🚀 保存为我的立项项目
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "redeem")}
                  className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-sky-300 transition hover:bg-sky-500/20"
                >
                  🎁 5分秒兑周报生成器
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "checkin")}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-left text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  📅 每日签到领算力 (+5分)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3 text-[11px]">
            <a href="/projects" className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              📂 我的项目
            </a>
            <a href="/market" className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              🛒 模板市场
            </a>
          </div>
        </aside>

        {/* Center Column: Codex Execution Trace & Multi-Turn Composer */}
        <section className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-4 sm:p-5 lg:border-r lg:border-b-0">
          <div className="space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div>
                <span className="text-[11px] font-bold text-emerald-400">ACTIVE CODEX TASK · {activeTask.model}</span>
                <h2 className="mt-0.5 text-base font-extrabold text-white">{activeTask.title}</h2>
              </div>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                {running ? "⚡ 执行中..." : "✓ 已就绪"}
              </span>
            </div>

            {/* User Prompt Bubble */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-bold text-slate-400">🧑 任务指令</div>
              <p className="mt-1 text-xs leading-5 text-slate-100">{activeTask.prompt}</p>
            </div>

            {/* Collapsible Tool Execution Trace */}
            <details className="group rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold text-indigo-300">
                <span>🛠️ 工具链执行轨迹 ({activeTask.trace.length} 步)</span>
                <span className="font-mono text-[10px] text-slate-400">点击展开 ↓</span>
              </summary>
              <ul className="mt-2 space-y-1.5 font-mono text-xs text-slate-300">
                {activeTask.trace.map((step, idx) => (
                  <li key={idx} className="rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] text-emerald-300">
                    {step}
                  </li>
                ))}
              </ul>
            </details>

            {/* Agent Response Summary */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-3.5">
              <div className="mb-1 text-xs font-extrabold text-emerald-300">✓ 工程输出说明</div>
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

          {/* Codex Bottom Composer */}
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
              placeholder="向 Pi-Codex 下达工程任务：例如「写一个番茄钟网页」「生成农客松路演PPT大纲」「用Python分析土壤数据」..."
              className="w-full resize-none bg-transparent text-xs leading-5 text-white placeholder:text-slate-500 focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void executeCodexTask();
                }
              }}
            />
            {/* ANS Intent Bridge: Proactive Term Pills & 1-Click 4-Part Brief Upgrade */}
            {(() => {
              const cluster = detectIntentAndMatchTerms(promptInput || activeTask.prompt);
              return (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5" data-testid="codex-intent-bridge">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-300">{cluster.badge.zh}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const upgraded = upgradeToStructuredBrief(promptInput || activeTask.prompt, "zh");
                        setPromptInput(upgraded);
                        toast.success("已按 ANS 四段式规范 + ans-tone-guard 扩写工程指令！");
                      }}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      🧭 一键扩写为四段式专业 Brief
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">{cluster.clarifyingQuestion.zh}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">注入术语约束：</span>
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
                          toast.success(`已注入「${term.label.zh}」工程约束`);
                        }}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-300"
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
                  ["🌐 互动网页", "请用单文件 HTML5 + Canvas 生成一个可交互的 AI 算力监控仪表盘网页"],
                  ["🌾 农客松方案", "帮我写一份中国农大农客松智慧农业参赛方案与核心 Python 代码"],
                  ["📄 论文精修", "帮我润色一段深度学习农业遥感方向的中英文论文摘要并给修改对比"],
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
                {running ? "⚡ 正在执行..." : "⚡ 运行任务 (Run in Codex)"}
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
                { id: "terminal", label: "📟 终端日志" },
                { id: "tools", label: "🧰 全站工具箱" },
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
                🔄 重置
              </button>
              <button
                type="button"
                onClick={downloadActiveHtml}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                💾 下载 .html
              </button>
              <button
                type="button"
                onClick={openFullscreenPreview}
                className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
              >
                🖥️ 新窗口全屏 ↗
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeTask.artifactCode);
                  toast.success("已复制右侧画布完整源码！");
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
                    <span>🟢 Sandbox Live Preview · <code className="text-emerald-300">{activeTask.artifactFile}</code></span>
                    <button type="button" onClick={() => setCanvasTab("code")} className="text-emerald-400 hover:underline">
                      修改源码 →
                    </button>
                  </div>
                  <iframe
                    key={`${activeTask.id}-${previewKey}`}
                    title="Pi-Codex Live Artifact Preview"
                    srcDoc={activeTask.artifactCode}
                    sandbox="allow-scripts"
                    className="min-h-[520px] w-full flex-1 rounded-2xl border border-slate-800 bg-slate-950 shadow-inner"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                    <span>📄 工程产物预览 · <code className="text-emerald-300">{activeTask.artifactFile}</code></span>
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
                  <span>正在编辑: <strong className="text-emerald-300">{activeTask.artifactFile}</strong>（修改后切回「👁️ 实时预览」即刻生效）</span>
                  <span>{activeTask.artifactCode.split("\n").length} lines</span>
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
                <div className="mb-2 border-b border-slate-800 pb-2 text-slate-400">ANS Pi-Codex Cloud Terminal · bash (node v24 / python 3.12)</div>
                {terminalLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {canvasTab === "tools" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ["⚡ 模型广场与多模型演练", "/workspace/models", "DeepSeek / Qwen / 视觉模型零配置对比"],
                  ["🎨 3D 个人网站工作坊", "/market/resume-website", "3D 角色与双语个人作品集即开即改"],
                  ["🎬 Hypit 视频工作台", "/workflows/hypit", "AI 创意视频制作与脚本生成工作台"],
                  ["🎭 Toonflow 短剧工坊 ↗", "https://toonflow.cauai.fun", "小说转分镜与 AI 漫剧独立创作站"],
                  ["📚 VibeHub 知识库", "/vibe-hub", "全栈 AI 编程教程、提示词与实战路线"],
                  ["🎁 3D 抓娃娃与算力福利", "/workspace/benefits", "免费领 100~150 积分、抽 ¥100 锦鲤"],
                  ["🛒 ANS 工作流市场", "/market", "花积分一键购买并运行 AI 工作流"],
                  ["🤝 赛事组队与战队空间", "/teams", "创建/加入黑客松战队，共享比赛算力"],
                  ["📦 我的市场订单", "/market/orders", "查看已购工作流并一键默认验收"],
                  ["🔑 算力卡密充值与 API Key", "/workspace/credits", "兑换算力卡密、管理开发者密钥"],
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