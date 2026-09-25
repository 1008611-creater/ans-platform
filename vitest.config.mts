import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// 用 .mts 而不是 .ts：Vite 8 的 native 配置加载器会把 .ts 当 CommonJS 处理，
// 里面的 ESM 语法会触发 configLoader 警告，并在未来大版本里直接失效。
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "packages"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "packages/",
        "src/**/*.d.ts",
        "vitest.config.mts",
        "vitest.setup.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});