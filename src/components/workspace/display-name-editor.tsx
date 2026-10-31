"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Bot, CalendarCheck, Check, ChevronDown, Code2, Coins, Copy, CopyPlus,
  Download, ExternalLink, Eye, FileCode2, FileText, FolderOpen, FolderPlus, Gift, GitBranch, GitCompareArrows, Lightbulb,
  Loader2, MessageSquare, Monitor, PanelLeft, PanelLeftClose, PanelRightClose, PanelRightOpen, Pencil, Plus, ReceiptText, RotateCw,
  Smartphone, Square, SquareTerminal, Store, Trash2, Undo2, Wand2, X,
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
import { WORKFLOWS, defaultParams, getWorkflow, type WorkflowId } from "./workflow-registry";
import { WorkbenchHome } from "./workbench-home";
import { WorkflowRunNode } from "./workflow-run-node";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePausedRunModels, useRunModelMultipliers } from "@/components/providers/run-model-pricing";
import { imeBlocks } from "@/lib/ui/ime-enter-guard";
import { ResizableSplit } from "@/lib/ui/resizable-split";
import { MiddleEllipsis } from "@/lib/ui/middle-ellipsis";
import { useCopyFeedback } from "@/lib/ui/copy-feedback";
import { useFollowBottom } from "@/lib/ui/follow-bottom";
import { useDismiss } from "@/lib/ui/use-dismiss";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
      <Button type="button" variant="ghost" size="sm" className="ms-1 h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>
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
    <div class="stage" id="outputBox">点击下方按钮测试交互，或切到右侧「源码」直接修改 HTML / CSS / JS 代码。</div>
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
    const badgeHtml = `\n  <!-- [Agent 增量变更] ${safeNote} -->\n  <div style="margin:14px auto;max-width:680px;padding:10px 14px;border-radius:10px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);color:#34d399;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;"><span>⚡ 已应用增量修改：${safeNote}</span><button onclick="this.parentElement.remove()" style="background:transparent;border:1px solid rgba(16,185,129,0.4);color:#34d399;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer;">收起</button></div>\n</body>`;
    return patched.replace("</body>", badgeHtml);
  }
  return `${existingCode.trimEnd()}\n\n# [Agent 增量修改] ${safeNote}\n`;
}

// 侧栏宽度：默认 276px，可拖到 240–420px，双击复位；宽度只存在本机
const SIDEBAR_DEFAULT = 276;
const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 420;
const SIDEBAR_STORAGE_KEY = "ans:workspace:sidebar-width:v1";
const SIDEBAR_COLLAPSED_KEY = "ans:workspace:sidebar-collapsed:v1";
const clampSidebar = (value: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(value)));

interface QueuedPrompt {
  id: string;
  text: string;
  mode: "code" | "ask";
  workflow: WorkflowId;
  params: Record<string, string>;
}

const WORKBENCH_MODEL_OPTIONS = [
  { key: "deepseek-v4.1-flash", labelKey: "model.flash" },
  { key: "gpt-6.1-sol", labelKey: "model.sol" },
  { key: "gpt-6-astra", labelKey: "model.astra" },
] as const;

/** 对话里的回复：Markdown 渲染。刚跑完时，短句逐字晕开，长文整体从模糊到清楚 */
function ThreadReply({ text, fresh }: { text: string; fresh: boolean }) {
  const plain = text.length <= 80 && !/[#*`|>\n-]/.test(text);
  if (fresh && plain) {
    return (
      <p className="text-sm leading-7 [text-wrap:pretty]">
        {Array.from(text).map((ch, i) => (
          <span key={i} className="ans-stream-char" style={{ animationDelay: `${i * 30}ms` }}>{ch}</span>
        ))}
      </p>
    );
  }
  return (
    <div className={`ans-wb-md text-sm ${fresh ? "ans-wb-reveal" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img", "input", "script"]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** 发送按钮上冒出的一圈薄荷绿碎片，播完自己消失 */
function SendSparks() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="ans-wb-spark"
          style={{ "--spark-angle": `${i * 45 + 20}deg` } as React.CSSProperties}
        />
      ))}
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
  const w = useTranslations("workbench");
  const storageKey = `ans:workspace:user-tasks:v1:${actorId || "guest"}`;
  const [userTasks, setUserTasks] = useState<CodexTask[]>([]);
  const [guideTasks] = useState<CodexTask[]>(INITIAL_CODEX_TASKS);
  const [activeId, setActiveId] = useState<string>(INITIAL_CODEX_TASKS[0].id);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState<boolean>(false);
  const [model, setModel] = useState<"deepseek-v4.1-flash" | "gpt-6-astra" | "gpt-6.1-sol">("deepseek-v4.1-flash");
  const multipliers = useRunModelMultipliers();
  const paused = usePausedRunModels();
  const [workflowId, setWorkflowId] = useState<WorkflowId>("code");
  const [wfParams, setWfParams] = useState<Record<string, string>>({});
  const [freshId, setFreshId] = useState<string | null>(null);
  const [sparkKey, setSparkKey] = useState<number>(0);
  const composerMode = getWorkflow(workflowId).mode;
  const [iterateOnCurrent, setIterateOnCurrent] = useState<boolean>(true);
  // 首屏是「想做点什么？」空状态；点开任务或发出指令后进入对话视图
  const [home, setHome] = useState<boolean>(true);
  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [sideCollapsed, setSideCollapsed] = useState<boolean>(false);
  const panelToggleRef = useRef<HTMLButtonElement>(null);
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const guideButtonRef = useRef<HTMLButtonElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const navSwipeRef = useRef<{ x: number; y: number } | null>(null);
  const gripDownRef = useRef<{ at: number; x: number }>({ at: 0, x: 0 });
  const wide = useMediaQuery("(min-width: 1024px)");
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
  const replyCopy = useCopyFeedback();
  const threadRef = useRef<HTMLDivElement>(null);
  // 首页是空状态，不跟随底部；进入任务对话后才按 40/120 规则跟随
  const { showJump, jumpToLatest } = useFollowBottom(threadRef, !home);
  useDismiss(toolsOpen, () => setToolsOpen(false), [toolsRef, toolsButtonRef], toolsButtonRef);
  useDismiss(showOnboardingGuide, () => setShowOnboardingGuide(false), [guideRef, guideButtonRef], guideButtonRef);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT);
  const gripRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [gripDragging, setGripDragging] = useState<boolean>(false);
  // 执行中继续发的消息排在输入框上方，当前这轮结束后按顺序发出；用户点停止后先不自动发
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const holdQueueRef = useRef<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  // 执行计时取真实开始时间；完成时不在看的任务记成未读
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [unseen, setUnseen] = useState<string[]>([]);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const homeRef = useRef(home);
  homeRef.current = home;

  // 窄屏下全站悬浮兔兔龙会压住输入框；工作台顶栏已有 Agent 入口，打开工作台时让它让位
  useEffect(() => {
    document.body.classList.add("ans-workbench-open");
    return () => document.body.classList.remove("ans-workbench-open");
  }, []);

  // 宽屏打开右侧面板时，兔兔龙的气泡不盖住预览
  const splitOpen = wide && !home && panelOpen;
  useEffect(() => {
    document.body.classList.toggle("ans-workbench-split", splitOpen);
    return () => document.body.classList.remove("ans-workbench-split");
  }, [splitOpen]);

  useEffect(() => {
    setLivePoints(points);
  }, [points]);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
      if (stored) setSidebarWidth(clampSidebar(stored));
      setSideCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  // 收起后清掉 freshId：回复只在刚生成时逐字晕开一次，之后重新挂载也不再重播
  useEffect(() => {
    if (!freshId) return;
    const timer = window.setTimeout(() => setFreshId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [freshId]);

  // 拖侧栏时按 Esc 恢复原宽度。分隔条按下时不拿焦点，所以监听挂在 window 上
  useEffect(() => {
    if (!gripDragging) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        endSidebarDrag(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gripDragging]);

  useEffect(() => {
    if (runStartedAt === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [runStartedAt]);

  useEffect(() => {
    if (running || queue.length === 0 || holdQueueRef.current) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    void executeRef.current(next.text, "playground", undefined, next.mode, { id: next.workflow, params: next.params });
  }, [running, queue]);

  function formatDuration(sec: number) {
    const s = Math.max(1, Math.round(sec));
    return s < 60 ? w("time.seconds", { s }) : w("time.minutes", { m: Math.floor(s / 60), s: s % 60 });
  }

  function saveSidebarWidth(value: number) {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
    } catch {
      // ignore storage errors
    }
  }

  function noteDone(taskId: string) {
    if (homeRef.current || activeIdRef.current !== taskId) {
      setUnseen(prev => (prev.includes(taskId) ? prev : [...prev, taskId]));
    }
  }

  function stopRun() {
    holdQueueRef.current = true;
    abortRef.current?.abort();
  }

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

  function focusTask(id: string) {
    setActiveId(id);
    setHome(false);
    setUnseen(prev => prev.filter(item => item !== id));
    setNavOpen(false);
    // 窄屏上面板是整屏浮层，进入任务时先看对话，点文件变更条再打开
    if (!wide) setPanelOpen(false);
  }

  function goHome() {
    setHome(true);
    setNavOpen(false);
    setPromptInput("");
    setTimeout(() => document.getElementById("codex-composer-input")?.focus(), 50);
  }

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
    focusTask(blankTask.id);
    setCanvasTab("preview");
    setTimeout(() => document.getElementById("codex-composer-input")?.focus(), 50);
  }

  function handleDeleteUserTask(taskId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = userTasks.filter(t => t.id !== taskId);
    saveUserTasks(next);
    if (activeId === taskId) {
      if (next[0]) focusTask(next[0].id);
      else { setActiveId(guideTasks[0].id); setHome(true); }
    }
    toast.success(w("toast.recordDeleted"));
  }

  function handleClearUserTasks() {
    saveUserTasks([]);
    setActiveId(guideTasks[0].id);
    setHome(true);
    toast.success(w("toast.recordsCleared"));
  }

  async function executeCodexTask(
    customPrompt?: string,
    intent: "playground" | "checkin" | "claw" | "redeem" | "scaffold" = "playground",
    baseTasksOverride?: CodexTask[],
    overrideMode?: "code" | "ask",
    wf?: { id: WorkflowId; params: Record<string, string> },
  ) {
    const wfManifest = getWorkflow(wf?.id ?? (overrideMode === "ask" ? "ask" : "code"));
    const runParams = wf?.params ?? {};
    const isWorkflowRun = Boolean(wfManifest.brief);
    const runMode = overrideMode ?? wfManifest.mode;
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
          focusTask(savedTask.id);
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
        focusTask(savedTask.id);
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
    setRunStartedAt(startedAt);
    const controller = new AbortController();
    abortRef.current = controller;
    const baseTasks = baseTasksOverride ?? (userTasks.length > 0 ? userTasks : readStoredUserTasks());
    const shouldIterateCurrent =
      intent === "playground" && !home && iterateOnCurrent && Boolean(activeTask?.artifactCode) &&
      (wfManifest.id === "ask" || (activeTask.workflow ?? "code") === wfManifest.id);
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
      : isWorkflowRun
        ? `# ${q || shortTitle}\n\n登录后，Agent 会按${wfManifest.name}工作流写出完整方案。`
        : buildLocalStarterHtml(q || shortTitle);
    const draftFile = isWorkflowRun ? `${wfManifest.id}-plan.md` : "local-draft.html";

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
      tag: isWorkflowRun ? wfManifest.name : runMode === "ask" ? w("tag.archQA") : shouldIterateCurrent ? "增量迭代" : intent === "playground" ? "我的任务" : "快捷操作",
      model,
      mode: runMode,
      workflow: wfManifest.id,
      params: runParams,
      branch: activeTask.branch || "ans-workspace/main",
      durationSec: 1,
      diffAdditions: initialDiff.additions,
      diffDeletions: initialDiff.deletions,
      status: "running",
      prompt: q || shortTitle,
      trace: runningTrace,
      summary: runMode === "ask" ? w("progress.analyzing") : "正在执行代码构建与差异对比...",
      artifactType: shouldIterateCurrent ? activeTask.artifactType : isWorkflowRun ? "markdown" : "html",
      artifactFile: shouldIterateCurrent ? activeTask.artifactFile : isWorkflowRun ? draftFile : "my-output.html",
      previousCode: diffBaselineForFallback,
      artifactCode: shouldIterateCurrent ? activeTask.artifactCode : fallbackCode,
    };

    const nextWithRunning = isUpdatingExistingUserTask
      ? baseTasks.map(t => (t.id === taskId ? runningTask : t))
      : [runningTask, ...baseTasks];
    saveUserTasks(nextWithRunning);
    focusTask(taskId);
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
          prompt: wfManifest.brief && q ? wfManifest.brief(q, runParams) : q,
          model,
          mode: runMode,
          contextCode: shouldIterateCurrent ? contextBaseline.slice(0, 12000) : undefined,
        }),
        signal: controller.signal,
      });
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      if (res.status === 401 || !res.ok) {
        const localDiff = computeUnifiedDiff(diffBaselineForFallback, fallbackCode);
        // 没有调用模型，就不编造「读需求、规划、写入、检查」四步；只标记成本地草稿
        const updated = nextWithRunning.map(item =>
          item.id === taskId
            ? {
                ...item,
                status: "completed" as const,
                durationSec: elapsedSec,
                diffAdditions: localDiff.additions,
                diffDeletions: localDiff.deletions,
                trace: [],
                local: "guest" as const,
                summary:
                  runMode === "ask"
                    ? w("reply.localAnswer", { p1: q, p2: runningTask.artifactFile })
                    : shouldIterateCurrent
                      ? w("reply.appliedChange", { p1: runningTask.artifactFile, p2: localDiff.additions, p3: localDiff.deletions })
                      : w("reply.guestMode"),
                links: [{ labelZh: w("link.signInForCompute"), href: "/login?callbackUrl=%2Fworkspace" }],
                artifactType: runningTask.artifactType,
                artifactFile: shouldIterateCurrent ? runningTask.artifactFile : draftFile,
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
            : isWorkflowRun
              ? draftFile
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
              local: undefined,
              // 代码和文档已经放进右侧面板，对话里只留说明文字
              summary: codeMatch
                ? reply.replace(codeMatch[0], "").trim() || w("reply.done")
                : isWorkflowRun && resolvedType === "markdown"
                  ? `${wfManifest.name}方案写好了，在 ${resolvedFile} 里。想改哪里直接说。`
                  : reply,
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
      if (controller.signal.aborted) {
        // 用户主动停止：保留发起前的文件，不生成本地草稿
        saveUserTasks(
          nextWithRunning.map(item =>
            item.id === taskId
              ? {
                  ...item,
                  status: "stopped" as const,
                  durationSec: elapsedSec,
                  trace: runningTrace.slice(0, 2),
                  summary: w("reply.stopped"),
                }
              : item,
          ),
        );
        return;
      }
      const localDiff = computeUnifiedDiff(diffBaselineForFallback, fallbackCode);
      const updated = nextWithRunning.map(item =>
        item.id === taskId
          ? {
              ...item,
              status: "completed" as const,
              durationSec: elapsedSec,
              diffAdditions: localDiff.additions,
              diffDeletions: localDiff.deletions,
              trace: [],
              local: "offline" as const,
              summary: "已生成本地可编辑草稿，可以在预览面板里看预览、变更和源码。",
              artifactType: runningTask.artifactType,
              artifactFile: shouldIterateCurrent ? runningTask.artifactFile : draftFile,
              previousCode: diffBaselineForFallback,
              artifactCode: fallbackCode,
            }
          : item,
      );
      saveUserTasks(updated);
    } finally {
      abortRef.current = null;
      setRunStartedAt(null);
      setRunning(false);
      setFreshId(taskId);
      noteDone(taskId);
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
      focusTask(forkedTask.id);
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
    focusTask(forkedTask.id);
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

  // 浮层自己会弹出来，不再额外弹提示条；关闭后焦点回到顶栏的 Agent 按钮
  function switchToFloatingChat() {
    window.dispatchEvent(new CustomEvent("ans:open-companion-chat", { detail: { draft: promptInput, returnFocusId: "wb-agent-button" } }));
  }

  /** 关闭预览面板，焦点还给顶栏的面板开关 */
  function closePanel() {
    setPanelOpen(false);
    requestAnimationFrame(() => panelToggleRef.current?.focus({ preventScroll: true }));
  }

  function toggleSidebar(collapsed: boolean) {
    setSideCollapsed(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }

  const codeLineCount = Math.max(1, activeTask.artifactCode.split("\n").length);
  const showPanel = !home && panelOpen;
  const statusTone = running
    ? "bg-emerald-500"
    : isViewingGuideSample
      ? "bg-amber-400"
      : activeTask.local
        ? "bg-muted-foreground/50"
        : activeTask.mode === "ask"
          ? "bg-sky-500"
          : "bg-emerald-500";
  const addTone = "text-emerald-700 dark:text-emerald-300";
  const delTone = "text-rose-700 dark:text-rose-300";

  function pickWorkflow(id: WorkflowId) {
    setWorkflowId(id);
    setWfParams(defaultParams(getWorkflow(id)));
  }

  function cycleParam(key: string) {
    const param = getWorkflow(workflowId).params.find(item => item.key === key);
    if (!param) return;
    setWfParams(prev => {
      const idx = param.options.indexOf(prev[key] ?? param.options[0]);
      return { ...prev, [key]: param.options[(idx + 1) % param.options.length] };
    });
  }

  function submitComposer(mode: "code" | "ask" = composerMode) {
    setToolsOpen(false);
    if (promptInput.trim()) setSparkKey(k => k + 1);
    holdQueueRef.current = false;
    const text = promptInput.trim();
    if (running) {
      if (!text) return;
      setQueue(prev => [...prev, { id: `queued-${Date.now()}`, text, mode, workflow: workflowId, params: wfParams }]);
      setPromptInput("");
      return;
    }
    void executeCodexTask(undefined, "playground", undefined, mode, { id: workflowId, params: wfParams });
  }

  function startSidebarDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    // 按下时 preventDefault 会让浏览器的 dblclick 不可靠，这里自己判断双击
    const last = gripDownRef.current;
    const isDouble = event.timeStamp - last.at < 350 && Math.abs(event.clientX - last.x) <= 6;
    gripDownRef.current = { at: isDouble ? 0 : event.timeStamp, x: event.clientX };
    if (isDouble) {
      setSidebarWidth(SIDEBAR_DEFAULT);
      saveSidebarWidth(SIDEBAR_DEFAULT);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    gripRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    setGripDragging(true);
  }

  function moveSidebarDrag(event: React.PointerEvent<HTMLDivElement>) {
    const grip = gripRef.current;
    if (!grip) return;
    setSidebarWidth(clampSidebar(grip.startWidth + event.clientX - grip.startX));
  }

  function endSidebarDrag(restore = false) {
    const grip = gripRef.current;
    if (!grip) return;
    gripRef.current = null;
    setGripDragging(false);
    const value = restore ? grip.startWidth : sidebarWidth;
    setSidebarWidth(value);
    saveSidebarWidth(value);
  }

  // 左栏：新建、我的任务、引导范例；底部是去处链接和账户
  const sidebar = (
    <nav aria-label={w("label.openMenu")} className="flex h-full min-h-0 flex-col gap-4 p-2">
      <div className="flex items-center justify-between gap-1">
        <button type="button" onClick={goHome} className="ans-wb-row font-medium">
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          {w("label.newTask")}
        </button>
        {wide ? (
          <button type="button" onClick={() => toggleSidebar(true)} aria-label={w("label.collapseSidebar")} title={w("label.collapseSidebar")} className="ans-wb-icon">
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={() => setNavOpen(false)} aria-label={w("label.closeMenu")} className="ans-wb-icon">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <section>
          <div className="group/head flex h-7 items-center justify-between px-2.5 text-xs text-muted-foreground">
            <span>
              {w("label.myTasks")} <span className="ans-num">{userTasks.length}</span>
            </span>
            {userTasks.length > 0 && (
              <button
                type="button"
                onClick={handleClearUserTasks}
                title={w("title.clearTasks")}
                className="rounded-md px-1.5 py-0.5 opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/head:opacity-100"
              >
                {w("label.clear")}
              </button>
            )}
          </div>
          {userTasks.length === 0 ? (
            <p className="px-2.5 py-1 text-xs leading-5 text-muted-foreground [text-wrap:pretty]">{w("empty.tasks")}</p>
          ) : (
            <ul className="space-y-px">
              {userTasks.map(t => (
                <li key={t.id}>
                  <div
                    onClick={() => focusTask(t.id)}
                    role="button"
                    tabIndex={0}
                    aria-current={!home && t.id === activeTask.id ? "true" : undefined}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        focusTask(t.id);
                      }
                    }}
                    className="ans-wb-row group cursor-pointer"
                  >
                    {t.status === "running" ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                    ) : t.workflow && getWorkflow(t.workflow).brief ? (
                      <span className="mx-[3px] size-2 shrink-0 rounded-full" style={{ background: getWorkflow(t.workflow).color }} aria-hidden="true" />
                    ) : t.mode === "ask" ? (
                      <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate" title={t.title}>{t.title}</span>
                    {unseen.includes(t.id) && (
                      <span className="size-1.5 shrink-0 rounded-full bg-sky-500 group-hover:hidden group-focus-within:hidden" aria-hidden="true" />
                    )}
                    <button
                      type="button"
                      onClick={e => handleDeleteUserTask(t.id, e)}
                      title={w("title.deleteRecord")}
                      aria-label={w("aria.deleteRecord", { p1: t.title })}
                      className="hidden size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-rose-600 group-hover:inline-flex group-focus-within:inline-flex dark:hover:text-rose-300"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex h-7 items-center px-2.5 text-xs text-muted-foreground">工作流</div>
          <ul className="space-y-px">
            {WORKFLOWS.filter(item => item.brief).map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={home && workflowId === item.id ? "true" : undefined}
                  onClick={() => {
                    pickWorkflow(item.id);
                    goHome();
                  }}
                  className="ans-wb-row"
                >
                  <span className="mx-[3px] size-2 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                </button>
              </li>
            ))}
            <li>
              <Link href="/market" className="ans-wb-row text-muted-foreground hover:text-foreground">
                <Plus className="size-3.5 shrink-0" aria-hidden="true" />
                从市场添加
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="space-y-px">
        <Link href="/projects" className="ans-wb-row text-muted-foreground hover:text-foreground">
          <FolderOpen className="size-4 shrink-0" aria-hidden="true" />
          {w("label.projects")}
        </Link>
        <Link href="/market" className="ans-wb-row text-muted-foreground hover:text-foreground">
          <Store className="size-4 shrink-0" aria-hidden="true" />
          {w("label.market")}
        </Link>
      </div>

      {/* 账户：头像、昵称、等级、积分；领算力、账本、签到都收在这一块 */}
      <div className="ans-wb-rule-t -mx-2 space-y-1 px-2 pt-2">
        <div className="flex items-center gap-2.5 px-2.5 py-1">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-medium" aria-hidden="true">
            {(current || "A").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center text-sm">
              <span className="truncate">{current}</span>
              {actorId && <LegacyDisplayNameEditor actorId={actorId} current={current} />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{levelName}</span>
              <span className="inline-flex items-center gap-1">
                <Coins className="size-3.5" aria-hidden="true" />
                <span className="ans-num text-foreground">{livePoints}</span> {w("label.points")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <Link href="/workspace/benefits" className="ans-wb-icon text-emerald-700 dark:text-emerald-300">
            <Gift className="size-3.5" aria-hidden="true" />
            {w("label.claimCompute")}
          </Link>
          <Link href="/workspace/credits" className="ans-wb-icon">
            <ReceiptText className="size-3.5" aria-hidden="true" />
            {w("label.ledger")}
          </Link>
          <button type="button" onClick={() => void executeCodexTask("", "checkin")} title={w("title.checkin")} className="ans-wb-icon">
            <CalendarCheck className="size-3.5" aria-hidden="true" />
            {w("label.checkin")}
          </button>
        </div>
      </div>
    </nav>
  );

  // 底部输入框：一个大框；「+」里收纳补齐细节、意图词、快捷指令和新建空白
  const seedText = (promptInput || (home ? "" : activeTask.prompt) || "").trim();
  const cluster = detectIntentAndMatchTerms(seedText);
  const composerCard = (
    <form
      onSubmit={e => {
        e.preventDefault();
        submitComposer();
      }}
      className="ans-wb-composer relative rounded-[20px] p-2"
    >
      <textarea
        id="codex-composer-input"
        rows={home ? 3 : 2}
        value={promptInput}
        onChange={e => setPromptInput(e.target.value)}
        placeholder={
          running
            ? w("placeholder.queue")
            : !home && iterateOnCurrent && activeTask.artifactCode && (activeTask.workflow ?? "code") === workflowId
              ? w("placeholder.iterate", { file: activeTask.artifactFile })
              : getWorkflow(workflowId).placeholder
        }
        className="block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none [field-sizing:content]"
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey && !imeBlocks(e)) {
            e.preventDefault();
            submitComposer();
          }
        }}
      />

      {/* 「+」菜单浮在输入框外面，不推挤页面；首页向下展开，对话里向上展开 */}
      <div
        ref={toolsRef}
        data-open={toolsOpen}
        inert={!toolsOpen}
        className={`ans-menu absolute left-0 z-30 w-[min(320px,100%)] ${home ? "top-full mt-2 origin-top-left" : "bottom-full mb-2 origin-bottom-left"}`}
      >
          <div className="flex flex-col gap-px p-1" data-testid="codex-intent-bridge">
            <button
              type="button"
              title={w("title.expandIdea")}
              onClick={() => {
                const rawIdea = (promptInput || (home ? "" : activeTask.prompt)).trim();
                if (!rawIdea) {
                  toast.info(w("toast.needIdeaFirst"));
                  document.getElementById("codex-composer-input")?.focus();
                  return;
                }
                setPromptInput(upgradeToStructuredBrief(rawIdea, "zh"));
                toast.success(w("toast.detailsExpanded"));
              }}
              className="ans-menu-item"
            >
              <Wand2 className="size-3.5" aria-hidden="true" />
              {w("label.expandDetails")}
            </button>
            {cluster.terms.map(term => (
              <button
                key={term.slug}
                type="button"
                title={term.hint.zh}
                onClick={() => {
                  setPromptInput(prev => {
                    const base = (prev || (home ? "" : activeTask.prompt)).trim();
                    if (!base) return term.appendText.zh;
                    return base.includes(term.appendText.zh) ? base : `${base}\n- ${term.appendText.zh}`;
                  });
                }}
                className="ans-menu-item text-muted-foreground"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {term.label.zh}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setToolsOpen(false);
                handleStartBlankTask();
              }}
              className="ans-menu-item text-muted-foreground"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              {w("label.newBlank")}
            </button>
          </div>
      </div>

      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            ref={toolsButtonRef}
            type="button"
            aria-expanded={toolsOpen}
            aria-haspopup="true"
            aria-label={w("label.moreTools")}
            title={w("label.moreTools")}
            onClick={() => setToolsOpen(v => !v)}
            className="ans-wb-icon rounded-full"
          >
            <Plus className={`ans-spring-pop size-4 transition-transform ${toolsOpen ? "rotate-45" : ""}`} aria-hidden="true" />
          </button>
          {!home && workflowId !== "code" && (
            <button
              type="button"
              data-testid="codex-workflow-chip"
              onClick={() => pickWorkflow("code")}
              title={`${getWorkflow(workflowId).name}，点一下退回写代码`}
              className="ans-wb-chip-in inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
              style={{ background: `color-mix(in srgb, ${getWorkflow(workflowId).color} 14%, transparent)`, color: getWorkflow(workflowId).color }}
            >
              {getWorkflow(workflowId).name}
              <X className="size-3 opacity-70" aria-hidden="true" />
            </button>
          )}
          <div className="contents">
            {home && getWorkflow(workflowId).params.map((param, idx) => (
              <button
                key={`${workflowId}-${param.key}`}
                type="button"
                onClick={() => cycleParam(param.key)}
                title="点一下换一个"
                style={{ animationDelay: `${(idx + 1) * 40}ms` }}
                className="ans-wb-chip-in inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-colors hover:bg-muted hover:text-foreground"
              >
                {wfParams[param.key] ?? param.options[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* 手机上也能选模型；倍率完整显示，聚焦时是双环 */}
          <label className="relative inline-flex h-8 cursor-pointer items-center rounded-[8px] pl-2 pr-6 text-xs text-muted-foreground transition-colors focus-within:text-foreground focus-within:shadow-[var(--focus-ring)] hover:bg-muted hover:text-foreground">
            <select
              aria-label={w("aria.modelSelect")}
              value={model}
              onChange={e => setModel(e.target.value as typeof model)}
              className="max-w-[42vw] cursor-pointer appearance-none bg-transparent outline-none [field-sizing:content] focus-visible:shadow-none sm:max-w-none"
            >
              {WORKBENCH_MODEL_OPTIONS.map(option => {
                const rate = multipliers[option.key];
                const available = !paused.includes(option.key);
                return <option key={option.key} value={option.key} disabled={!available}>{w(option.labelKey)}{!available ? ` (${w("model.unavailable")})` : rate === undefined ? "" : ` ${rate}x`}</option>;
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5" aria-hidden="true" />
          </label>
          {running && (
            <button
              type="button"
              data-testid="codex-stop"
              onClick={stopRun}
              aria-label={w("label.stopRun")}
              title={w("label.stopRun")}
              className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-surface-raised"
            >
              <Square className="size-3 fill-current" aria-hidden="true" />
            </button>
          )}
          <span className="relative inline-flex">
          {sparkKey > 0 && <SendSparks key={sparkKey} />}
          <button
            type="submit"
            data-testid="codex-send"
            disabled={!promptInput.trim()}
            aria-label={running ? w("label.queued") : w("label.send")}
            title={getWorkflow(workflowId).name}
            className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          </span>
        </div>
      </div>
    </form>
  );

  // 有产物时，输入框背后露出一条灰色上下文条：基于哪个文件继续改，点一下切换
  const composer = !home && !(running && activeTask.status === "running") && activeTask.artifactCode ? (
    <div className="ans-wb-tray">
      <button
        type="button"
        aria-pressed={iterateOnCurrent}
        onClick={() => setIterateOnCurrent(v => !v)}
        title={w("label.iterateOnCurrent")}
        className={`flex w-full min-w-0 items-center gap-1.5 rounded-t-[20px] px-3.5 pb-2 pt-1.5 text-xs transition-colors ${
          iterateOnCurrent ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {iterateOnCurrent ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <FileCode2 className="size-3.5 shrink-0" aria-hidden="true" />}
        <span className="shrink-0">{w("label.iterateOnCurrent")}</span>
        <MiddleEllipsis name={activeTask.artifactFile} className="font-mono text-muted-foreground" />
      </button>
      {composerCard}
    </div>
  ) : (
    composerCard
  );

  // 对话：用户指令是右侧气泡；Agent 回复是正文，上面一行可折叠的执行步骤，下面是文件变更条和操作
  const taskRunning = running && activeTask.status === "running";
  const elapsedSec = taskRunning && runStartedAt !== null ? (now - runStartedAt) / 1000 : activeTask.durationSec ?? 0;
  const runStatusLabel = taskRunning
    ? `${w("status.working")} ${formatDuration(elapsedSec)}`
    : activeTask.status === "stopped"
      ? w("status.stoppedAfter", { time: formatDuration(elapsedSec) })
      : w("status.workedFor", { time: formatDuration(elapsedSec) });

  const thread = (
    <div className="mx-auto w-full max-w-[768px] space-y-4 px-4 pb-6 pt-6 sm:px-6">
      <div className="flex flex-col items-end gap-1.5">
        {isViewingGuideSample && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lightbulb className="size-3.5" aria-hidden="true" />
            {w("label.samplePrompt")}
            <button
              type="button"
              onClick={() => setPromptInput(activeTask.prompt)}
              className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              {w("label.fillIntoInput")}
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        <p
          aria-label={isViewingGuideSample ? w("label.samplePrompt") : w("label.taskPrompt")}
          className="max-w-[85%] whitespace-pre-wrap rounded-[18px] bg-muted px-4 py-2.5 text-sm leading-6 [text-wrap:pretty]"
        >
          {activeTask.prompt || <span className="text-muted-foreground">{w("empty.prompt")}</span>}
        </p>
      </div>

      <div className="space-y-3">
        {((activeTask.trace && activeTask.trace.length > 0) || taskRunning) && (
          <WorkflowRunNode
            key={`${activeTask.id}-${activeTask.status}`}
            workflow={activeTask.workflow ?? (activeTask.mode === "ask" ? "ask" : "code")}
            params={activeTask.params}
            status={activeTask.status}
            trace={activeTask.trace ?? []}
            statusLabel={runStatusLabel}
          />
        )}

        {!taskRunning && activeTask.local && (
          <p data-testid="codex-local-draft" className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            {activeTask.local === "guest" ? w("status.localGuest") : w("status.localOffline")}
          </p>
        )}

        {!taskRunning && (
          <ThreadReply text={activeTask.summary} fresh={freshId === activeTask.id} />
        )}

        {!taskRunning && activeTask.status === "completed" && getWorkflow(activeTask.workflow).next && (
          <a
            href={getWorkflow(activeTask.workflow).next!.href}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm text-background transition-opacity hover:opacity-90"
          >
            {getWorkflow(activeTask.workflow).next!.label}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        )}

        {!taskRunning && (<>
        <button
          type="button"
          onClick={() => {
            setCanvasTab("diff");
            setPanelOpen(true);
          }}
          title={w("label.viewDiff")}
          className="flex w-full max-w-[420px] items-center justify-between gap-3 rounded-[12px] bg-card px-3 py-2 font-mono text-xs shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-colors hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileCode2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <MiddleEllipsis name={activeTask.artifactFile} />
          </span>
          <span className="ans-num flex shrink-0 items-center gap-2">
            <span className={addTone}>+{activeDiff.additions}</span>
            {activeDiff.deletions > 0 && <span className={delTone}>-{activeDiff.deletions}</span>}
            <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>

        {activeTask.links && activeTask.links.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeTask.links.map((lk, i) => (
              <a
                key={i}
                href={lk.href}
                title={lk.detail}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm underline decoration-[var(--hairline)] underline-offset-4 transition-colors hover:bg-muted"
              >
                {lk.labelZh || lk.title || lk.labelEn || w("link.open")}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}

        <div className="-ml-2 flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            onClick={() => void replyCopy.copy(activeTask.summary)}
            title={w("label.copyReply")}
            aria-label={w("label.copyReply")}
            className="ans-wb-icon"
          >
            {replyCopy.copied ? (
              <Check className={`size-3.5 ${addTone} ${replyCopy.state === "leaving" ? "ans-feedback-leaving" : "ans-pop"}`} aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </button>
          {isViewingGuideSample && (
            <button type="button" onClick={forkActiveSampleToDraft} className="ans-wb-icon">
              <CopyPlus className="size-3.5" aria-hidden="true" />
              {w("label.copyAsDraft")}
            </button>
          )}
          <button
            type="button"
            onClick={() => void executeCodexTask(activeTask.title, "scaffold")}
            title={w("title.saveToProjects")}
            className="ans-wb-icon"
          >
            <FolderPlus className="size-3.5" aria-hidden="true" />
            {w("label.saveAsProject")}
          </button>
          <button type="button" onClick={downloadActiveHtml} title={w("label.download")} aria-label={w("label.download")} className="ans-wb-icon">
            <Download className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        </>)}
      </div>
    </div>
  );

  // 右侧面板：预览、变更、源码、终端
  const panelTabs = [
    { id: "preview", label: w("tab.preview"), Icon: Eye },
    { id: "diff", label: w("tab.diff"), Icon: GitCompareArrows, count: true },
    { id: "code", label: w("tab.code"), Icon: Code2 },
    { id: "terminal", label: w("tab.terminal"), Icon: SquareTerminal },
  ] as const;
  const panel = (
    <section className="flex h-full min-h-0 flex-1 flex-col bg-background">
      {!wide && (
        <div className="ans-wb-rule-b flex h-12 shrink-0 items-center gap-1 px-1.5">
          <button type="button" onClick={closePanel} className="ans-wb-icon shrink-0 text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {w("label.backToChat")}
          </button>
          <MiddleEllipsis name={activeTask.artifactFile} className="min-w-0 flex-1 text-right font-mono text-xs text-muted-foreground" />
        </div>
      )}
      <div className="ans-wb-rule-b flex h-11 shrink-0 items-center justify-between gap-2 px-2">
        <div
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto"
          role="tablist"
          aria-orientation="horizontal"
          onKeyDown={e => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
            e.preventDefault();
            const idx = panelTabs.findIndex(tab => tab.id === canvasTab);
            const last = panelTabs.length - 1;
            const nextIdx = e.key === "Home" ? 0 : e.key === "End" ? last : (idx + (e.key === "ArrowRight" ? 1 : -1) + panelTabs.length) % panelTabs.length;
            const next = panelTabs[nextIdx].id;
            setCanvasTab(next);
            document.getElementById(`wb-tab-${next}`)?.focus();
          }}
        >
          {panelTabs.map(({ id, label, Icon, ...rest }) => {
            const count = "count" in rest && rest.count;
            return (
            <button
              key={id}
              id={`wb-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={canvasTab === id}
              aria-controls="wb-tabpanel"
              tabIndex={canvasTab === id ? 0 : -1}
              data-testid={`codex-tab-${id}`}
              onClick={() => setCanvasTab(id)}
              aria-label={label}
              className="ans-wb-icon shrink-0"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
              {count && (
                <span className="ans-num hidden font-mono sm:inline">
                  <span className={addTone}>+{activeDiff.additions}</span>{" "}
                  <span className={delTone}>-{activeDiff.deletions}</span>
                </span>
              )}
            </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canvasTab === "preview" && activeTask.artifactType === "html" && (
            <>
              <button
                type="button"
                data-testid="codex-viewport-desktop"
                aria-pressed={viewportMode === "desktop"}
                onClick={() => setViewportMode("desktop")}
                title={w("label.desktop")}
                aria-label={w("label.desktop")}
                className="ans-wb-icon"
              >
                <Monitor className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="codex-viewport-mobile"
                aria-pressed={viewportMode === "mobile"}
                onClick={() => setViewportMode("mobile")}
                title={w("label.mobile")}
                aria-label={w("label.mobile")}
                className="ans-wb-icon"
              >
                <Smartphone className="size-3.5" aria-hidden="true" />
              </button>
            </>
          )}
          {canvasTab === "diff" && activeTask.previousCode && (
            <button type="button" onClick={revertToPreviousCode} title={w("title.restoreVersion")} className="ans-wb-icon">
              <Undo2 className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{w("label.restore")}</span>
            </button>
          )}
          <button type="button" onClick={() => setPreviewKey(k => k + 1)} title={w("title.reloadPreview")} aria-label={w("label.refresh")} className="ans-wb-icon">
            <RotateCw className="size-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void copyFeedback.copy(activeTask.artifactCode)} title={w("label.copy")} aria-label={w("label.copy")} className="ans-wb-icon">
            {copyFeedback.copied ? (
              <Check className={`size-3.5 ${addTone} ${copyFeedback.state === "leaving" ? "ans-feedback-leaving" : "ans-pop"}`} aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </button>
          {activeTask.artifactType === "html" && (
            <button type="button" onClick={openFullscreenPreview} title={w("label.newWindow")} aria-label={w("label.newWindow")} className="ans-wb-icon">
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </button>
          )}
          {wide && (
            <button type="button" onClick={closePanel} aria-label={w("label.closePanel")} title={w("label.closePanel")} className="ans-wb-icon">
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div id="wb-tabpanel" role="tabpanel" aria-labelledby={`wb-tab-${canvasTab}`} className="flex min-h-0 flex-1 flex-col p-2">
        {/* 预览常驻：切到别的标签只是隐藏，iframe 不重建，里面的交互状态不丢 */}
        <div className={canvasTab === "preview" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        {(
          taskRunning ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[12px] bg-card p-6 shadow-[inset_0_0_0_0.5px_var(--hairline)]" aria-busy="true">
              <span className="text-xs text-muted-foreground">{getWorkflow(activeTask.workflow).name}正在写 {activeTask.artifactFile}</span>
              {[72, 92, 64, 84, 48].map((width, idx) => (
                <span key={idx} className="ans-wb-skeleton h-3 rounded-full" style={{ width: `${width}%`, animationDelay: `${idx * 120}ms` }} />
              ))}
            </div>
          ) : activeTask.artifactType === "html" ? (
            <div
              className={`flex min-h-0 flex-1 items-stretch justify-center rounded-[12px] bg-muted p-1 ${freshId === activeTask.id ? "ans-wb-reveal" : ""}`}
            >
              <iframe
                key={`${activeTask.id}-${previewKey}`}
                title="Live Artifact Preview"
                srcDoc={activeTask.artifactCode}
                sandbox="allow-scripts"
                className={`min-h-[360px] flex-1 rounded-[8px] bg-card transition-[max-width] duration-300 ${
                  viewportMode === "mobile" ? "mx-auto max-w-[390px]" : "w-full"
                }`}
              />
            </div>
          ) : activeTask.artifactType === "markdown" ? (
            <article className="min-h-0 flex-1 overflow-auto rounded-[12px] bg-card p-5 text-sm leading-7 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
              <div className="ans-wb-rule-b mb-3 flex items-center justify-between gap-3 pb-2.5 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{w("label.docPreview")} {activeTask.title}</span>
                </span>
                <span className="shrink-0 font-mono">{activeTask.model}</span>
              </div>
              <div className="ans-wb-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img", "input", "script"]}>
                  {activeTask.artifactCode}
                </ReactMarkdown>
              </div>
            </article>
          ) : (
            <pre className="min-h-0 flex-1 overflow-auto rounded-[12px] bg-card p-4 font-mono text-xs leading-6 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
              {activeTask.artifactCode}
            </pre>
          )
        )}
        </div>

        {canvasTab === "diff" && (
          <div data-testid="codex-diff-viewer" className="min-h-0 flex-1 overflow-auto rounded-[12px] bg-card font-mono text-xs shadow-[inset_0_0_0_0.5px_var(--hairline)]">
            <div className="ans-wb-rule-b sticky top-0 z-10 flex items-center justify-between gap-3 bg-card/95 px-4 py-2 backdrop-blur">
              <span className="min-w-0 truncate text-muted-foreground">
                a/{activeTask.artifactFile} → b/{activeTask.artifactFile}
              </span>
              <span className="ans-num shrink-0 space-x-3">
                <span className={addTone}>+{activeDiff.additions} {w("label.added")}</span>
                <span className={delTone}>-{activeDiff.deletions} {w("label.removed")}</span>
              </span>
            </div>
            <div className="py-1">
              {activeDiff.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`ans-num grid grid-cols-[40px_40px_20px_1fr] items-start px-2 py-0.5 leading-5 ${
                    line.type === "add"
                      ? "bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100"
                      : line.type === "del"
                        ? "bg-rose-500/[0.08] text-rose-900 dark:text-rose-200"
                        : "text-muted-foreground"
                  }`}
                >
                  <span className="select-none pr-2 text-right opacity-60">{line.oldLine ?? ""}</span>
                  <span className="select-none pr-2 text-right opacity-60">{line.newLine ?? ""}</span>
                  <span className="select-none">{line.type === "add" ? "+" : line.type === "del" ? "-" : " "}</span>
                  <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{line.text || " "}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canvasTab === "code" && (
          <div className="flex min-h-0 flex-1 overflow-auto rounded-[12px] bg-card shadow-[inset_0_0_0_0.5px_var(--hairline)]">
            <div aria-hidden="true" className="ans-num select-none bg-muted px-2.5 py-4 text-right font-mono text-xs leading-6 text-muted-foreground">
              {Array.from({ length: codeLineCount }, (_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>
            <textarea
              value={activeTask.artifactCode}
              onChange={e => updateActiveCode(e.target.value)}
              aria-label={w("aria.sourceEditor")}
              spellCheck={false}
              style={{ height: `${codeLineCount * 24 + 32}px` }}
              className="w-full flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-6 focus:outline-none"
            />
          </div>
        )}

        {canvasTab === "terminal" && (
          <div className="min-h-0 flex-1 overflow-auto rounded-[12px] bg-card p-4 font-mono text-xs leading-6 text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)]">
            <div className="ans-wb-rule-b mb-3 flex items-center justify-between gap-3 pb-2" title={w("title.branch")}>
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <GitBranch className="size-3.5 shrink-0" aria-hidden="true" />
                {activeTask.branch || "ans-workspace/main"}
              </span>
              <span className="shrink-0">{activeTask.model}</span>
            </div>
            {activeTask.trace && activeTask.trace.length > 0 && (
              <div className="mb-3 rounded-[8px] bg-muted p-3">
                <div className="mb-1">{w("label.currentTaskSteps")}</div>
                {activeTask.trace.map((step, idx) => (
                  <div key={idx} className="leading-5 text-foreground">{step}</div>
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
  );

  const conversation = (
    <section className="relative flex h-full min-h-0 flex-1 flex-col bg-card">
      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto">
        {home ? (
          <WorkbenchHome
            composer={composer}
            typed={promptInput.length}
            workflow={workflowId}
            onPickWorkflow={id => {
              pickWorkflow(id);
              document.getElementById("codex-composer-input")?.focus();
            }}
            onPickTemplate={tpl => {
              if (tpl.workflow && tpl.workflow !== workflowId) pickWorkflow(tpl.workflow);
              setPromptInput(tpl.prompt);
              document.getElementById("codex-composer-input")?.focus();
            }}
          />
        ) : (
          thread
        )}
      </div>
      {!home && showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-[120px] left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1 rounded-full bg-card px-3 text-xs shadow-[inset_0_0_0_0.5px_var(--hairline),0_4px_16px_-8px_rgb(26_26_25/20%)] hover:bg-muted"
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
          {w("label.jumpLatest")}
        </button>
      )}
      {!home && (
        <div className="mx-auto w-full max-w-[768px] px-4 pb-4 sm:px-6">
          {queue.length > 0 && (
            <ul className="mb-2 space-y-1" aria-label={w("label.queued")}>
              {queue.map(item => (
                <li key={item.id} className="flex min-w-0 items-center gap-2 rounded-[12px] bg-muted py-1 pl-3 pr-1 text-sm">
                  <span className="shrink-0 text-xs text-muted-foreground">{w("label.queued")}</span>
                  <span className="min-w-0 flex-1 truncate" title={item.text}>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => setQueue(prev => prev.filter(entry => entry.id !== item.id))}
                    className="ans-wb-icon h-7 min-w-7"
                  >
                    {w("label.withdraw")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {composer}
        </div>
      )}
    </section>
  );

  return (
    <div
      data-testid="pi-codex-workbench"
      aria-label={w("aria.workbench")}
      className="ans-wb relative flex h-[calc(100dvh-var(--wb-top)-64px-env(safe-area-inset-bottom))] min-h-[560px] overflow-hidden bg-background text-foreground xl:h-[calc(100dvh-var(--wb-top))]"
    >
      {wide ? (
        <aside
          style={{ width: sideCollapsed ? 0 : sidebarWidth }}
          inert={sideCollapsed}
          aria-hidden={sideCollapsed || undefined}
          className={`ans-wb-side relative shrink-0 bg-background ${sideCollapsed ? "overflow-hidden" : ""} ${gripDragging ? "" : "ans-spring-drag transition-[width]"}`}
        >
          {/* 收起时侧栏内容保持原宽度被裁掉，不挤成一条 */}
          <div style={{ width: sidebarWidth }} className="h-full">{sidebar}</div>
          {!sideCollapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={w("label.resizeSidebar")}
              aria-valuemin={SIDEBAR_MIN}
              aria-valuemax={SIDEBAR_MAX}
              aria-valuenow={sidebarWidth}
              title={w("label.resizeSidebar")}
              tabIndex={0}
              data-dragging={gripDragging}
              className="ans-wb-grip"
              onPointerDown={startSidebarDrag}
              onPointerMove={moveSidebarDrag}
              onPointerUp={() => endSidebarDrag()}
              onPointerCancel={() => endSidebarDrag(true)}
              onDoubleClick={() => {
                setSidebarWidth(SIDEBAR_DEFAULT);
                saveSidebarWidth(SIDEBAR_DEFAULT);
              }}
              onKeyDown={e => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = clampSidebar(sidebarWidth + (e.key === "ArrowLeft" ? -16 : 16));
                  setSidebarWidth(next);
                  saveSidebarWidth(next);
                }
              }}
            />
          )}
        </aside>
      ) : (
        // 窄屏：任务列表是从左边滑出的抽屉，焦点、Esc、遮罩、滚动锁定交给 Sheet；向左划也能关
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            showClose={false}
            aria-describedby={undefined}
            onCloseAutoFocus={e => {
              // 手机上点按不一定让按钮拿到焦点，关闭后明确还给顶栏的菜单按钮
              e.preventDefault();
              navButtonRef.current?.focus({ preventScroll: true });
            }}
            className="w-[min(300px,85vw)] gap-0 border-0 p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:max-w-none"
            onTouchStart={e => {
              const t = e.touches[0];
              navSwipeRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={e => {
              const start = navSwipeRef.current;
              navSwipeRef.current = null;
              const t = e.changedTouches[0];
              if (!start || !t) return;
              const dx = t.clientX - start.x;
              if (dx < -56 && Math.abs(dx) > Math.abs(t.clientY - start.y) * 1.5) setNavOpen(false);
            }}
          >
            <SheetTitle className="sr-only">{w("label.myTasks")}</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col bg-card">
        {/* 顶栏：任务标题与状态；右侧是预览面板开关、Agent 对话、上手说明 */}
        <header className="ans-wb-rule-b relative z-20 flex h-11 shrink-0 items-center justify-between gap-2 px-2 sm:px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {(!wide || sideCollapsed) && (
              <button
                ref={navButtonRef}
                type="button"
                onClick={() => (wide ? toggleSidebar(false) : setNavOpen(true))}
                aria-label={wide ? w("label.expandSidebar") : w("label.openMenu")}
                title={wide ? w("label.expandSidebar") : undefined}
                aria-expanded={wide ? undefined : navOpen}
                className="ans-wb-icon"
              >
                <PanelLeft className="size-4" aria-hidden="true" />
              </button>
            )}
            {home ? (
              <span className="truncate px-1 text-sm text-muted-foreground">{w("mode.workbench")}</span>
            ) : (
              <>
                <h2 className="truncate px-1 text-sm font-medium" title={activeTask.title}>{activeTask.title}</h2>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${statusTone} ${running ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
                  {running
                    ? w("status.running")
                    : isViewingGuideSample
                      ? w("status.guidedSample")
                      : activeTask.status === "stopped"
                        ? runStatusLabel
                        : activeTask.local
                        ? w("status.notRun")
                        : activeTask.mode === "ask"
                        ? w("status.askMode")
                        : w("status.applied")}
                </span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <div className="relative">
              <button
                ref={guideButtonRef}
                type="button"
                onClick={() => setShowOnboardingGuide(v => !v)}
                title={w("title.threeStepGuide")}
                aria-expanded={showOnboardingGuide}
                aria-haspopup="true"
                className="ans-wb-icon"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{w("onboarding.guideButton")}</span>
              </button>
              {/* 三步上手说明：浮在顶栏下面，不推挤主区；Esc 或点外面关闭 */}
              <div
                ref={guideRef}
                data-open={showOnboardingGuide}
                inert={!showOnboardingGuide}
                data-testid={showOnboardingGuide ? "workbench-onboarding-guide" : undefined}
                className="ans-menu absolute right-0 top-full z-30 mt-1.5 w-[min(340px,calc(100vw-24px))] origin-top-right"
              >
                <ol className="space-y-px p-1 text-xs">
                  {[
                    [w("onboarding.step1Title"), w("onboarding.step1Body")],
                    [w("onboarding.step2Title"), w("onboarding.step2Body")],
                    [w("onboarding.step3Title"), w("onboarding.step3Body")],
                  ].map(([title, body], idx) => (
                    <li key={title} className="flex items-start gap-2.5 rounded-[8px] px-2.5 py-2">
                      <span className="ans-num inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">{idx + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground">{title}</span>
                        <span className="mt-0.5 block leading-5 text-muted-foreground [text-wrap:pretty]">{body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <button id="wb-agent-button" type="button" onClick={switchToFloatingChat} title={w("title.openAgentChat")} className="ans-wb-icon">
              <Bot className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Agent {w("mode.agentChat")}</span>
            </button>
            {!home && (
              <button
                ref={panelToggleRef}
                type="button"
                aria-pressed={panelOpen}
                onClick={() => setPanelOpen(v => !v)}
                title={w("label.togglePanel")}
                aria-label={w("label.togglePanel")}
                className="ans-wb-icon"
              >
                {panelOpen ? <PanelRightClose className="size-4" aria-hidden="true" /> : <PanelRightOpen className="size-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* 宽屏始终渲染分栏：开关面板只改右栏宽度，左侧对话不会重建 */}
          {wide ? (
            <ResizableSplit
              label={w("label.splitHandle")}
              reopenLabel={w("label.showPreview")}
              initialRatio={0.48}
              className="min-h-0 flex-1"
              open={showPanel}
              onOpenChange={setPanelOpen}
              left={conversation}
              right={panel}
            />
          ) : (
            conversation
          )}
        </div>
      </div>

      {/* 窄屏：面板从右边整屏滑入，顶部有「返回对话」 */}
      {!wide && (
        <Sheet open={showPanel} onOpenChange={open => { if (!open) setPanelOpen(false); }}>
          <SheetContent
            side="right"
            showClose={false}
            aria-describedby={undefined}
            className="w-full gap-0 border-0 bg-background p-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:max-w-none"
            onCloseAutoFocus={e => {
              e.preventDefault();
              panelToggleRef.current?.focus({ preventScroll: true });
            }}
          >
            <SheetTitle className="sr-only">{activeTask.title}</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/** 订阅媒体查询；服务端渲染时按宽屏处理。 */
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
