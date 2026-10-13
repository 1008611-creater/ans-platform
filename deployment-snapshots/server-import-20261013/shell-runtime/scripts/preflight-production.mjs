import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicAnsReadyStates = {
  backend: "supabase",
  objectStorage: "configured",
  analytics: "configured",
  errorMonitoring: "configured",
};

const fullPlatformReadyStates = {
  ...publicAnsReadyStates,
  codexfastWorker: "configured",
  codexfastPreview: "configured",
};

function requiredReadyStates(scope = "public-ans") {
  return scope === "full-platform" ? fullPlatformReadyStates : publicAnsReadyStates;
}

function present(value) {
  return Boolean(String(value || "").trim());
}

function validHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && Boolean(url.host);
  } catch {
    return false;
  }
}

function validAnalyticsToken(value) {
  try {
    const token = JSON.parse(String(value || ""))?.token;
    return /^[a-z0-9]{16,128}$/i.test(token || "");
  } catch {
    return false;
  }
}

export function validateEnvironment(environment = process.env, scope = "public-ans") {
  const failures = [];
  const requireValue = (key, condition = present(environment[key])) => {
    if (!condition) failures.push(`env:${key}`);
  };

  requireValue("NODE_ENV", environment.NODE_ENV === "production");
  requireValue("DATA_BACKEND", environment.DATA_BACKEND === "supabase");
  requireValue("PUBLIC_ORIGIN", validHttpsUrl(environment.PUBLIC_ORIGIN));
  requireValue("SUPABASE_URL", validHttpsUrl(environment.SUPABASE_URL));
  requireValue("SUPABASE_SERVICE_ROLE_KEY");

  for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) requireValue(key);
  requireValue("CF_ANALYTICS_TOKEN", validAnalyticsToken(environment.CF_ANALYTICS_TOKEN));
  requireValue("SENTRY_DSN", validHttpsUrl(environment.SENTRY_DSN));
  requireValue("SENTRY_ENVIRONMENT", present(environment.SENTRY_ENVIRONMENT));
  requireValue("APP_RELEASE", present(environment.APP_RELEASE));
  if (scope === "full-platform") {
    requireValue("CODEXFAST_WORKER_TOKEN", String(environment.CODEXFAST_WORKER_TOKEN || "").trim().length >= 32);
    requireValue("CODEXFAST_WORKER_IP_ALLOWLIST");
    requireValue("CODEXFAST_PREVIEW_ORIGIN", validHttpsUrl(environment.CODEXFAST_PREVIEW_ORIGIN));
    requireValue("CODEXFAST_DEFAULT_COST_CAP", Number(environment.CODEXFAST_DEFAULT_COST_CAP) > 0);
  }
  return failures;
}

export function validateReadyState(payload, scope = "public-ans") {
  if (!payload?.ok) return ["readyz:ok"];
  return Object.entries(requiredReadyStates(scope))
    .filter(([key, expected]) => payload[key] !== expected)
    .map(([key]) => `readyz:${key}`);
}

export async function validateRollbackEvidence(pathname, offhostPath) {
  const failures = [];
  if (!existsSync(resolve(repositoryRoot, "scripts/backup-app-state.sh"))) failures.push("rollback:backup-script");
  if (!existsSync(resolve(repositoryRoot, "scripts/backup-app-state-r2.sh"))) failures.push("rollback:offhost-backup-script");
  if (!pathname) return [...failures, "rollback:backup-evidence"];
  try {
    const evidence = await stat(pathname);
    if (!evidence.isFile() || evidence.size === 0) failures.push("rollback:backup-evidence");
  } catch {
    failures.push("rollback:backup-evidence");
  }
  if (!offhostPath) return [...failures, "rollback:offhost-evidence"];
  try {
    const evidence = JSON.parse(await readFile(offhostPath, "utf8"));
    if (!evidence?.bucket || !evidence?.objectKey || !Number.isFinite(Number(evidence?.bytes)) || Number(evidence.bytes) <= 0 || !/^[a-f0-9]{64}$/i.test(evidence?.sha256 || "") || !evidence?.verifiedAt) {
      failures.push("rollback:offhost-evidence");
    }
  } catch {
    failures.push("rollback:offhost-evidence");
  }
  return failures;
}

async function readyState(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { payload: null, failures: ["readyz:http"] };
    return { payload: await response.json(), failures: [] };
  } catch {
    return { payload: null, failures: ["readyz:unreachable"] };
  }
}

function argumentsFor(argv) {
  const values = { readyUrl: process.env.ANS_READY_URL || "http://127.0.0.1:4194/readyz", backupEvidence: "", offhostEvidence: "", scope: "public-ans", json: false };
  for (const argument of argv) {
    if (argument === "--json") values.json = true;
    else if (argument.startsWith("--ready-url=")) values.readyUrl = argument.slice("--ready-url=".length);
    else if (argument.startsWith("--backup-evidence=")) values.backupEvidence = argument.slice("--backup-evidence=".length);
    else if (argument.startsWith("--offhost-evidence=")) values.offhostEvidence = argument.slice("--offhost-evidence=".length);
    else if (argument === "--scope=full-platform") values.scope = "full-platform";
  }
  return values;
}

export async function runPreflight({ environment = process.env, readyUrl, backupEvidence, offhostEvidence, scope = "public-ans" } = {}) {
  const environmentFailures = validateEnvironment(environment, scope);
  const ready = await readyState(readyUrl || environment.ANS_READY_URL || "http://127.0.0.1:4194/readyz");
  const readinessFailures = [...ready.failures, ...validateReadyState(ready.payload, scope)];
  const rollbackFailures = await validateRollbackEvidence(backupEvidence || environment.ANS_BACKUP_EVIDENCE || "", offhostEvidence || environment.ANS_OFFHOST_BACKUP_EVIDENCE || "");
  const failures = [...environmentFailures, ...readinessFailures, ...rollbackFailures];
  return {
    status: failures.length ? "blocked" : "deploy-ready",
    blocker: failures.length ? "production-environment-contract" : "",
    failures,
    evidence: {
      readyzChecked: !ready.failures.length,
      scope,
      readyzStates: ready.payload ? Object.fromEntries(Object.keys(requiredReadyStates(scope)).map((key) => [key, ready.payload[key] || "not-configured"])) : {},
      rollbackEvidenceProvided: Boolean(backupEvidence || environment.ANS_BACKUP_EVIDENCE),
      offhostRollbackEvidenceProvided: Boolean(offhostEvidence || environment.ANS_OFFHOST_BACKUP_EVIDENCE),
    },
  };
}

async function main() {
  const options = argumentsFor(process.argv.slice(2));
  const result = await runPreflight({ readyUrl: options.readyUrl, backupEvidence: options.backupEvidence, offhostEvidence: options.offhostEvidence, scope: options.scope });
  if (options.json) console.log(JSON.stringify(result));
  else {
    console.log(`ANS production preflight: ${result.status}`);
    if (result.failures.length) console.log(`Missing or unhealthy checks: ${result.failures.join(", ")}`);
    console.log(`Scope: ${result.evidence.scope}; readyz checked: ${result.evidence.readyzChecked ? "yes" : "no"}; local rollback: ${result.evidence.rollbackEvidenceProvided ? "provided" : "missing"}; off-host rollback: ${result.evidence.offhostRollbackEvidenceProvided ? "provided" : "missing"}`);
  }
  process.exitCode = result.status === "deploy-ready" ? 0 : 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
