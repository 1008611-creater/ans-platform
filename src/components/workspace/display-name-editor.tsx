"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
        onKeyDown={(event) => { if (event.key === "Enter") void save(); if (event.key === "Escape") setOpen(false); }}
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
  const safeTitle = userPrompt.replace(/[<>]/g, "").slice(0, 48) || "已完成今日签到 (+5 积分)";
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
            : q.slice(0, 28) || "已完成今日签到 (+5 积分)";

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
      `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.readWorkspace", { p1: shouldIterateCurrent ? w("trace.readCurrentArtifact", { p1: activeTask.artifactFile, p2: contextBaseline.length }) : w("trace.initWorkspaceContext") }) : "初始化工作区上下文"}`,
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
          `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.readWorkspace", { p1: shouldIterateCurrent ? w("trace.readBaseline", { p1: activeTask.artifactFile }) : w("trace.createSandbox") }) : "创建本地沙盒环境"}`,
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
            `[1/4] agent.read_workspace → ${shouldIterateCurrent ? w("trace.readWorkspace", { p1: shouldIterateCurrent ? w("trace.loadFile", { p1: resolvedFile }) : w("trace.initTaskContext") }) : "初始化新任务上下文"}`,
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
        title: w("task.revisedTitle", { p1: activeTask.title.replace(/^[^\s]+\s*/, "") }),
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
      title: w("task.draftTitle", { p1: activeTask.title.replace(/^[^\s]+\s*/, "") }),
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

  return (
    <div
      data-testid="pi-codex-workbench"
      aria-label={w("aria.workbench")}
      className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-700/80 bg-slate-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={switchToFloatingChat}
              title={w("title.openAgentChat")}
              className="rounded-lg px-2.5 py-1 font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              🤖 Agent {w("mode.agentChat")}
            </button>
            <span className="rounded-lg bg-emerald-500 px-3 py-1 font-black text-slate-950 shadow-sm">
              🛠️ {w("mode.workbench")}
            </span>
          </div>
          <span
            title={w("title.branch")}
            className="hidden items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-400 sm:inline-flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {activeTask.branch || "ans-workspace/main"}
          </span>
          <select
            aria-label={w("aria.modelSelect")}
            value={model}
            onChange={e => setModel(e.target.value as typeof model)}
            className="rounded-xl border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs font-bold text-emerald-300 outline-none focus:border-emerald-500"
          >
            <option value="deepseek-v4.1-flash">⚡ DeepSeek-V4.1-Flash (1x)</option>
            <option value="gpt-6.1-sol">🧠 GPT-6.1-Sol · 深度推理 (0.16x)</option>
            <option value="gpt-6-astra">🌟 GPT-6-Astra · 前端代码 (0.16x)</option>
          </select>
          <button
            type="button"
            onClick={() => setShowOnboardingGuide(v => !v)}
            title={w("title.threeStepGuide")}
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            📖 {showOnboardingGuide ? w("label.collapse") : "引导"}
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
            🎁 {w("label.claimCompute")}
          </a>
          <a href="/workspace/credits" className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-200 transition hover:bg-slate-800">
            🔑 {w("label.ledger")}
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
                📖 Codex {w("guide.title")}
              </span>
              <span className="text-slate-300">
                <strong>① 提需求 / 选模式</strong>（底部「💬 {w("label.ask")}」或「⚡ 写代码」）→
                <strong className="ml-1">② 查链路与 Diff</strong>（中间看执行步骤，右侧看「± 变更」与「{w("tab.preview")}」）→
                <strong className="ml-1">③ {w("label.saveAsProject")}</strong>。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartBlankTask}
                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-black text-slate-950 hover:bg-emerald-400"
              >
                + {w("label.newBlank")}
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

      {/* 3-Column Codex Grid: Task Queue (240px) | Agent Execution Thread & Composer (360px) | Artifact & Diff Inspector (1fr) */}
      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[240px_360px_1fr]">
        {/* Left Column: Codex Task Sidebar with Git Diff Stats */}
        <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/40 p-3 lg:border-r lg:border-b-0">
          <div className="space-y-3.5">
            {/* Section 1: Real User Tasks */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-400">
                  📂 我的任务 ({userTasks.length})
                </span>
                <div className="flex items-center gap-1">
                  {userTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearUserTasks}
                      title={w("title.clearTasks")}
                      className="rounded-lg border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                    >
                      {w("label.clear")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartBlankTask}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                  >
                    + {w("label.new")}
                  </button>
                </div>
              </div>
              {userTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 px-2.5 py-2 text-center text-[11px] text-slate-300">
                  {w("empty.tasks")}
                </div>
              ) : (
                <div className="max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
                  {userTasks.map(t => {
                    const addCount = t.diffAdditions ?? t.artifactCode.split("\n").length;
                    const delCount = t.diffDeletions ?? 0;
                    return (
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
                        className={`group flex w-full cursor-pointer flex-col gap-1 rounded-xl border px-2.5 py-2 text-left transition ${
                          t.id === activeTask.id
                            ? "border-emerald-500/60 bg-emerald-500/15 text-white shadow-sm"
                            : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="line-clamp-1 text-xs font-bold">{t.title}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="text-[10px] text-emerald-300">
                              {t.status === "running" ? "⚡" : t.mode === "ask" ? "💬" : "✓"}
                            </span>
                            <button
                              type="button"
                              onClick={e => handleDeleteUserTask(t.id, e)}
                              title={w("title.deleteRecord")}
                              aria-label={w("aria.deleteRecord", { p1: t.title })}
                              className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 group-hover:inline-block"
                            >
                              ×
                            </button>
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                          <span className="truncate">{t.artifactFile}</span>
                          <span className="shrink-0 space-x-1">
                            <span className="text-emerald-400">+{addCount}</span>
                            {delCount > 0 && <span className="text-rose-400">-{delCount}</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Onboarding Sample Walkthroughs */}
            <div className="border-t border-slate-800/80 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-300/90">
                  {w("status.guidedSample")}
                </span>
                <span className="font-mono text-[10px] text-slate-300">含 Diff 对比</span>
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
                        : "border-slate-800/70 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="line-clamp-1 text-xs font-semibold">{t.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-emerald-400">
                        +{t.diffAdditions ?? 64}
                        {t.diffDeletions ? <span className="ml-0.5 text-rose-400">-{t.diffDeletions}</span> : null}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-slate-300">
                      <span>{t.artifactFile}</span>
                      <span>{t.tag.replace("范例", "")}</span>
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
                  title={w("title.saveToProjects")}
                  className="rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-2 py-1.5 text-center text-[11px] font-bold text-indigo-200 transition hover:bg-indigo-500/25"
                >
                  🚀 {w("label.saveAsProject")}
                </button>
                <button
                  type="button"
                  onClick={() => void executeCodexTask("", "checkin")}
                  title={w("title.checkin")}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  📅 {w("label.checkin")}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-800/80 pt-2.5 text-center text-[11px]">
            <a href="/projects" className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              📂 {w("label.projects")}
            </a>
            <a href="/market" className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 hover:border-emerald-500/40 hover:text-white">
              🛒 {w("label.market")}
            </a>
          </div>
        </aside>

        {/* Center Column: OpenAI Codex Execution Thread + Dual-Mode Composer */}
        <section className="flex flex-col justify-between border-b border-slate-800 bg-slate-950 p-3.5 sm:p-4 lg:border-r lg:border-b-0">
          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-0.5">
            {/* Compact Task Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <span>{activeTask.tag}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-400">{activeTask.artifactFile}</span>
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
                    : activeTask.mode === "ask"
                      ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              }`}>
                {running
                  ? w("status.running")
                  : isViewingGuideSample
                    ? w("status.guidedSample")
                    : activeTask.mode === "ask"
                      ? w("status.askMode")
                      : w("status.applied")}
              </span>
            </div>

            {/* Step 1: User Task Prompt Bubble */}
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>{isViewingGuideSample ? "💡 范例指令" : "🧑 任务指令"}</span>
                {isViewingGuideSample && (
                  <button
                    type="button"
                    onClick={() => setPromptInput(activeTask.prompt)}
                    className="text-emerald-400 hover:underline"
                  >
                    {w("label.fillIntoInput")} ↓
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-100">
                {activeTask.prompt || <span className="text-slate-300">等待输入需求...</span>}
              </p>
            </div>

            {/* Step 2: OpenAI Codex Collapsible Execution Trace */}
            {activeTask.trace && activeTask.trace.length > 0 && (
              <div
                data-testid="codex-execution-trace"
                className="rounded-xl border border-slate-800/90 bg-slate-900/40 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => setTraceExpanded(v => !v)}
                  className="flex w-full items-center justify-between text-left text-[11px] font-bold text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      ⚡ Agent 执行链路 · {activeTask.trace.length} 步
                      {activeTask.durationSec ? ` (${activeTask.durationSec}s)` : ""}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {traceExpanded ? w("label.expandTrace") : "展开 ▾"}
                  </span>
                </button>
                {traceExpanded && (
                  <ol className="mt-2 space-y-1 border-t border-slate-800/80 pt-2 font-mono text-[11px] leading-5 text-slate-400">
                    {activeTask.trace.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="mt-0.5 text-emerald-400">›</span>
                        <span className="break-all">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Step 3: Agent Result & Diff File Summary Card */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-emerald-300">
                  {isViewingGuideSample ? w("summary.sample") : activeTask.mode === "ask" ? "💬 Agent 解答" : "✓ 变更摘要"}
                </span>
                {isViewingGuideSample && (
                  <button
                    type="button"
                    onClick={forkActiveSampleToDraft}
                    className="shrink-0 rounded-lg bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 hover:bg-amber-300"
                  >
                    {w("label.copyAsDraft")}
                  </button>
                )}
              </div>
              <div className="max-h-[130px] overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">
                {activeTask.summary}
              </div>

              {/* Codex File Diff Pill — click to jump to Diff tab */}
              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 font-mono text-[11px]">
                <span className="truncate text-slate-200">📄 {activeTask.artifactFile}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-emerald-400">+{activeDiff.additions}</span>
                  {activeDiff.deletions > 0 && <span className="text-rose-400">-{activeDiff.deletions}</span>}
                  <button
                    type="button"
                    onClick={() => setCanvasTab("diff")}
                    className="rounded bg-slate-800 px-1.5 py-0.5 font-sans text-[10px] font-bold text-emerald-300 hover:bg-slate-700"
                  >
                    {w("label.viewDiff")} →
                  </button>
                </div>
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
                      {lk.labelZh || lk.title || lk.labelEn || "已完成今日签到 (+5 积分)"} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom OpenAI Codex Composer (Ask vs. Code Dual Mode + Context Iteration Toggle) */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void executeCodexTask(undefined, "playground", undefined, composerMode);
            }}
            className="mt-3 rounded-2xl border border-slate-700/90 bg-slate-900 p-2.5 shadow-inner"
          >
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={iterateOnCurrent}
                  onChange={e => setIterateOnCurrent(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 accent-emerald-500"
                />
                <span>
                  基于当前文件迭代修改 <code className="text-[10px] text-emerald-300">({activeTask.artifactFile})</code>
                </span>
              </label>
              <span className="font-mono text-[10px] text-slate-400">
                {composerMode === "code" ? w("mode.codeShort") : w("label.ask")}
              </span>
            </div>

            <textarea
              id="codex-composer-input"
              rows={3}
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={
                iterateOnCurrent
                  ? `描述要对 ${activeTask.artifactFile} 做的修改（如：切换为浅色主题、增加导出 CSV 按钮），或直接{w("label.ask")}...`
                  : w("placeholder.newTask")
              }
              className="w-full resize-none bg-transparent text-xs leading-5 text-white placeholder:text-slate-400 focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void executeCodexTask(undefined, "playground", undefined, composerMode);
                }
              }}
            />
            {(() => {
              const seedText = (promptInput || activeTask.prompt || "已完成今日签到 (+5 积分)").trim();
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
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    ✨ {w("label.expandDetails")}
                  </button>
                </div>
              );
            })()}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-800 pt-2">
              <div className="flex flex-wrap gap-1">
                {[
                  [w("quickPrompt.themeLabel"), "把当前页面配色改为清新浅色主题，并增加一个顶部状态横幅"],
                  [w("quickPrompt.chartLabel"), "请用单文件 HTML5 + CSS + JS 写一个简洁好用的实验数据记录与折线图网页"],
                  [w("quickPrompt.briefLabel"), "帮我梳理一份中国农大农客松智慧农业参赛项目痛点、方案与分工提纲"],
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

              {/* OpenAI Codex Dual-Mode Action Bar: Ask vs. Code */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="codex-mode-ask"
                  disabled={running}
                  onClick={() => {
                    setComposerMode("ask");
                    if (promptInput.trim()) {
                      void executeCodexTask(undefined, "playground", undefined, "ask");
                    }
                  }}
                  title={w("title.askMode")}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                    composerMode === "ask"
                      ? "border-sky-400/70 bg-sky-500/20 text-sky-200"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  💬 {w("label.ask")}
                </button>
                <button
                  type="submit"
                  data-testid="codex-mode-code"
                  disabled={running}
                  onClick={() => setComposerMode("code")}
                  title={w("title.codeMode")}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
                >
                  {running ? w("label.runningNow") : "⚡ 写代码"}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Right Column: Codex Artifact & Unified Diff Inspector */}
        <section className="flex flex-col bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-2">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "preview", label: w("tab.preview") },
                { id: "diff", label: `± 变更 (+${activeDiff.additions} -${activeDiff.deletions})` },
                { id: "code", label: w("tab.code") },
                { id: "terminal", label: w("tab.terminal") },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`codex-tab-${t.id}`}
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
              {canvasTab === "preview" && activeTask.artifactType === "html" && (
                <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-[11px]">
                  <button
                    type="button"
                    data-testid="codex-viewport-desktop"
                    onClick={() => setViewportMode("desktop")}
                    className={`rounded px-2 py-0.5 font-semibold ${
                      viewportMode === "desktop" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🖥️ {w("label.desktop")}
                  </button>
                  <button
                    type="button"
                    data-testid="codex-viewport-mobile"
                    onClick={() => setViewportMode("mobile")}
                    className={`rounded px-2 py-0.5 font-semibold ${
                      viewportMode === "mobile" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    📱 {w("label.mobile")}
                  </button>
                </div>
              )}
              {canvasTab === "diff" && activeTask.previousCode && (
                <button
                  type="button"
                  onClick={revertToPreviousCode}
                  title={w("title.restoreVersion")}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  ↩️ {w("label.restore")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewKey(k => k + 1)}
                title={w("title.reloadPreview")}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                🔄 {w("label.refresh")}
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activeTask.artifactCode);
                  toast.success(w("toast.copied"));
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
              >
                📋 {w("label.copy")}
              </button>
              <button
                type="button"
                onClick={downloadActiveHtml}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                💾 {w("label.download")}
              </button>
              {activeTask.artifactType === "html" && (
                <button
                  type="button"
                  onClick={openFullscreenPreview}
                  className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500/30"
                >
                  🖥️ {w("label.newWindow")} ↗
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-3">
            {canvasTab === "preview" && (
              activeTask.artifactType === "html" ? (
                <div className="flex flex-1 items-stretch justify-center rounded-2xl border border-slate-800 bg-slate-950/90 p-1">
                  <iframe
                    key={`${activeTask.id}-${previewKey}`}
                    title="Live Artifact Preview"
                    srcDoc={activeTask.artifactCode}
                    sandbox="allow-scripts"
                    className={`min-h-[540px] flex-1 rounded-xl border border-slate-800 bg-slate-950 shadow-inner transition-all ${
                      viewportMode === "mobile" ? "mx-auto max-w-[390px]" : "w-full"
                    }`}
                  />
                </div>
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

            {canvasTab === "diff" && (
              <div
                data-testid="codex-diff-viewer"
                className="min-h-[540px] flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 font-mono text-xs"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-2 text-[11px]">
                  <span className="text-slate-300">
                    diff --git a/{activeTask.artifactFile} b/{activeTask.artifactFile}
                  </span>
                  <span className="space-x-2 font-bold">
                    <span className="text-emerald-400">+{activeDiff.additions} 新增</span>
                    <span className="text-rose-400">-{activeDiff.deletions} 删除</span>
                  </span>
                </div>
                <div className="divide-y divide-slate-900/60 py-1">
                  {activeDiff.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-[40px_40px_20px_1fr] items-start px-2 py-0.5 leading-5 ${
                        line.type === "add"
                          ? "bg-emerald-500/10 text-emerald-200"
                          : line.type === "del"
                            ? "bg-rose-500/15 text-rose-300"
                            : "text-slate-400"
                      }`}
                    >
                      <span className="select-none pr-2 text-right text-[10px] text-slate-400">
                        {line.oldLine ?? ""}
                      </span>
                      <span className="select-none pr-2 text-right text-[10px] text-slate-400">
                        {line.newLine ?? ""}
                      </span>
                      <span className="select-none font-bold">
                        {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{line.text || " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canvasTab === "code" && (
              <div className="flex min-h-[540px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                <div
                  aria-hidden="true"
                  className="select-none border-r border-slate-800/80 bg-slate-900/60 px-2.5 py-4 text-right font-mono text-xs leading-6 text-slate-400"
                >
                  {Array.from({ length: codeLineCount }, (_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>
                <textarea
                  value={activeTask.artifactCode}
                  onChange={e => updateActiveCode(e.target.value)}
                  aria-label={w("aria.sourceEditor")}
                  className="min-h-[540px] w-full flex-1 resize-none bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-300 focus:outline-none"
                />
              </div>
            )}

            {canvasTab === "terminal" && (
              <div className="min-h-[540px] flex-1 overflow-auto rounded-2xl border border-slate-800 bg-black p-4 font-mono text-xs leading-6 text-emerald-400">
                <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                  <span>Agent 已完成今日签到 (+5 积分) {activeTask.branch || "ans-workspace/main"}</span>
                  <span>{activeTask.model}</span>
                </div>
                {activeTask.trace && activeTask.trace.length > 0 && (
                  <div className="mb-3 rounded-xl border border-slate-800/90 bg-slate-950/90 p-2.5 text-slate-300">
                    <div className="mb-1 text-[11px] font-bold text-emerald-300">{w("label.currentTaskSteps")}</div>
                    {activeTask.trace.map((step, idx) => (
                      <div key={idx} className="text-[11px] leading-5">
                        {step}
                      </div>
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
      </div>
    </div>
  );
}