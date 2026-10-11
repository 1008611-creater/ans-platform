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

export function getRunModel(key: string): RunModelOption | undefined {
  return RUN_MODEL_OPTIONS.find((model) => model.key === key);
}