"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Bot, CalendarCheck, Check, ChevronDown, Code2, Coins, Copy, CopyPlus,
  Cpu, Download, ExternalLink, Eye, FileCode2, FileText, FolderOpen, FolderPlus, Gift, GitBranch, GitCompareArrows, Lightbulb,
  ListChecks, Loader2, MessageSquare, Monitor, PanelsTopLeft, Pencil, Plus, ReceiptText, RotateCw, Smartphone, SquareTerminal,
  Store, Trash2, Undo2, UserRound, Wand2, X,
} from "lucide-react";
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
import { usePausedRunModels, useRunModelMultipliers } from "@/components/providers/run-model-pricing";
import { imeBlocks } from "@/lib/ui/ime-enter-guard";
import { ResizableSplit } from "@/lib/ui/resizable-split";
import { MiddleEllipsis } from "@/lib/ui/middle-ellipsis";
import { useCopyFeedback } from "@/lib/ui/copy-feedback";

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
  const w = useTranslations("workbench");
  const { request, isActive } = useSettingsRequest(actorId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    const nickname = value.trim();
    if (nickname.length < 2 || nickname.length > 40) {
      toast.error(w("toast.nicknameLength"));
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
        toast.error(`${result.message || w("toast.updateFailed")}${retry ? w("toast.retryAfterMinutes", { p1: Math.ceil(retry / 60) }) : ""}`);
        return;
      }
      toast.success(w("toast.nicknameUpdated"));
      setOpen(false);
      window.location.reload();
    } catch {
      if (isActive()) toast.error(w("toast.retryLater"));
    } finally {
      if (isActive()) setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="ms-2 h-7 gap-1 text-xs text-current hover:text-white" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" /> {w("label.editNickname")}
      </Button>
    );
  }

  return (
    <span className="ms-2 inline-flex items-center gap-1.5 align-middle">
      <Input
        value={value}
        maxLength={40}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !imeBlocks(event)) void save(); if (event.key === "Escape") setOpen(false); }}
        className="h-7 w-40 text-sm"
        aria-label={w("aria.nicknameInput")}
      />
      <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => void save()}>
        {saving ? w("label.saving") : "保存"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => setOpen(false)}>取消</Button>
    </span>
  );
}

interface DiffLine {
  type: "add" | "del" | "ctx";
  oldLine?: number;
  newLine?: number;
  text: string;
}

function computeUnifiedDiff(
  oldCode: string,
  newCode: string,
): { lines: DiffLine[]; additions: number; deletions: number } {
  const oldLines = (oldCode || "").split("\n");
  const newLines = (newCode || "").split("\n");
  if (!oldCode) {
    return {
      lines: newLines.map((text, idx) => ({
        type: "add" as const,
        newLine: idx + 1,
        text,
      })),
      additions: newLines.length,
      deletions: 0,
    };
  }
  if (oldCode === newCode) {
    return {
      lines: newLines.map((text, idx) => ({
        type: "ctx" as const,
        oldLine: idx + 1,
        newLine: idx + 1,
        text,
      })),
      additions: 0,
      deletions: 0,
    };
  }

  const m = oldLines.length;
  const n = newLines.length;
  if (m * n > 250000) {
    const result: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;
    const maxLen = Math.max(m, n);
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const nw = newLines[i];
      if (o === nw && o !== undefined) {
        result.push({ type: "ctx", oldLine: i + 1, newLine: i + 1, text: o });
      } else {
        if (o !== undefined) {
          result.push({ type: "del", oldLine: i + 1, text: o });
          deletions++;
        }
        if (nw !== undefined) {
          result.push({ type: "add", newLine: i + 1, text: nw });
          additions++;
        }
      }
    }
    return { lines: result, additions, deletions };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      lines.push({ type: "ctx", oldLine: i + 1, newLine: j + 1, text: oldLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: "del", oldLine: i + 1, text: oldLines[i] });
      deletions++;
      i++;
    } else {
      lines.push({ type: "add", newLine: j + 1, text: newLines[j] });
      additions++;
      j++;
    }
  }
  while (i < m) {
    lines.push({ type: "del", oldLine: i + 1, text: oldLines[i] });
    deletions++;
    i++;
  }
  while (j < n) {
    lines.push({ type: "add", newLine: j + 1, text: newLines[j] });
    additions++;
    j++;
  }
  return { lines, additions, deletions };
}

function buildLocalStarterHtml(userPrompt: string): string {
  const safeTitle = userPrompt.replace(/[<>]/g, "").slice(0, 48) || "我的第一个网页应用";
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
    <div class="stage" id="outputBox">点击下方按钮测试交互，或切到顶部「{w("tab.code")}」直接修改 HTML / CSS / JS 代码。</div>
    <button onclick="document.getElementById('outputBox').textContent = '✅ 交互测试成功！当前时间：' + new Date().toLocaleTimeString()">运行交互测试</button>
  </div>
</body>
</html>`;
}

function applySmartLocalCodeEdit(existingCode: string, instruction: string): string {
  const safeNote = instruction.replace(/[<>]/g, "").slice(0, 80);
  if (/<!DOCTYPE html>|<html[\s>]/i.test(existingCode) && existingCode.includes("</body>")) {
    let patched = existingCode;
    if (/亮色|浅色|白底|light/i.test(instruction)) {
      patched = patched
        .replace(/background:\s*#090d16/g, "background: #f8fafc")
        .replace(/background:\s*#060913/g, "background: #f8fafc")
        .replace(/color:\s*#f1f5f9/g, "color: #0f172a")
        .replace(/color:\s*#e2e8f0/g, "color: #0f172a");
    } else if (/金色|琥珀|暖色|amber|gold/i.test(instruction)) {
      patched = patched.replace(/#10b981/g, "#f59e0b").replace(/#34d399/g, "#fbbf24");
    }
    const badgeHtml = `\n  <!-- [Agent 增量变更] ${safeNote} -->\n  <div style="margin:14px auto;max-width:680px;padding:10px 14px;border-radius:10px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);color:#34d399;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;"><span>⚡ 已应用增量修改：${safeNote}</span><button onclick="this.parentElement.remove()" style="background:transparent;border:1px solid rgba(16,185,129,0.4);color:#34d399;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">{w("label.collapse")}</button></div>\n</body>`;
    return patched.replace("</body>", badgeHtml);
  }
  return `${existingCode.trimEnd()}\n\n# [Agent 增量修改] ${safeNote}\n`;
}

const WORKBENCH_MODEL_OPTIONS = [
  { key: "deepseek-v4.1-flash", labelKey: "model.flash" },
  { key: "gpt-6.1-sol", labelKey: "model.sol" },
  { key: "gpt-6-astra", labelKey: "model.astra" },
] as const;

function PiCodexWorkbench({
  actorId,
  current,
  points = 0,
  levelName = "Lv.1",
  initialPrompt = "",
}: CodexWorkbenchProps) {
  const w = useTranslations("workbench");
  const storageKey = `ans:workspace:user-tasks:v1:${actorId || "guest"}`;
  const [userTasks, setUserTasks] = useState<CodexTask[]>([]);
  const [guideTasks] = useState<CodexTask[]>(INITIAL_CODEX_TASKS);
  const [activeId, setActiveId] = useState<string>(INITIAL_CODEX_TASKS[0].id);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const multipliers = useRunModelMultipliers();
  const paused = usePausedRunModels();
  const [composerMode, setComposerMode] = useState<"code" | "ask">("code");
  const [iterateOnCurrent, setIterateOnCurrent] = useState<boolean>(true);
  const [traceExpanded, setTraceExpanded] = useState<boolean>(true);
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");
  const [promptInput, setPromptInput] = useState<string>(initialPrompt);
  const [running, setRunning] = useState<boolean>(false);
  const [canvasTab, setCanvasTab] = useState<"preview" | "diff" | "code" | "terminal">("preview");
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    w("trace.ready", { p1: current, p2: points }),
  ]);
  const [livePoints, setLivePoints] = useState<number>(points);
  const copyFeedback = useCopyFeedback();

  useEffect(() => {
    setLivePoints(points);
  }, [points]);

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
  const activeDiff = computeUnifiedDiff(activeTask.previousCode ?? "", activeTask.artifactCode);

  const executeRef = useRef(executeCodexTask);
  executeRef.current = executeCodexTask;

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
      void executeRef.current(cleanInitial, "playground", stored, "code");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    const onExternalPrompt = (ev: Event) => {
      const detail = (ev as CustomEvent<{ prompt?: string; mode?: "code" | "ask" }>).detail;
      const incoming = detail?.prompt?.trim();
      if (incoming) {
        setPromptInput(incoming);
        void executeRef.current(incoming, "playground", undefined, detail?.mode ?? "code");
      }
    };
    window.addEventListener("ans:codex-prompt", onExternalPrompt);
    return () => window.removeEventListener("ans:codex-prompt", onExternalPrompt);
  }, []);

  function buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (actorId && actorId !== "guest-preview") {
      headers["x-ans-actor"] = actorId;
    }
    return headers;
  }

  function handleStartBlankTask() {
    const starter = buildLocalStarterHtml(w("default.firstWebAppTitle"));
    const blankTask: CodexTask = {
      id: "user-draft-" + Date.now(),
      title: w("task.newBlankDraft"),
      tag: "我的草稿",
      model,
      mode: "code",
      branch: "ans-workspace/main",
      durationSec: 1,
      diffAdditions: starter.split("\n").length,
      diffDeletions: 0,
      status: "ready",
      prompt: "",
      trace: [
        w("trace.initWorkspace"),
        w("trace.readyForInput"),
      ],
      summary: w("label.ask"),
      artifactType: "html",
      artifactFile: "my-app.html",
      previousCode: "",
      artifactCode: starter,
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
    toast.success(w("toast.recordDeleted"));
  }

  function handleClearUserTasks() {
    saveUserTasks([]);
    setActiveId(guideTasks[0].id);
    toast.success(w("toast.recordsCleared"));
  }

  async function executeCodexTask(
    customPrompt?: string,
    intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" = "playground",
    baseTasksOverride?: CodexTask[],
    overrideMode?: "code" | "ask",
  ) {
    const runMode = overrideMode ?? composerMode;
    const q = (customPrompt ?? promptInput).trim();
    if (!q && intent === "playground") return;
    if (running) return;
    if (intent === "checkin") {
      setRunning(true);
      try {
        const res = await fetch("/api/mascot/agent", {
          method: "POST",
          headers: buildAuthHeaders(),
          body: JSON.stringify({ action: "pi_action", intent: "checkin", prompt: "", model }),
        });
        if (res.status === 401 || !res.ok) {
          toast.info(w("toast.signInForCheckin"));
          return;
        }
        const data = await res.json();
        if (typeof data?.balancePoints === "number") {
          setLivePoints(data.balancePoints);
        }
        toast.success((data?.replyZh || "已完成今日签到 (+5 积分)").slice(0, 80));
      } catch {
        toast.error(w("toast.checkinNoResponse"));
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
          headers: buildAuthHeaders(),
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
            trace: [
              ...(activeTask.trace ?? []),
              w("trace.scaffoldProject"),
            ],
            summary: w("toast.savedLocal"),
            links: [{ labelZh: w("link.createProject"), href: targetLink }],
          };
          const next = baseTasks.some(t => t.id === savedTask.id)
            ? baseTasks.map(t => (t.id === savedTask.id ? savedTask : t))
            : [savedTask, ...baseTasks];
          saveUserTasks(next);
          setActiveId(savedTask.id);
          toast.success(w("toast.savedLocal"));
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
          trace: Array.isArray(data?.trace) && data.trace.length > 0 ? data.trace : activeTask.trace,
          summary: rawReply || "已生成项目立项草稿。",
          links: Array.isArray(data?.links) && data.links.length > 0
            ? data.links
            : [{ labelZh: w("link.openProjects"), href: "/projects" }],
        };
        const next = baseTasks.some(t => t.id === savedTask.id)
          ? baseTasks.map(t => (t.id === savedTask.id ? savedTask : t))
          : [savedTask, ...baseTasks];
        saveUserTasks(next);
        setActiveId(savedTask.id);
        toast.success(w("toast.savedProjectDraft"));
      } catch {
        toast.error(w("toast.saveNoResponse"));
      } finally {
        setRunning(false);
      }
      return;
    }

    setRunning(true);
    const startedAt = Date.now();
    const baseTasks = baseTasksOverride ?? (userTasks.length > 0 ? userTasks : readStoredUserTasks());
    const shouldIterateCurrent =
      intent === "playground" && iterateOnCurrent && Boolean(activeTask?.artifactCode);
    const contextBaseline = shouldIterateCurrent ? activeTask.artifactCode : "";
    const isUpdatingExistingUserTask =
      shouldIterateCurrent && baseTasks.some(t => t.id === activeTask.id);

    const taskId = isUpdatingExistingUserTask ? activeTask.id : "user-task-" + Date.now();
    const shortTitle =
      intent === "claw"
        ? w("quickPrompt.claw")
        : intent === "redeem"
          ? w("quickPrompt.redeem")
          : isUpdatingExistingUserTask
            ? activeTask.title
            : q.slice(0, 28) || w("task.newBlankDraft");

    const fallbackCode = shouldIterateCurrent
      ? runMode === "ask"
        ? activeTask.artifactCode
        : applySmartLocalCodeEdit(activeTask.artifactCode, q)
      : buildLocalStarterHtml(q || shortTitle);

    const diffBaselineForFallback =
      shouldIterateCurrent && runMode === "ask"
        ? activeTask.previousCode ?? ""
        : contextBaseline;
    const initialDiff = computeUnifiedDiff(diffBaselineForFallback, fallbackCode);
    const runningTrace = [
      `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.readCurrentArtifact", { p1: activeTask.artifactFile, p2: contextBaseline.length }) : w("trace.initWorkspaceContext")}`,
      `[2/4] agent.route_intent → mode=${runMode.toUpperCase()} · model=${model}`,
      w("trace.runningModel"),
    ];

    const runningTask: CodexTask = {
      id: taskId,
      title: shortTitle,
      tag: runMode === "ask" ? w("tag.archQA") : shouldIterateCurrent ? "增量迭代" : intent === "playground" ? "我的任务" : "快捷操作",
      model,
      mode: runMode,
      branch: activeTask.branch || "ans-workspace/main",
      durationSec: 1,
      diffAdditions: initialDiff.additions,
      diffDeletions: initialDiff.deletions,
      status: "running",
      prompt: q || shortTitle,
      trace: runningTrace,
      summary: runMode === "ask" ? w("progress.analyzing") : "正在执行代码构建与差异对比...",
      artifactType: shouldIterateCurrent ? activeTask.artifactType : "html",
      artifactFile: shouldIterateCurrent ? activeTask.artifactFile : "my-output.html",
      previousCode: diffBaselineForFallback,
      artifactCode: shouldIterateCurrent ? activeTask.artifactCode : fallbackCode,
    };

    const nextWithRunning = isUpdatingExistingUserTask
      ? baseTasks.map(t => (t.id === taskId ? runningTask : t))
      : [runningTask, ...baseTasks];
    saveUserTasks(nextWithRunning);
    setActiveId(taskId);
    setTraceExpanded(true);
    if (customPrompt === undefined) setPromptInput("");
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [${runMode.toUpperCase()}] ${shortTitle} (${model})`,
    ]);

    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          action: "pi_action",
          intent,
          prompt: q,
          model,
          mode: runMode,
          contextCode: shouldIterateCurrent ? contextBaseline.slice(0, 12000) : undefined,
        }),
      });
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      if (res.status === 401 || !res.ok) {
        const localDiff = computeUnifiedDiff(diffBaselineForFallback, fallbackCode);
        const guestTrace = [
          `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.readBaseline", { p1: activeTask.artifactFile }) : w("trace.createSandbox")}`,
          w("trace.planChanges", { p1: q.slice(0, 36) }),
          runMode === "ask"
            ? w("trace.answerQuery")
            : w("trace.applyPatch", { p1: localDiff.additions, p2: localDiff.deletions }),
          w("trace.verifyOutput", { p1: elapsedSec }),
        ];
        const updated = nextWithRunning.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed" as const,
                durationSec: elapsedSec,
                diffAdditions: localDiff.additions,
                diffDeletions: localDiff.deletions,
                trace: guestTrace,
                summary:
                  runMode === "ask"
                    ? w("reply.localAnswer", { p1: q, p2: runningTask.artifactFile })
                    : shouldIterateCurrent
                      ? w("reply.appliedChange", { p1: runningTask.artifactFile, p2: localDiff.additions, p3: localDiff.deletions })
                      : w("reply.guestMode"),
                links: [{ labelZh: w("link.signInForCompute"), href: "/login?callbackUrl=%2Fworkspace" }],
                artifactType: runningTask.artifactType,
                artifactFile: shouldIterateCurrent ? runningTask.artifactFile : "local-draft.html",
                previousCode: diffBaselineForFallback,
                artifactCode: fallbackCode,
              }
            : item,
        );
        saveUserTasks(updated);
        if (runMode === "code" && shouldIterateCurrent) {
          setCanvasTab("diff");
        } else {
          setCanvasTab("preview");
        }
        return;
      }

      const data = await res.json();
      const rawReply = (data?.replyZh || data?.replyEn || "").trim();
      const reply = rawReply && rawReply !== "UNAUTHORIZED" ? rawReply : w("reply.done");
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

      const nextArtifactCode =
        runMode === "ask" && !codeMatch && shouldIterateCurrent
          ? activeTask.artifactCode
          : extractedCode;
      const resolvedType: "html" | "python" | "markdown" =
        runMode === "ask" && !codeMatch && shouldIterateCurrent
          ? activeTask.artifactType
          : isHtml
            ? "html"
            : isPython
              ? "python"
              : "markdown";
      const resolvedFile = shouldIterateCurrent
        ? activeTask.artifactFile
        : resolvedType === "html"
          ? "my-live-app.html"
          : resolvedType === "python"
            ? "script.py"
            : "document.md";

      const effectivePreviousCode =
        shouldIterateCurrent && nextArtifactCode === activeTask.artifactCode
          ? activeTask.previousCode ?? ""
          : contextBaseline;
      const computedDiff = computeUnifiedDiff(effectivePreviousCode, nextArtifactCode);
      const serverTrace = Array.isArray(data?.trace) && data.trace.length > 0
        ? data.trace
        : [
            `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.loadFile", { p1: resolvedFile }) : w("trace.initTaskContext")}`,
            `[2/4] agent.route_intent → tool=${data?.toolUsed || "run_model_playground"} (${model})`,
            w("trace.writeArtifact", { p1: resolvedFile, p2: computedDiff.additions, p3: computedDiff.deletions }),
            w("trace.verifyOutputBuild", { p1: elapsedSec }),
          ];

      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              durationSec: elapsedSec,
              diffAdditions: computedDiff.additions,
              diffDeletions: computedDiff.deletions,
              trace: serverTrace,
              summary: reply,
              links: Array.isArray(data?.links) ? data.links : [],
              artifactType: resolvedType,
              artifactFile: resolvedFile,
              previousCode: effectivePreviousCode,
              artifactCode: nextArtifactCode,
            }
          : item,
      );
      saveUserTasks(updated);
      setCanvasTab("preview");
      setTerminalLogs(prev => [
        ...prev,
        ...serverTrace.map((step: string) => `  ${step}`),
        w("trace.statusNotice", { p1: new Date().toLocaleTimeString(), p2: data?.ok === false ? w("trace.statusWarn") : w("trace.statusDone"), p3: computedDiff.additions, p4: computedDiff.deletions }),
      ]);
    } catch {
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const localDiff = computeUnifiedDiff(diffBaselineForFallback, fallbackCode);
      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              durationSec: elapsedSec,
              diffAdditions: localDiff.additions,
              diffDeletions: localDiff.deletions,
              trace: [
                w("trace.offlineSandbox"),
                w("trace.generateArtifact", { p1: runningTask.artifactFile, p2: localDiff.additions, p3: localDiff.deletions }),
                w("trace.draftReady", { p1: elapsedSec }),
              ],
              summary: "已生成本地可编辑草稿，支持在右侧查看预览、Diff 变更与源码。",
              artifactType: runningTask.artifactType,
              artifactFile: shouldIterateCurrent ? runningTask.artifactFile : "local-draft.html",
              previousCode: diffBaselineForFallback,
              artifactCode: fallbackCode,
            }
          : item,
      );
      saveUserTasks(updated);
    } finally {
      setRunning(false);
    }
  }

  function updateActiveCode(newCode: string) {
    const baseline = activeTask.previousCode ?? activeTask.artifactCode;
    const diff = computeUnifiedDiff(baseline, newCode);
    if (userTasks.some(t => t.id === activeTask.id)) {
      saveUserTasks(
        userTasks.map(item =>
          item.id === activeTask.id
            ? {
                ...item,
                previousCode: item.previousCode ?? item.artifactCode,
                artifactCode: newCode,
                diffAdditions: diff.additions,
                diffDeletions: diff.deletions,
              }
            : item,
        ),
      );
    } else {
      const forkedDiff = computeUnifiedDiff(activeTask.artifactCode, newCode);
      const forkedTask: CodexTask = {
        ...activeTask,
        id: "user-fork-" + Date.now(),
        title: w("task.revisedTitle", { p1: activeTask.title }),
        tag: "我的草稿",
        previousCode: activeTask.artifactCode,
        artifactCode: newCode,
        diffAdditions: forkedDiff.additions,
        diffDeletions: forkedDiff.deletions,
        trace: [
          ...(activeTask.trace ?? []),
          w("trace.forkSample", { p1: forkedDiff.additions, p2: forkedDiff.deletions }),
        ],
        summary: w("label.guidedSamples"),
      };
      const next = [forkedTask, ...userTasks];
      saveUserTasks(next);
      setActiveId(forkedTask.id);
    }
  }

  function revertToPreviousCode() {
    if (!activeTask.previousCode) {
      toast.info(w("toast.alreadyBaseline"));
      return;
    }
    updateActiveCode(activeTask.previousCode);
    toast.success(w("toast.restoredPrevious"));
  }

  function forkActiveSampleToDraft() {
    const forkedTask: CodexTask = {
      ...activeTask,
      id: "user-fork-" + Date.now(),
      title: w("task.draftTitle", { p1: activeTask.title }),
      tag: "我的草稿",
      previousCode: activeTask.previousCode ?? activeTask.artifactCode,
      trace: [...(activeTask.trace ?? []), w("label.copy")],
      summary: w("toast.copiedAsDraft"),
    };
    const next = [forkedTask, ...userTasks];
    saveUserTasks(next);
    setActiveId(forkedTask.id);
    toast.success(w("toast.copiedAsDraft"));
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
      toast.success(w("toast.fileDownloaded"));
    } catch {
      toast.error(w("toast.downloadFailed"));
    }
  }

  function openFullscreenPreview() {
    try {
      const blob = new Blob([activeTask.artifactCode], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error(w("toast.previewWindowFailed"));
    }
  }

  function switchToFloatingChat() {
    window.dispatchEvent(new CustomEvent("ans:open-companion-chat", { detail: { draft: promptInput } }));
    toast.success(w("toast.agentOpened"));
  }

  const codeLineCount = Math.max(1, activeTask.artifactCode.split("\n").length);
  const statusTone = running
    ? "bg-emerald-400"
    : isViewingGuideSample
      ? "bg-amber-300"
      : activeTask.mode === "ask"
        ? "bg-sky-400"
        : "bg-emerald-400";

  return (
    <div
      data-testid="pi-codex-workbench"
      aria-label={w("aria.workbench")}
      className="ans-wb overflow-hidden rounded-[20px] bg-[#0b0b0a] text-[#ededeb] shadow-[0_24px_64px_-24px_rgb(11_11_10/45%)]"
    >
      {/* 顶栏：模式切换、模型、身份与积分 */}
      <div className="ans-wb-rule-b flex flex-wrap items-center justify-between gap-2 bg-[#151515] px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center rounded-[10px] bg-[#0b0b0a] p-0.5 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              title={w("title.openAgentChat")}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[#9a9a95] transition-colors hover:text-[#ededeb]"
            >
              <Bot className="size-3.5" aria-hidden="true" />
              Agent {w("mode.agentChat")}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#20201e] px-2.5 py-1 font-[460] text-[#ededeb]">
              <PanelsTopLeft className="size-3.5" aria-hidden="true" />
              {w("mode.workbench")}
            </span>
          </div>
          <span title={w("title.branch")} className="ans-wb-chip hidden font-mono sm:inline-flex">
            <GitBranch className="size-3.5" aria-hidden="true" />
            {activeTask.branch || "ans-workspace/main"}
          </span>
          <label className="ans-wb-chip relative cursor-pointer pr-6">
            <Cpu className="size-3.5" aria-hidden="true" />
            <select
              aria-label={w("aria.modelSelect")}
              value={model}
              onChange={e => setModel(e.target.value as typeof model)}
              className="cursor-pointer appearance-none bg-transparent text-[#ededeb] outline-none"
            >
              {WORKBENCH_MODEL_OPTIONS.map(option => {
                const rate = multipliers[option.key];
                const available = !paused.includes(option.key);
                return <option key={option.key} value={option.key} disabled={!available}>{w(option.labelKey)}{!available ? ` (${w("model.unavailable")})` : rate === undefined ? "" : ` ${rate}x`}</option>;
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3.5" aria-hidden="true" />
          </label>
          <button
            type="button"
            onClick={() => setShowOnboardingGuide(v => !v)}
            title={w("title.threeStepGuide")}
            aria-expanded={showOnboardingGuide}
            className="ans-wb-chip"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            {showOnboardingGuide ? w("label.collapse") : w("onboarding.guideButton")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="ans-wb-chip pointer-events-auto">
            <UserRound className="size-3.5" aria-hidden="true" />
            <span className="text-[#ededeb]">{current}</span>
            <span className="text-amber-200/90">{levelName}</span>
            {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
          </span>
          <span className="ans-wb-chip">
            <Coins className="size-3.5" aria-hidden="true" />
            <span className="ans-num text-[#ededeb]">{livePoints}</span> {w("label.points")}
          </span>
          <Link href="/workspace/benefits" className="ans-wb-chip text-emerald-300 hover:text-emerald-200">
            <Gift className="size-3.5" aria-hidden="true" />
            {w("label.claimCompute")}
          </Link>
          <Link href="/workspace/credits" className="ans-wb-chip">
            <ReceiptText className="size-3.5" aria-hidden="true" />
            {w("label.ledger")}
          </Link>
        </div>
      </div>

      {/* 可收起的三步上手说明 */}
      <div className="ans-collapse" data-open={showOnboardingGuide}>
        <div inert={!showOnboardingGuide}>
          <div
            data-testid={showOnboardingGuide ? "workbench-onboarding-guide" : undefined}
            className="ans-wb-rule-b flex flex-wrap items-center justify-between gap-3 bg-[#151515] px-3 py-2.5 text-xs sm:px-4"
          >
            <ol className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#c9c9c4]">
              {[
                [w("onboarding.step1Title"), w("onboarding.step1Body")],
                [w("onboarding.step2Title"), w("onboarding.step2Body")],
                [w("onboarding.step3Title"), w("onboarding.step3Body")],
              ].map(([title, body], idx) => (
                <li key={title} className="inline-flex items-center gap-2" title={body}>
                  <span className="ans-num inline-flex size-5 items-center justify-center rounded-full bg-[#20201e] text-[#ededeb]">{idx + 1}</span>
                  <span className="text-[#ededeb]">{title}</span>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleStartBlankTask} className="ans-wb-chip text-[#ededeb]">
                <Plus className="size-3.5" aria-hidden="true" />
                {w("label.newBlank")}
              </button>
              <button
                type="button"
                onClick={() => setShowOnboardingGuide(false)}
                aria-label={w("label.collapse")}
                className="ans-wb-chip px-1.5"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 三栏：任务列表 | Agent 对话与输入框 | 产物预览 */}
      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* 左栏：我的任务、引导范例、快捷操作 */}
        <aside className="ans-wb-col flex flex-col justify-between gap-4 bg-[#151515] p-2.5">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between px-1.5">
                <span className="text-xs text-[#9a9a95]">
                  {w("label.myTasks")} <span className="ans-num">{userTasks.length}</span>
                </span>
                <div className="flex items-center">
                  {userTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearUserTasks}
                      title={w("title.clearTasks")}
                      className="ans-wb-chip px-2 py-0.5 hover:text-rose-300"
                    >
                      {w("label.clear")}
                    </button>
                  )}
                  <button type="button" onClick={handleStartBlankTask} className="ans-wb-chip px-2 py-0.5 text-[#ededeb]">
                    <Plus className="size-3.5" aria-hidden="true" />
                    {w("label.new")}
                  </button>
                </div>
              </div>
              {userTasks.length === 0 ? (
                <p className="rounded-[10px] bg-[#1a1a19] px-3 py-2.5 text-xs leading-5 text-[#9a9a95] [text-wrap:pretty]">
                  {w("empty.tasks")}
                </p>
              ) : (
                <div className="max-h-[220px] space-y-0.5 overflow-y-auto">
                  {userTasks.map(t => {
                    const addCount = t.diffAdditions ?? t.artifactCode.split("\n").length;
                    const delCount = t.diffDeletions ?? 0;
                    const StatusIcon = t.status === "running" ? Loader2 : t.mode === "ask" ? MessageSquare : Check;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setActiveId(t.id)}
                        role="button"
                        tabIndex={0}
                        aria-current={t.id === activeTask.id ? "true" : undefined}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveId(t.id);
                          }
                        }}
                        className={`group flex w-full cursor-pointer flex-col gap-0.5 rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                          t.id === activeTask.id ? "bg-[#20201e] text-[#ededeb]" : "text-[#c9c9c4] hover:bg-[#1a1a19]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="line-clamp-1 text-[13px]">{t.title}</span>
                          <span className="flex shrink-0 items-center gap-0.5">
                            <StatusIcon className={`size-3.5 text-emerald-300 ${t.status === "running" ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                            <button
                              type="button"
                              onClick={e => handleDeleteUserTask(t.id, e)}
                              title={w("title.deleteRecord")}
                              aria-label={w("aria.deleteRecord", { p1: t.title })}
                              className="hidden rounded p-0.5 text-[#9a9a95] hover:bg-rose-500/15 hover:text-rose-300 group-hover:inline-flex group-focus-within:inline-flex"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 font-mono text-xs text-[#9a9a95]">
                          <MiddleEllipsis name={t.artifactFile} />
                          <span className="ans-num shrink-0 space-x-1">
                            <span className="text-emerald-300/90">+{addCount}</span>
                            {delCount > 0 && <span className="text-rose-300/90">-{delCount}</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between px-1.5">
                <span className="text-xs text-[#9a9a95]">{w("label.guidedSamples")}</span>
                <span className="text-xs text-[#9a9a95]">{w("label.withDiff")}</span>
              </div>
              <div className="space-y-0.5">
                {guideTasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    title={t.summary}
                    aria-current={t.id === activeTask.id ? "true" : undefined}
                    className={`w-full rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                      t.id === activeTask.id ? "bg-[#20201e] text-[#ededeb]" : "text-[#c9c9c4] hover:bg-[#1a1a19]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-[13px]">{t.title}</span>
                      <span className="shrink-0 whitespace-nowrap text-xs text-[#9a9a95]">{t.tag.replace("范例", "")}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-xs text-[#9a9a95]">
                      <MiddleEllipsis name={t.artifactFile} />
                      <span className="ans-num shrink-0 space-x-1">
                        <span className="text-emerald-300/90">+{t.diffAdditions ?? 64}</span>
                        {t.diffDeletions ? <span className="text-rose-300/90">-{t.diffDeletions}</span> : null}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
                title={w("title.saveToProjects")}
                className="ans-wb-btn"
              >
                <FolderPlus className="size-3.5" aria-hidden="true" />
                {w("label.saveAsProject")}
              </button>
              <button
                type="button"
                onClick={() => void executeCodexTask("", "checkin")}
                title={w("title.checkin")}
                className="ans-wb-btn"
              >
                <CalendarCheck className="size-3.5" aria-hidden="true" />
                {w("label.checkin")}
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-xs">
            <Link href="/projects" className="ans-wb-chip">
              <FolderOpen className="size-3.5" aria-hidden="true" />
              {w("label.projects")}
            </Link>
            <Link href="/market" className="ans-wb-chip">
              <Store className="size-3.5" aria-hidden="true" />
              {w("label.market")}
            </Link>
          </nav>
        </aside>

        {/* 中栏对话 | 右栏产物预览：可拖动分栏，拖动时给预览盖遮罩；Esc 复原，双击 50/50，左栏超过 82% 收起预览 */}
        <ResizableSplit
          label={w("label.splitHandle")}
          reopenLabel={w("label.showPreview")}
          initialRatio={0.4}
          // 中栏：Agent 执行线程与输入框
          left={
        <section className="ans-wb-col flex flex-1 flex-col justify-between bg-[#0b0b0a] p-3 sm:p-4">
          <div className="max-h-[440px] space-y-3 overflow-y-auto pr-0.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 text-xs text-[#9a9a95]">
                  <span className="shrink-0 whitespace-nowrap">{activeTask.tag}</span>
                  <MiddleEllipsis name={activeTask.artifactFile} className="font-mono" />
                </div>
                <h2 className="mt-1 truncate text-sm font-[560] text-[#ededeb]" title={activeTask.title}>
                  {activeTask.title}
                </h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-[#c9c9c4]">
                <span className={`size-1.5 rounded-full ${statusTone} ${running ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                {running
                  ? w("status.running")
                  : isViewingGuideSample
                    ? w("status.guidedSample")
                    : activeTask.mode === "ask"
                      ? w("status.askMode")
                      : w("status.applied")}
              </span>
            </div>

            {/* 第 1 步：用户指令 */}
            <div className="rounded-[12px] bg-[#151515] p-3">
              <div className="flex items-center justify-between text-xs text-[#9a9a95]">
                <span className="inline-flex items-center gap-1.5">
                  {isViewingGuideSample ? <Lightbulb className="size-3.5" aria-hidden="true" /> : <UserRound className="size-3.5" aria-hidden="true" />}
                  {isViewingGuideSample ? w("label.samplePrompt") : w("label.taskPrompt")}
                </span>
                {isViewingGuideSample && (
                  <button
                    type="button"
                    onClick={() => setPromptInput(activeTask.prompt)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[#c9c9c4] transition-colors hover:bg-[#20201e] hover:text-[#ededeb]"
                  >
                    {w("label.fillIntoInput")}
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-[#ededeb] [text-wrap:pretty]">
                {activeTask.prompt || <span className="text-[#9a9a95]">{w("empty.prompt")}</span>}
              </p>
            </div>

            {/* 第 2 步：Agent 执行链路 */}
            {activeTask.trace && activeTask.trace.length > 0 && (
              <div data-testid="codex-execution-trace" className="rounded-[12px] bg-[#151515] px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setTraceExpanded(v => !v)}
                  aria-expanded={traceExpanded}
                  className="flex w-full items-center justify-between text-left text-xs text-[#c9c9c4] hover:text-[#ededeb]"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="size-3.5" aria-hidden="true" />
                    {w("trace.heading")} <span className="ans-num">{activeTask.trace.length}</span> {w("trace.unit")}
                    {activeTask.durationSec ? <span className="ans-num text-[#9a9a95]">{activeTask.durationSec}s</span> : null}
                  </span>
                  <ChevronDown className={`size-3.5 transition-transform ${traceExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                <div className="ans-collapse" data-open={traceExpanded}>
                  <div inert={!traceExpanded}>
                    <ol className="mt-2 space-y-1 font-mono text-xs leading-5 text-[#9a9a95]">
                      {activeTask.trace.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-emerald-300/80" aria-hidden="true" />
                          <span className="break-all">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* 第 3 步：结果与文件变更 */}
            <div className="rounded-[12px] bg-[#151515] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs text-[#9a9a95]">
                  {isViewingGuideSample ? w("summary.sample") : activeTask.mode === "ask" ? w("summary.answer") : w("summary.changes")}
                </span>
                {isViewingGuideSample && (
                  <button
                    type="button"
                    onClick={forkActiveSampleToDraft}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-[#c9c9c4] transition-colors hover:bg-[#20201e] hover:text-[#ededeb]"
                  >
                    <CopyPlus className="size-3.5" aria-hidden="true" />
                    {w("label.copyAsDraft")}
                  </button>
                )}
              </div>
              <div className="max-h-[130px] overflow-y-auto whitespace-pre-wrap text-[13px] leading-6 text-[#ededeb] [text-wrap:pretty]">
                {activeTask.summary}
              </div>

              <button
                type="button"
                onClick={() => setCanvasTab("diff")}
                title={w("label.viewDiff")}
                className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-[8px] bg-[#1a1a19] px-2.5 py-1.5 font-mono text-xs transition-colors hover:bg-[#20201e]"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[#c9c9c4]">
                  <FileCode2 className="size-3.5 shrink-0" aria-hidden="true" />
                  <MiddleEllipsis name={activeTask.artifactFile} />
                </span>
                <span className="ans-num flex shrink-0 items-center gap-2">
                  <span className="text-emerald-300/90">+{activeDiff.additions}</span>
                  {activeDiff.deletions > 0 && <span className="text-rose-300/90">-{activeDiff.deletions}</span>}
                  <ArrowRight className="size-3.5 text-[#9a9a95]" aria-hidden="true" />
                </span>
              </button>

              {activeTask.links && activeTask.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activeTask.links.map((lk, i) => (
                    <a
                      key={i}
                      href={lk.href}
                      title={lk.detail}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#ededeb] transition-colors hover:bg-[#20201e]"
                    >
                      {lk.labelZh || lk.title || lk.labelEn || w("link.open")}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 底部输入框：提问 / 写代码 双模式，可选基于当前文件迭代 */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeCodexTask(undefined, "playground", undefined, composerMode);
            }}
            className="ans-wb-composer mt-3 rounded-[16px] bg-[#151515] p-2"
          >
            <div className="flex items-center justify-between gap-2 px-1.5 pt-0.5 text-xs">
              <label className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-[#9a9a95] select-none">
                <input
                  type="checkbox"
                  checked={iterateOnCurrent}
                  onChange={e => setIterateOnCurrent(e.target.checked)}
                  className="size-3.5 shrink-0 rounded accent-emerald-400"
                />
                <span className="shrink-0">{w("label.iterateOnCurrent")}</span>
                <MiddleEllipsis name={activeTask.artifactFile} className="font-mono text-[#c9c9c4]" />
              </label>
            </div>

            <textarea
              id="codex-composer-input"
              rows={3}
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={iterateOnCurrent ? w("placeholder.iterate", { file: activeTask.artifactFile }) : w("placeholder.newTask")}
              className="mt-1 w-full resize-none bg-transparent px-1.5 text-[13px] leading-6 text-[#ededeb] placeholder:text-[#8a8a85] focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey && !imeBlocks(e)) {
                  e.preventDefault();
                  void executeCodexTask(undefined, "playground", undefined, composerMode);
                }
              }}
            />
            {(() => {
              const seedText = (promptInput || activeTask.prompt || "").trim();
              const cluster = detectIntentAndMatchTerms(seedText);
              return (
                <div className="flex flex-wrap items-center gap-1 px-0.5 py-1" data-testid="codex-intent-bridge">
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
                      className="inline-flex items-center gap-1 rounded-md bg-[#1a1a19] px-2 py-0.5 text-xs text-[#c9c9c4] transition-colors hover:bg-[#20201e] hover:text-[#ededeb]"
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      {term.label.zh}
                    </button>
                  ))}
                  <button
                    type="button"
                    title={w("title.expandIdea")}
                    onClick={() => {
                      const rawIdea = (promptInput || activeTask.prompt).trim();
                      if (!rawIdea) {
                        toast.info(w("toast.needIdeaFirst"));
                        document.getElementById("codex-composer-input")?.focus();
                        return;
                      }
                      const upgraded = upgradeToStructuredBrief(rawIdea, "zh");
                      setPromptInput(upgraded);
                      toast.success(w("toast.detailsExpanded"));
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-[#1a1a19] px-2 py-0.5 text-xs text-emerald-200 transition-colors hover:bg-[#20201e]"
                  >
                    <Wand2 className="size-3" aria-hidden="true" />
                    {w("label.expandDetails")}
                  </button>
                </div>
              );
            })()}

            <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 px-0.5">
              <div className="flex flex-wrap gap-0.5">
                {[
                  [w("quickPrompt.themeLabel"), "把当前页面配色改为清新浅色主题，并增加一个顶部状态横幅"],
                  [w("quickPrompt.chartLabel"), "请用单文件 HTML5 + CSS + JS 写一个简洁好用的实验数据记录与折线图网页"],
                  [w("quickPrompt.briefLabel"), "帮我梳理一份中国农大农客松智慧农业参赛项目痛点、方案与分工提纲"],
                ].map(([label, sample]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPromptInput(sample)}
                    className="rounded-md px-2 py-1 text-xs text-[#9a9a95] transition-colors hover:bg-[#20201e] hover:text-[#ededeb]"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="codex-mode-ask"
                  disabled={running}
                  aria-pressed={composerMode === "ask"}
                  onClick={() => {
                    setComposerMode("ask");
                    if (promptInput.trim()) {
                      void executeCodexTask(undefined, "playground", undefined, "ask");
                    }
                  }}
                  title={w("title.askMode")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-xs transition-colors disabled:opacity-50 ${
                    composerMode === "ask" ? "bg-[#20201e] text-sky-200" : "text-[#c9c9c4] hover:bg-[#20201e] hover:text-[#ededeb]"
                  }`}
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  {w("label.ask")}
                </button>
                <button
                  type="submit"
                  data-testid="codex-mode-code"
                  disabled={running}
                  onClick={() => setComposerMode("code")}
                  title={w("title.codeMode")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-emerald-400 px-3.5 text-xs font-[560] text-[#0b0b0a] transition-colors hover:bg-emerald-300 disabled:opacity-60"
                >
                  {running ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />}
                  {running ? w("label.runningNow") : w("label.writeCode")}
                </button>
              </div>
            </div>
          </form>
        </section>
          }
          // 右栏：产物与 Diff 预览
          right={
        <section className="flex flex-1 flex-col bg-[#151515]">
          <div className="ans-wb-rule-b flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-0.5" role="tablist">
              {[
                { id: "preview", label: w("tab.preview"), Icon: Eye },
                { id: "diff", label: w("tab.diff"), Icon: GitCompareArrows, count: true },
                { id: "code", label: w("tab.code"), Icon: Code2 },
                { id: "terminal", label: w("tab.terminal"), Icon: SquareTerminal },
              ].map(({ id, label, Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={canvasTab === id}
                  data-testid={`codex-tab-${id}`}
                  onClick={() => setCanvasTab(id as typeof canvasTab)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    canvasTab === id ? "bg-[#20201e] text-[#ededeb]" : "text-[#9a9a95] hover:bg-[#1a1a19] hover:text-[#ededeb]"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                  {count && (
                    <span className="ans-num font-mono">
                      <span className="text-emerald-300/90">+{activeDiff.additions}</span>{" "}
                      <span className="text-rose-300/90">-{activeDiff.deletions}</span>
                    </span>
                  )}
                </button>
              ))}
              <span className="ml-1 hidden max-w-[220px] px-1 font-mono text-xs text-[#9a9a95] xl:inline-flex">
                <MiddleEllipsis name={activeTask.artifactFile} />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-0.5">
              {canvasTab === "preview" && activeTask.artifactType === "html" && (
                <div className="mr-1 inline-flex items-center rounded-[10px] bg-[#0b0b0a] p-0.5 text-xs">
                  <button
                    type="button"
                    data-testid="codex-viewport-desktop"
                    aria-pressed={viewportMode === "desktop"}
                    onClick={() => setViewportMode("desktop")}
                    title={w("label.desktop")}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${
                      viewportMode === "desktop" ? "bg-[#20201e] text-[#ededeb]" : "text-[#9a9a95] hover:text-[#ededeb]"
                    }`}
                  >
                    <Monitor className="size-3.5" aria-hidden="true" />
                    {w("label.desktop")}
                  </button>
                  <button
                    type="button"
                    data-testid="codex-viewport-mobile"
                    aria-pressed={viewportMode === "mobile"}
                    onClick={() => setViewportMode("mobile")}
                    title={w("label.mobile")}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${
                      viewportMode === "mobile" ? "bg-[#20201e] text-[#ededeb]" : "text-[#9a9a95] hover:text-[#ededeb]"
                    }`}
                  >
                    <Smartphone className="size-3.5" aria-hidden="true" />
                    {w("label.mobile")}
                  </button>
                </div>
              )}
              {canvasTab === "diff" && activeTask.previousCode && (
                <button type="button" onClick={revertToPreviousCode} title={w("title.restoreVersion")} className="ans-wb-chip">
                  <Undo2 className="size-3.5" aria-hidden="true" />
                  {w("label.restore")}
                </button>
              )}
              <button type="button" onClick={() => setPreviewKey(k => k + 1)} title={w("title.reloadPreview")} aria-label={w("label.refresh")} className="ans-wb-chip px-2">
                <RotateCw className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void copyFeedback.copy(activeTask.artifactCode)}
                title={w("label.copy")}
                aria-label={w("label.copy")}
                className="ans-wb-chip px-2"
              >
                {copyFeedback.copied ? (
                  <Check className={`size-3.5 text-emerald-300 ${copyFeedback.state === "leaving" ? "ans-feedback-leaving" : "ans-pop"}`} aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
              </button>
              <button type="button" onClick={downloadActiveHtml} title={w("label.download")} aria-label={w("label.download")} className="ans-wb-chip px-2">
                <Download className="size-3.5" aria-hidden="true" />
              </button>
              {activeTask.artifactType === "html" && (
                <button type="button" onClick={openFullscreenPreview} className="ans-wb-chip">
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {w("label.newWindow")}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-2.5">
            {canvasTab === "preview" && (
              activeTask.artifactType === "html" ? (
                <div className="flex flex-1 items-stretch justify-center rounded-[14px] bg-[#0b0b0a] p-1">
                  <iframe
                    key={`${activeTask.id}-${previewKey}`}
                    title="Live Artifact Preview"
                    srcDoc={activeTask.artifactCode}
                    sandbox="allow-scripts"
                    className={`min-h-[540px] flex-1 rounded-[10px] bg-[#0b0b0a] transition-[max-width] duration-300 ${
                      viewportMode === "mobile" ? "mx-auto max-w-[390px]" : "w-full"
                    }`}
                  />
                </div>
              ) : activeTask.artifactType === "markdown" ? (
                <article className="min-h-[540px] flex-1 overflow-auto rounded-[14px] bg-[#0b0b0a] p-5 text-sm leading-7 text-[#ededeb]">
                  <div className="ans-wb-rule-b mb-3 flex items-center justify-between gap-3 pb-2.5 text-xs text-[#9a9a95]">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{w("label.docPreview")} {activeTask.title}</span>
                    </span>
                    <span className="shrink-0 font-mono">{activeTask.model}</span>
                  </div>
                  <div className="whitespace-pre-wrap [text-wrap:pretty]">{activeTask.artifactCode}</div>
                </article>
              ) : (
                <pre className="min-h-[540px] flex-1 overflow-auto rounded-[14px] bg-[#0b0b0a] p-4 font-mono text-xs leading-6 text-[#d7d7d2]">
                  {activeTask.artifactCode}
                </pre>
              )
            )}

            {canvasTab === "diff" && (
              <div data-testid="codex-diff-viewer" className="min-h-[540px] flex-1 overflow-auto rounded-[14px] bg-[#0b0b0a] font-mono text-xs">
                <div className="ans-wb-rule-b sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#0b0b0a]/95 px-4 py-2 backdrop-blur">
                  <span className="min-w-0 truncate text-[#9a9a95]">
                    a/{activeTask.artifactFile} → b/{activeTask.artifactFile}
                  </span>
                  <span className="ans-num shrink-0 space-x-3">
                    <span className="text-emerald-300/90">+{activeDiff.additions} {w("label.added")}</span>
                    <span className="text-rose-300/90">-{activeDiff.deletions} {w("label.removed")}</span>
                  </span>
                </div>
                <div className="py-1">
                  {activeDiff.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`ans-num grid grid-cols-[40px_40px_20px_1fr] items-start px-2 py-0.5 leading-5 ${
                        line.type === "add"
                          ? "bg-emerald-400/[0.08] text-emerald-100"
                          : line.type === "del"
                            ? "bg-rose-400/[0.10] text-rose-200"
                            : "text-[#9a9a95]"
                      }`}
                    >
                      <span className="select-none pr-2 text-right text-[#6f6f6a]">{line.oldLine ?? ""}</span>
                      <span className="select-none pr-2 text-right text-[#6f6f6a]">{line.newLine ?? ""}</span>
                      <span className="select-none">{line.type === "add" ? "+" : line.type === "del" ? "-" : " "}</span>
                      <span className="whitespace-pre-wrap break-all">{line.text || " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canvasTab === "code" && (
              <div className="flex min-h-[540px] flex-1 overflow-hidden rounded-[14px] bg-[#0b0b0a]">
                <div
                  aria-hidden="true"
                  className="ans-num select-none bg-[#0f0f0e] px-2.5 py-4 text-right font-mono text-xs leading-6 text-[#6f6f6a]"
                >
                  {Array.from({ length: codeLineCount }, (_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>
                <textarea
                  value={activeTask.artifactCode}
                  onChange={e => updateActiveCode(e.target.value)}
                  aria-label={w("aria.sourceEditor")}
                  spellCheck={false}
                  className="min-h-[540px] w-full flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-6 text-[#d7d7d2] focus:outline-none"
                />
              </div>
            )}

            {canvasTab === "terminal" && (
              <div className="min-h-[540px] flex-1 overflow-auto rounded-[14px] bg-[#0b0b0a] p-4 font-mono text-xs leading-6 text-[#c9c9c4]">
                <div className="ans-wb-rule-b mb-3 flex items-center justify-between gap-3 pb-2 text-[#9a9a95]">
                  <span className="truncate">~/{activeTask.branch || "ans-workspace/main"}</span>
                  <span className="shrink-0">{activeTask.model}</span>
                </div>
                {activeTask.trace && activeTask.trace.length > 0 && (
                  <div className="mb-3 rounded-[10px] bg-[#151515] p-3">
                    <div className="mb-1 text-[#9a9a95]">{w("label.currentTaskSteps")}</div>
                    {activeTask.trace.map((step, idx) => (
                      <div key={idx} className="leading-5 text-[#d7d7d2]">{step}</div>
                    ))}
                  </div>
                )}
                {terminalLogs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </section>
          }
        />
      </div>
    </div>
  );
}