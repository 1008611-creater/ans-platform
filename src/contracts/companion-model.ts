/** Default for new companion conversations; saved selections retain their model. */
/**
 * 2026-10-22 实测：上游 apic.cauai.fun 只真正服务 `deepseek-v4.1-flash`；
 * `gpt-6.1-sol` 与 `gpt-6-astra` 在 /responses 上稳定返回 HTTP 500
 * （"Service is temporarily unavailable"），/chat/completions 更是 404 无路由。
 * 默认值必须落在能用的模型上，否则每一轮 Agent 都会以 UPSTREAM_REJECTED 结束。
 * 上游恢复后可以把默认改回去；模型选项本身不受影响。
 */
export const DEFAULT_COMPANION_MODEL = "deepseek-v4.1-flash" as const;
