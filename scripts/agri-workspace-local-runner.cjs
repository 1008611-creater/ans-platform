// Isolated PostgreSQL only; no shared client generation or production configuration.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const mode = process.argv[2] || "integration";
if (!["integration", "lint", "types", "schema", "schema-diff", "foundation-schema"].includes(mode)) throw new Error("Unsupported check");
const info = JSON.parse(execFileSync("docker", ["inspect", "ans-audit3-db"], {encoding:"utf8",windowsHide:true}))[0];
const pg = Object.fromEntries(info.Config.Env.map(v=>{const i=v.indexOf("=");return [v.slice(0,i),v.slice(i+1)];}));
const user=pg.POSTGRES_USER||"postgres", password=pg.POSTGRES_PASSWORD;
if(!password||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(user)) throw new Error("Isolated credentials unavailable");
const database="ans_product_verify_agri_workspace_r1";
const url="postgresql://"+encodeURIComponent(user)+":"+encodeURIComponent(password)+"@127.0.0.1:55438/"+database+"?schema=public";
const env={...process.env};
for(const key of Object.keys(env)) if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(key)) env[key]="";
Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,PRISMA_CLIENT_ENGINE_TYPE:"binary",ANS_PROJECT_WORKER_DISABLED:"true",NEXT_TELEMETRY_DISABLED:"1",ANS_TOONFLOW_COMPUTE_ENABLED:"0",ANS_TOONFLOW_EMBED_ENABLED:"0"});
const dir=".workbuddy/evidence/agri-workspace";fs.mkdirSync(dir,{recursive:true});
function run(args,label){
 const result=spawnSync(process.execPath,args,{env,encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024});
 const text=((result.stdout||"")+(result.stderr||"")).replaceAll(url,"[isolated-database]").replaceAll(password,"[redacted]");
 const target=dir+"/"+label;
 if(fs.existsSync(target+".log")) fs.copyFileSync(target+".log",target+"-previous-"+Date.now()+".log");
 fs.writeFileSync(target+".log",text);fs.writeFileSync(target+"-exit.json",JSON.stringify({exitCode:result.status,isolatedPostgres:true,productionWrites:false})+"\n");
 console.log("[workspace] "+label+" exit "+result.status);
 if(result.status!==0){console.error(text.slice(-4500));process.exit(result.status||1);}
 return text;
}
if(mode==="integration"){
 const exists=execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-Atc","SELECT 1 FROM pg_database WHERE datname='"+database+"'"],{encoding:"utf8",windowsHide:true}).trim();
 if(!exists) execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-c","CREATE DATABASE "+database],{stdio:"ignore",windowsHide:true});
 run(["node_modules/prisma/build/index.js","migrate","deploy"],"migrations");
 run(["node_modules/tsx/dist/cli.mjs","scripts/agri-workspace-integration.ts"],"integration");
}else if(mode==="lint")run(["node_modules/eslint/bin/eslint.js","src/server/competitions/agrihackathon/workspace.ts","src/contracts/agri-workspace.ts","scripts/agri-workspace-integration.ts","scripts/agri-workspace-local-runner.cjs"],"lint");
else if(mode==="types")run(["node_modules/typescript/bin/tsc","-p","tsconfig.typecheck.json","--noEmit","--incremental","false"],"types");
else if(mode==="foundation-schema") {
 const diff=run(["node_modules/prisma/build/index.js","migrate","diff","--from-url",url,"--to-schema-datamodel","prisma/schema.prisma","--script"],"full-schema-diff-sql");
 const foundationTables=["agri_workspaces","agri_rule_versions","agri_stage_windows","agri_access_grants","agri_workspace_events","agri_command_receipts"];
 const drift=foundationTables.filter(table=>diff.includes(table));
 fs.writeFileSync(dir+"/foundation-schema.json",JSON.stringify({isolatedPostgres:true,productionWrites:false,foundationTables,foundationDrift:drift,passed:drift.length===0,wholeSchemaMatches:!/(?:ALTER|DROP|CREATE) (?:TABLE|TYPE|INDEX)/.test(diff),limits:"Existing prompt review, admin config default and catalog foreign key baseline drift retained; not a whole-schema clean report."},null,2)+"\n");
 if(drift.length) throw new Error("Foundation schema drift: "+drift.join(", "));
 console.log("[workspace] foundation schema matches all six new tables; baseline drift remains recorded");
} else if(mode==="schema-diff")run(["node_modules/prisma/build/index.js","migrate","diff","--from-url",url,"--to-schema-datamodel","prisma/schema.prisma","--exit-code"],"schema-diff");
else run(["node_modules/prisma/build/index.js","validate"],"schema");
