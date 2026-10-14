import { VisualPortfolioError } from "./errors";
/** A missing state is ambiguous after restart or across app instances. Fail closed. */
const writers = new Map<string, "reserved" | "writing" | "settled" | "fenced">();
const touched = new Map<string, number>();
export function reserveInputWriter(id: string) {
  for (const [key, state] of writers) if (state !== "writing" && Date.now() - (touched.get(key) ?? 0) > 120000) forgetInputWriter(key);
  if (writers.size >= 1024) throw new VisualPortfolioError("INPUT_CLEANUP_PENDING", 503);
  writers.set(id, "reserved"); touched.set(id, Date.now());
}
export function beginInputWriter(id: string) {
  if (writers.get(id) !== "reserved") throw new VisualPortfolioError("INPUT_CLEANUP_PENDING", 503);
  writers.set(id, "writing");
}
export function settleInputWriter(id: string) {
  if (writers.get(id) === "writing") { writers.set(id, "settled"); touched.set(id, Date.now()); }
}
/** Synchronous fencing occurs before deletion: reserved callbacks cannot start later. */
export function fenceInputWriter(id: string) {
  const state = writers.get(id);
  if (!state || state === "writing") throw new VisualPortfolioError("INPUT_CLEANUP_PENDING", 503);
  writers.set(id, "fenced");
}
export function forgetInputWriter(id: string) { writers.delete(id); touched.delete(id); }
