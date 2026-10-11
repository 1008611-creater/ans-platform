const { execFileSync, spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
const info = JSON.parse(execFileSync("docker", ["inspect", "ans-audit3-db"], { encoding: "utf8", windowsHide: true }))[0];
const pg = Object.fromEntries(info.Config.Env.map(entry => { const i = entry.indexOf("="); return [entry.slice(0, i), entry.slice(i + 1)]; }));
const user = pg.POSTGRES_USER || "postgres", password = pg.POSTGRES_PASSWORD;
if (!password || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(user)) throw new Error("Isolated credentials unavailable");
const env = { ...process.env };
for (const key of Object.keys(env)) if (/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(key)) env[key] = "";
const url = "postgresql://" + encodeURIComponent(user) + ":" + encodeURIComponent(password) + "@127.0.0.1:55438/ans_product_verify_compute_r2?schema=public";
Object.assign(env, { DATABASE_URL: url, DIRECT_URL: url, AUTH_SECRET: randomBytes(32).toString("hex"), ANS_PROJECT_WORKER_DISABLED: "true", ANS_TOONFLOW_COMPUTE_ENABLED: "0", NODE_ENV: "production" });
const mode = process.argv[2] || "integration";
if (mode === "integration") {
  const exists = execFileSync("docker", ["exec", "ans-audit3-db", "psql", "-U", user, "-d", "postgres", "-Atc", "SELECT 1 FROM pg_database WHERE datname='ans_product_verify_compute_r2'"], { encoding: "utf8", windowsHide: true }).trim();
  if (!exists) execFileSync("docker", ["exec", "ans-audit3-db", "psql", "-U", user, "-d", "postgres", "-c", "CREATE DATABASE ans_product_verify_compute_r2"], { stdio: "ignore", windowsHide: true });
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe", windowsHide: true });
  if (result.status !== 0) { console.error("[compute] isolated migration failed (diagnostics withheld)"); process.exit(1); }
  console.log("[compute] isolated migrations deployed");
}
const args = mode === "integration" ? ["node_modules/tsx/dist/cli.mjs", "scripts/compute-integration.ts"] : mode === "http" ? ["node_modules/tsx/dist/cli.mjs", "scripts/compute-http-check.ts"] : mode === "build" ? ["node_modules/next/dist/bin/next", "build", "--webpack"] : mode === "unit" ? ["node_modules/vitest/vitest.mjs", "run", "src/__tests__/lib/compute-policy.test.ts", "src/__tests__/api/compute-routes.test.ts"] : null;
if (!args) throw new Error("Invalid operation");
fs.mkdirSync(".workbuddy/evidence/compute", { recursive: true });
const log = fs.createWriteStream(".workbuddy/evidence/compute/" + mode + ".log");
const child = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
for (const stream of [child.stdout, child.stderr]) stream.on("data", data => { const text = data.toString().replaceAll(url, "[isolated-database]").replaceAll(password, "[redacted]").replaceAll(env.AUTH_SECRET, "[fixture-secret]"); log.write(text); process.stdout.write(text); });
child.on("exit", code => { log.end(); fs.writeFileSync(".workbuddy/evidence/compute/" + mode + "-exit.json", JSON.stringify({ exitCode: code, isolatedPostgres: true, providerCalls: 0, realFunds: false }) + "\n"); process.exitCode = code === 0 ? 0 : code || 1; });
