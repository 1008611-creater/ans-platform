"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { agriTaskCommandSchema, agriTaskEditableSchema, agriTaskMutationSchema, agriTaskHistoryPageSchema, type AgriTaskHistoryPage, type AgriTaskFilters, type AgriTaskEditable, type AgriTaskView, type AgriTaskList, type AgriTaskDetail, type AgriTaskCommand, type AgriTaskMutation } from "@/contracts/agri-tasks";
import { clearAgriRecoveries, readAgriRecovery, writeAgriRecovery, type AgriTaskRecovery } from "./agri-task-recovery";
import { AgriTaskReferences } from "./agri-task-references";
import type { AgriTargetDate } from "@/contracts/agrihackathon";

const api = "/api/competitions/agrihackathon/tasks";
const stages = ["PREPARATION", "PRELIMINARY", "FINAL", "EVENT_DAY", "ARCHIVE"] as const;
const statuses = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const priorities = ["LOW", "NORMAL", "HIGH"] as const;
class TaskRequestError extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
// These errors are emitted after the locked receipt lookup. A retry rejected
// before that lookup (notably 429) cannot disprove an earlier committed write.
const receiptRejected = new Set(["AGRI_REVISION_CONFLICT", "AGRI_TASK_LIMIT", "AGRI_SHARE_LIMIT", "INVALID_RECIPIENT", "INVALID_SHARE_EXPIRY", "AGRI_REFERENCE_LIMIT", "AGRI_REFERENCE_ALREADY_ATTACHED", "AGRI_REFERENCE_UNAVAILABLE"]);
function canReleasePending(error: unknown, wasRetry: boolean) {
  return error instanceof TaskRequestError && !error.uncertain && (!wasRetry || receiptRejected.has(error.code));
}
async function request<T>(url: string, actorId: string, command?: AgriTaskCommand, competitionId?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", headers: { "x-ans-task-actor": actorId, ...(command ? { "Content-Type": "application/json" } : {}) }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) });
  } catch { throw new TaskRequestError("INTERNAL_ERROR", !!command); }
  let body;
  try { body = await response.json(); } catch { throw new TaskRequestError("INTERNAL_ERROR", !!command); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TaskRequestError("INTERNAL_ERROR", !!command);
  if (!response.ok || body.ok !== true) throw new TaskRequestError(typeof body.error?.code === "string" ? body.error.code : "INTERNAL_ERROR", !!command && (response.status >= 500 || response.ok));
  if (command) {
    const parsed = agriTaskMutationSchema.safeParse(body.data);
    if (!parsed.success) throw new TaskRequestError("INTERNAL_ERROR", true);
    const result = parsed.data;
    if (command.action === "initialize") {
      if (result.task !== null) throw new TaskRequestError("INTERNAL_ERROR", true);
    } else if (!competitionId || !result.task || result.task.competitionId !== competitionId || ("taskId" in command && result.task.id !== command.taskId) || result.appliedRevision !== ("expectedRevision" in command ? command.expectedRevision + 1 : 1)) {
      throw new TaskRequestError("INTERNAL_ERROR", true);
    }
    return result as T;
  }
  return body.data as T;
}
function beijingInput(at: string | null) {
  if (!at || !Number.isFinite(Date.parse(at))) return "";
  return new Date(Date.parse(at) + 8 * 3600_000).toISOString().slice(0, 16);
}
function inputInstant(value: string) { return value ? value + ":00+08:00" : ""; }
function time(at: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
}
function freshTask(): AgriTaskEditable {
  return { title: "", stage: "PREPARATION", status: "NOT_STARTED", priority: "NORMAL", due: { state: "UNKNOWN", at: null }, acceptanceCriteria: "", collaborationNotes: "", inputRequirements: { schemaVersion: 1, items: [] }, blockingInput: null, completionResult: null };
}
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children(id)}</div>;
}
const selectClass = "w-full min-w-0 rounded-md border bg-background p-2 text-sm";
function DateField({ label, value, onChange, disabled }: { label: string; value: AgriTargetDate; onChange: (value: AgriTargetDate) => void; disabled?: boolean }) {
  const t = useTranslations("product.agriTasks");
  return <div className="space-y-2"><Field label={label}>{id => <select id={id} className={selectClass} value={value.state} disabled={disabled} onChange={e => { const state = e.target.value as AgriTargetDate["state"]; onChange(state === "UNKNOWN" ? { state, at: null } : { state, at: value.at ?? "" }); }}>
    {(["UNKNOWN", "TENTATIVE", "CONFIRMED"] as const).map(state => <option key={state} value={state}>{t("date." + state)}</option>)}
  </select>}</Field>{value.state !== "UNKNOWN" && <Input aria-label={label} type="datetime-local" disabled={disabled} value={beijingInput(value.at)} onChange={e => onChange({ state: value.state as "TENTATIVE" | "CONFIRMED", at: inputInstant(e.target.value) })} />}</div>;
}

export function AgriTimetable() {
  const t = useTranslations("product.agriTasks");
  const locale = useLocale();
  const { data: session, status, update } = useSession();
  const [invalidSession, setInvalidSession] = useState(false);
  const markInvalid = useCallback(() => { clearAgriRecoveries(); setInvalidSession(true); }, []);
  useEffect(() => { if (status === "unauthenticated") clearAgriRecoveries(); }, [status]);
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!session?.user?.id) {
    const guestTasks = [
      {
        stage: "PREPARATION",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 01" : "📖 Sample · Stage 01",
        priority: "HIGH",
        title: locale === "zh" ? "组建 1–5 人跨学科战队 & 锁定三大赛道选题" : "Form 1–5 Member Team & Lock Track Topic",
        criteria: locale === "zh" ? "在战队大厅完成队长建队，绑定 GitHub 仓库或本地源码包，申领最高 750 点团队专属算力包（150 点/人）。" : "Create a team, bind your GitHub repo, and claim up to 750 team compute points (150 pts/member).",
        reward: "+150 点 / 人",
      },
      {
        stage: "PRELIMINARY",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 02" : "📖 Sample · Stage 02",
        priority: "HIGH",
        title: locale === "zh" ? "农业 AI 核心算法 / 硬件原型与数据集验证" : "Agri-AI Core Model / Hardware Prototype Validation",
        criteria: locale === "zh" ? "基于 DeepSeek / Qwen2.5-VL 或边缘端 YOLO 完成病虫害识别、智慧灌溉或表型分析全流程验证。" : "Complete crop disease, smart irrigation, or phenotyping validation with LLM/VLM.",
        reward: "AI 算力直连",
      },
      {
        stage: "PRELIMINARY",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 03" : "📖 Sample · Stage 03",
        priority: "HIGH",
        title: locale === "zh" ? "提交初赛工程包与 SHA-256 密码学哈希存证" : "Submit Preliminary Package & SHA-256 Hash Escrow",
        criteria: locale === "zh" ? "上传 10MB 内源码压缩包、架构说明与可复现实验命令，系统自动生成不可篡改 SHA-256 指纹。" : "Upload source archive and reproducible commands for automatic SHA-256 fingerprinting.",
        reward: "防篡改代码存证",
      },
      {
        stage: "FINAL",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 04" : "📖 Sample · Stage 04",
        priority: "NORMAL",
        title: locale === "zh" ? "评委盲审反馈迭代 & 现场演示环境自检" : "Judge Feedback Iteration & Live Demo Check",
        criteria: locale === "zh" ? "根据五维度评分（问题价值、AI 契合度、创新性、技术实现、完整度）完成演示自检表。" : "Complete live demo checklist across the 5 official judging dimensions.",
        reward: "冲击 ¥3,300 奖池",
      },
      {
        stage: "EVENT_DAY",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 05" : "📖 Sample · Stage 05",
        priority: "HIGH",
        title: locale === "zh" ? "中国农大现场路演答辩与实时人气打榜" : "CAU On-Site Pitch & Live Popularity Voting",
        criteria: locale === "zh" ? "现场 5 分钟真机演示 + 3 分钟评委问答，同步开启全校作品墙星标助威。" : "5-min live hardware/software demo + 3-min Q&A with campus-wide star voting.",
        reward: "校级荣誉证书",
      },
      {
        stage: "ARCHIVE",
        stageLabel: locale === "zh" ? "📖 范例 · Stage 06" : "📖 Sample · Stage 06",
        priority: "NORMAL",
        title: locale === "zh" ? "入选正式展览馆 & 上架工具与工作流市场分成" : "Official Showcase Publication & Market Royalties",
        criteria: locale === "zh" ? "优秀工程可归档至正式展览馆，并封装为标准技能包上架工具与工作流市场获取积分分成。" : "Publish to official showcase and list on the marketplace for ongoing point royalties.",
        reward: "80% 创作者分成",
      },
    ];
    return (
      <div className="space-y-4" data-testid="agri-tasks-guest-preview">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {locale === "zh" ? "农大创客马拉松 · 战队任务看板" : "AgriHackathon · Team Task Board"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {locale === "zh"
                ? "当前未登录 · 登录后可初始化团队专属任务看板、指派队员并关联提交存证。"
                : "Sign in to initialize your interactive team task board, assign members, and link submission records."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link href="/login?callbackUrl=%2Fcompetitions%2Fagrihackathon%2Ftasks">{t("login")}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/competitions/agrihackathon">{locale === "zh" ? "返回赛事主站" : "Back to Hub"}</Link>
            </Button>
          </div>
        </div>
        <details className="group rounded-2xl border border-dashed border-border/80 bg-muted/15 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
            <span>{locale === "zh" ? "📖 查看标准 6 阶段备赛里程碑参考范例" : "📖 View 6-Stage Milestone Reference Template"}</span>
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">▾</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">{locale === "zh" ? "收起 ▴" : "Collapse ▴"}</span>
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guestTasks.map((item, idx) => (
              <Card key={idx} className="border-border/60 bg-card/90 transition hover:border-emerald-500/40 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[11px]">{item.stageLabel}</Badge>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                      {item.reward}
                    </span>
                  </div>
                  <CardTitle className="pt-1.5 text-base leading-snug">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.criteria}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      </div>
    );
  }
  if (invalidSession) return <div className="space-y-3"><p role="alert">{t("errors.ACCOUNT_CHANGED")}</p><Button onClick={() => void update().then(() => setInvalidSession(false)).catch(() => setInvalidSession(true))}>{t("refresh")}</Button></div>;
  return <TaskList key={session.user.id} actorId={session.user.id} onAccountChanged={markInvalid} />;
}
function TaskList({ actorId, onAccountChanged }: { actorId: string; onAccountChanged: () => void }) {
  const t = useTranslations("product.agriTasks"); const locale = useLocale();
  const [data, setData] = useState<AgriTaskList | null>(null);
  const [error, setError] = useState(""); const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<AgriTaskFilters["scope"]>("all");
  const [stageFilter, setStageFilter] = useState<AgriTaskFilters["stage"]>();
  const loadSequence = useRef(0);
  const [selected, setSelected] = useState<AgriTaskDetail | "new" | "resume" | null>(null);
  const [recovery, setRecovery] = useState<AgriTaskRecovery | null>(null);
  const initializing = useRef(false);
  const [pending, setPending] = useState<AgriTaskCommand | null>(null);
  const alive = useRef(true);
  const load = useCallback(async (cursor?: string) => {
    const sequence = ++loadSequence.current;
    const current = () => alive.current && sequence === loadSequence.current;
    setBusy(true); setError("");
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (filter !== "all") query.set("scope", filter);
    if (stageFilter) query.set("stage", stageFilter);
    try { const result = await request<AgriTaskList>(api + (query.size ? "?" + query.toString() : ""), actorId); if (current()) { setData(old => cursor && old ? { ...result, tasks: [...old.tasks, ...result.tasks].filter((task, i, all) => all.findIndex(row => row.id === task.id) === i) } : result); const saved = readAgriRecovery(actorId, result.competitionId); setRecovery(saved?.editor ?? null); setPending(saved?.initialization ?? null); } }
    catch (e) { if (!current()) return; if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; } setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR"); }
    finally { if (current()) setBusy(false); }
  }, [actorId, onAccountChanged, filter, stageFilter]);
  useEffect(() => { alive.current = true; setData(null); void load(); return () => { alive.current = false; }; }, [load]);
  async function initialize() {
    if (initializing.current || !data) return;
    initializing.current = true;
    const wasRetry = !!pending;
    const command = pending ?? { action: "initialize", idempotencyKey: crypto.randomUUID(), locale: locale === "zh" ? "zh" : "en" } as AgriTaskCommand;
    setPending(command); writeAgriRecovery(actorId, data.competitionId, { ...readAgriRecovery(actorId, data.competitionId), initialization: command }); setBusy(true); setError("");
    try { const result = await request<AgriTaskMutation>(api, actorId, command, data.competitionId); if (!alive.current) return; setPending(null); writeAgriRecovery(actorId, data.competitionId, { ...readAgriRecovery(actorId, data.competitionId), initialization: undefined }); setNote(t("initialized", { count: result.createdTaskCount ?? 0 })); await load(); }
    catch (e) { if (!alive.current) return; if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; } if (alive.current) { if (canReleasePending(e, wasRetry)) { setPending(null); writeAgriRecovery(actorId, data.competitionId, { ...readAgriRecovery(actorId, data.competitionId), initialization: undefined }); } setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR"); } }
    finally { initializing.current = false; if (alive.current) setBusy(false); }
  }
  async function open(task: AgriTaskView) {
    setBusy(true); setError("");
    try { const detail = await request<AgriTaskDetail>(api + "/" + encodeURIComponent(task.id), actorId); if (alive.current) setSelected(detail); }
    catch (e) { if (!alive.current) return; if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; } if (alive.current) setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR"); }
    finally { if (alive.current) setBusy(false); }
  }
  if (selected && data) return <TaskEditor actorId={actorId} competitionId={data.competitionId} recovery={selected === "resume" ? recovery : null} onAccountChanged={onAccountChanged} initial={selected === "resume" ? recovery?.detail ?? null : selected === "new" ? null : selected} onClose={() => { writeAgriRecovery(actorId, data.competitionId, { ...readAgriRecovery(actorId, data.competitionId), editor: undefined }); setRecovery(null); setSelected(null); void load(); }} />;
  const tasks = data?.tasks ?? [];
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  return <div className="space-y-5">
    <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-6">{t("privacy")}</p>
    {error && <p role="alert">{message(error)}</p>}{note && <p role="status">{note}</p>}
    {pending && <p role="alert">{t("operationPending")}</p>}
    {recovery && <div className="space-y-2 rounded-xl border p-4"><p role="status">{t("recoveryAvailable")}</p><Button disabled={busy || !!pending} onClick={() => setSelected("resume")}>{t("resumeDraft")}</Button></div>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !!pending || !!recovery || !data} onClick={() => setSelected("new")}>{t("add")}</Button><Button variant="outline" disabled={busy || !data} onClick={initialize}>{pending ? t("retry") : t("initialize")}</Button><Button variant="ghost" disabled={busy} onClick={() => void load()}>{t("refresh")}</Button></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("visibilityField")}>{id => <select id={id} disabled={busy || !!pending} value={filter} className={selectClass} onChange={e => setFilter(e.target.value as AgriTaskFilters["scope"])}>{["all", "mine", "shared"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select>}</Field>
      <Field label={t("stageField")}>{id => <select id={id} disabled={busy || !!pending} value={stageFilter ?? "all"} className={selectClass} onChange={e => setStageFilter(e.target.value === "all" ? undefined : e.target.value as AgriTaskFilters["stage"])}><option value="all">{t("allStages")}</option>{stages.map(stage => <option key={stage} value={stage}>{t("stage." + stage)}</option>)}</select>}</Field>
    </div>
    {busy && <p role="status">{t("loading")}</p>}{data && !tasks.length && <p>{t(filter === "all" && !stageFilter ? "empty" : "filteredEmpty")}</p>}
    <div className="grid gap-4 md:grid-cols-2">{tasks.map(task => <Card key={task.id} className="min-w-0"><CardHeader><div className="flex flex-wrap gap-2"><Badge variant="secondary">{t("stage." + task.stage)}</Badge><Badge variant="outline">{t("status." + task.status)}</Badge>{task.access === "SHARED_READONLY" && <Badge variant="outline">{t("shared")}</Badge>}</div><CardTitle className="break-words text-lg">{task.title}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="break-all text-xs text-muted-foreground">{t("ownerLabel", { id: task.ownerId })}</p><p className="text-sm">{t("dueState." + task.dueState)}{task.due.at ? " · " + time(task.due.at, locale) : ""}</p><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.acceptanceCriteria}</p><Button variant="outline" disabled={busy || !!pending || !!recovery} onClick={() => void open(task)}>{t(task.access === "OWNER" ? "edit" : "inspect")}</Button></CardContent></Card>)}</div>
    {data?.nextCursor && <Button variant="outline" disabled={busy} onClick={() => void load(data.nextCursor ?? undefined)}>{t("more")}</Button>}
  </div>;
}

function TaskEditor({ initial, onClose, actorId, competitionId, recovery, onAccountChanged }: { actorId: string; competitionId: string; recovery: AgriTaskRecovery | null; onAccountChanged: () => void; initial: AgriTaskDetail | null; onClose: () => void }) {
  const t = useTranslations("product.agriTasks"); const locale = useLocale();
  const [detail, setDetail] = useState(recovery?.detail ?? initial);
  const [historyGeneration, setHistoryGeneration] = useState(0);
  const [draft, setDraft] = useState<AgriTaskEditable>(() => recovery?.draft ?? (initial ? agriTaskEditableSchema.parse(Object.fromEntries(Object.keys(freshTask()).map(key => [key, initial.task[key as keyof AgriTaskEditable]]))) : freshTask()));
  const [baseline, setBaseline] = useState(recovery?.baseline ?? JSON.stringify(draft));
  const [pending, setPending] = useState<AgriTaskCommand | null>(recovery?.pending ?? null);
  const pendingRef = useRef(pending); const inFlight = useRef(false);
  const [staleDetail, setStaleDetail] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [note, setNote] = useState(""); const [conflict, setConflict] = useState(recovery?.conflict ?? false);
  const [acknowledged, setAcknowledged] = useState(false); const [recipient, setRecipient] = useState(""); const [expiry, setExpiry] = useState("");
  const readonly = detail?.task.access === "SHARED_READONLY";
  const dirty = JSON.stringify(draft) !== baseline || !!pending;
  const locked = busy || !!pending || conflict || readonly;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    writeAgriRecovery(actorId, competitionId, { ...readAgriRecovery(actorId, competitionId), editor: dirty || conflict ? { detail, draft, baseline, pending, conflict } : undefined });
  }, [actorId, competitionId, dirty, conflict, detail, draft, baseline, pending]);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigate = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const anchor = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm(t("confirmLeave"))) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", leave); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", leave); document.removeEventListener("click", navigate, true); };
  }, [dirty, t]);
  function change<K extends keyof AgriTaskEditable>(key: K, value: AgriTaskEditable[K]) { setDraft(old => ({ ...old, [key]: value })); setAcknowledged(false); }
  const message = (code: string) => code === "VALIDATION" ? t("validation") : t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  async function reload(replace: boolean) {
    if (!detail || inFlight.current || pendingRef.current || (replace && !window.confirm(t("confirmLatest")))) return;
    inFlight.current = true; setBusy(true);
    try { const latest = await request<AgriTaskDetail>(api + "/" + encodeURIComponent(detail.task.id), actorId); if (!alive.current) return; setDetail(latest); setHistoryGeneration(value => value + 1); setStaleDetail(false); if (latest.task.revision !== detail.task.revision && !replace) setConflict(true); if (replace) { const next = agriTaskEditableSchema.parse(Object.fromEntries(Object.keys(freshTask()).map(key => [key, latest.task[key as keyof AgriTaskEditable]]))); setDraft(next); setBaseline(JSON.stringify(next)); setConflict(false); pendingRef.current = null; setPending(null); setAcknowledged(false); setError(""); } }
    catch (e) { if (!alive.current) return; if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; } if (alive.current) setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR"); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  async function mutate(command: AgriTaskCommand) {
    if (inFlight.current || readonly || (pendingRef.current && JSON.stringify(command) !== JSON.stringify(pendingRef.current))) return;
    const wasRetry = !!pendingRef.current;
    const parsed = agriTaskCommandSchema.safeParse(command);
    if (!parsed.success) { setError("VALIDATION"); return; }
    inFlight.current = true; pendingRef.current = parsed.data;
    writeAgriRecovery(actorId, competitionId, { ...readAgriRecovery(actorId, competitionId), editor: { detail, draft, baseline, pending: parsed.data, conflict } });
    setPending(parsed.data); setBusy(true); setError(""); setNote("");
    try {
      const result = await request<AgriTaskMutation>(api, actorId, parsed.data, competitionId); if (!alive.current) return;
      if (!result.task) throw new TaskRequestError("INTERNAL_ERROR", true);
      pendingRef.current = null; setPending(null);
      const changedLater = result.appliedRevision !== result.task.revision;
      if (changedLater) { setConflict(true); setNote(t("recoveredLater")); }
      else {
        if (command.action === "create" || command.action === "update") { const next = command.task; setDraft(next); setBaseline(JSON.stringify(next)); setAcknowledged(false); }
        setNote(t(command.action === "share" || command.action === "revokeShare" ? "shareSaved" : "saved"));
      }
      setStaleDetail(false);
      setDetail(old => ({ task: result.task!, history: old?.history ?? [], shares: old?.shares ?? [], historyTruncated: old?.historyTruncated ?? false, historyNextBeforeRevision: old?.historyNextBeforeRevision, references: old?.references ?? [] }));
      setHistoryGeneration(value => value + 1);
      // A confirmed write remains confirmed even if the follow-up read fails.
      try { const latest = await request<AgriTaskDetail>(api + "/" + encodeURIComponent(result.task.id), actorId); if (alive.current) { setDetail(latest); setHistoryGeneration(value => value + 1); if (latest.task.revision !== result.appliedRevision) { setConflict(true); setNote(t("recoveredLater")); } } } catch (e) { if (!alive.current) return; if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) onAccountChanged(); else if (alive.current) setStaleDetail(true); /* Confirmed write is retained. */ }
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; }
      if (canReleasePending(e, wasRetry)) { pendingRef.current = null; setPending(null); }
      if (e instanceof TaskRequestError && e.code === "AGRI_REVISION_CONFLICT") setConflict(true);
      setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR");
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  async function save() {
    if (inFlight.current || pendingRef.current || readonly || conflict) return;
    if (draft.status === "DONE" && !acknowledged) { setError("VALIDATION"); return; }
    const task = agriTaskEditableSchema.safeParse(draft); if (!task.success) { setError("VALIDATION"); return; }
    await mutate(detail ? { action: "update", taskId: detail.task.id, expectedRevision: detail.task.revision, task: task.data, idempotencyKey: crypto.randomUUID() } : { action: "create", task: task.data, idempotencyKey: crypto.randomUUID() });
  }

  return <div className="space-y-6">
    <Button variant="ghost" disabled={busy || !!pending} onClick={() => { if (!dirty || window.confirm(t("confirmLeave"))) onClose(); }}>{t("close")}</Button>
    {detail && <p className="break-all text-sm">{t("ownerLabel", { id: detail.task.ownerId })}</p>}{readonly && <p role="status">{t("readonly")}</p>}{error && <p role="alert">{message(error)}</p>}{note && <p role="status">{note}</p>}
    {staleDetail && <p role="alert">{t("detailStale")}</p>}
    {detail && <Button variant="outline" disabled={busy || !!pending} onClick={() => void reload(false)}>{t("refreshDetail")}</Button>}
    {pending && <div className="space-y-2 rounded-xl border p-4"><p role="alert">{t("pending")}</p><Button disabled={busy} onClick={() => void mutate(pending)}>{t("retry")}</Button></div>}
    {conflict && <div className="space-y-2 rounded-xl border p-4"><p role="alert">{t("conflict")}</p><Button disabled={busy || !!pending} onClick={() => void reload(true)}>{t("latest")}</Button></div>}
    <p className="text-sm text-muted-foreground">{t("timezone")}</p>
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-5">
      <fieldset disabled={!!locked} className="min-w-0 space-y-5">
        <Field label={t("titleField")}>{id => <Input id={id} maxLength={160} value={draft.title} onChange={e => change("title", e.target.value)} />}</Field>
        <div className="grid gap-4 sm:grid-cols-3"><Field label={t("stageField")}>{id => <select id={id} className={selectClass} value={draft.stage} onChange={e => change("stage", e.target.value as AgriTaskEditable["stage"])}>{stages.map(stage => <option key={stage} value={stage}>{t("stage." + stage)}</option>)}</select>}</Field>
          <Field label={t("statusField")}>{id => <select id={id} className={selectClass} value={draft.status} onChange={e => { const status = e.target.value as AgriTaskEditable["status"]; setDraft(old => ({ ...old, status, completionResult: status === "DONE" ? old.completionResult ?? "" : null, blockingInput: status === "DONE" ? null : status === "BLOCKED" ? old.blockingInput ?? { from: "", needed: "", latestAt: { state: "UNKNOWN", at: null } } : old.blockingInput })); setAcknowledged(false); }}>{statuses.map(status => <option key={status} value={status}>{t("status." + status)}</option>)}</select>}</Field>
          <Field label={t("priorityField")}>{id => <select id={id} className={selectClass} value={draft.priority} onChange={e => change("priority", e.target.value as AgriTaskEditable["priority"])}>{priorities.map(priority => <option key={priority} value={priority}>{t("priority." + priority)}</option>)}</select>}</Field></div>
        <DateField label={t("due")} value={draft.due} onChange={value => change("due", value)} />
        <Field label={t("acceptance")}>{id => <Textarea id={id} maxLength={2000} value={draft.acceptanceCriteria} onChange={e => change("acceptanceCriteria", e.target.value)} />}</Field>
        <Field label={t("collaboration")}>{id => <Textarea id={id} maxLength={2000} value={draft.collaborationNotes} onChange={e => change("collaborationNotes", e.target.value)} />}</Field>
        <section className="space-y-3"><h2 className="font-semibold">{t("inputs")}</h2>{draft.inputRequirements.items.map((input, index) => {
          const update = (next: typeof input) => change("inputRequirements", { schemaVersion: 1, items: draft.inputRequirements.items.map((value, i) => i === index ? next : value) });
          return <div key={index} className="space-y-3 rounded-xl border p-4"><Field label={t("inputFrom")}>{id => <Input id={id} maxLength={160} value={input.from} onChange={e => update({ ...input, from: e.target.value })} />}</Field><Field label={t("inputNeeded")}>{id => <Textarea id={id} maxLength={2000} value={input.needed} onChange={e => update({ ...input, needed: e.target.value })} />}</Field><DateField label={t("latestAt")} value={input.latestAt} onChange={latestAt => update({ ...input, latestAt })} /><Button type="button" variant="ghost" onClick={() => change("inputRequirements", { schemaVersion: 1, items: draft.inputRequirements.items.filter((_, i) => i !== index) })}>{t("removeInput")}</Button></div>;
        })}<Button type="button" variant="outline" disabled={draft.inputRequirements.items.length >= 20} onClick={() => change("inputRequirements", { schemaVersion: 1, items: [...draft.inputRequirements.items, { from: "", needed: "", latestAt: { state: "UNKNOWN", at: null } }] })}>{t("addInput")}</Button></section>
        {draft.blockingInput && <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">{t("block")}</h2><Field label={t("inputFrom")}>{id => <Input id={id} maxLength={160} value={draft.blockingInput!.from} onChange={e => change("blockingInput", { ...draft.blockingInput!, from: e.target.value })} />}</Field><Field label={t("inputNeeded")}>{id => <Textarea id={id} maxLength={2000} value={draft.blockingInput!.needed} onChange={e => change("blockingInput", { ...draft.blockingInput!, needed: e.target.value })} />}</Field><DateField label={t("latestAt")} value={draft.blockingInput.latestAt} onChange={latestAt => change("blockingInput", { ...draft.blockingInput!, latestAt })} />{draft.status !== "BLOCKED" && <Button type="button" variant="ghost" onClick={() => change("blockingInput", null)}>{t("removeInput")}</Button>}</section>}
        {draft.status === "DONE" && <section className="space-y-3"><Field label={t("complete")}>{id => <Textarea id={id} maxLength={2000} value={draft.completionResult ?? ""} onChange={e => change("completionResult", e.target.value)} />}</Field><p className="text-sm">{t("completeHint")}</p><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />{t("acknowledge")}</label></section>}
      </fieldset>{!readonly && <Button type="submit" disabled={!!locked}>{t("save")}</Button>}
    </form>
    {detail && !staleDetail && <AgriTaskReferences actorId={actorId} taskId={detail.task.id} revision={detail.task.revision} references={detail.references ?? []} locked={!!locked || dirty} readonly={!!readonly} mutate={mutate} invalidate={onAccountChanged} />}
    {detail && <p className="text-sm text-muted-foreground">{t("created")}: {time(detail.task.createdAt, locale)} · {t("updated")}: {time(detail.task.updatedAt, locale)}{detail.task.completedAt ? " · " + t("completedAt") + ": " + time(detail.task.completedAt, locale) : ""}</p>}
    {detail && !readonly && <section className="space-y-4 rounded-xl border p-4"><h2 className="font-semibold">{t("share")}</h2><p className="text-sm">{t("privacy")}</p><fieldset disabled={!!locked || dirty} className="min-w-0 space-y-3"><Field label={t("recipient")}>{id => <Input id={id} maxLength={80} value={recipient} onChange={e => setRecipient(e.target.value)} />}</Field><p className="text-sm text-muted-foreground">{t("recipientHint")}</p><Field label={t("expiry")}>{id => <Input id={id} type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} />}</Field><Button onClick={() => void mutate({ action: "share", taskId: detail.task.id, expectedRevision: detail.task.revision, recipientId: recipient.trim(), expiresAt: expiry ? inputInstant(expiry) : null, idempotencyKey: crypto.randomUUID() })}>{t("grant")}</Button></fieldset>
      {!detail.shares.length && <p className="text-sm">{t("noShares")}</p>}{detail.shares.map(share => <div key={share.userId} className="flex flex-wrap items-center justify-between gap-2"><span className="break-all text-sm">{share.userId}{share.expiresAt ? " · " + time(share.expiresAt, locale) : ""}</span><Button variant="outline" disabled={!!locked || dirty} onClick={() => void mutate({ action: "revokeShare", taskId: detail.task.id, expectedRevision: detail.task.revision, recipientId: share.userId, idempotencyKey: crypto.randomUUID() })}>{t("revoke")}</Button></div>)}
    </section>}
    {detail && !readonly && <TaskHistory key={JSON.stringify([actorId, competitionId, detail.task.id, historyGeneration])} detail={detail} actorId={actorId} competitionId={competitionId} disabled={busy || !!pending || staleDetail} onAccountChanged={onAccountChanged} />}
  </div>;
}

// The history window owns its reads only: pagination never replaces an unsaved
// draft, its CAS revision, pending receipt or completion acknowledgement.
function TaskHistory({ detail, actorId, competitionId, disabled, onAccountChanged }: { detail: AgriTaskDetail; actorId: string; competitionId: string; disabled: boolean; onAccountChanged: () => void }) {
  const t = useTranslations("product.agriTasks"); const locale = useLocale();
  const [history, setHistory] = useState(detail.history);
  const [cursor, setCursor] = useState(detail.historyNextBeforeRevision ?? (detail.historyTruncated ? detail.history.at(-1)?.revision ?? null : null));
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const alive = useRef(true); const inFlight = useRef(false); const retryBefore = useRef<number | undefined>(undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function load(beforeRevision?: number) {
    if (disabled || inFlight.current) return;
    inFlight.current = true; retryBefore.current = beforeRevision; setBusy(true); setError("");
    try {
      const raw = await request<unknown>(api + "/" + encodeURIComponent(detail.task.id) + "/history" + (beforeRevision === undefined ? "" : "?beforeRevision=" + beforeRevision), actorId);
      if (!alive.current) return;
      const parsed = agriTaskHistoryPageSchema.safeParse(raw);
      if (!parsed.success) throw new TaskRequestError("INTERNAL_ERROR");
      const page: AgriTaskHistoryPage = parsed.data;
      if (page.ownerId !== actorId || page.taskId !== detail.task.id || page.competitionId !== competitionId
        || (beforeRevision !== undefined && page.history.some(event => event.revision >= beforeRevision))) throw new TaskRequestError("INTERNAL_ERROR");
      setHistory(old => beforeRevision === undefined ? page.history : [...old, ...page.history].filter((event, index, all) => all.findIndex(other => other.revision === event.revision) === index));
      setCursor(page.nextBeforeRevision);
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof TaskRequestError && ["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"].includes(e.code)) { onAccountChanged(); return; }
      if (e instanceof TaskRequestError && e.code === "NOT_FOUND") { setHistory([]); setCursor(null); }
      setError(e instanceof TaskRequestError ? e.code : "INTERNAL_ERROR");
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="space-y-3" aria-busy={busy}>
    <h2 className="font-semibold">{t("history")}</h2><p className="text-sm text-muted-foreground">{t("historyNote")}</p>
    <Button variant="ghost" disabled={disabled || busy} onClick={() => void load()}>{t("refreshHistory")}</Button>
    {history.map(event => <details key={event.revision} className="rounded-xl border p-3"><summary className="cursor-pointer text-sm">{t("version", { revision: event.revision })} · {t("actions." + event.action)} · {time(event.createdAt, locale)}</summary><div className="mt-3 space-y-2 whitespace-pre-wrap break-words text-sm"><p>{event.task.title}</p><p>{t("status." + event.task.status)} · {t("date." + event.task.due.state)}{event.task.due.at ? " · " + time(event.task.due.at, locale) : ""}</p><p>{event.task.acceptanceCriteria}</p><p>{event.task.collaborationNotes}</p>{event.task.inputRequirements.items.map((item, i) => <p key={i}>{item.from}: {item.needed}{item.latestAt.at ? " · " + time(item.latestAt.at, locale) : ""}</p>)}{event.task.blockingInput && <p>{t("block")}: {event.task.blockingInput.from}: {event.task.blockingInput.needed}</p>}{event.task.completionResult && <p>{t("outcome")}: {event.task.completionResult}</p>}{event.shareChange && <p>{event.shareChange.recipientId + " · " + (event.shareChange.expiresAt ? time(event.shareChange.expiresAt, locale) : t("date.UNKNOWN"))}</p>}{event.referenceChange && <p>{t("references.history." + event.referenceChange.action)}</p>}</div></details>)}
    {error && <p role="alert">{error !== "NOT_FOUND" && t("historyLoadError")} {t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p>}
    {busy && <p role="status">{t("historyLoading")}</p>}
    {error && error !== "NOT_FOUND" ? <Button variant="outline" disabled={disabled || busy} onClick={() => void load(retryBefore.current)}>{t("retry")}</Button> : cursor !== null && <Button variant="outline" disabled={disabled || busy} onClick={() => void load(cursor)}>{t("moreHistory")}</Button>}
  </section>;
}
