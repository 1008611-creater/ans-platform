import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const frameClasses: Record<string, string> = {
  default: "ring-1 ring-border",
  mint: "ring-2 ring-emerald-300 shadow-[0_0_0_3px_rgba(110,231,183,.18)]",
  orbit: "relative ring-2 ring-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,.18),0_0_18px_rgba(56,189,248,.35)] after:pointer-events-none after:absolute after:-inset-1 after:rounded-full after:border after:border-dashed after:border-sky-400/70 after:animate-[spin_9s_linear_infinite]",
  molten: "relative ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,.2),0_0_20px_rgba(245,158,11,.3)] before:pointer-events-none before:absolute before:-inset-1 before:rounded-full before:bg-amber-400/20 before:blur-md",
  aurora: "relative ring-2 ring-fuchsia-400 shadow-[0_0_0_3px_rgba(217,70,239,.2),0_0_24px_rgba(34,211,238,.35)] after:pointer-events-none after:absolute after:-inset-1 after:rounded-full after:border after:border-fuchsia-300/70 after:animate-[pulse_2.6s_ease-in-out_infinite]",
  core: "relative ring-2 ring-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,.25),0_0_26px_rgba(236,72,153,.35)] before:pointer-events-none before:absolute before:-inset-1 before:rounded-full before:bg-gradient-to-r before:from-violet-400/35 before:via-fuchsia-400/15 before:to-cyan-300/35 before:blur-md before:animate-[spin_8s_linear_infinite]",
};

export function AvatarFrame({ frameKey = "default", className, children }: { frameKey?: string; className?: string; children: ReactNode }) {
  return <span className={cn("relative z-0 inline-flex rounded-full p-0.5 motion-reduce:before:animate-none motion-reduce:after:animate-none", frameClasses[frameKey] ?? frameClasses.default, className)}><span className="relative z-10 inline-flex h-full w-full rounded-full">{children}</span></span>;
}
