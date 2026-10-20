// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/git-health.mjs");
const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** 造一个小仓库：提交两次，返回 { dir, first, second }（second = HEAD）。 */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "git-health-fixture-"));
  fixtures.push(dir);
  const run = (args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  run(["init", "-q"]);
  run(["config", "user.email", "health@example.com"]);
  run(["config", "user.name", "health"]);
  writeFileSync(join(dir, "README.md"), "first\n");
  run(["add", "-A"]);
  run(["commit", "-qm", "first"]);
  const first = run(["rev-parse", "HEAD"]);
  writeFileSync(join(dir, "README.md"), "second\n");
  run(["commit", "-qam", "second"]);
  const second = run(["rev-parse", "HEAD"]);
  run(["update-ref", "refs/remotes/origin/main", second]);
  return { dir, run, first, second };
}

function health(dir: string) {
  const result = spawnSync("node", [script], { cwd: dir, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

it("prints (无) and passes when the deploy signal branches do not exist", () => {
  const { dir } = fixture();
  const { code, out } = health(dir);
  expect(code).toBe(0);
  expect(out).toContain("ops/deploy-target    : (无)");
  expect(out).toContain("ops/prod-live        : (无)");
  expect(out).not.toContain("部署信号不一致");
});

it("fails critically when deploy-target and prod-live disagree", () => {
  const { dir, run, first, second } = fixture();
  run(["update-ref", "refs/remotes/origin/ops/deploy-target", second]);
  run(["update-ref", "refs/remotes/origin/ops/prod-live", first]);
  const { code, out } = health(dir);
  expect(code).toBe(1);
  expect(out).toContain("[严重] 部署信号不一致：ops/deploy-target ≠ ops/prod-live");
});

it("stays green when both signals equal the main tip", () => {
  const { dir, run, second } = fixture();
  run(["update-ref", "refs/remotes/origin/ops/deploy-target", second]);
  run(["update-ref", "refs/remotes/origin/ops/prod-live", second]);
  const { code, out } = health(dir);
  expect(code).toBe(0);
  expect(out).not.toContain("部署信号不一致");
  expect(out).not.toContain("main 比部署信号领先");
});

it("warns (without failing) when main is ahead of the deploy signal", () => {
  const { dir, run, first, second } = fixture();
  run(["update-ref", "refs/remotes/origin/ops/deploy-target", first]);
  run(["update-ref", "refs/remotes/origin/ops/prod-live", first]);
  const { code, out } = health(dir);
  expect(code).toBe(0);
  expect(out).toContain("main 比部署信号领先");
  expect(out).toContain("1 个提交");
  void second;
});
