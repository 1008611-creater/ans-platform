// Isolated PostgreSQL only; no shared client generation or production configuration.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const mode = process.argv[2] || "integration";
if (!["integration", "lint", "types", "schema", "schema-diff", "stage-schema", "migrations", "unit", "persistence", "script-types", "build", "http", "browser"].includes(mode)) throw new Error("Unsupported check");
const info = JSON.parse(execFileSync("docker", ["inspect", "ans-audit3-db"], {encoding:"utf8",windowsHide:true}))[0];
const pg = Object.fromEntries(info.Config.Env.map(v=>{const i=v.indexOf("=");return [v.slice(0,i),v.slice(i+1)];}));
const user=pg.POSTGRES_USER||"postgres", password=pg.POSTGRES_PASSWORD;
if(!password||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(user)) throw new Error("Isolated credentials unavailable");
const database="ans_product_verify_agri_submissions_r1";
const url="postgresql://"+encodeURIComponent(user)+":"+encodeURIComponent(password)+"@127.0.0.1:55438/"+database+"?schema=public";
const env={...process.env};
// Prevent Next dotenv loading real provider credentials absent from the inherited process.
for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) if (fs.existsSync(file)) {
 for (const line of fs.readFileSync(file,"utf8").split(/\r?\n/)) {
  const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if(match) env[match[1]]="";
 }
}
for(const key of Object.keys(env)) if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(key)) env[key]="";
Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,PRISMA_CLIENT_ENGINE_TYPE:"binary",ANS_PROJECT_WORKER_DISABLED:"true",NEXT_TELEMETRY_DISABLED:"1",ANS_TOONFLOW_COMPUTE_ENABLED:"0",ANS_TOONFLOW_EMBED_ENABLED:"0", AUTH_SECRET:randomBytes(32).toString("hex"), AUTH_TRUST_HOST:"true", AUTH_URL:"http://127.0.0.1:3148", NEXTAUTH_URL:"http://127.0.0.1:3148", NEXT_PUBLIC_APP_URL:"http://127.0.0.1:3148", NODE_ENV:mode==="unit"?"test":"production",
 ...(["build","http","browser"].includes(mode)?{ANS_LOCAL_DIST_DIR:".next-agri-submissions"}:{})});
const dir=".workbuddy/evidence/agri-submissions";fs.mkdirSync(dir,{recursive:true});
function run(args,label){
 const result=spawnSync(process.execPath,args,{env,encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024});
 const text=((result.stdout||"")+(result.stderr||"")).replaceAll(url,"[isolated-database]").replaceAll(password,"[redacted]");
 const target=dir+"/"+label;
 if(fs.existsSync(target+".log")) fs.copyFileSync(target+".log",target+"-previous-"+Date.now()+".log");
 fs.writeFileSync(target+".log",text);fs.writeFileSync(target+"-exit.json",JSON.stringify({exitCode:result.status,isolatedPostgres:true,productionWrites:false})+"\n");
 console.log("[submissions] "+label+" exit "+result.status);
 if(result.status!==0){console.error(text.slice(-4500));process.exit(result.status||1);}
 return text;
}
if(["integration","migrations","persistence","http","browser"].includes(mode)){
 const exists=execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-Atc","SELECT 1 FROM pg_database WHERE datname='"+database+"'"],{encoding:"utf8",windowsHide:true}).trim();
 if(!exists) execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-c","CREATE DATABASE "+database],{stdio:"ignore",windowsHide:true});
 run(["node_modules/prisma/build/index.js","migrate","deploy"],"migrations");
 if(mode!=="migrations") run(["node_modules/tsx/dist/cli.mjs",["http","browser"].includes(mode)?"scripts/agri-submissions-http-check.ts":"scripts/agri-submissions-integration.ts",...(mode==="persistence"?["--persistence"]:mode==="browser"?["--browser"]:[])],mode);
}else if(mode==="lint")run(["node_modules/eslint/bin/eslint.js","src/server/competitions/agrihackathon/submissions.ts","src/server/competitions/agrihackathon/submissions-http.ts","src/contracts/agri-submissions.ts","src/app/api/competitions/agrihackathon/submissions","src/__tests__/api/agri-submission-routes.test.ts","src/server/competitions/service.ts","src/__tests__/lib/competition-service.test.ts","next.config.ts","eslint.config.mjs","src/components/competitions/agri-submissions.tsx","src/components/competitions/agri-submission-recovery.tsx","src/app/competitions/agrihackathon/submissions","src/__tests__/components/agri-submissions.test.tsx","src/components/competitions/agri-works.tsx","src/domain/competitions/agri-works-export.ts","src/app/competitions/agrihackathon/works","src/app/competitions/agrihackathon/page.tsx","src/__tests__/components/agri-works.test.tsx","src/__tests__/lib/agri-works-export.test.ts"],"lint");
else if(mode==="unit")run(["node_modules/vitest/vitest.mjs","run","--testTimeout=30000","src/__tests__/api/agri-submission-routes.test.ts","src/__tests__/lib/agri-submissions.test.ts","src/__tests__/lib/competition-service.test.ts","src/__tests__/lib/eslint-config.test.ts","src/__tests__/components/agri-submissions.test.tsx","src/__tests__/lib/product-translations.test.ts","src/__tests__/lib/agri-works-export.test.ts","src/__tests__/components/agri-works.test.tsx","src/__tests__/components/agrihackathon-landing.test.tsx"],"unit");
else if(mode==="build")run(["node_modules/next/dist/bin/next","build","--webpack"],"build");
else if(mode==="script-types"){
 const config=path.resolve(dir,"tsconfig.scripts.json");
 fs.writeFileSync(config,JSON.stringify({extends:path.resolve("tsconfig.typecheck.json"),include:[path.resolve("scripts/agri-submissions-integration.ts"),path.resolve("scripts/agri-submissions-http-check.ts")],exclude:["node_modules"]}));
 run(["node_modules/typescript/bin/tsc","-p",config,"--noEmit","--incremental","false"],"script-types");
}
else if(mode==="types")run(["node_modules/typescript/bin/tsc","-p","tsconfig.typecheck.json","--noEmit","--incremental","false"],"types");
else if(mode==="stage-schema") {
 const diff=run(["node_modules/prisma/build/index.js","migrate","diff","--from-url",url,"--to-schema-datamodel","prisma/schema.prisma","--script"],"full-schema-diff-sql");
 const foundationTables=["agri_entry_stages","agri_stage_submissions","agri_submission_material_refs","agri_submission_events","agri_submission_receipts"];
 const drift=foundationTables.filter(table=>diff.includes(table));
 fs.writeFileSync(dir+"/stage-schema.json",JSON.stringify({isolatedPostgres:true,productionWrites:false,foundationTables,foundationDrift:drift,passed:drift.length===0,wholeSchemaMatches:!/(?:ALTER|DROP|CREATE) (?:TABLE|TYPE|INDEX)/.test(diff),limits:"Existing prompt review, admin config default and catalog foreign key baseline drift retained; not a whole-schema clean report."},null,2)+"\n");
 if(drift.length) throw new Error("Foundation schema drift: "+drift.join(", "));
 console.log("[submissions] foundation schema matches all five stage tables; baseline drift remains recorded");
} else if(mode==="schema-diff")run(["node_modules/prisma/build/index.js","migrate","diff","--from-url",url,"--to-schema-datamodel","prisma/schema.prisma","--exit-code"],"schema-diff");
else run(["node_modules/prisma/build/index.js","validate"],"schema");
