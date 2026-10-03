/**
 * Models exposed by the template runner.
 *
 * `key` is the stable value used by ANS. `upstream` is the exact model id
 * understood by the configured OpenAI-compatible gateway. Keeping the two
 * separate prevents UI labels from accidentally being sent to the gateway.
 */
export const RUN_MODEL_OPTIONS = [
  {
    key: "gpt-5.6-terra",
    label: "GPT-5.6 Terra (balanced)",
    upstream: "openai/gpt-5.6-terra",
    channel: "OmniRoute",
  },
  {
    key: "gpt-5.6-sol",
    label: "GPT-5.6 Sol (frontier)",
    upstream: "openai/gpt-5.6-sol",
    channel: "OmniRoute",
  },
  {
    key: "gpt-6-astra",
    label: "GPT-6 Astra (flagship)",
    upstream: "gpt-mcgrox-astra",
    channel: "OmniRoute",
  },
  {
    key: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash (TR)",
    upstream: "zzzz/deepseek-v4-flash",
    channel: "TR",
  },
  {
    key: "deepseek-v4-flash-0731",
    label: "DeepSeek V4 Flash 0731 (TR)",
    upstream: "zzzz/deepseek-v4-flash-0731",
    channel: "TR",
  },
  {
    key: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro (TR)",
    upstream: "zzzz/deepseek-v4-pro",
    channel: "TR",
  },
  {
    key: "deepseek-v4-pro-0813",
    label: "DeepSeek V4 Pro 0813 (TR)",
    upstream: "zzzz/deepseek-v4-pro-0813",
    channel: "TR",
  },
  {
    key: "glm-5.1",
    label: "GLM-5.1 (TR)",
    upstream: "zzzz/glm-5.1",
    channel: "TR",
  },
  {
    key: "glm-5.2",
    label: "GLM-5.2 (TR)",
    upstream: "zzzz/glm-5.2",
    channel: "TR",
  },
  {
    key: "glm-5.3-flash",
    label: "GLM-5.3 Flash (TR)",
    upstream: "zzzz/glm-5.3-flash",
    channel: "TR",
  },
  {
    key: "kimi-k2.6",
    label: "Kimi K2.6 (TR)",
    upstream: "zzzz/kimi-k2.6",
    channel: "TR",
  },
  {
    key: "kimi-k2.7-code",
    label: "Kimi K2.7 Code (TR)",
    upstream: "zzzz/kimi-k2.7-code",
    channel: "TR",
  },
  {
    key: "qwen3.7-max",
    label: "Qwen 3.7 Max (TR)",
    upstream: "zzzz/qwen3.7-max",
    channel: "TR",
  },
  {
    key: "qwen3.8-max",
    label: "Qwen 3.8 Max (TR)",
    upstream: "zzzz/qwen3.8-max",
    channel: "TR",
  },
  {
    key: "seed-2.1-pro",
    label: "Seed 2.1 Pro (TR)",
    upstream: "zzzz/seed-2.1-pro",
    channel: "TR",
  },
  {
    key: "seed-2.1-turbo",
    label: "Seed 2.1 Turbo (TR)",
    upstream: "zzzz/seed-2.1-turbo",
    channel: "TR",
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
