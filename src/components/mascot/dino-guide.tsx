"use client";

import { DinoAvatar } from "./dino-avatar";
import { WorkspaceLink as Link } from "@/components/providers/workspace-navigation";
import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useDinoTask } from "./dino-task-context";

export function DinoGuide() {
  const t = useTranslations("product.mascot");
  const [open, setOpen] = useState(false);
  const task = useDinoTask();
  const focusTarget = useRef<string | null>(null);
  const titleId = useId();
  return <div className="ans-dino-guide" data-task-state={task?.phase ?? "idle"}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" aria-label={t(open ? "close" : task ? "taskOpen" : "open")} className="ans-dino-trigger"><DinoAvatar phase={task?.phase ?? "idle"} open={open} /><span className="ans-dino-pip" aria-hidden="true" /></button></PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={14} aria-labelledby={titleId} className="w-[min(350px,calc(100vw-32px))] rounded-3xl p-5 motion-reduce:animate-none" onCloseAutoFocus={(event) => {
        const id = focusTarget.current;
        focusTarget.current = null;
        if (!id || id !== task?.targetId) return;
        const target = document.getElementById(id);
        if (!target || target.matches(":disabled") || target.closest("[inert]")) return;
        event.preventDefault();
        target.scrollIntoView({ block: "center", behavior: "auto" });
        target.focus({ preventScroll: true });
      }}>
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-primary">{t("name")}</span><Button size="icon" variant="ghost" aria-label={t("close")} onClick={() => setOpen(false)}><X className="h-4 w-4" aria-hidden="true" /></Button></div>
        {task ? <>
          <h2 id={titleId} className="text-xl font-semibold">{t("taskTitle")}</h2>
          <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{t(`task.${task.phase}`)}</p>
          <ol aria-label={t("taskSteps")} className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {([1, 2, 3] as const).map(step => <li key={step} aria-current={step === task.step ? "step" : undefined} className={`rounded-xl border px-2 py-3 leading-5 ${step === task.step ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}><span aria-hidden="true" className="mb-1 block">0{step}</span>{t(`taskStep.${step}`)}</li>)}
          </ol>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("taskCost", { points: task.costPoints })}</p>
          {task.targetId && <Button variant="outline" className="mt-4 w-full" onClick={() => { focusTarget.current = task.targetId ?? null; setOpen(false); }}>{t("taskAction")}</Button>}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("taskFooter")}</p>
        </> : <><h2 id={titleId} className="text-xl font-semibold">{t("title")}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{t("body")}</p>
        <div className="mt-5 space-y-2">{[{ href: "/explore?category=career", label: "career" }, { href: "/workflows/toonflow", label: "create" }, { href: "/explore", label: "discover" }].map((item) => <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">{t(item.label)}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>)}</div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("footer")}</p></>}
        <a href="/mascot/3d/preview.html" target="_blank" rel="noopener noreferrer" aria-label={`${t("name")} · 360°`} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs text-muted-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">360°<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
      </PopoverContent>
    </Popover>
  </div>;
}

