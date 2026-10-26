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
/** ANS_RUN_MODELS_PAUSED (comma-separated keys) keeps a model visible but greyed
 * out and refuses new calls, without a redeploy. Unknown keys are ignored, and the
 * default model can never be paused (every fallback lands on it).
 * Server-only: the browser never sees this env, so callers pass the list
 * explicitly; client pickers receive it through RunModelPricingProvider. */
export function pausedRunModels(env: Readonly<Record<string, string | undefined>> = process.env): RunModelKey[] {
  const wanted = new Set((env.ANS_RUN_MODELS_PAUSED ?? "").split(",").map((key) => key.trim()).filter(Boolean));
  return RUN_MODEL_OPTIONS.filter((model) => model.key !== DEFAULT_RUN_MODEL && wanted.has(model.key)).map((model) => model.key);
}
/** For starting a new call: unknown and paused models both return undefined. */
export function getAvailableRunModel(key: string, paused: readonly string[]): RunModelOption | undefined {
  const model = getRunModel(key);
  return model && !paused.includes(model.key) ? model : undefined;
}
export function availableRunModelOptions(paused: readonly string[]): RunModelOption[] {
  return RUN_MODEL_OPTIONS.filter((model) => !paused.includes(model.key));
}
/** Retail consumption multipliers are not defined here: ANS_MODEL_BILLING_POLICY
 * owns them. Read them with readRunModelMultipliers() on the server and pass them
 * to the UI, so the displayed rate is always the rate that is charged. */
export type RunModelMultipliers = Partial<Record<RunModelKey, number>>;
