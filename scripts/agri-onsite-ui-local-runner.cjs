// Frontend checks only: no database or production operations.
const fs = require("node:fs"), cp = require("node:child_process"), { randomBytes } = require("node:crypto");
const dir = ".workbuddy/evidence/agri-onsite-ui";
fs.mkdirSync(dir, { recursive: true });
const env = { ...process.env };
for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) env[match[1]] = "";
  }
}
for (const name of Object.keys(env)) if (/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(name)) env[name] = "";
Object.assign(env, { DATABASE_URL: "postgresql://postgres:NoDatabaseAccess@127.0.0.1:1/onsite_ui_no_database", DIRECT_URL: "postgresql://postgres:NoDatabaseAccess@127.0.0.1:1/onsite_ui_no_database", AUTH_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1", ANS_PROJECT_WORKER_DISABLED: "true", ANS_AGRIHACKATHON_COMPETITION_ID: "", ANS_TOONFLOW_COMPUTE_ENABLED: "0", ANS_TOONFLOW_EMBED_ENABLED: "0", AUTH_URL: "http://127.0.0.1:3162", NEXTAUTH_URL: "http://127.0.0.1:3162", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3162", AUTH_TRUST_HOST: "true" });
const jobs = [
  ["unit", ["node_modules/vitest/vitest.mjs", "run", "src/__tests__/components/agri-onsite.test.tsx", "src/__tests__/lib/agri-onsite.test.ts", "src/__tests__/api/agri-onsite-routes.test.ts", "src/__tests__/components/agri-works.test.tsx", "src/__tests__/components/agri-record-summary.test.tsx", "src/__tests__/components/agri-task-references.test.tsx", "src/__tests__/components/agrihackathon-landing.test.tsx", "src/__tests__/lib/product-translations.test.ts"]],
  ["lint", ["node_modules/eslint/bin/eslint.js", "src/components/competitions/agri-onsite.tsx", "src/components/competitions/agri-onsite-recovery.tsx", "src/app/competitions/(full)/agrihackathon/onsite/page.tsx", "src/__tests__/components/agri-onsite.test.tsx", "src/__tests__/lib/agri-onsite.test.ts", "src/__tests__/api/agri-onsite-routes.test.ts", "src/components/providers/index.tsx", "src/components/competitions/agri-works.tsx", "src/app/competitions/(full)/agrihackathon/page.tsx", "src/contracts/agri-onsite.ts", "src/server/competitions/agrihackathon/onsite.ts"]],
  ["script-lint", ["node_modules/eslint/bin/eslint.js", "--no-ignore", "scripts/agri-onsite-integration.ts"]],
  ["runner-syntax", ["--check", "scripts/agri-onsite-ui-local-runner.cjs"]],
  ["backend-runner-syntax", ["--check", "scripts/agri-onsite-local-runner.cjs"]],
  ["types", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit", "--incremental", "false"]],
];
for (const [label, args] of jobs) {
  if (process.argv[2] && process.argv[2] !== label) continue;
  const result = cp.spawnSync(process.execPath, args, { env, encoding: "utf8", windowsHide: true, timeout: 300000, maxBuffer: 12 * 1024 * 1024 });
  const text = (result.stdout || "") + (result.stderr || "");
  if (fs.existsSync(dir+"/"+label+".log")) fs.copyFileSync(dir+"/"+label+".log", dir+"/"+label+"-previous-"+Date.now()+".log");
  fs.writeFileSync(dir+"/"+label+".log", text);
  fs.writeFileSync(dir+"/"+label+"-exit.json", JSON.stringify({ exitCode: result.status, frontendOnly: true, databaseAccess: false, productionWrites: false })+"\n");
  console.log("[onsite-ui] " + label + " exit " + result.status);
  if (result.status !== 0) { console.error(text.slice(-6000)); process.exitCode = 1; break; }
}
