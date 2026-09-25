import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Vite 文件配置不支持 inline-only 的 envFile；明确指向不存在的随机目录，禁止加载项目.env。
const envDir = fileURLToPath(new URL(`./ans-no-env-${randomUUID()}`, import.meta.url));
if (existsSync(envDir)) throw new Error("隔离环境目录意外存在，拒绝运行");

// 独立配置：不合并根配置、不加载任何全局 setup 或数据库 mock；不创建 envDir。
export default defineConfig({
  root: fileURLToPath(new URL("../", import.meta.url)),
  envDir,
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  test: {
    include: ["tests/ans-p0p1.integration.ts"],
    environment: "node",
    setupFiles: [],
    globalSetup: [],
    globals: false,
    // 让 Vite 解析 NextAuth 的 next/server 无扩展名导入；不替换认证实现。
    server: { deps: { inline: ["next-auth"] } },
    pool: "forks",
    // Vitest 4 移除 poolOptions；maxWorkers: 1 + fileParallelism: false 等价于原先的 singleFork。
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 30000,
    reporters: ["verbose"],
    cache: false,
  },
});
