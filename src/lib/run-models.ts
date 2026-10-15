/** ANS model IDs match the APIC gateway exactly. All member balances and
 * spending authorization remain owned by ANS; upstream credentials stay server-side.
 * Routing is prepared locally and requires live-call verification before release.
 */
export const RUN_MODEL_OPTIONS = [
  { key: "deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash", upstream: "deepseek-v4.1-flash", channel: "APIC" },
  { key: "gpt-6-astra", label: "GPT-6 Astra", upstream: "gpt-6-astra", channel: "APIC" },
  { key: "gpt-6.1-sol", label: "GPT-6.1 Sol", upstream: "gpt-6.1-sol", channel: "APIC" },
] as const;

export type RunModelKey = (typeof RUN_MODEL_OPTIONS)[number]["key"];
export type RunModelOption = (typeof RUN_MODEL_OPTIONS)[number];

/** Runtime thinking controls accepted by OpenAI-compatible upstreams. */
export const RUN_REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type RunReasoningEffort = (typeof RUN_REASONING_EFFORTS)[number];

export const RUN_REASONING_EFFORT_LABELS: Record<RunReasoningEffort, string> = {
  none: "关闭",
  low: "低",
  medium: "中",
  high: "高",
};

export const DEFAULT_RUN_MODEL: RunModelKey = "deepseek-v4.1-flash";
export { DEFAULT_COMPANION_MODEL } from "@/contracts/companion-model";

export function getRunModel(key: string): RunModelOption | undefined {
  return RUN_MODEL_OPTIONS.find((model) => model.key === key);
}
/** APIC consumption factors apply to each model's own base token price.
 * These are not relative prices between models. Keep UI and reserve math aligned. */
export const RUN_MODEL_METERING: Record<RunModelKey, { inputReservePerMillion: number; outputReservePerMillion: number; consumptionMultiplier: number }> = {
  "deepseek-v4.1-flash": { inputReservePerMillion: 0.3, outputReservePerMillion: 1.2, consumptionMultiplier: 1 },
  "gpt-6-astra": { inputReservePerMillion: 45, outputReservePerMillion: 75, consumptionMultiplier: 0.16 },
  "gpt-6.1-sol": { inputReservePerMillion: 9, outputReservePerMillion: 15, consumptionMultiplier: 0.16 },
};
