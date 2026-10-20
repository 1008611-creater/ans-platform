#!/usr/bin/env node
/**
 * 把 main 同步进 develop（走 PR + 门禁，可选自动合并）。
 *
 * 背景：main 前进后 develop 会落后；落后久了，下一次 develop → main 发布会把
 * 旧内容合回主干（2026-10-20 PR #164 就是这么把 deploy.sh 静默回退的）。
 * 本脚本把"检查 → 合并 → 开 PR → 等门禁 → 合并"做成一条可重复执行的命令。
 *
 * 用法：
 *   node scripts/sync-develop.mjs --dry-run     # 只看状态，不改任何东西
 *   node scripts/sync-develop.mjs               # 建分支 + 开 PR（不自动合并）
 *   node scripts/sync-develop.mjs --merge       # 建分支 + 开 PR + 门禁绿后自动合并
 *
 * 安全性：在临时 worktree 里操作，不碰当前工作区；不 force-push；分支名带时间戳。
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const autoMerge = argv.includes("--merge");
const CHECK_TIMEOUT_MS = Number(process.env.SYNC_TIMEOUT_MS ?? 30 * 60 * 1000);
const POLL_MS = 30_000;

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const git = (...args) => run("git", args);
const ghJson = (args) => JSON.parse(run("gh", args));
const log = (msg) => console.log(msg);
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const repo = ghJson(["repo", "view", "--json", "nameWithOwner"]).nameWithOwner;
log(`[sync-develop] 仓库 ${repo}`);

git("fetch", "origin", "--prune", "--no-tags");
const compare = ghJson(["api", `repos/${repo}/compare/develop...main`]);
log(`[sync-develop] main 领先 develop ${compare.ahead_by} 个提交，develop 领先 ${compare.behind_by} 个；差异文件 ${compare.files?.length ?? 0}`);

if (compare.ahead_by === 0) {
  log("[sync-develop] develop 已包含 main，无需同步。");
  process.exit(0);
}
if (dryRun) {
  log("[sync-develop] --dry-run：将建分支 chore/sync-main-into-develop-" + stamp() + " 并开 PR 到 develop。");
  const files = (compare.files ?? []).map((f) => `  ${f.status.padEnd(9)} ${f.filename}`).slice(0, 20);
  if (files.length) log("[sync-develop] 差异文件（前 20）：\n" + files.join("\n"));
  process.exit(0);
}

// 已经有一个同步 PR 开着就复用它，避免重复开单。
const open = ghJson(["pr", "list", "--state", "open", "--limit", "50", "--json", "number,headRefName,baseRefName"])
  .filter((p) => p.baseRefName === "develop" && /^chore\/sync-main-into-develop-/.test(p.headRefName));
let prNumber = open[0]?.number ?? null;
let branch = open[0]?.headRefName ?? null;

if (prNumber) {
  log(`[sync-develop] 复用已存在的同步 PR #${prNumber}（${branch}）`);
} else {
  branch = `chore/sync-main-into-develop-${stamp()}`;
  const tmp = mkdtempSync(join(tmpdir(), "ans-sync-develop-"));
  try {
    log(`[sync-develop] 在临时 worktree 合并：${tmp}`);
    git("worktree", "add", "--detach", tmp, "origin/develop");
    run("git", ["-C", tmp, "merge", "origin/main", "--no-edit", "-m", `chore(develop): 同步 main（${compare.ahead_by} 个提交）`]);
    // 本地快检（不依赖 node_modules）：权威守卫 + 文档链接
    const chk = [
      ["node", ["scripts/check-authority.mjs", "--worktree", "--base", "origin/main"]],
      ["node", ["scripts/check-docs.mjs"]],
    ];
    for (const [cmd, args] of chk) {
      try {
        const out = run(cmd, args, { cwd: tmp });
        log(`[sync-develop] ✓ ${args[0]} ${out.split("\n").pop() ?? ""}`);
      } catch (error) {
        log(`[sync-develop] ✗ ${args[0]} 失败：${(error.stdout ?? error.message).toString().slice(-400)}`);
        log("[sync-develop] 本地快检失败：请人工处理后再开 PR。");
        process.exit(1);
      }
    }
    run("git", ["-C", tmp, "switch", "-c", branch]);
    run("git", ["-C", tmp, "push", "-u", "origin", branch]);
  } finally {
    try {
      run("git", ["worktree", "remove", "--force", tmp]);
    } catch {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  const body = [
    `## 自动同步（scripts/sync-develop.mjs）`,
    "",
    `main 领先 develop **${compare.ahead_by}** 个提交（差异文件 ${compare.files?.length ?? 0} 个），把 main 合并进 develop，`,
    "避免下一次 develop→main 发布把旧内容合回主干（参见 PR #164 的静默回退事故）。",
    "",
    "合并结果已跑过本地快检：`check-authority --base origin/main`（含静默删除检测）+ `check-docs`。",
    "",
    "## 权威基线",
    "- 条目 ID：无新增/撤销（纯同步）",
    "- [x] `check-authority --base origin/main` 通过",
  ].join("\n");
  prNumber = Number(run("gh", [
    "api", `repos/${repo}/pulls`, "-X", "POST",
    "-f", `title=chore(develop): 同步 main（${compare.ahead_by} 个提交）`,
    "-f", `head=${branch}`, "-f", "base=develop",
    "-f", `body=${body}`,
    "--jq", ".number",
  ]));
  log(`[sync-develop] 已开 PR #${prNumber}（${branch}）→ develop`);
}

if (!autoMerge) {
  log(`[sync-develop] 未自动合并；PR：#${prNumber} https://github.com/${repo}/pull/${prNumber}`);
  process.exit(0);
}

const deadline = Date.now() + CHECK_TIMEOUT_MS;
for (;;) {
  const state = ghJson(["pr", "view", String(prNumber), "--json", "state,mergeStateStatus,statusCheckRollup"]);
  const checks = (state.statusCheckRollup ?? []).map((c) => `${c.name ?? c.context}=${c.conclusion ?? c.state}`);
  log(`[sync-develop] #${prNumber} state=${state.state} merge=${state.mergeStateStatus} checks=${checks.join(",") || "none"}`);
  if (state.state !== "OPEN") {
    log(`[sync-develop] PR 已 ${state.state}，结束。`);
    process.exit(state.state === "MERGED" ? 0 : 1);
  }
  const failed = (state.statusCheckRollup ?? []).some((c) => ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"].includes(c.conclusion));
  if (failed) {
    log("[sync-develop] 门禁失败，保留 PR 供人工处理。");
    process.exit(1);
  }
  if (state.mergeStateStatus === "CLEAN") {
    run("gh", ["pr", "merge", String(prNumber), "--merge"]);
    log(`[sync-develop] 已合并 #${prNumber}`);
    process.exit(0);
  }
  if (Date.now() > deadline) {
    log("[sync-develop] 等待门禁超时，保留 PR 供人工处理。");
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
