#!/usr/bin/env node
// ANS 权威基线守卫：把 docs/authority/ledger.json 里的决定变成可执行断言。
// 用法：
//   node check-authority.mjs                        # 默认对 origin/main 校验
//   node check-authority.mjs --worktree             # 校验本地工作树（谨慎：本地可能过期）
//   node check-authority.mjs --ref origin/develop
//   node check-authority.mjs --ledger docs/authority/ledger.json
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const useWorktree = argv.includes("--worktree");
const refOverride = opt("--ref");
const ledgerPath = resolve(opt("--ledger", "docs/authority/ledger.json"));

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });

let ledger;
try {
  ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
} catch (error) {
  console.error(`[authority] 无法读取账本 ${ledgerPath}: ${error.message}`);
  process.exit(2);
}

// 先报告本地工作区是否过期，避免"本地是对的"这种假结论。
try {
  const shallow = git(["rev-parse", "--is-shallow-repository"]).trim() === "true";
  const behind = Number(git(["rev-list", "--count", "HEAD..origin/main"]).trim());
  const dirty = git(["status", "--porcelain"]).split("\n").filter(Boolean).length;
  if (behind > 0 || dirty > 0) {
    console.log(`[authority] 提示：本地工作区落后 origin/main ${behind} 个提交${shallow ? "（浅克隆重，该数字不可信）" : ""}，${dirty} 项未提交改动；` +
      `本次校验基准 = ${useWorktree ? "本地工作树（易失真）" : refOverride ?? "origin/main"}。`);
  }
} catch { /* 无远端时忽略 */ }

const cache = new Map();
function readTarget(ref, file) {
  const key = `${ref}:${file}`;
  if (cache.has(key)) return cache.get(key);
  let text = null;
  try {
    text = useWorktree
      ? readFileSync(resolve(file), "utf8")
      : git(["show", `${ref}:${file}`]);
  } catch {
    text = null;
  }
  cache.set(key, text);
  return text;
}

const count = (text, value) => text.split(value).length - 1;
let pass = 0;
const failures = [];
const skipped = [];

// 静默删除检测（--base <ref>）：base 上存在的权威条目不允在工作树里整条消失。
// 这正是 2026-10-20 PR #164 发生的事：一个基于旧 main 的分支把旧 deploy.sh、
// 旧 git-health.mjs 和旧账本一起合了进来，A-RELEASE-01/02 连同实现被"静默回退"，
// 而当时所有门禁都是绿的 —— 账本被同一个 PR 改掉，守卫没得可查。
const baseRef = opt("--base", null);
if (baseRef) {
  let baseLedger = null;
  try {
    baseLedger = JSON.parse(git(["show", `${baseRef}:docs/authority/ledger.json`]));
  } catch {
    console.log(`[authority] 提示：读不到 ${baseRef} 的账本，跳过静默删除检测。`);
  }
  if (baseLedger) {
    const byId = new Set((ledger.entries ?? []).map((entry) => entry.id));
    for (const baseEntry of baseLedger.entries ?? []) {
      if (byId.has(baseEntry.id)) continue;
      failures.push({
        id: baseEntry.id, title: baseEntry.title, ref: baseRef, file: "docs/authority/ledger.json",
        reason: `该权威条目在 ${baseRef} 上存在，但本次改动把它整条删除了`,
        note: "禁止静默删除：撤销必须保留条目并改成 revoked/superseded（或给出取代它的新条目 ID）",
      });
    }
  }
}

for (const entry of ledger.entries ?? []) {
  const status = entry.status ?? "authoritative";
  const rules = entry.rules ?? [];
  if (status !== "authoritative") {
    skipped.push(`${entry.id}（${status}，不参与守卫）`);
    continue;
  }
  if (!rules.length) {
    skipped.push(`${entry.id}（无机器规则，仅流程约束）`);
    continue;
  }
  for (const rule of rules) {
    const ref = useWorktree ? "worktree" : rule.ref ?? refOverride ?? "origin/main";
    const text = readTarget(ref, rule.file);
    if (text === null) {
      failures.push({
        id: entry.id, title: entry.title, ref, file: rule.file,
        reason: `文件不存在（${ref}）`, note: rule.note ?? "",
      });
      continue;
    }
    const value = rule.value ?? "";
    let ok = false;
    if (rule.type === "contains") ok = text.includes(value);
    else if (rule.type === "absent") ok = !text.includes(value);
    else if (rule.type === "countMax") ok = count(text, value) <= (rule.max ?? 1);
    else ok = false;
    if (ok) pass += 1;
    else failures.push({
      id: entry.id, title: entry.title, ref, file: rule.file,
      reason: rule.type === "contains" ? `缺少必需内容：${value}`
        : rule.type === "absent" ? `出现了被禁止的内容：${value}`
        : `出现次数 ${count(text, value)} > 上限 ${rule.max ?? 1}：${value}`,
      note: rule.note ?? "",
    });
  }
}

console.log(`\n[authority] 账本：${ledgerPath}（${ledger.entries?.length ?? 0} 条）`);
console.log(`[authority] 通过 ${pass} 条规则，失败 ${failures.length} 条，跳过 ${skipped.length} 条\n`);
for (const s of skipped) console.log(`  - SKIP ${s}`);
for (const f of failures) {
  console.log(`  ✗ ${f.id}｜${f.title}`);
  console.log(`      ${f.ref}:${f.file} → ${f.reason}`);
  if (f.note) console.log(`      note: ${f.note}`);
  console.log("      处置：恢复该权威实现，或在本 PR 中把该条目标记为 revoked/superseded 并说明理由。\n");
}
if (!failures.length) console.log("  ✓ 所有权威条目均未被回退。\n");
process.exit(failures.length ? 1 : 0);
