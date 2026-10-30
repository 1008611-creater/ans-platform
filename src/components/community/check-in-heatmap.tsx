/** 最近 5 周签到格子（GitHub 贡献图样式）。只画真实签到记录。 */
const WEEKS = 5;

function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function CheckInHeatmap({ today, days, label }: { today: string; days: string[]; label: string }) {
  const checked = new Set(days);
  // 让最后一列以今天结尾，列从左到右是由远到近的周。
  const cells = Array.from({ length: WEEKS * 7 }, (_, index) => shiftDay(today, index - (WEEKS * 7 - 1)));
  return <div role="img" aria-label={label} className="grid w-max grid-flow-col grid-rows-7 gap-1">
    {cells.map((day) => <span key={day} title={day} className={`h-3 w-3 rounded-[3px] ${checked.has(day) ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted"} ${day === today ? "ring-1 ring-foreground/40" : ""}`} />)}
  </div>;
}
