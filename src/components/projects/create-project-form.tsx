"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { ProjectGoal } from "@/contracts/projects";
import { studioSelectionHref } from "@/domain/catalog/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QUICK_PROJECT_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  goal: ProjectGoal;
  title: string;
}> = [
  {
    id: "agri",
    label: "🌾 农客松参赛项目",
    goal: "contest",
    title: "CAU 农情病虫害多模态遥感诊断与农艺处方系统",
  },
  {
    id: "aigc",
    label: "🎬 AIGC 短剧项目",
    goal: "portfolio",
    title: "Toonflow 赛博长安 AI 漫剧四格分镜与视频生成工程",
  },
  {
    id: "resume",
    label: "✨ 3D 个人简历站",
    goal: "career",
    title: "Three.js 3D 星空个人作品集与全栈求职简历站",
  },
];

export function CreateProjectForm({
  initialGoal = "career",
  initialWorkflowId,
  initialTitle = "",
  guestMode = false,
  callbackPath = "/projects",
}: {
  initialGoal?: ProjectGoal;
  initialWorkflowId?: CatalogWorkflowId;
  initialTitle?: string;
  guestMode?: boolean;
  callbackPath?: string;
}) {
  const router = useRouter();
  const t = useTranslations("learning");
  const [title, setTitle] = useState(initialTitle);
  const [goal, setGoal] = useState<ProjectGoal>(initialGoal);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (guestMode) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goal }),
      });
      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? t("createFailed"));
      router.push(studioSelectionHref(payload.data.project.id, initialWorkflowId));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("createFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold text-foreground">⚡ 一键填入热门立项课题：</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROJECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setGoal(preset.goal);
                setTitle(preset.title);
              }}
              className="rounded-full border border-primary/30 bg-background px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <fieldset disabled={pending} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t("goalQuestion")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["career", "contest", "portfolio"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={goal === value}
              variant={goal === value ? "default" : "outline"}
              onClick={() => setGoal(value)}
            >
              {t(value)}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("projectName")}</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("projectPlaceholder")}
          required
          maxLength={80}
          disabled={pending}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {guestMode
          ? "🔓 当前为免登工坊预览模式：选好课题后点击下方按钮将跳转登录并为你创建专属工作空间。"
          : t("privateHint")}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !title.trim()}>
        {guestMode ? "🔐 登录并立即创建立项 →" : t(pending ? "creating" : "create")}
      </Button>
    </form>
  );
}

