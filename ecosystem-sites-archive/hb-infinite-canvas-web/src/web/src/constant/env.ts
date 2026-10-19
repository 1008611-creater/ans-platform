export const APP_VERSION = __APP_VERSION__ || "dev";

export const DOCS_URL = import.meta.env.VITE_DOC_URL || "https://docs.canvas.best";

// Official plugin registry URL: CI publishes to plugins-dist for jsDelivr delivery; an environment variable may override it for self-hosting.
export const PLUGIN_REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/basketikun/infinite-canvas@plugins-dist/official-plugins.json";

/**
 * Agnes API key for the bundled video proxy — **local development only**.
 *
 * ⚠️ 服务器构建绝不能注入真 Key：这个值会被 Vite 内联进 bundle，任何访客都能读到。
 *   2026-09-16 实测确认过一次泄漏（产物里能直接搜到 Bearer 令牌）。
 *
 * 服务器构建改为传占位串，真 Key 由 nginx 的 proxy_set_header Authorization 在服务端注入，
 * 浏览器发什么都会被覆盖，所以占位串不影响功能。
 *
 * Local dev: injected by scripts/windows/start.bat from agnes-video-proxy/.env at launch.
 */
export const AGNES_API_KEY = (import.meta.env.VITE_AGNES_API_KEY || "").trim();

/**
 * Base URL of the bundled Agnes video proxy.
 * Local dev falls back to http://localhost:8787; server builds pass VITE_AGNES_BASE_URL=/agnes so the
 * browser calls its own origin and nginx proxies to the 127.0.0.1:8787 daemon (no CORS, no open port).
 */
export const AGNES_BASE_URL = (import.meta.env.VITE_AGNES_BASE_URL || "").trim().replace(/\/+$/, "") || "http://localhost:8787";
