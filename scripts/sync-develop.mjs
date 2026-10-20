#!/usr/bin/env node
/**
 * 把 main 同步进 develop（走 PR + 门禁，可选自动合并）。
 *
 * 背景：main 前进后 develop 会落后；落后久了，下一次 develop → main 发布会把
 * 旧内容合回主干（2026-10-20 PR #164 就是这么把 deploy.sh 静默回退的）。
 *
 * 用法：
 *   node scripts/sync-develop.mjs --dry-run     # 只看状态，不改任何东西
 *   node scripts/sync-develop.mjs               # 建分支 + 开 PR（不自动合并）
 *   node scripts/sync-develop.mjs --merge       # 建分支 + 开 PR + 开启 auto-merge（门禁绿后自动合并）
 *
 * 安全性：在临时 worktree 里操作，不碰当前工作区；不 force-push；分支名带时间戳。
 * 健壮性：所有 gh/git 网络调用带退避重试（这台机器到 GitHub 偶发 EOF/超时）；
 *        合并优先用 gh --auto（不在本地长轮询）；退回轮询时只认必需检查 Test/Authority。
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const autoMerge = argv.includes("--merge");
const CHECK_TIMEOUT_MS = Number(process.env.SYNC_TIMEOUT_MS ?? 30 * 60 * 1000);
const POLL_MS = 45_000;
const REQUIRED_CHECKS = ["Test", "Authority"];
const BAD_CONCLUSIONS = ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (msg) => console.log(msg);

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();

/** 带退避重试：这台机器到 GitHub 偶发 "EOF" / TLS 超时。 */
async function withRetry(label, fn, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      const detail = (error.stderr ?? error.message ?? "").toString().trim().split("\n").pop();
      log(`[sync-develop] ${label} 第 ${attempt}/${attempts} 次失败：${detail}`);
      if (attempt < attempts) await sleep(2000 * attempt);
    }
  }
  throw lastError;
}

const git = (...args) => run("git", args);
const ghText = (args, attempts = 4) => withRetry(`gh ${args[0]}`, () => run("gh", args), attempts);
const ghJson = async (args, attempts = 4) => JSON.parse(await ghText(args, attempts));

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};
const checkName = (c) => c.name ?? c.context ?? c.workflowName ?? "";

const repo = (await ghJson(["repo", "view", "--json", "nameWithOwner"])).nameWithOwner;
log(`[sync-develop] 仓库 ${repo}`);

git("fetch", "origin", "--prune", "--no-tags");
const compare = await ghJson(["api", `repos/${repo}/compare/develop...main`]);
log(`[sync-develop] main 领先 develop ${compare.ahead_by} 个提交，develop 领先 ${compare.behind_by} 个；差异文件 ${compare.files?.length ?? 0}`);

if (compare.ahead_by === 0) {
  log("[sync-develop] develop 已包含 main，无需同步。");
  process.exit(0);
}
if (dryRun) {
  log(`[sync-develop] --dry-run：将建分支 chore/sync-main-into-develop-${stamp()} 并开 PR 到 develop。`);
  const files = (compare.files ?? []).map((f) => `  ${f.status.padEnd(9)} ${f.filename}`).slice(0, 20);
  if (files.length) log("[sync-develop] 差异文件（前 20）：\n" + files.join("\n"));
  process.exit(0);
}

// 已经有一个同步 PR 开着就复用它，避免重复开单。
const openPrs = await ghJson(["pr", "list", "--state", "open", "--limit", "50", "--json", "number,headRefName,baseRefName"]);
const existing = openPrs.find((p) => p.baseRefName === "develop" && /^chore\/sync-main-into-develop-/.test(p.headRefName));
let prNumber = existing?.number ?? null;
let branch = existing?.headRefName ?? null;

if (prNumber) {
  log(`[sync-develop] 复用已存在的同步 PR #${prNumber}（${branch}）`);
} else {
  branch = `chore/sync-main-into-develop-${stamp()}`;
  const tmp = mkdtempSync(join(tmpdir(), "ans-sync-develop-"));
  try {
    log(`[sync-develop] 在临时 worktree 合并：${tmp}`);
    git("worktree", "add", "--detach", tmp, "origin/develop");
    run("git", ["-C", tmp, "merge", "origin/main", "--no-edit", "-m", `chore(develop): 同步 main（${compare.ahead_by} 个提交）`]);
    for (const args of [["scripts/check-authority.mjs", "--worktree", "--base", "origin/main"], ["scripts/check-docs.mjs"]]) {
      try {
        const out = run("node", args, { cwd: tmp });
        log(`[sync-develop] ✓ ${args[0]} ${out.split("\n").pop() ?? ""}`);
      } catch (error) {
        log(`[sync-develop] ✗ ${args[0]} 失败：${(error.stdout ?? error.message).toString().slice(-400)}`);
        log("[sync-develop] 本地快检失败：请人工处理后再开 PR。");
        process.exit(1);
      }
    }
    run("git", ["-C", tmp, "switch", "-c", branch]);
    await withRetry("git push", () => run("git", ["-C", tmp, "push", "-u", "origin", branch]));
  } finally {
    try {
      run("git", ["worktree", "remove", "--force", tmp]);
    } catch {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  const body = [
    "## 自动同步（scripts/sync-develop.mjs）",
    "",
    `main 领先 develop **${compare.ahead_by}** 个提交（差异文件 ${compare.files?.length ?? 0} 个），把 main 合并进 develop，`,
    "避免下一次 develop→main 发布把旧内容合回主干（参见 PR #164 的静默回退事故）。",
    "",
    "合并结果已跑过本地快检：check-authority --base origin/main（含静默删除检测）+ check-docs。",
    "",
    "## 权威基线",
    "- 条目 ID：无新增/撤销（纯同步）",
    "- [x] check-authority --base origin/main 通过",
  ].join("\n");
  prNumber = Number(await ghText([
    "api", `repos/${repo}/pulls`, "-X", "POST",
    "-f", `title=chore(develop): 同步 main（${compare.ahead_by} 个提交）`,
    "-f", `head=${branch}`, "-f", "base=develop",
    "-f", `body=${body}`,
    "--jq", ".number",
  ]));
  log(`[sync-develop] 已开 PR #${prNumber}（${branch}）→ develop`);
}

const prUrl = `https://github.com/${repo}/pull/${prNumber}`;
if (!autoMerge) {
  log(`[sync-develop] 未自动合并；PR：#${prNumber} ${prUrl}`);
  process.exit(0);
}

// 首选：交给 GitHub 的 auto-merge（门禁绿后自动合并），不在本地长轮询。
try {
  await ghText(["pr", "merge", String(prNumber), "--auto", "--merge"]);
  const view = await ghJson(["pr", "view", String(prNumber), "--json", "state,autoMergeRequest"]);
  if (view.state === "MERGED") {
    log(`[sync-develop] 已合并 #${prNumber}`);
    process.exit(0);
  }
  log(`[sync-develop] 已开启 auto-merge：门禁绿后 GitHub 会自动合并 #${prNumber} ${prUrl}`);
  process.exit(0);
} catch (error) {
  log(`[sync-develop] 开启 auto-merge 失败，退回本地轮询：${(error.stderr ?? error.message ?? "").toString().trim().split("\n").pop()}`);
}

const deadline = Date.now() + CHECK_TIMEOUT_MS;
for (;;) {
  let state;
  try {
    state = await ghJson(["pr", "view", String(prNumber), "--json", "state,mergeStateStatus,statusCheckRollup"], 3);
  } catch (error) {
    log(`[sync-develop] 读取 PR 状态失败（网络抖动，继续等）：${(error.stderr ?? error.message ?? "").toString().trim().split("\n").pop()}`);
    if (Date.now() > deadline) process.exit(1);
    await sleep(POLL_MS);
    continue;
  }
  const rollup = state.statusCheckRollup ?? [];
  log(`[sync-develop] #${prNumber} state=${state.state} merge=${state.mergeStateStatus} checks=${rollup.map((c) => `${checkName(c)}=${c.conclusion ?? c.state}`).join(",") || "none"}`);
  if (state.state !== "OPEN") {
    log(`[sync-develop] PR 已 ${state.state}，结束。`);
    process.exit(state.state === "MERGED" ? 0 : 1);
  }
  const requiredBad = rollup.filter((c) => REQUIRED_CHECKS.includes(checkName(c)) && BAD_CONCLUSIONS.includes(c.conclusion));
  const otherBad = rollup.filter((c) => !REQUIRED_CHECKS.includes(checkName(c)) && BAD_CONCLUSIONS.includes(c.conclusion));
  if (requiredBad.length) {
    log(`[sync-develop] 必需门禁失败：${requiredBad.map((c) => `${checkName(c)}=${c.conclusion}`).join(",")}；保留 PR 供人工处理。`);
    process.exit(1);
  }
  if (otherBad.length) {
    log(`[sync-develop] 提醒：非必需检查失败（不影响合并）：${otherBad.map((c) => `${checkName(c)}=${c.conclusion}`).join(",")}`);
  }
  if (state.mergeStateStatus === "CLEAN") {
    await withRetry("gh pr merge", () => run("gh", ["pr", "merge", String(prNumber), "--merge"]));
    log(`[sync-develop] 已合并 #${prNumber}`);
    process.exit(0);
  }
  if (Date.now() > deadline) {
    log("[sync-develop] 等待门禁超时，保留 PR 供人工处理。");
    process.exit(1);
  }
  await sleep(POLL_MS);
}
