#!/usr/bin/env node
// Rebuild the local ANS patch from an exact upstream Git commit. No inference.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tools/gh-aw-ans");
const manifest = JSON.parse(readFileSync(path.join(toolDirectory, "manifest.json"), "utf8"));
const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  if (!["--source", "--output"].includes(flag) || !args[index + 1] || options[flag]) {
    throw new Error("Usage: node scripts/build-review-compiler.mjs --source <upstream checkout> --output <new absolute directory>");
  }
  options[flag] = args[index + 1];
}
if (!options["--source"] || !options["--output"] || !path.isAbsolute(options["--output"])) {
  throw new Error("Provide an upstream checkout and a new absolute output directory.");
}
const source = realpathSync(path.resolve(options["--source"]));
const output = path.resolve(options["--output"]);
if (!existsSync(source) || existsSync(output)) throw new Error("Source must exist; output must not exist. Existing files are never removed.");
function run(command, commandArgs, cwd, capture = false, env = process.env) {
  const result = spawnSync(command, commandArgs, { cwd, env, shell: false, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (exit ${result.status}). Output is retained for inspection.`);
  return capture ? result.stdout.trim() : undefined;
}
function canonicalNewPath(target) {
  let parent = target;
  const missing = [];
  while (!existsSync(parent)) {
    const next = path.dirname(parent);
    if (next === parent) throw new Error("Cannot resolve output parent directory.");
    missing.unshift(path.basename(parent));
    parent = next;
  }
  return path.join(realpathSync(parent), ...missing);
}
const sourceRoot = realpathSync(run("git", ["rev-parse", "--show-toplevel"], source, true));
const resolvedOutput = canonicalNewPath(output);
const sourceRelativeOutput = path.relative(sourceRoot, resolvedOutput);
if (sourceRelativeOutput === "" || (!path.isAbsolute(sourceRelativeOutput) && sourceRelativeOutput !== ".." && !sourceRelativeOutput.startsWith(`..${path.sep}`))) {
  throw new Error("Output must be outside the supplied Git worktree, including directory aliases.");
}
function sha256(file) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }
const patch = path.join(toolDirectory, "detection-model-policy.patch");
const regression = path.join(toolDirectory, "ans_detection_model_policy_test.go");
if (sha256(patch) !== manifest.patchSha256 || sha256(regression) !== manifest.testSha256) throw new Error("Bundled patch/test integrity mismatch.");
run("git", ["cat-file", "-e", `${manifest.upstreamCommit}^{commit}`], source);
mkdirSync(output, { recursive: true });
const checkout = path.join(output, "source");
run("git", ["-c", "core.autocrlf=false", "clone", "--no-hardlinks", "--no-checkout", "--", source, checkout], output);
run("git", ["-c", "core.autocrlf=false", "checkout", "--detach", manifest.upstreamCommit], checkout);
if (run("git", ["rev-parse", "HEAD"], checkout, true) !== manifest.upstreamCommit) throw new Error("Upstream commit mismatch.");
run("git", ["apply", "--unidiff-zero", "--check", patch], checkout);
run("git", ["apply", "--unidiff-zero", patch], checkout);
copyFileSync(regression, path.join(checkout, "pkg/workflow/ans_detection_model_policy_test.go"));
run("git", ["diff", "--check"], checkout);
const temporaryDirectory = path.join(output, "tmp");
mkdirSync(temporaryDirectory);
const env = { ...process.env, GOTMPDIR: temporaryDirectory };
run("go", ["test", "./pkg/workflow", "-run", manifest.regressionPattern, "-count=1"], checkout, false, env);
const binary = path.join(output, process.platform === "win32" ? "gh-aw-ans-model-policy.exe" : "gh-aw-ans-model-policy");
// Retain the base version so the upstream blocked-version check still applies.
// The filename, bundled manifest and generated build receipt identify this patch.
run("go", ["build", "-trimpath", "-ldflags", `-X main.version=${manifest.upstreamVersion} -X main.isRelease=true`, "-o", binary, "./cmd/gh-aw"], checkout, false, env);
const receipt = {
  distribution: manifest.distribution,
  upstreamRepository: manifest.upstreamRepository,
  upstreamCommit: manifest.upstreamCommit,
  compilerReportedBaseVersion: manifest.upstreamVersion,
  patchSha256: manifest.patchSha256,
  testSha256: manifest.testSha256,
  goVersion: run("go", ["version"], checkout, true, env),
  binarySha256: sha256(binary),
  regressionTests: "passed",
  inferenceInvoked: false,
  builtAt: new Date().toISOString(),
};
writeFileSync(path.join(output, "build-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Built ${manifest.distribution}. Base version: ${manifest.upstreamVersion}.`);
console.log(`Binary: ${binary}`);
console.log("No workflow was activated and no model was called.");