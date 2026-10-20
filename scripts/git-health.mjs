#!/usr/bin/env node
// ANS Git / 发布体检：一眼看出"仓库和发布有没有出问题"。
// 用法：node git-health.mjs [--gh] [--fetch] [--stale-days 30]
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const withGh = argv.includes("--gh");
const doFetch = argv.includes("--fetch");
const staleDays = Number((() => { const i = argv.indexOf("--stale-days"); return i >= 0 ? argv[i + 1] : 30; })()) || 30;

const sh = (cmd, args, allowFail = true) => {
  try { return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { if (allowFail) return ""; throw error; }
};
const git = (args, allowFail = true) => sh("git", args, allowFail);
const n = (s) => Number(s || 0);

if (doFetch) git(["fetch", "--all", "--prune"]);

const findings = [];
const add = (level, title, detail, fix) => findings.push({ level, title, detail, fix });
const LEVEL_TAG = { critical: "严重", warn: "警告", info: "信息" };

const head = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "(unknown)";
const headSha = git(["log", "-1", "--format=%h %ci %s"]) || "";
const shallow = git(["rev-parse", "--is-shallow-repository"]) === "true";
const behind = n(git(["rev-list", "--count", "HEAD..origin/main"]));
const ahead = n(git(["rev-list", "--count", "origin/main..HEAD"]));
const dirty = git(["status", "--porcelain"]).split("\n").filter(Boolean);
const dirtyCounts = dirty.reduce((acc, line) => { const k = line.slice(0, 2).trim() || "?"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

console.log("=".repeat(72));
console.log("ANS Git / 发布体检");
console.log("=".repeat(72));
console.log(`当前分支      : ${head}`);
console.log(`HEAD          : ${headSha}`);
console.log(`相对 origin/main: 落后 ${behind} / 领先 ${ahead}${shallow ? "（浅克隆重，数字可能失真）" : ""}`);
console.log(`克隆形态      : ${shallow ? "shallow —— 历史不完整，落后/领先与 --merged 分支统计均不可信" : "full"}`);
console.log(`未提交改动    : ${dirty.length} 项 ${JSON.stringify(dirtyCounts)}`);

if (shallow) add("warn", "本地仓库是浅克隆重（shallow）",
  "落后/领先、git branch --merged 的统计会失真：同一组提交在 shallow 下显示 1084/1，GitHub 真值是 1278/0。",
  "以 gh api repos/<owner>/<repo>/compare/<sha>...main 取真值，或 git fetch --unshallow 补齐历史后再审计");
if (!shallow && behind > 0) add("warn", `本地工作区落后 origin/main ${behind} 个提交`,
  "用这个工作区做审查/结论会得到假象。", "git fetch --all --prune 后从 origin/main 新建分支");
if (dirty.length > 0) add("info", `工作树有 ${dirty.length} 项未提交改动`, "改动没进任何 PR，等于没有审查。", "确认意图后提交进分支或明确丢弃");

// 部署信号灯
const sig = (name) => {
  const line = git(["log", "-1", "--format=%h %ci %s", `origin/${name}`]);
  return line || null;
};
const deployTarget = sig("ops/deploy-target");
const prodLive = sig("ops/prod-live");
const mainTip = git(["log", "-1", "--format=%h %ci %s", "origin/main"]);
const hash = (line) => (line ? line.split(" ")[0] : null);
console.log(`\norigin/main          : ${mainTip || "(无)"}`);
console.log(`ops/deploy-target    : ${deployTarget || "(无)"}`);
console.log(`ops/prod-live        : ${prodLive || "(无)"}`);

if (deployTarget && prodLive) {
  if (hash(deployTarget) !== hash(prodLive)) {
    add("critical", "部署信号不一致：ops/deploy-target ≠ ops/prod-live",
      "要么上线没回写，要么上线失败。", "git ls-remote origin refs/heads/ops/* 核对，并在生产侧确认实际运行镜像");
  }
  if (hash(mainTip) !== hash(deployTarget)) {
    const drift = shallow ? "提交数不可信（浅克隆）" : n(git(["rev-list", "--count", `origin/ops/deploy-target..origin/main`])) + " 个提交";
    add("warn", `main 比部署信号领先 ${drift}`,
      "有已合并但未进入部署信号的提交（含自动化数据提交）。",
      "确认这批是否已上线；发布后必须把信号推到本次发布 SHA");
  }
}

// 分支卫生
const merged = git(["branch", "-r", "--merged", "origin/main"]).split("\n").map((s) => s.trim()).filter(Boolean);
const unmerged = git(["branch", "-r", "--no-merged", "origin/main"]).split("\n").map((s) => s.trim()).filter((s) => s && !s.includes("->"));
console.log(`\n远端分支：已并入 main ${merged.length} 条；未并入 ${unmerged.length} 条${shallow ? "（浅克隆下该统计失真）" : ""}`);
if (unmerged.length) console.log(`未并入示例：${unmerged.slice(0, 10).join(", ")}`);
add("info", `远端分支 ${merged.length + unmerged.length} 条，其中 ${merged.length} 条已并入 main`,
  "无自动删除策略时会持续腐化。", "开启 delete_branch_on_merge；批量清理需用户授权");

// 陈旧分支
const cutoff = Date.now() - staleDays * 86400000;
const refs = git(["for-each-ref", "--sort=-committerdate", "--format=%(refname:short)|%(committerdate:iso8601)", "refs/remotes/origin"])
  .split("\n").filter(Boolean).map((l) => { const [name, date] = l.split("|"); return { name, at: Date.parse(date) }; });
const stale = refs.filter((r) => r.at && r.at < cutoff && r.name !== "origin/HEAD");
if (stale.length) add("warn", `${stale.length} 条远端分支超过 ${staleDays} 天未更新`,
  stale.slice(0, 8).map((s) => s.name).join(", "), "确认无未落地改动后清理");

// GitHub 侧（可选）
if (withGh) {
  const ghAvailable = sh("gh", ["--version"]).length > 0;
  if (!ghAvailable) add("info", "未检测到 gh CLI", "跳过分支保护与 CI 检查", "安装 gh 后加 --gh 复跑");
  else {
    const repo = git(["remote", "get-url", "origin"]).replace(/^.*github\.com[:/]/, "").replace(/\.git$/, "");
    const protect = (branch) => {
      const raw = sh("gh", ["api", `repos/${repo}/branches/${branch}/protection`]);
      return raw.length > 0 && !raw.includes("Branch not protected");
    };
    if (shallow) {
      const headFull = git(["rev-parse", "HEAD"]);
      const cmp = sh("gh", ["api", `repos/${repo}/compare/${headFull}...main`, "--jq", "{status,ahead_by,behind_by}"]);
      if (cmp) add("info", "GitHub 真值（compare HEAD...main，不受本地浅克隆影响）", cmp, "");
    }
    const guardedRefs = new Set();
    // ruleset（2026-10-20 起 main/develop 由 ruleset 保护，而不是旧式 branch protection）
    const rulesetsRaw = sh("gh", ["api", `repos/${repo}/rulesets`]);
    if (rulesetsRaw) {
      try {
        const rulesets = JSON.parse(rulesetsRaw);
        console.log("\n分支 ruleset：");
        for (const summary of rulesets) {
          const detailRaw = sh("gh", ["api", `repos/${repo}/rulesets/${summary.id}`]);
          const detail = detailRaw ? JSON.parse(detailRaw) : {};
          const refs = (detail.conditions?.ref_name?.include ?? []).join(",");
          const types = (detail.rules ?? []).map((rule) => rule.type);
          const checks = (detail.rules ?? []).find((rule) => rule.type === "required_status_checks")
            ?.parameters?.required_status_checks?.map((check) => check.context) ?? [];
          const bypass = (detail.bypass_actors ?? []).map((actor) => `${actor.actor_type}#${actor.actor_id}:${actor.bypass_mode}`).join(",") || "(none)";
          console.log(`  ${summary.name} [${refs}] rules=${types.join("/")} checks=${checks.join("+") || "none"} bypass=${bypass}`);
          for (const ref of detail.conditions?.ref_name?.include ?? []) guardedRefs.add(ref);
          const guarded = /refs\/heads\/(main|develop)/.test(refs);
          if (guarded && checks.length === 0) {
            add("warn", `${summary.name} 没有必需状态检查`,
              `${refs} 上的提交可以绕过 CI 进入主干。`,
              "为该 ruleset 增加 required_status_checks（Test + Authority）");
          }
          if (guarded && bypass === "(none)") {
            add("info", `${summary.name} 没有任何 bypass 白名单`,
              "包括管理员在内的直接推送都会被拦；若投稿自动化直推 main 会失败。",
              "按需为 RepositoryRole#admin 增加 bypass_mode=always");
          }
        }
      } catch { add("info", "无法解析 rulesets", "", ""); }
    }
    // 既没有 ruleset、也没有旧式 branch protection 才算"没保护"。
    for (const branch of ["main", "develop"]) {
      if (!protect(branch) && !guardedRefs.has(`refs/heads/${branch}`)) {
        add("critical", `${branch} 分支没有任何保护（既无 ruleset 也无 branch protection）`,
          "没有必需状态检查 / 必需 review / 禁止直推。",
          `gh api repos/${repo}/rulesets 或 -X PUT repos/${repo}/branches/${branch}/protection（需管理员授权）`);
      }
    }
    const runs = sh("gh", ["run", "list", "--limit", "5", "--json", "workflowName,headBranch,conclusion,createdAt"]);
    if (runs) {
      try {
        const list = JSON.parse(runs);
        console.log("\n最近流水线：");
        for (const r of list) console.log(`  ${r.createdAt} | ${r.workflowName} | ${r.headBranch} | ${r.conclusion}`);
        const failed = list.filter((r) => r.conclusion === "failure");
        if (failed.length) add("info", `最近 5 次运行中有 ${failed.length} 次失败`,
          failed.map((r) => `${r.workflowName}@${r.headBranch}`).join(", "), "查看 gh run view <id> --log-failed");
      } catch { add("info", "无法解析 CI 运行列表", "", ""); }
    }
  }
}

console.log("\n" + "-".repeat(72));
if (!findings.length) console.log("未发现需要处理的问题。");
for (const f of findings.filter((x) => x.level === "critical")) console.log(`[${LEVEL_TAG.critical}] ${f.title}\n   ${f.detail}\n   → ${f.fix}`);
for (const f of findings.filter((x) => x.level === "warn")) console.log(`[${LEVEL_TAG.warn}] ${f.title}\n   ${f.detail}\n   → ${f.fix}`);
for (const f of findings.filter((x) => x.level === "info")) console.log(`[${LEVEL_TAG.info}] ${f.title}\n   ${f.detail}`);
console.log("-".repeat(72));
process.exit(findings.some((f) => f.level === "critical") ? 1 : 0);
