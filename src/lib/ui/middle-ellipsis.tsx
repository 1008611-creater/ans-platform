import { cn } from "@/lib/utils";

/** 把文件名拆成「可截断的开头」和「必须完整保留的结尾（含后缀）」。 */
export function splitFileName(name: string, tailChars = 6) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : "";
  const stem = ext ? name.slice(0, -ext.length) : name;
  if (stem.length <= tailChars + 2) return { head: stem, tail: ext };
  return { head: stem.slice(0, -tailChars), tail: stem.slice(-tailChars) + ext };
}

/** 长文件名中间省略：`very-long-report…final.pdf`，后缀完整保留，完整名放在 title。 */
export function MiddleEllipsis({ name, className }: { name: string; className?: string }) {
  const { head, tail } = splitFileName(name);
  return <span className={cn("inline-flex min-w-0 max-w-full", className)} title={name}>
    <span className="min-w-0 truncate">{head}</span>
    <span className="shrink-0 whitespace-pre">{tail}</span>
  </span>;
}
