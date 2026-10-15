// Own loopback PostgreSQL process and synthetic data only. Never reads production credentials.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),net=require('node:net'),{randomBytes,randomUUID}=require('node:crypto');
const root=path.resolve('.workbuddy/evidence/agri-evidence'),run=path.join(root,randomUUID());fs.mkdirSync(run,{recursive:true});
const bin='C:/Program Files/PostgreSQL/18/bin',data=path.join(run,'postgres'),password=randomBytes(32).toString('hex'),pw=path.join(run,'init-password'),user='agri_evidence_fixture';
const log=(name,text)=>fs.writeFileSync(path.join(run,name+'.log'),String(text).replaceAll(password,'[fixture-password]'));
function native(program,args){const result=cp.spawnSync(path.join(bin,program+'.exe'),args,{encoding:'utf8',windowsHide:true,timeout:60000});log(program,(result.stdout||'')+(result.stderr||''));if(result.status!==0)throw new Error(program+' failed; sanitized log retained');}
async function freePort(){for(let p=55447;p<55480;p++){const available=await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(p,'127.0.0.1',()=>server.close(()=>resolve(true)));});if(available)return p;}throw new Error('No isolated loopback port available');}
async function main(){const port=await freePort();fs.writeFileSync(pw,password,{flag:'wx'});native('initdb',['-D',data,'-U',user,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--pwfile',pw,'--encoding=UTF8','--locale=C']);fs.unlinkSync(pw);let started=false;try{
 native('pg_ctl',['-D',data,'-l',path.join(run,'server.log'),'-o','-h 127.0.0.1 -p '+port,'-w','start']);started=true;
 const env={...process.env};for(const name of Object.keys(env))if(/(?:API_KEY|SECRET|DATABASE_URL|DIRECT_URL|BASE_URL|SENTRY|OIDC|SMTP|S3_|ANS_AGRI_EVIDENCE_)/.test(name))delete env[name];
 const url='postgresql://'+user+':'+password+'@127.0.0.1:'+port+'/ans_agri_evidence_isolated?schema=public';Object.assign(env,{DATABASE_URL:url,DIRECT_URL:url,AUTH_SECRET:randomBytes(32).toString('hex'),AUTH_URL:'http://127.0.0.1:9',ANS_PROJECT_WORKER_DISABLED:'true',ANS_AGRI_EVIDENCE_WORKER_DISABLED:'true',ANS_AGRI_EVIDENCE_TEST_PORT:String(port),AGRI_EVIDENCE_REPORT_DIR:run,PGPASSWORD:password,NODE_ENV:'test'});
 const database=cp.spawnSync(path.join(bin,'createdb.exe'),['-h','127.0.0.1','-p',String(port),'-U',user,'ans_agri_evidence_isolated'],{env,encoding:'utf8',windowsHide:true,timeout:15000});if(database.status!==0)throw new Error('Isolated database create failed');
 function runNode(args,name){const result=cp.spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:8*1024**2});log(name,(result.stdout||'')+(result.stderr||''));console.log(name+' exit '+result.status);if(result.status!==0)throw new Error(name+' failed; sanitized log retained');}
 runNode(['node_modules/prisma/build/index.js','migrate','deploy'],'migrations');runNode(['node_modules/tsx/dist/cli.mjs','scripts/agri-evidence-integration.ts'],'integration');
 runNode(['node_modules/tsx/dist/cli.mjs','scripts/agri-evidence-integration.ts','--persistence'],'persistence');
 const dump=path.join(run,'database.backup');
 function dbTool(program,args){const result=cp.spawnSync(path.join(bin,program+'.exe'),args,{env,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:8*1024**2});log(program,(result.stdout||'')+(result.stderr||''));if(result.status!==0)throw new Error(program+' failed');}
 dbTool('pg_dump',['-h','127.0.0.1','-p',String(port),'-U',user,'-Fc','-f',dump,'ans_agri_evidence_isolated']);
 dbTool('createdb',['-h','127.0.0.1','-p',String(port),'-U',user,'ans_agri_evidence_isolated_restored']);
 dbTool('pg_restore',['-h','127.0.0.1','-p',String(port),'-U',user,'-d','ans_agri_evidence_isolated_restored',dump]);
 fs.cpSync(path.join(run,'objects'),path.join(run,'restored-objects'),{recursive:true,errorOnExist:true});
 const restored=url.replace('/ans_agri_evidence_isolated?','/ans_agri_evidence_isolated_restored?');Object.assign(env,{DATABASE_URL:restored,DIRECT_URL:restored,AGRI_EVIDENCE_RESTORED:'true'});
 runNode(['node_modules/tsx/dist/cli.mjs','scripts/agri-evidence-integration.ts','--persistence'],'restored-persistence');
 fs.writeFileSync(path.join(run,'backup-restore.json'),JSON.stringify({isolated:true,databaseRestored:true,objectsRestored:true,hashVerifiedInFreshProcess:true,productionChanged:false})+'\n');
 fs.writeFileSync(path.join(root,'latest.json'),JSON.stringify({run,isolated:true,productionChanged:false,providerCalls:0,databasePort:port})+'\n');
 }finally{if(started)native('pg_ctl',['-D',data,'-m','fast','-w','stop']);}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
