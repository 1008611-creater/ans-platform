"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getWorkflow, readableStep, type WorkflowId } from "./workflow-registry";

interface RunNodeProps {
  workflow?: WorkflowId;
  params?: Record<string, string>;
  status: "completed" | "running" | "ready" | "stopped";
  trace: string[];
  statusLabel: string;
}

/**
 * 运行节点：一张卡片，头部是工作流名和参数，下面是逐步展开的步骤。
 * 运行中只有当前一步在转，其余等待；完成后每一步可点开看服务端返回的执行记录。
 */
export function WorkflowRunNode({ workflow, params, status, trace, statusLabel }: RunNodeProps) {
  const manifest = getWorkflow(workflow);
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const running = status === "running";
  const stopped = status === "stopped";
  const stages = manifest.stages;
  const details = trace.map(readableStep);
  // 服务端只在结束时一次返回全部记录，所以运行中停在第一步，结束后全部打勾
  const doneCount = running ? 0 : stopped ? Math.min(details.length, stages.length) : stages.length;
  const chips = Object.values(params ?? {});

  return (
    <div data-testid="codex-execution-trace" className="overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_0.5px_var(--hairline)]">
      <div className="flex min-w-0 items-center gap-2.5 px-3.5 py-3">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-xs font-semibold"
          style={{ background: `color-mix(in srgb, ${manifest.color} 14%, transparent)`, color: manifest.color }}
          aria-hidden="true"
        >
          {manifest.name.slice(0, 1)}
        </span>
        <span className="shrink-0 text-sm font-medium">{manifest.name}</span>
        <span className="flex min-w-0 flex-wrap gap-1">
          {chips.map(chip => (
            <span key={chip} className="inline-flex h-6 items-center rounded-full px-2 text-xs text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)]">
              {chip}
            </span>
          ))}
        </span>
        <span className="ans-num ml-auto shrink-0 text-xs text-muted-foreground">{statusLabel}</span>
      </div>
      <ol className="px-3.5 pb-3 pl-[52px]">
        {stages.map((label, idx) => {
          const done = idx < doneCount;
          const current = running && idx === 0;
          // 记录比步骤多时，剩下的都并进最后一步
          const detail = idx === stages.length - 1 ? details.slice(idx).join("；") : details[idx];
          const expanded = open === idx || current;
          return (
            <li key={label} className="text-sm">
              <button
                type="button"
                disabled={!done || !detail}
                aria-expanded={done && detail ? expanded : undefined}
                aria-controls={done && detail ? `${baseId}-step-${idx}` : undefined}
                onClick={() => setOpen(prev => (prev === idx ? null : idx))}
                className={`flex min-h-[30px] w-full items-center gap-2.5 text-left transition-colors ${
                  done || current ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {done ? (
                  <span className="ans-pop inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" style={{ animationDelay: `${idx * 90}ms` }}>
                    <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : current ? (
                  <span className="size-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-[var(--hairline)] border-t-emerald-500 motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--hairline)]" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">{label}</span>
                {done && detail && (
                  <ChevronDown className={`ans-spring-pop size-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                )}
              </button>
              <div id={`${baseId}-step-${idx}`} className="ans-collapse" data-open={Boolean(expanded && (detail || current))}>
                <div inert={!expanded}>
                  <p className="pb-1.5 pl-6 text-xs leading-5 text-muted-foreground [text-wrap:pretty]">
                    {current ? manifest.sub : detail}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
