"use client";

import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { CommunityRecipe } from "@/contracts/community-posts";
import { Button } from "@/components/ui/button";
import { useCopyFeedback } from "@/lib/ui/copy-feedback";

/**
 * 帖子上的配方。「做同款」先复制提示词，再在新标签页打开工具；没留链接就只复制。
 * 先发起复制再开窗口：新标签页抢走焦点后剪贴板会拒绝写入；窗口也得在点击这一拍里开，放到 await 之后会被当成弹窗拦掉。
 */
export function RecipeCard({ recipe }: { recipe: CommunityRecipe }) {
  const t = useTranslations("product.communityPost.recipe");
  const { state, copied, copy } = useCopyFeedback();

  const makeSame = async () => {
    const copying = copy(recipe.prompt);
    if (recipe.url) window.open(recipe.url, "_blank", "noopener,noreferrer");
    if (await copying) toast.success(t("copied"));
    else toast.error(t("copyFailed"));
  };

  return <section aria-labelledby="recipe-heading" className="space-y-3 rounded-xl bg-muted p-4" data-testid="community-recipe">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="recipe-heading" className="text-sm font-semibold">{t("title")}</h2>
      {recipe.url
        ? <a href={recipe.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">{t("tool", { tool: recipe.tool })}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
        : <span className="text-sm text-muted-foreground">{t("tool", { tool: recipe.tool })}</span>}
    </div>
    <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-card p-3 font-mono text-sm leading-relaxed text-foreground/90">{recipe.prompt}</pre>
    <Button type="button" onClick={() => void makeSame()} className="w-full sm:w-auto">
      {copied
        ? <Check className={`h-4 w-4 ${state === "leaving" ? "ans-feedback-leaving" : ""}`} aria-hidden="true" />
        : recipe.url ? <ExternalLink className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {recipe.url ? t("makeSame") : t("copyOnly")}
    </Button>
  </section>;
}
