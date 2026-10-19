// 临时 override：禁用 vite 预打包(optimizeDeps)，绕开损坏的 streamdown 嵌套包扫描。
// 仅用于 dev server 启动验证；正式用 vite.config.ts。
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webDir = dirname(fileURLToPath(import.meta.url));
const localVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";

export default defineConfig({
    base: process.env.VITE_BASE || "/",
    plugins: [react()],
    resolve: {
        alias: { "@": resolve(webDir, "src") },
    },
    optimizeDeps: {
        disabled: true,
    },
    server: {
        port: 3000,
        host: "0.0.0.0",
    },
});