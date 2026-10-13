const {spawnSync,execFileSync}=require('node:child_process');const {randomBytes}=require('node:crypto');const fs=require('node:fs');
const name='ans-member-hubs-isolated-20261013',database='ans_member_hubs_isolated';
const exists=spawnSync('docker',['inspect',name],{encoding:'utf8',windowsHide:true});
if(exists.status!==0){const password=randomBytes(24).toString('hex');const r=spawnSync('docker',['run','--detach','--name',name,'--label','ans.isolated=member-hubs-20261013','-p','127.0.0.1:55448:5432','-e','POSTGRES_PASSWORD='+password,'-e','POSTGRES_DB='+database,'postgres:17-bookworm'],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error('Cannot start isolated PostgreSQL');}
const info=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8',windowsHide:true}))[0];const password=info.Config.Env.find(v=>v.startsWith('POSTGRES_PASSWORD=')).split('=')[1];
const url='postgresql://postgres:'+password+'@127.0.0.1:55448/'+database+'?schema=public';const env={...process.env,DATABASE_URL:url,DIRECT_URL:url,ANS_PROJECT_WORKER_DISABLED:'true',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of Object.keys(env))if(/API_KEY|SMTP_|SECRET|TOKEN|BASE_URL/.test(key))env[key]='';
env.DATABASE_URL=url;env.DIRECT_URL=url;fs.mkdirSync('.workbuddy/evidence/member-hubs',{recursive:true});
const mode=process.argv[2]||'migrations';const args=mode==='migrations'?['node_modules/prisma/build/index.js','migrate','deploy']:mode==='schema'?['node_modules/prisma/build/index.js','validate']:['node_modules/tsx/dist/cli.mjs','scripts/member-hubs-integration.ts'];
const r=spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});const text=(r.stdout+r.stderr).replaceAll(password,'[redacted]').replaceAll(url,'[isolated]');fs.writeFileSync('.workbuddy/evidence/member-hubs/'+mode+'.log',text);console.log(mode+' exit '+r.status);if(r.status!==0)console.log(text.slice(-3000));process.exit(r.status??1);
