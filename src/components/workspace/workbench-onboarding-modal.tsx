"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Persisted once the member has seen (or skipped) the workbench walkthrough. */
const SEEN_PREFIX = "ans:workbench-onboarding:v1:";

function storageKey(actorId: string) {
  return SEEN_PREFIX + (actorId || "guest");
}

export function readWorkbenchOnboardingSeen(actorId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(actorId)) === "1";
  } catch {
    return true;
  }
}

export function markWorkbenchOnboardingSeen(actorId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(actorId), "1");
  } catch {
    // Optional storage: a blocked write only re-opens the guide next visit.
  }
}

export interface WorkbenchSample {
  id: string;
  title: string;
  artifactFile: string;
}

export function WorkbenchOnboardingModal({
  open,
  actorId,
  samples,
  onOpenChange,
  onPickSample,
}: {
  open: boolean;
  actorId: string;
  samples: WorkbenchSample[];
  onOpenChange: (open: boolean) => void;
  onPickSample?: (id: string) => void;
}) {
  const t = useTranslations("workbench");
  const [remember, setRemember] = useState(true);

  function dismiss() {
    if (remember) markWorkbenchOnboardingSeen(actorId);
    onOpenChange(false);
  }

  function pick(id: string) {
    if (remember) markWorkbenchOnboardingSeen(actorId);
    onPickSample?.(id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) dismiss(); }}>
      <DialogContent data-testid="workbench-onboarding-modal" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("onboarding.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.subtitle")}</DialogDescription>
        </DialogHeader>

        <ol className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map(step => (
            <li key={step} className="rounded-xl border border-border bg-muted/40 p-3">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {step}
              </span>
              <p className="mt-2 text-sm font-semibold">{t(`onboarding.step${step}Title`)}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(`onboarding.step${step}Body`)}</p>
            </li>
          ))}
        </ol>

        {samples.length > 0 && (
          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="text-sm font-semibold">{t("onboarding.samplesTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("onboarding.samplesBody")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {samples.map(sample => (
                <Button
                  key={sample.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  title={sample.artifactFile}
                  onClick={() => pick(sample.id)}
                >
                  {sample.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
            {t("onboarding.neverShow")}
          </label>
          <Button type="button" onClick={dismiss}>{t("onboarding.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
