const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
const mode = process.argv[2] || "integration";
const allowed = ["integration", "persistence", "unit", "build", "http", "serve"];
if (!allowed.includes(mode)) throw new Error("Invalid operation");
const info = JSON.parse(execFileSync("docker", ["inspect", "ans-audit3-db"], { encoding: "utf8", windowsHide: true }))[0];
const pg = Object.fromEntries(info.Config.Env.map(entry => { const i = entry.indexOf("="); return [entry.slice(0, i), entry.slice(i + 1)]; }));
const user = pg.POSTGRES_USER || "postgres", password = pg.POSTGRES_PASSWORD;
if (!password || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(user)) throw new Error("Isolated credentials unavailable");
const env = { ...process.env };
for (const key of Object.keys(env)) if (/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(key)) env[key] = "";
const database = "ans_product_verify_agri_tasks_r1";
const url = "postgresql://" + encodeURIComponent(user) + ":" + encodeURIComponent(password) + "@127.0.0.1:55438/" + database + "?schema=public";
Object.assign(env, { AUTH_SECRET: randomBytes(32).toString("hex"), AUTH_TRUST_HOST: "true", AUTH_URL: "http://127.0.0.1:3146", NEXTAUTH_URL: "http://127.0.0.1:3146", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3146", DATABASE_URL: url, DIRECT_URL: url, PRISMA_CLIENT_ENGINE_TYPE: "binary", ANS_PROJECT_WORKER_DISABLED: "true", NEXT_TELEMETRY_DISABLED: "1", ...(["build", "http", "serve"].includes(mode) ? { ANS_LOCAL_DIST_DIR: ".next-agri-tasks" } : {}), ANS_TOONFLOW_COMPUTE_ENABLED: "0", ANS_TOONFLOW_EMBED_ENABLED: "0", NODE_ENV: mode === "unit" ? "test" : "production" });
fs.mkdirSync(".workbuddy/evidence/agri-tasks", { recursive: true });
function execute(args, label) {
  const result = spawnSync(process.execPath, args, { env, encoding: "utf8", windowsHide: true, maxBuffer: 12 * 1024 * 1024 });
  const text = ((result.stdout || "") + (result.stderr || "")).replaceAll(url, "[isolated-database]").replaceAll(password, "[redacted]");
  if (fs.existsSync(".workbuddy/evidence/agri-tasks/" + label + ".log")) fs.copyFileSync(".workbuddy/evidence/agri-tasks/" + label + ".log", ".workbuddy/evidence/agri-tasks/" + label + "-previous-" + Date.now() + ".log");
  fs.writeFileSync(".workbuddy/evidence/agri-tasks/" + label + ".log", text);
  fs.writeFileSync(".workbuddy/evidence/agri-tasks/" + label + "-exit.json", JSON.stringify({ exitCode: result.status, isolatedPostgres: true, productionWrites: false }) + "\n");
  console.log("[agri] " + label + " exit " + result.status); if (result.status !== 0) { console.error(text.slice(-5000)); process.exit(result.status || 1); }
}
if (mode === "integration") {
  const exists = execFileSync("docker", ["exec", "ans-audit3-db", "psql", "-U", user, "-d", "postgres", "-Atc", "SELECT 1 FROM pg_database WHERE datname='ans_product_verify_agri_tasks_r1'"], { encoding: "utf8", windowsHide: true }).trim();
  if (!exists) execFileSync("docker", ["exec", "ans-audit3-db", "psql", "-U", user, "-d", "postgres", "-c", "CREATE DATABASE ans_product_verify_agri_tasks_r1"], { stdio: "ignore", windowsHide: true });
  execute(["node_modules/prisma/build/index.js", "migrate", "deploy"], "migrations");
  execute(["node_modules/tsx/dist/cli.mjs", "scripts/agri-tasks-integration.ts"], "integration");
} else if (mode === "persistence") execute(["node_modules/tsx/dist/cli.mjs", "scripts/agri-tasks-integration.ts", "--persistence"], "persistence");
else if (mode === "unit") execute(["node_modules/vitest/vitest.mjs", "run", "src/__tests__/lib/agri-tasks.test.ts", "src/__tests__/api/agri-task-routes.test.ts", "src/__tests__/lib/agrihackathon-policy.test.ts", "src/__tests__/components/agrihackathon-landing.test.tsx", "src/__tests__/lib/product-translations.test.ts", "src/__tests__/components/agri-timetable.test.tsx"], "unit");
else if (mode === "http") execute(["node_modules/tsx/dist/cli.mjs", "scripts/agri-tasks-http-check.ts"], "http");
else if (mode === "serve") {
  const fixture = JSON.parse(fs.readFileSync(".workbuddy/evidence/agri-tasks/http-fixture.json", "utf8"));
  if (!/^[a-z0-9-]+$/i.test(fixture.competitionId)) throw new Error("Invalid isolated fixture");
  env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
  const server = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3146"], { env, windowsHide: true, stdio: "inherit" });
  process.exitCode = server.status || 0;
} else execute(["node_modules/next/dist/bin/next", "build", "--webpack"], "build");
