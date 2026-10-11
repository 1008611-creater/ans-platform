// Dedicated loopback database; credentials remain in memory and subprocess environment only.
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),{randomBytes}=require("node:crypto");
const database="ans_product_verify_agri_p2_http_r1",dir=".workbuddy/evidence/agri-p2",root="/mnt/docker-desktop-disk/data/docker/containers";
const mode=process.argv[2]||"integration";
if(!["migrations","types","script-types","boundaries","build","serve-demo-readonly","prepare-existing-fixture"].includes(mode))throw new Error("Unsupported P2 mode");
const needsDatabase=["migrations","integration","persistence","serve-demo-readonly","prepare-existing-fixture"].includes(mode);
const targetDatabase=database;
let password="LocalNoDatabaseConnection",url="postgresql://postgres:LocalNoDatabaseConnection@127.0.0.1:1/"+database+"?schema=public";
fs.mkdirSync(dir,{recursive:true});
async function main(){
 if(needsDatabase){
  const matches=cp.execFileSync("wsl",["-d","docker-desktop","sh","-c","grep -l ans-audit3-db "+root+"/*/config.v2.json"],{encoding:"utf8",timeout:5000,windowsHide:true}).trim().split(/\r?\n/).filter(Boolean);
  const valid=[];
  for(const candidate of matches){if(!new RegExp("^"+root+"/[a-f0-9]{64}/config\\.v2\\.json$").test(candidate))continue;const info=JSON.parse(cp.execFileSync("wsl",["-d","docker-desktop","cat",candidate],{encoding:"utf8",timeout:5000,windowsHide:true}));if(info.Name==="/ans-audit3-db")valid.push({info,candidate});}
  if(valid.length!==1)throw new Error("Named isolated PostgreSQL not found");
  const {info,candidate}=valid[0],host=JSON.parse(cp.execFileSync("wsl",["-d","docker-desktop","cat",path.posix.dirname(candidate)+"/hostconfig.json"],{encoding:"utf8",timeout:5000,windowsHide:true})),bindings=host.PortBindings?.["5432/tcp"];
  if(!Array.isArray(bindings)||bindings.length!==1||bindings[0].HostIp!=="127.0.0.1"||bindings[0].HostPort!=="55438"||!/^postgres(?::|@)/.test(info.Config?.Image||""))throw new Error("Local PostgreSQL identity mismatch");
  const pg=Object.fromEntries(info.Config.Env.filter(x=>x.startsWith("POSTGRES_")).map(x=>{const i=x.indexOf("=");return[x.slice(0,i),x.slice(i+1)];}));const user=pg.POSTGRES_USER||"postgres";password=pg.POSTGRES_PASSWORD;if(!password||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(user))throw new Error("Local PostgreSQL credentials unavailable");
  const base="postgresql://"+encodeURIComponent(user)+":"+encodeURIComponent(password)+"@127.0.0.1:55438/";
  const {PrismaClient}=require("@prisma/client"),admin=new PrismaClient({datasources:{db:{url:base+"postgres?connect_timeout=3&socket_timeout=5"}}});
  try{const identity=await admin.$queryRawUnsafe("SELECT current_database() AS database");if(identity[0].database!=="postgres")throw new Error("Local admin database mismatch");const exists=await admin.$queryRawUnsafe("SELECT 1 FROM pg_database WHERE datname=$1",targetDatabase);if(!exists.length&&mode==="serve-demo-readonly")throw new Error("Previously verified Demo database unavailable");if(!exists.length&&mode==="prepare-existing-fixture")await admin.$executeRawUnsafe('CREATE DATABASE "ans_product_verify_agri_p2_http_r1" TEMPLATE "ans_product_verify_agri_demo_r3"');else if(!exists.length)throw new Error("Prepare existing isolated fixture clone first");}finally{await admin.$disconnect();}
  url=base+targetDatabase+"?schema=public&connect_timeout=3&socket_timeout=15";
  fs.writeFileSync(dir+(mode==="serve-demo-readonly"?"/existing-demo-database-identity.json":"/database-identity.json"),JSON.stringify({database:targetDatabase,loopback:"127.0.0.1:55438",containerName:info.Name,postgresImage:info.Config.Image,credentialSource:candidate,persistedCredentials:false,productionWrites:false})+"\n");
 }
 const env={...process.env};for(const file of [".env",".env.local",".env.production",".env.production.local"])if(fs.existsSync(file))for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){const m=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);if(m)env[m[1]]="";}
 for(const name of Object.keys(env))if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(name))env[name]="";
 Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,PRISMA_CLIENT_ENGINE_TYPE:"binary",ANS_PROJECT_WORKER_DISABLED:"true",NEXT_TELEMETRY_DISABLED:"1",ANS_TOONFLOW_COMPUTE_ENABLED:"0",ANS_TOONFLOW_EMBED_ENABLED:"0",AUTH_SECRET:randomBytes(32).toString("hex"),NODE_ENV:mode==="unit"?"test":"production",ANS_AGRIHACKATHON_COMPETITION_ID:"",AUTH_TRUST_HOST:"true",AUTH_URL:"http://127.0.0.1:3163",NEXTAUTH_URL:"http://127.0.0.1:3163",NEXT_PUBLIC_APP_URL:"http://127.0.0.1:3163",ANS_LOCAL_DIST_DIR:".next-agri-p2"});
 function run(args,label){const result=cp.spawnSync(process.execPath,args,{env,encoding:"utf8",windowsHide:true,maxBuffer:12*1024*1024,timeout:300000});const text=((result.stdout||"")+(result.stderr||"")).replaceAll(url,"[isolated-database]").replaceAll(password,"[redacted]");const target=dir+"/"+label;if(fs.existsSync(target+".log"))fs.copyFileSync(target+".log",target+"-previous-"+Date.now()+".log");fs.writeFileSync(target+".log",text);fs.writeFileSync(target+"-exit.json",JSON.stringify({exitCode:result.status,isolatedPostgres:needsDatabase,productionWrites:false})+"\n");console.log("[agri-p2] "+label+" exit "+result.status);if(result.status!==0){console.error(text.slice(-5000));throw new Error("P2 check failed");}}
 if(mode==="prepare-existing-fixture"){run(["node_modules/prisma/build/index.js","migrate","deploy"],"migrations");run(["node_modules/tsx/dist/cli.mjs","scripts/agri-p2-existing-fixture.ts"],"existing-fixture");}
 else if(mode==="migrations")run(["node_modules/prisma/build/index.js","migrate","deploy"],"migrations");
 else if(mode==="build")run(["node_modules/next/dist/bin/next","build","--webpack"],mode);
 else if(mode==="serve-demo-readonly"){const existing=JSON.parse(fs.readFileSync(".workbuddy/evidence/agri-demo/http-fixture.json","utf8"));if(existing.localFixtureOnly!==true||!existing.edition)throw new Error("Existing verified fixture unavailable");env.ANS_AGRIHACKATHON_COMPETITION_ID=existing.edition;const result=cp.spawnSync(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3163"],{env,windowsHide:true,stdio:"inherit"});process.exitCode=result.status||0;}
 else if(mode==="types")run(["node_modules/typescript/bin/tsc","-p","tsconfig.typecheck.json","--noEmit","--incremental","false"],mode);
 else if(mode==="boundaries")run(["scripts/check-boundaries.mjs"],mode);
 else{const config=path.resolve(dir,"tsconfig.scripts.json");fs.writeFileSync(config,JSON.stringify({extends:path.resolve("tsconfig.typecheck.json"),include:[path.resolve("scripts/agri-p2-existing-fixture.ts")],exclude:["node_modules"]}));run(["node_modules/typescript/bin/tsc","-p",config,"--noEmit","--incremental","false"],mode);}
}
main().catch(()=>{console.error("P2 local check failed; sanitized evidence retained, credentials suppressed");process.exitCode=1;});
