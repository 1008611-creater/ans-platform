"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { ProjectGoal } from "@/contracts/projects";
import { studioSelectionHref } from "@/domain/catalog/selection";
import { detectIntentAndMatchTerms, upgradeToStructuredBrief } from "@/domain/vibehub/ans-site-optimizers";
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
    title: "农田病虫害拍照识别与防治建议小工具",
  },
  {
    id: "aigc",
    label: "🎬 AIGC 短剧项目",
    goal: "portfolio",
    title: "AI 漫剧四镜头分镜脚本与画面生成小作品",
  },
  {
    id: "resume",
    label: "✨ 3D 个人简历站",
    goal: "career",
    title: "个人求职简历与课程项目展示网页",
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
  const rawLocale = useLocale();
  const locale = (rawLocale === "en" ? "en" : "zh") as "zh" | "en";
  const t = useTranslations("learning");
  const [title, setTitle] = useState(initialTitle);
  const [goal, setGoal] = useState<ProjectGoal>(initialGoal);
  const [showBrief, setShowBrief] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialGoal) setGoal(initialGoal);
  }, [initialGoal]);

  const intentCluster = detectIntentAndMatchTerms(title || (goal === "contest" ? "农客松遥感诊断" : goal === "portfolio" ? "AIGC短剧分镜" : "3D个人简历作品集"));
  const structuredBrief = upgradeToStructuredBrief(title, locale, t(goal));

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
        <p className="text-xs font-semibold text-foreground">📖 常用立项模板：</p>
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

      {/* ANS Intent Bridge */}
      <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/35 p-3.5" data-testid="project-intent-bridge">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">{intentCluster.badge[locale]}</span>
          <button
            type="button"
            onClick={() => setShowBrief(v => !v)}
            className="text-xs font-semibold text-primary underline underline-offset-4 hover:opacity-80"
          >
            {showBrief ? (locale === "en" ? "Hide Brief" : "收起项目需求大纲") : (locale === "en" ? "✨ Generate Project Brief" : "✨ 帮我生成项目需求大纲")}
          </button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{intentCluster.clarifyingQuestion[locale]}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">{locale === "en" ? "Related topics:" : "相关学习词条："}</span>
          {intentCluster.terms.map(term => (
            <Link
              key={term.slug}
              href={`/vibe-hub/${term.slug}?lang=${locale}`}
              title={term.hint[locale]}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              {term.label[locale]} ↗
            </Link>
          ))}
        </div>
        {showBrief && (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-foreground">{structuredBrief}</pre>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(structuredBrief);
                  setCopiedBrief(true);
                  setTimeout(() => setCopiedBrief(false), 1800);
                }}
                className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/80"
              >
                {copiedBrief ? "✓ 已复制需求大纲" : "📋 复制需求大纲"}
              </button>
              <Link
                href={`/workspace?prompt=${encodeURIComponent(structuredBrief.slice(0, 600))}`}
                className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                ⚡ 带此大纲去 AI 工作台生成代码 →
              </Link>
            </div>
          </div>
        )}
      </div>

      {!guestMode && (
        <p className="text-xs text-muted-foreground">{t("privateHint")}</p>
      )}
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


