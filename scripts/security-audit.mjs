/**
 * 依赖安全扫描（`npm audit` 的可判定包装）。
 *
 * 判定规则：
 *   - 生产依赖（`--omit=dev`）出现 high/critical 漏洞 => 失败。
 *   - 仅开发依赖出现漏洞 => 打印告警但不阻塞（开发链路不进入运行时）。
 *   - 无法访问审计服务（离线、代理不可用）=> 默认跳过；CI 用
 *     AUDIT_MODE=require 把跳过转成失败，避免扫描被静默忽略。
 *
 * 环境变量：
 *   AUDIT_MODE=require  缺少审计服务时直接失败（CI 用），默认 auto 表示跳过。
 */
import { spawnSync } from "node:child_process";

const MODE = process.env.AUDIT_MODE === "require" ? "require" : "auto";

function skipped(message) {
  console.log(`[audit] 跳过：${message}`);
  if (MODE === "require") {
    console.error("[audit] AUDIT_MODE=require，前置条件缺失按失败处理");
    process.exitCode = 1;
  }
}

function runAudit(args) {
  const options = {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  };
  // Windows 上 Node 禁止直接 spawn `npm.cmd`（EINVAL），因此经 cmd.exe 执行。
  // 命令串只由本文件的字面量拼成，不含任何外部输入，不存在注入面。
  if (process.platform === "win32") {
    const command = ["npm", "audit", "--json", ...args].join(" ");
    return spawnSync("cmd.exe", ["/d", "/s", "/c", command], options);
  }
  return spawnSync("npm", ["audit", "--json", ...args], options);
}

function classify(raw) {
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    return null;
  }
  return report?.metadata?.vulnerabilities ?? null;
}

function offlineHint(result) {
  const text = `${result.stderr ?? ""}${result.stdout ?? ""}`;
  return /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ERR_SOCKET_TIMEOUT|audit endpoint|request to https/i.test(
    text,
  );
}

// npm 的审计接口偶发超时（同一命令重跑即恢复正常），因此对「拿不到可解析输出」
// 的失败多次重试并退避，避免把网络抖动误判成脚本故障或真实漏洞。
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1500;

function collect(label, args) {
  let result = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    result = runAudit(args);
    if (classify(result.stdout ?? "")) return { counts: classify(result.stdout ?? ""), result };
    if (attempt < MAX_ATTEMPTS) {
      console.log(`[audit] ${label}：第 ${attempt} 次未取到报告，重试`);
      // 审计接口失败通常来自瞬时网络问题，同步等待后再试，避免空转打爆 registry。
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RETRY_DELAY_MS);
    }
  }
  return { counts: null, result };
}

function report(label, args, { blocking }) {
  const { counts, result } = collect(label, args);
  if (!counts) {
    if (offlineHint(result)) {
      skipped(`${label}：无法访问审计服务`);
      return true;
    }
    console.error(`[audit] ${label} 输出无法解析`);
    if (result?.stderr) console.error(result.stderr.trim());
    return false;
  }
  const { info, low, moderate, high, critical, total } = counts;
  console.log(
    `[audit] ${label}：critical ${critical} / high ${high} / moderate ${moderate} / low ${low} / info ${info}`,
  );
  if (blocking && (high > 0 || critical > 0)) {
    console.error(`[audit] ${label} 存在 high/critical 漏洞，阻断发布`);
    return false;
  }
  if (!blocking && total > 0) {
    console.warn(`[audit] ${label} 有 ${total} 个开发依赖漏洞（不进入运行时，不阻断）`);
  }
  return true;
}

const prodOk = report("生产依赖", ["--omit=dev", "--audit-level=high"], { blocking: true });
const devOk = report("含开发依赖", ["--audit-level=high"], { blocking: false });

if (prodOk && devOk) {
  console.log("[audit] 依赖安全扫描完成");
} else {
  process.exitCode = 1;
}
