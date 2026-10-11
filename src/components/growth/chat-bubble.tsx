import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const bubbleClasses: Record<string, string> = {
  default: "border-border bg-card",
  mint: "border-emerald-300/70 bg-emerald-50/70 dark:bg-emerald-950/20",
  neon: "border-fuchsia-400/70 bg-fuchsia-50/70 shadow-[0_0_18px_rgba(217,70,239,.12)] dark:bg-fuchsia-950/20",
  orbit: "border-sky-400/70 bg-sky-50/70 shadow-[0_0_18px_rgba(56,189,248,.16)] dark:bg-sky-950/20",
  mentor: "border-amber-400/70 bg-amber-50/70 dark:bg-amber-950/20",
  core: "border-violet-400/80 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-[0_0_20px_rgba(139,92,246,.16)] dark:from-violet-950/20 dark:to-fuchsia-950/20",
};

export function ChatBubble({ bubbleKey = "default", className, children }: { bubbleKey?: string; className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border px-4 py-3 text-sm leading-6 transition-shadow motion-reduce:transition-none", bubbleClasses[bubbleKey] ?? bubbleClasses.default, bubbleKey !== "default" && "hover:shadow-lg", className)}>{children}</div>;
}
