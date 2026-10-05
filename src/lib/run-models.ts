/**
 * Models exposed by the template runner.
 *
 * `key` is the stable value used by ANS. `upstream` is the exact model id
 * understood by the configured OpenAI-compatible gateway. Keeping the two
 * separate prevents UI labels from accidentally being sent to the gateway.
 *
 * 2026-10-05 权威探测（生产文本网关 McGrox，`/v1/models` + 逐个真实调用）：
 * - 网关只接受**不带前缀**的模型名；旧 ID 上的 `openai/`、`zzzz/` 前缀一律返回 404。
 * - `gpt-5.6-terra` / `gpt-5.6-sol` / `gpt-6-astra` 实测均 200，且支持
 *   `reasoning_effort` 与流式返回（含 usage）。
 * - 原白名单里的 13 个 TR 国模（deepseek / glm / kimi / qwen / seed）返回 404
 *   `Model "..." is not supported by any configured account in this group`，
 *   已从白名单移除，避免用户选中后必然失败。
 * 新增模型前必须先用 `/v1/models` 加一次真实调用确认网关可用。
 */
export const RUN_MODEL_OPTIONS = [
  {
    key: "gpt-5.6-terra",
    label: "GPT-5.6 Terra (balanced)",
    upstream: "gpt-5.6-terra",
    channel: "McGrox",
  },
  {
    key: "gpt-5.6-sol",
    label: "GPT-5.6 Sol (frontier)",
    upstream: "gpt-5.6-sol",
    channel: "McGrox",
  },
  {
    key: "gpt-6-astra",
    label: "GPT-6 Astra (flagship)",
    upstream: "gpt-6-astra",
    channel: "McGrox",
  },
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

export const DEFAULT_RUN_MODEL: RunModelKey = "gpt-5.6-terra";

export function getRunModel(key: string): RunModelOption | undefined {
  return RUN_MODEL_OPTIONS.find((model) => model.key === key);
}