export interface ApicStatusRecord {
  monitorName: string;
  model: string;
  status: "operational" | "degraded" | "failed" | "error";
  latencyMs: number | null;
  availability24h: number;
  checkedAt: string;
}

export interface ApicStatusSnapshot {
  generatedAt: string;
  records: ApicStatusRecord[];
}

const CACHE_KEY = "__ansApicStatusSnapshot" as const;
type StatusGlobal = typeof globalThis & { [CACHE_KEY]?: ApicStatusSnapshot };
const MAX_AGE_MS = 3 * 60 * 1000;

export function saveApicStatus(snapshot: ApicStatusSnapshot): void {
  (globalThis as StatusGlobal)[CACHE_KEY] = snapshot;
}

export function getFreshApicStatus(): ApicStatusSnapshot | null {
  const snapshot = (globalThis as StatusGlobal)[CACHE_KEY];
  if (!snapshot) return null;
  const age = Date.now() - Date.parse(snapshot.generatedAt);
  return Number.isFinite(age) && age >= -60_000 && age <= MAX_AGE_MS ? snapshot : null;
}
