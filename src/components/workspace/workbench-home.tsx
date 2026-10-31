"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { WORKFLOWS, getWorkflow, type WorkflowId, type WorkflowTemplate } from "./workflow-registry";

interface WorkbenchHomeProps {
  composer: ReactNode;
  /** 输入框里的字数，变了兔兔龙就跳一下 */
  typed: number;
  workflow: WorkflowId;
  onPickWorkflow: (id: WorkflowId) => void;
  onPickTemplate: (template: WorkflowTemplate) => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

/** 首页：问候、输入框、工作流切换，下面是当前工作流的模板或成品画廊 */
export function WorkbenchHome({ composer, typed, workflow, onPickWorkflow, onPickTemplate }: WorkbenchHomeProps) {
  const manifest = getWorkflow(workflow);
  const mascotRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = mascotRef.current;
    if (!el || typed === 0) return;
    el.classList.remove("ans-wb-hop");
    void el.offsetWidth;
    el.classList.add("ans-wb-hop");
  }, [typed]);
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col px-4 pb-16 pt-[clamp(32px,11vh,112px)] sm:px-6">
      <div className="mx-auto w-full max-w-[720px] text-center">
        <h1 className="inline-flex items-center justify-center gap-3 ans-wb-serif text-[28px] font-semibold leading-10 tracking-tight sm:text-[34px]">
          <span ref={mascotRef} className="inline-flex">
            <Image src="/mascot/ans-mascot.png" alt="" width={48} height={48} priority className="ans-wb-bob size-10 sm:size-12" />
          </span>
          <span suppressHydrationWarning>{greeting()}，想做点什么？</span>
        </h1>
        <p key={workflow} className="ans-fade-swap mt-2 text-sm text-muted-foreground">{manifest.sub}</p>
        <div className="mt-7 text-left">{composer}</div>
        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="工作流">
          {WORKFLOWS.map(item => {
            const on = item.id === workflow;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                data-workflow={item.id}
                onClick={() => onPickWorkflow(item.id)}
                className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-transform duration-200 [transition-timing-function:cubic-bezier(.23,1,.32,1)] hover:-translate-y-px active:translate-y-0 sm:h-9 ${
                  on ? "bg-foreground text-background" : "bg-card text-muted-foreground shadow-[inset_0_0_0_0.5px_var(--hairline)] hover:text-foreground"
                }`}
              >
                <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {manifest.templates.length > 0 && (
        <section className="mt-10" aria-label={manifest.templatesTitle}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">{manifest.templatesTitle}</h2>
            <span className="text-xs text-muted-foreground">{workflow === "code" ? "点一张，按它的做法开始" : `${manifest.templates.length} 个模板`}</span>
          </div>
          <div key={workflow} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {manifest.templates.map((tpl, idx) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPickTemplate(tpl)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`ans-wb-rise group relative aspect-[3/4] overflow-hidden rounded-[14px] text-left shadow-[inset_0_0_0_0.5px_var(--hairline)] ${tpl.contain ? "bg-[#f3efe6]" : "bg-muted"}`}
              >
                <TemplateImage src={tpl.image} contain={tpl.contain} />
                <span className="absolute right-2.5 top-2.5 inline-flex h-7 items-center rounded-full bg-card/90 px-2.5 text-xs text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  用这个
                </span>
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-[rgb(11_11_10/60%)] to-transparent px-3 pb-2.5 pt-8 text-sm text-white">
                  <span className="truncate">{tpl.title}</span>
                  <span className="shrink-0 text-xs opacity-80">{tpl.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 模板图：加载完再淡入，不在空白卡上突然蹦出来；悬停放大 300ms */
function TemplateImage({ src, contain }: { src: string; contain?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(min-width: 640px) 200px, 45vw"
      unoptimized={src.endsWith(".svg")}
      onLoad={() => setLoaded(true)}
      className={`transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(.23,1,.32,1)] group-hover:scale-[1.03] motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"} ${contain ? "object-contain" : "object-cover"}`}
    />
  );
}
