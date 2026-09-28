import { spawn } from "node:child_process";

// 完整 verify 必须明确连接隔离的 staging/CI 数据库。
// 不把本机 PostgreSQL 或构建期占位连接串当作验证环境。
if (!process.env.DATABASE_URL) {
  console.error("[verify] 缺少 DATABASE_URL：完整验证必须提供隔离的 staging/CI PostgreSQL。");
  process.exit(2);
}
if (!process.env.SMOKE_DATABASE_URL) {
  console.error("[verify] 缺少 SMOKE_DATABASE_URL：浏览器、无障碍和性能验证必须使用独立测试库。");
  process.exit(2);
}
if (!process.env.MODEL_CREDENTIAL_SECRET) {
  process.env.MODEL_CREDENTIAL_SECRET = "verify-only-secret";
}
const steps = [
  ["typecheck", "npm", ["run", "typecheck"]],
  // `next build` 的 TypeScript 阶段会连同 src/__tests__ 一起检查，这里提前独立跑一次，
  // 让测试文件的类型错误在门禁前段就暴露，而不是拖到最后一步的构建。
  ["typecheck (tests)", "npm", ["run", "typecheck:tests"]],
  ["lint", "npm", ["run", "lint"]],
  ["docs", "npm", ["run", "docs:check"]],
  // 分层边界（import boundary）必须在构建前拦住越界依赖：这类问题不会让单元
  // 测试变红，但会把数据库/凭证代码拖进浏览器 bundle，或让分层约束悄悄腐化。
  ["boundaries", "npm", ["run", "check:boundaries"]],
  ["unit tests", "npm", ["run", "test:unit"]],
  ["security audit", "npm", ["run", "audit:security"]],
  ["build", "npm", ["run", "build"]],
  ["browser smoke", "npm", ["run", "smoke"]],
  ["accessibility audit", "npm", ["run", "a11y"]],
  ["performance budget", "npm", ["run", "perf"]],
];

// 依赖扫描在离线环境下按「跳过」处理（退出码 0），CI 用 AUDIT_MODE=require
// 把跳过转成失败，避免生产依赖漏洞在流水线里被静默忽略。
if (!process.env.AUDIT_MODE) process.env.AUDIT_MODE = "auto";

// 浏览器冒烟的数据库地址必须由调用者显式提供；缺少浏览器或构建产物时，
// 仍可由 SMOKE_MODE / A11Y_MODE / PERF_MODE 决定是否把前置条件缺失视为失败。
if (!process.env.SMOKE_MODE) process.env.SMOKE_MODE = "auto";

console.log("[verify] 使用显式 SMOKE_DATABASE_URL 执行浏览器、无障碍和性能验证");

// 可访问性与性能同样在真实构建产物上跑浏览器，前置条件（浏览器、构建产物、
// 可写冒烟库）与冒烟一致。默认 auto 跳过；CI 用 A11Y_MODE / PERF_MODE 把
// 「跳过」转成失败，避免这两道检查在流水线里被静默忽略。
if (!process.env.A11Y_MODE) process.env.A11Y_MODE = "auto";
if (!process.env.PERF_MODE) process.env.PERF_MODE = "auto";

function run(label, command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n[verify] ${label}`);
    // Windows 上 npm 是 `npm.cmd`，Node 直接 spawn 会报 EINVAL，因此经 cmd.exe 执行。
    // 不传 `shell: true`：那会把参数拼进命令行（Node DEP0190）。这里命令与参数都是
    // 本文件的字面量，不存在外部输入，也不做任何转义拼接。
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", command, ...args], {
            stdio: "inherit",
            env: process.env,
          })
        : spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

try {
  for (const [label, command, args] of steps) {
    await run(label, command, args);
  }
  console.log("\n[verify] all checks passed");
} catch (error) {
  console.error(`\n[verify] ${error.message}`);
  process.exitCode = 1;
}
