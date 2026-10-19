export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(value: string | Date, days: number) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function shanghaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function nextShanghaiMidnightIso(date = new Date()) {
  const key = shanghaiDateKey(date);
  const next = new Date(`${key}T16:00:00.000Z`);
  return next.toISOString();
}

export function formatChinaDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
    .format(new Date(value))
    .replaceAll("/", "-");
}
