// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const guard = resolve(process.cwd(), "scripts/check-authority.mjs");
const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>, ledger: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "authority-fixture-"));
  fixtures.push(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "guard@example.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "guard"], { cwd: dir });
  for (const [rel, content] of Object.entries(files)) {
    const target = join(dir, rel);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, content);
  }
  if (ledger !== null) {
    mkdirSync(join(dir, "docs/authority"), { recursive: true });
    writeFileSync(join(dir, "docs/authority/ledger.json"), typeof ledger === "string" ? ledger : JSON.stringify(ledger, null, 2));
  }
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: dir });
  return dir;
}

function runGuard(dir: string, args: string[] = ["--worktree"]) {
  const result = spawnSync("node", [guard, ...args], { cwd: dir, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const entry = (rules: unknown[]) => ({
  version: 1,
  entries: [{ id: "A-TEST-01", status: "authoritative", title: "fixture entry", rules }],
});

it("passes when every authoritative rule still holds", () => {
  const dir = fixture({ "src/keep.ts": "export const marker = 'KEEP_ME';\n" }, entry([
    { ref: "origin/main", file: "src/keep.ts", type: "contains", value: "KEEP_ME" },
    { ref: "origin/main", file: "src/keep.ts", type: "absent", value: "REMOVED" },
    { ref: "origin/main", file: "src/keep.ts", type: "countMax", value: "export", max: 4 },
  ]));
  const { code, out } = runGuard(dir);
  expect(code).toBe(0);
  expect(out).toContain("通过 3 条规则");
  expect(out).toContain("所有权威条目均未被回退");
});

it("fails a contains rule when the protected code disappears", () => {
  const dir = fixture({ "src/keep.ts": "export const gone = true;\n" }, entry([
    { ref: "origin/main", file: "src/keep.ts", type: "contains", value: "KEEP_ME", note: "protected marker" },
  ]));
  const { code, out } = runGuard(dir);
  expect(code).toBe(1);
  expect(out).toContain("A-TEST-01");
  expect(out).toContain("缺少必需内容：KEEP_ME");
  expect(out).toContain("protected marker");
});

it("fails an absent rule when forbidden code returns", () => {
  const dir = fixture({ "src/keep.ts": "REMOVED_LEGACY\n" }, entry([
    { ref: "origin/main", file: "src/keep.ts", type: "absent", value: "REMOVED_LEGACY" },
  ]));
  const { code, out } = runGuard(dir);
  expect(code).toBe(1);
  expect(out).toContain("出现了被禁止的内容");
});

it("fails a countMax rule when duplication regrows", () => {
  const dir = fixture({ "src/keep.ts": "isZh ? a\nisZh ? b\nisZh ? c\n" }, entry([
    { ref: "origin/main", file: "src/keep.ts", type: "countMax", value: "isZh ?", max: 2 },
  ]));
  const { code, out } = runGuard(dir);
  expect(code).toBe(1);
  expect(out).toContain("出现次数 3 > 上限 2");
});

it("fails when a base-branch entry is silently deleted from the ledger", () => {
  // 先造一份"base"：账本里有 A-TEST-01 与 A-DROPPED-01 两条，并把该提交指到 origin/main。
  const dir = fixture({ "src/keep.ts": "export const marker = 'KEEP_ME';\n" }, {
    version: 1,
    entries: [
      { id: "A-TEST-01", status: "authoritative", title: "kept entry", rules: [] },
      { id: "A-DROPPED-01", status: "authoritative", title: "silently dropped entry", rules: [] },
    ],
  });
  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", baseSha], { cwd: dir });
  // 工作树里的账本把 A-DROPPED-01 整条删掉（模拟"基于旧 main 的分支把它自己的旧账本合回来"）。
  writeFileSync(join(dir, "docs/authority/ledger.json"), JSON.stringify({
    version: 1,
    entries: [{ id: "A-TEST-01", status: "authoritative", title: "kept entry", rules: [] }],
  }, null, 2));
  const { code, out } = runGuard(dir, ["--worktree", "--base", "origin/main"]);
  expect(code).toBe(1);
  expect(out).toContain("A-DROPPED-01");
  expect(out).toContain("整条删除");
});

it("skips non-authoritative entries instead of failing them", () => {
  const dir = fixture({ "src/keep.ts": "nothing yet\n" }, {
    version: 1,
    entries: [{ id: "A-TEST-02", status: "pending", title: "future rule", rules: [
      { ref: "origin/main", file: "src/keep.ts", type: "contains", value: "NOT_THERE_YET" },
    ] }],
  });
  const { code, out } = runGuard(dir);
  expect(code).toBe(0);
  expect(out).toContain("SKIP A-TEST-02");
});

it("fails when a protected file is missing entirely", () => {
  const dir = fixture({ "src/other.ts": "x\n" }, entry([
    { ref: "origin/main", file: "src/deleted.ts", type: "contains", value: "anything" },
  ]));
  const { code, out } = runGuard(dir);
  expect(code).toBe(1);
  expect(out).toContain("文件不存在");
});

it("exits 2 when the ledger cannot be parsed", () => {
  const dir = fixture({ "src/keep.ts": "x\n" }, "{ not json");
  const { code, out } = runGuard(dir);
  expect(code).toBe(2);
  expect(out).toContain("无法读取账本");
});
