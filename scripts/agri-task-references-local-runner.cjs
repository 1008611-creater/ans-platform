// All modes use synthetic users and a dedicated loopback PostgreSQL database.
const {execFileSync,spawnSync}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),{randomBytes}=require("node:crypto");
const mode=process.argv[2]||"integration";
if(!["schema","migrations","integration","persistence","lint","types","unit","script-types","boundaries","build","http","serve","all-unit","all-lint","docs","issues"].includes(mode))throw new Error("Unsupported issue check");
const info=JSON.parse(execFileSync("docker",["inspect","ans-audit3-db"],{encoding:"utf8",windowsHide:true}))[0];
const pg=Object.fromEntries(info.Config.Env.map(v=>{const i=v.indexOf("=");return[v.slice(0,i),v.slice(i+1)];}));
const user=pg.POSTGRES_USER||"postgres",password=pg.POSTGRES_PASSWORD,database="ans_product_verify_agri_references_r2";
if(!password||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(user))throw new Error("Isolated credentials unavailable");
const url="postgresql://"+encodeURIComponent(user)+":"+encodeURIComponent(password)+"@127.0.0.1:55438/"+database+"?schema=public";
const env={...process.env};
for(const file of [".env",".env.local",".env.production",".env.production.local"])if(fs.existsSync(file))for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);if(match)env[match[1]]="";}
for(const name of Object.keys(env))if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(name))env[name]="";
Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,PRISMA_CLIENT_ENGINE_TYPE:"binary",ANS_PROJECT_WORKER_DISABLED:"true",NEXT_TELEMETRY_DISABLED:"1",ANS_TOONFLOW_COMPUTE_ENABLED:"0",ANS_TOONFLOW_EMBED_ENABLED:"0",AUTH_SECRET:randomBytes(32).toString("hex"),AUTH_TRUST_HOST:"true",AUTH_URL:"http://127.0.0.1:3158",NEXTAUTH_URL:"http://127.0.0.1:3158",NEXT_PUBLIC_APP_URL:"http://127.0.0.1:3158",NODE_ENV:["unit","all-unit"].includes(mode)?"test":"production",ANS_LOCAL_DIST_DIR:".next-agri-references"});
const dir=".workbuddy/evidence/agri-references";fs.mkdirSync(dir,{recursive:true});
function run(args,label){const result=spawnSync(process.execPath,args,{env,encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024});const text=((result.stdout||"")+(result.stderr||"")).replaceAll(url,"[isolated-database]").replaceAll(password,"[redacted]");const target=dir+"/"+label;if(fs.existsSync(target+".log"))fs.copyFileSync(target+".log",target+"-previous-"+Date.now()+".log");fs.writeFileSync(target+".log",text);fs.writeFileSync(target+"-exit.json",JSON.stringify({exitCode:result.status,isolatedPostgres:true,productionWrites:false})+"\n");console.log("[issues] "+label+" exit "+result.status);if(result.status!==0){console.error(text.slice(-5000));process.exit(result.status||1);}return text;}
if(["migrations","integration","persistence"].includes(mode)){
 const exists=execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-Atc","SELECT 1 FROM pg_database WHERE datname='"+database+"'"],{encoding:"utf8",windowsHide:true}).trim();if(!exists)execFileSync("docker",["exec","ans-audit3-db","psql","-U",user,"-d","postgres","-c","CREATE DATABASE "+database],{stdio:"ignore",windowsHide:true});
 run(["node_modules/prisma/build/index.js","migrate","deploy"],"migrations");
 if(mode!=="migrations")run(["node_modules/tsx/dist/cli.mjs","scripts/agri-task-references-integration.ts",...(mode === "persistence"?["--persistence"]:[])],mode);
}else if(mode === "schema")run(["node_modules/prisma/build/index.js","validate"],mode);
else if(mode === "build")run(["node_modules/next/dist/bin/next","build","--webpack"],mode);
else if(mode === "http")run(["node_modules/tsx/dist/cli.mjs","scripts/agri-task-references-http-check.ts"],mode);
else if(mode === "serve"){const fixture=JSON.parse(fs.readFileSync(dir+"/http-fixture.json","utf8"));env.ANS_AGRIHACKATHON_COMPETITION_ID=fixture.edition;const result=spawnSync(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3158"],{env,windowsHide:true,stdio:"inherit"});process.exitCode=result.status||0;}
else if(mode === "all-unit")run(["node_modules/vitest/vitest.mjs","run","--testTimeout=30000"],mode);
else if(mode === "all-lint")run(["node_modules/eslint/bin/eslint.js"],mode);
else if(mode === "docs")run(["scripts/check-docs.mjs"],mode);
else if(mode === "issues"){run(["scripts/check-boundaries.mjs"],"boundaries");}
else if(mode === "types")run(["node_modules/typescript/bin/tsc","-p","tsconfig.typecheck.json","--noEmit","--incremental","false"],mode);
else if(mode === "unit")run(["node_modules/vitest/vitest.mjs","run","--testTimeout=30000","src/__tests__/lib/agri-issues.test.ts","src/__tests__/api/agri-issues-routes.test.ts","src/__tests__/components/agri-issues.test.tsx"],mode);
else if(mode === "lint")run(["node_modules/eslint/bin/eslint.js","src/contracts/agri-task-references.ts","src/contracts/agri-tasks.ts","src/server/competitions/agrihackathon/task-references.ts","src/server/competitions/agrihackathon/tasks.ts","src/components/competitions/agri-task-references.tsx","src/components/competitions/agri-reference-record.tsx","src/app/api/competitions/agrihackathon/tasks/candidates","src/app/competitions/agrihackathon/records","src/components/competitions/agri-timetable.tsx","src/server/competitions/agrihackathon/issues.ts","src/app/api/competitions/agrihackathon/issues","src/components/competitions/agri-issues.tsx","src/__tests__/lib/agri-issues.test.ts","src/__tests__/api/agri-issues-routes.test.ts","src/__tests__/components/agri-issues.test.tsx","scripts/agri-task-references-integration.ts","scripts/agri-task-references-http-check.ts"],mode);
else if(mode === "boundaries")run(["scripts/check-boundaries.mjs"],mode);
else{const config=path.resolve(dir,"tsconfig.scripts.json");fs.writeFileSync(config,JSON.stringify({extends:path.resolve("tsconfig.typecheck.json"),include:[path.resolve("scripts/agri-task-references-integration.ts"),path.resolve("scripts/agri-task-references-http-check.ts")],exclude:["node_modules"]}));run(["node_modules/typescript/bin/tsc","-p",config,"--noEmit","--incremental","false"],mode);}


