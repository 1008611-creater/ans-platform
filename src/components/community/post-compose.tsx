"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitFork, ImagePlus, Minus, Plus, Repeat2, X } from "lucide-react";
import { toast } from "sonner";
import {
  COMMUNITY_BOARDS,
  COMMUNITY_STALL_KINDS,
  POST_BODY_MAX,
  POST_IMAGE_MAX,
  POST_TITLE_MAX,
  STALL_MAX_DAYS,
  TEAM_ROLE_MAX,
  TEAM_ROLE_SLOTS_MAX,
  TEXT_POST_MAX,
  type CommunityBoardId,
  type CommunityPostKindId,
  type CommunityStallKindId,
  type CommunityTeamRole,
} from "@/contracts/community-posts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCommunityRequest } from "./use-community-request";
import { clearDraft, loadDraft, loginHref, saveDraft } from "./draft";
import { imeBlocks, imeSubmitGuard } from "@/lib/ui/ime-enter-guard";

const BOARD_CHANNEL: Record<CommunityBoardId, string> = { TEAM: "team", CAREER: "career", RESEARCH: "research", AIGC: "aigc", CAMPUS: "campus" };
const FIELD = "h-10 w-full rounded-lg bg-card px-3 text-sm outline-none shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-shadow focus-visible:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)]";
const LABEL = "text-sm font-semibold";

function dayInput(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
}

/** 「接一下」时要接的原帖：板块跟着原帖走，只能发笔记或一句话。 */
export type RelayTarget = { id: string; label: string; authorName: string; board: CommunityBoardId; count: number; cover: string | null };
/** 「附项目」选中的项目广场项目。 */
export type RemixPick = { slug: string; title: string };

/**
 * 发帖和「接一下」的弹窗。
 * 游客也能打开、先写；点发出时把草稿存在本机，去登录，登录完回到 `returnTo`（带着打开弹窗的参数），字还在。
 */
export function PostCompose({ teams, competitions, defaultBoard, relay, project: initialProject, defaultOpen = false, triggerClassName, guest = false, returnTo }: { teams: Array<{ id: string; name: string }>; competitions: Array<{ id: string; title: string }>; defaultBoard?: CommunityBoardId; relay?: RelayTarget; project?: RemixPick; defaultOpen?: boolean; triggerClassName?: string; guest?: boolean; returnTo?: string }) {
  const t = useTranslations("product.communityPost.compose");
  const r = useTranslations("product.communityPost.relay");
  const page = useTranslations("product.communityPage");
  const router = useRouter();
  const { send, pending } = useCommunityRequest();
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [kind, setKind] = useState<CommunityPostKindId>(relay || initialProject ? "NOTE" : "STALL");
  const [stall, setStall] = useState<CommunityStallKindId>("SEEK");
  const [board, setBoard] = useState<CommunityBoardId>(relay?.board ?? defaultBoard ?? "CAMPUS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [roles, setRoles] = useState<CommunityTeamRole[]>([]);
  const [roleDraft, setRoleDraft] = useState("");
  const [deadline, setDeadline] = useState(dayInput(14));
  const [project, setProject] = useState<RemixPick | null>(initialProject ?? null);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectResults, setProjectResults] = useState<RemixPick[] | null>(null);
  // 发出后到新帖子页面之前，按钮保持不可点，弹窗不再接受修改。
  const [leaving, setLeaving] = useState(false);
  const draftKey = relay ? `relay:${relay.id}` : "post";

  // 登录回来自动打开弹窗时，把登录前写的字放回去。
  useEffect(() => {
    if (!defaultOpen || guest) return;
    const draft = loadDraft(draftKey);
    if (!draft) return;
    if (draft.kind === "NOTE" || draft.kind === "TEXT" || (draft.kind === "STALL" && !relay)) setKind(draft.kind);
    if (draft.stall && (COMMUNITY_STALL_KINDS as readonly string[]).includes(draft.stall)) setStall(draft.stall as CommunityStallKindId);
    if (!relay && draft.board && (COMMUNITY_BOARDS as readonly string[]).includes(draft.board)) setBoard(draft.board as CommunityBoardId);
    if (draft.title) setTitle(draft.title);
    if (draft.body) setBody(draft.body);
  }, [defaultOpen, guest, draftKey, relay]);

  useEffect(() => {
    if (!open || kind !== "NOTE") return;
    let alive = true;
    fetch("/api/config/storage").then((res) => res.json()).then((data: { supportsUpload?: boolean }) => { if (alive) setCanUpload(Boolean(data.supportsUpload)); }).catch(() => {});
    return () => { alive = false; };
  }, [open, kind]);

  // 搜项目：停手 250ms 再查，只在笔记、还没选项目时查。
  useEffect(() => {
    const query = projectQuery.trim();
    if (!open || kind !== "NOTE" || project || !query) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/community/projects?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.ok ? res.json() : { projects: [] })
        .then((data: { projects?: RemixPick[] }) => setProjectResults(data.projects ?? []))
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, kind, project, projectQuery]);

  const pickStall = (next: CommunityStallKindId) => {
    setStall(next);
    if (next === "TEAM") setBoard("TEAM");
  };

  const addRole = () => {
    const name = roleDraft.trim().slice(0, 20);
    if (!name || roles.length >= TEAM_ROLE_MAX || roles.some((role) => role.name === name)) return;
    setRoles([...roles, { name, slots: 1 }]);
    setRoleDraft("");
  };
  const changeSlots = (name: string, delta: number) => setRoles(roles.map((role) => role.name === name ? { ...role, slots: Math.min(TEAM_ROLE_SLOTS_MAX, Math.max(1, role.slots + delta)) } : role));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as { url?: string };
      if (!response.ok || !data.url?.startsWith("https://")) throw new Error("UPLOAD");
      setImages((current) => [...current, data.url!].slice(0, POST_IMAGE_MAX));
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const isTeam = kind === "STALL" && stall === "TEAM";
  const bodyMax = kind === "TEXT" ? TEXT_POST_MAX : POST_BODY_MAX;
  const ready = kind === "TEXT" ? body.trim().length >= 2
    : kind === "NOTE" ? title.trim().length >= 2 && body.trim().length >= 2
      : title.trim().length >= 4 && Boolean(deadline) && (!isTeam || (Boolean(teamId) && roles.length > 0));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || pending || leaving) return;
    if (guest) {
      saveDraft(draftKey, { kind, stall, board, title, body });
      setLeaving(true);
      window.location.assign(loginHref(returnTo ?? "/community"));
      return;
    }
    const relayOfId = relay?.id;
    const payload = kind === "TEXT" ? { kind, board, body, relayOfId }
      : kind === "NOTE" ? { kind, board, title, body, images, relayOfId, catalogSlug: project?.slug }
        : {
          kind, stall, board, title, body,
          // 截止日当天结束前都算有效。
          expiresAt: new Date(`${deadline}T23:59:59+08:00`).toISOString(),
          competitionId: competitionId || undefined,
          teamId: isTeam ? teamId : undefined,
          roles: isTeam ? roles : undefined,
        };
    // 不先刷新当前页：刷新和跳转抢在一起时，跳转会被吞掉，弹窗就停在「发布中…」。
    const result = await send<{ id: string }>("/api/community/posts", payload, { refresh: false });
    if (!result) return;
    clearDraft(draftKey);
    setLeaving(true);
    toast.success(relay ? r("success") : t("success"));
    setOpen(false);
    setTitle(""); setBody(""); setImages([]); setRoles([]); setProject(null); setProjectQuery("");
    // 接一下发出后回到原帖的接力串，马上能看到自己；新帖去新帖页面。
    router.push(relay ? `/community/posts/${relay.id}?relayed=${result.id}#relays` : `/community/posts/${result.id}`);
  };

  const segment = (active: boolean) => `h-9 flex-1 rounded-md text-sm transition-colors ${active ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
  const pill = (active: boolean) => `h-9 rounded-full border px-4 text-sm transition-colors ${active ? "border-foreground bg-foreground font-semibold text-background" : "bg-background hover:bg-muted"}`;

  const kinds = relay ? (["NOTE", "TEXT"] as const) : (["NOTE", "TEXT", "STALL"] as const);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{relay
      ? <Button className={triggerClassName}><Repeat2 className="h-4 w-4" aria-hidden="true" />{r("open")}</Button>
      : <Button size="sm" className={triggerClassName}><Plus className="h-4 w-4" aria-hidden="true" />{t("open")}</Button>}</DialogTrigger>
    {/* 弹窗里有表单，点遮罩不关，免得写了一半的内容丢掉；Esc 和取消按钮照常关闭。 */}
    <DialogContent onInteractOutside={(event) => event.preventDefault()} className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
      <form onSubmit={submit} className="flex flex-col">
        <div className="px-5 pb-1 pt-5"><DialogTitle className="text-lg font-bold">{relay ? r("dialogTitle") : t("title")}</DialogTitle></div>
        <div className="flex flex-col gap-4 px-5 py-4">
          {relay && <div className="flex items-center gap-2.5 rounded-xl bg-muted p-2.5">
            {relay.cover
              ? <img src={relay.cover} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              : <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-background"><Repeat2 className="h-5 w-5 text-muted-foreground" /></span>}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground ans-num">{r("from", { name: relay.authorName, count: relay.count })}</span>
              <span className="truncate text-sm font-semibold">{relay.label}</span>
            </div>
          </div>}
          <div role="group" aria-label={relay ? r("kindLabel") : t("kindLabel")} className="flex gap-0.5 rounded-lg bg-muted p-1">
            {kinds.map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={segment(kind === value)}>{t(`kinds.${value}`)}</button>)}
          </div>

          {kind === "STALL" && <div role="group" aria-label={t("stallLabel")} className="flex flex-wrap gap-2">
            {COMMUNITY_STALL_KINDS.map((value) => <button key={value} type="button" aria-pressed={stall === value} onClick={() => pickStall(value)} className={pill(stall === value)}>{page(`stall.${value}`)}</button>)}
          </div>}

          {!relay && <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-board`} className={LABEL}>{t("board")}</label>
            <select id={`${id}-board`} value={board} onChange={(event) => setBoard(event.target.value as CommunityBoardId)} className={FIELD}>
              {COMMUNITY_BOARDS.map((value) => <option key={value} value={value}>{page(`channels.${BOARD_CHANNEL[value]}`)}</option>)}
            </select>
          </div>}

          {kind !== "TEXT" && <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-title`} className={LABEL}>{kind === "NOTE" ? t("noteTitle") : t("stallTitle")}</label>
            <input onKeyDown={imeSubmitGuard} id={`${id}-title`} value={title} maxLength={POST_TITLE_MAX} onChange={(event) => setTitle(event.target.value)} className={FIELD} />
          </div>}

          {isTeam && <>
            {teams.length === 0
              ? <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">{t("teamNone")} <Link href="/teams" className="font-semibold underline underline-offset-2">{t("createTeam")}</Link></p>
              : <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-competition`} className={LABEL}>{t("competition")}</label>
                  <select id={`${id}-competition`} value={competitionId} onChange={(event) => setCompetitionId(event.target.value)} className={FIELD}>
                    <option value="">{t("competitionNone")}</option>
                    {competitions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-team`} className={LABEL}>{t("team")}</label>
                  <select id={`${id}-team`} value={teamId} onChange={(event) => setTeamId(event.target.value)} className={FIELD}>
                    {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              </div>}
            <fieldset className="flex flex-col gap-2">
              <legend className={`${LABEL} mb-1.5`}>{t("roles")}</legend>
              {roles.map((role) => <div key={role.name} className="flex items-center gap-2 rounded-lg border py-1.5 pl-3 pr-1.5">
                <span className="flex-1 text-sm">{role.name}</span>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={t("fewer", { name: role.name })} onClick={() => changeSlots(role.name, -1)}><Minus className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                <span className="w-5 text-center text-sm font-semibold">{role.slots}</span>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={t("more", { name: role.name })} onClick={() => changeSlots(role.name, 1)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t("removeRole", { name: role.name })} onClick={() => setRoles(roles.filter((item) => item.name !== role.name))}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>)}
              {roles.length < TEAM_ROLE_MAX && <div className="flex gap-2">
                <label htmlFor={`${id}-role`} className="sr-only">{t("roleName")}</label>
                <input id={`${id}-role`} value={roleDraft} maxLength={20} placeholder={t("roleName")} onChange={(event) => setRoleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!imeBlocks(event)) addRole(); } }} className={FIELD} />
                <Button type="button" variant="outline" onClick={addRole} disabled={!roleDraft.trim()}><Plus className="h-4 w-4" aria-hidden="true" />{t("addRole")}</Button>
              </div>}
            </fieldset>
          </>}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${id}-body`} className={LABEL}>{kind === "TEXT" ? t("textBody") : kind === "NOTE" ? t("body") : t("stallBody")}</label>
              {kind === "TEXT" && <span className="text-xs text-muted-foreground">{t("counter", { count: body.length, max: TEXT_POST_MAX })}</span>}
            </div>
            <textarea id={`${id}-body`} value={body} maxLength={bodyMax} rows={kind === "TEXT" ? 3 : 5} onChange={(event) => setBody(event.target.value)} className="w-full resize-none rounded-lg bg-card px-3 py-2.5 text-sm leading-relaxed outline-none shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-shadow focus-visible:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)]" />
          </div>

          {kind === "NOTE" && canUpload && <div className="flex flex-col gap-1.5">
            <span className={LABEL}>{t("images")}</span>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                <button type="button" aria-label={t("removeImage")} onClick={() => setImages(images.filter((item) => item !== url))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </div>)}
              {images.length < POST_IMAGE_MAX && <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted">
                <span className="sr-only">{uploading ? t("uploading") : t("addImage")}</span>
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
              </label>}
            </div>
          </div>}

          {kind === "NOTE" && <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-project`} className={LABEL}>{t("project")}</label>
            {project
              ? <div className="flex items-center gap-2 rounded-lg bg-muted py-1 pl-3 pr-1">
                <GitFork className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span id={`${id}-project`} className="min-w-0 flex-1 truncate text-sm font-semibold">{project.title}</span>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t("removeProject")} onClick={() => { setProject(null); setProjectQuery(""); }}><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
              : <>
                <input id={`${id}-project`} type="search" value={projectQuery} maxLength={40} placeholder={t("projectSearch")} onKeyDown={imeSubmitGuard} onChange={(event) => setProjectQuery(event.target.value)} className={FIELD} />
                {projectQuery.trim() && projectResults && (projectResults.length > 0
                  ? <ul className="flex flex-wrap gap-1.5">{projectResults.map((item) => <li key={item.slug}>
                    <button type="button" onClick={() => setProject(item)} className="h-8 max-w-full truncate rounded-full bg-muted px-3 text-sm transition-colors hover:bg-surface-raised">{item.title}</button>
                  </li>)}</ul>
                  : <p className="text-xs text-muted-foreground">{t("projectEmpty")}</p>)}
              </>}
          </div>}

          {kind === "STALL" && <div className="flex max-w-56 flex-col gap-1.5">
            <label htmlFor={`${id}-deadline`} className={LABEL}>{t("deadline")}</label>
            <input id={`${id}-deadline`} type="date" value={deadline} min={dayInput(0)} max={dayInput(STALL_MAX_DAYS - 1)} onChange={(event) => setDeadline(event.target.value)} className={FIELD} />
          </div>}

          {relay && <p className="text-xs text-muted-foreground text-pretty">{r("boardNote", { board: page(`channels.${BOARD_CHANNEL[relay.board]}`) })}</p>}
        </div>
        <DialogFooter className="border-t px-5 py-3.5">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button type="submit" disabled={!ready || pending || uploading || leaving}>{pending || leaving ? t("submitting") : guest ? t("loginToSubmit") : relay ? r("submit") : t("submit")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
