// Local disposable PostgreSQL only. Never reads deployment credentials.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const mode=require.main===module?(process.argv[2]||'integration'):'environment';
if(require.main===module&&!['integration','migrations','generate','validate','script-types','build','types','serve','fixture','http'].includes(mode))throw new Error('Unsupported wall check');
const database='ans_agri_wall_verify_20261015';
const url='postgresql://agri_verify@127.0.0.1:55449/'+database+'?schema=public';
const env={...process.env};
for(const file of ['.env','.env.local','.env.production','.env.production.local'])if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);if(m)env[m[1]]='';}
for(const key of Object.keys(env))if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET|OIDC_|SENTRY|BASE_URL|COMPUTE_POLICY)/.test(key))env[key]='';
Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,ANS_AGRI_WALL_VERIFY:'true',ANS_PROJECT_WORKER_DISABLED:'true',NEXT_TELEMETRY_DISABLED:'1',ANS_TOONFLOW_COMPUTE_ENABLED:'0',ANS_TOONFLOW_EMBED_ENABLED:'0',AUTH_SECRET:randomBytes(32).toString('hex'),NODE_ENV:['build','serve','environment'].includes(mode)?'production':'test',AUTH_TRUST_HOST:'true',AUTH_URL:'http://127.0.0.1:3139',NEXTAUTH_URL:'http://127.0.0.1:3139',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3139',ANS_LOCAL_DIST_DIR:'.next-agri-wall'});
const dir='.workbuddy/evidence/agri-wall';fs.mkdirSync(dir,{recursive:true});
const fixturePath=path.join(dir,'browser-fixture.json');if(fs.existsSync(fixturePath))env.ANS_AGRIHACKATHON_COMPETITION_ID=JSON.parse(fs.readFileSync(fixturePath,'utf8')).competitionId;
const authPath=path.join(dir,'local-auth.txt');if(fs.existsSync(authPath))env.AUTH_SECRET=fs.readFileSync(authPath,'utf8').trim();else fs.writeFileSync(authPath,env.AUTH_SECRET);
module.exports={env,dir};
function run(args,label){const r=spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,maxBuffer:12*1024*1024});const text=((r.stdout||'')+(r.stderr||'')).replaceAll(url,'[isolated-database]');fs.writeFileSync(path.join(dir,label+'.log'),text);console.log('[agri-wall] '+label+' exit '+r.status);if(r.status!==0){console.error(text.slice(-6000));process.exit(r.status||1);}return text;}
if(require.main!==module){}
else if(mode==='http')run(['node_modules/tsx/dist/cli.mjs','scripts/agri-wall-http-check.ts'],'http');
else if(mode==='fixture')run(['node_modules/tsx/dist/cli.mjs','scripts/agri-wall-browser-fixture.ts'],'browser-fixture');
else if(mode==='build')run(['node_modules/next/dist/bin/next','build','--webpack'],'build');
else if(mode==='types')run(['node_modules/typescript/bin/tsc','-p','tsconfig.typecheck.json','--noEmit','--incremental','false'],'types');
else if(mode==='serve')run(['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3139'],'serve');
else if(mode==='generate')run(['node_modules/prisma/build/index.js','generate'],'generate');
else if(mode==='validate')run(['node_modules/prisma/build/index.js','validate'],'validate');
else if(mode==='script-types'){const config=path.resolve(dir,'tsconfig.scripts.json');fs.writeFileSync(config,JSON.stringify({extends:path.resolve('tsconfig.typecheck.json'),include:[path.resolve('scripts/agri-wall-integration.ts'),path.resolve('scripts/agri-wall-browser-fixture.ts'),path.resolve('scripts/agri-wall-http-check.ts')],exclude:['node_modules']}));run(['node_modules/typescript/bin/tsc','-p',config,'--noEmit','--incremental','false'],'script-types');}
else{run(['node_modules/prisma/build/index.js','migrate','deploy'],'migrations');if(mode==='integration')run(['node_modules/tsx/dist/cli.mjs','scripts/agri-wall-integration.ts'],'integration');}
