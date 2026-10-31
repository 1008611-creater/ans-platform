"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, Minus, Plus, X } from "lucide-react";
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
import { imeBlocks, imeSubmitGuard } from "@/lib/ui/ime-enter-guard";

const BOARD_CHANNEL: Record<CommunityBoardId, string> = { TEAM: "team", CAREER: "career", RESEARCH: "research", AIGC: "aigc", CAMPUS: "campus" };
const FIELD = "h-10 w-full rounded-lg bg-card px-3 text-sm outline-none shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-shadow focus-visible:shadow-[inset_0_0_0_0.5px_var(--hairline),var(--focus-ring)]";
const LABEL = "text-sm font-semibold";

function dayInput(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
}

export function PostCompose({ teams, competitions, defaultBoard }: { teams: Array<{ id: string; name: string }>; competitions: Array<{ id: string; title: string }>; defaultBoard?: CommunityBoardId }) {
  const t = useTranslations("product.communityPost.compose");
  const page = useTranslations("product.communityPage");
  const router = useRouter();
  const { send, pending } = useCommunityRequest();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CommunityPostKindId>("STALL");
  const [stall, setStall] = useState<CommunityStallKindId>("SEEK");
  const [board, setBoard] = useState<CommunityBoardId>(defaultBoard ?? "CAMPUS");
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

  useEffect(() => {
    if (!open || kind !== "NOTE") return;
    let alive = true;
    fetch("/api/config/storage").then((res) => res.json()).then((data: { supportsUpload?: boolean }) => { if (alive) setCanUpload(Boolean(data.supportsUpload)); }).catch(() => {});
    return () => { alive = false; };
  }, [open, kind]);

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
    if (!ready || pending) return;
    const payload = kind === "TEXT" ? { kind, board, body }
      : kind === "NOTE" ? { kind, board, title, body, images }
        : {
          kind, stall, board, title, body,
          // 截止日当天结束前都算有效。
          expiresAt: new Date(`${deadline}T23:59:59+08:00`).toISOString(),
          competitionId: competitionId || undefined,
          teamId: isTeam ? teamId : undefined,
          roles: isTeam ? roles : undefined,
        };
    const result = await send<{ id: string }>("/api/community/posts", payload);
    if (!result) return;
    toast.success(t("success"));
    setOpen(false);
    setTitle(""); setBody(""); setImages([]); setRoles([]);
    router.push(`/community/posts/${result.id}`);
  };

  const segment = (active: boolean) => `h-9 flex-1 rounded-md text-sm transition-colors ${active ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`;
  const pill = (active: boolean) => `h-9 rounded-full border px-4 text-sm transition-colors ${active ? "border-foreground bg-foreground font-semibold text-background" : "bg-background hover:bg-muted"}`;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" aria-hidden="true" />{t("open")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
      <form onSubmit={submit} className="flex flex-col">
        <div className="px-5 pb-1 pt-5"><DialogTitle className="text-lg font-bold">{t("title")}</DialogTitle></div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <div role="group" aria-label={t("kindLabel")} className="flex gap-0.5 rounded-lg bg-muted p-1">
            {(["NOTE", "TEXT", "STALL"] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={segment(kind === value)}>{t(`kinds.${value}`)}</button>)}
          </div>

          {kind === "STALL" && <div role="group" aria-label={t("stallLabel")} className="flex flex-wrap gap-2">
            {COMMUNITY_STALL_KINDS.map((value) => <button key={value} type="button" aria-pressed={stall === value} onClick={() => pickStall(value)} className={pill(stall === value)}>{page(`stall.${value}`)}</button>)}
          </div>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-board`} className={LABEL}>{t("board")}</label>
            <select id={`${id}-board`} value={board} onChange={(event) => setBoard(event.target.value as CommunityBoardId)} className={FIELD}>
              {COMMUNITY_BOARDS.map((value) => <option key={value} value={value}>{page(`channels.${BOARD_CHANNEL[value]}`)}</option>)}
            </select>
          </div>

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

          {kind === "STALL" && <div className="flex max-w-56 flex-col gap-1.5">
            <label htmlFor={`${id}-deadline`} className={LABEL}>{t("deadline")}</label>
            <input id={`${id}-deadline`} type="date" value={deadline} min={dayInput(0)} max={dayInput(STALL_MAX_DAYS - 1)} onChange={(event) => setDeadline(event.target.value)} className={FIELD} />
          </div>}
        </div>
        <DialogFooter className="border-t px-5 py-3.5">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button type="submit" disabled={!ready || pending || uploading}>{pending ? t("submitting") : t("submit")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
