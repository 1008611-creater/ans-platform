"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { ProjectGoal } from "@/contracts/projects";
import { studioSelectionHref } from "@/domain/catalog/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateProjectForm({ initialGoal = "career", initialWorkflowId }: { initialGoal?: ProjectGoal; initialWorkflowId?: CatalogWorkflowId }) {
  const router = useRouter();
  const t = useTranslations("learning");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<ProjectGoal>(initialGoal);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, goal }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? t("createFailed"));
      router.push(studioSelectionHref(payload.data.project.id, initialWorkflowId));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("createFailed"));
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-2"><legend className="mb-2 text-sm font-medium">{t("goalQuestion")}</legend><div className="flex flex-wrap gap-2">{(["career", "contest", "portfolio"] as const).map((value) => <Button key={value} type="button" disabled={pending} aria-pressed={goal === value} variant={goal === value ? "default" : "outline"} onClick={() => setGoal(value)}>{t(value)}</Button>)}</div></fieldset>
      <label className="block space-y-2"><span className="text-sm font-medium">{t("projectName")}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("projectPlaceholder")} required maxLength={80} disabled={pending} /></label>
      <p className="text-xs text-muted-foreground">{t("privateHint")}</p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !title.trim()}>{t(pending ? "creating" : "create")}</Button>
    </form>
  );
}
