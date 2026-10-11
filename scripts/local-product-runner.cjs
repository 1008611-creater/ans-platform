const {execFileSync,spawn}=require('node:child_process');
const {createHash}=require('node:crypto');
const info=JSON.parse(execFileSync('docker',['inspect','ans-dev-db'],{encoding:'utf8'}))[0];
const pgEnv=Object.fromEntries(info.Config.Env.map(item=>{const i=item.indexOf('=');return[item.slice(0,i),item.slice(i+1)];}));
const user=pgEnv.POSTGRES_USER||'postgres';const password=pgEnv.POSTGRES_PASSWORD;
if(!password)throw new Error('Local container password unavailable');
const database=process.env.ANS_LOCAL_TEST_DB||'ans_product_verify_market';
if(!/^ans_product_verify_[a-z0-9_]+$/.test(database))throw new Error('Only explicitly isolated local test databases allowed');
const url='postgresql://'+encodeURIComponent(user)+':'+encodeURIComponent(password)+'@127.0.0.1:55437/'+database+'?schema=public';
const env={...process.env,DATABASE_URL:url,DIRECT_URL:url,AUTH_SECRET:createHash('sha256').update(password+':ANS-local-product-fixture').digest('hex'),AUTH_URL:'http://127.0.0.1:3107',NEXTAUTH_URL:'http://127.0.0.1:3107',AUTH_TRUST_HOST:'true',RUN_API_KEY:'',OPENAI_API_KEY:'',SMTP_USER:'',SMTP_PASS:'',NODE_ENV:'production'};
for(const key of Object.keys(env))if(/(?:API_KEY|SMTP_|TURNSTILE|SECRET)/.test(key)&&!['AUTH_SECRET'].includes(key))env[key]='';
const mode=process.argv[2];
if(mode==='migrate'){
  const exists=execFileSync('docker',['exec','ans-dev-db','psql','-U',user,'-d','postgres','-Atc',"SELECT 1 FROM pg_database WHERE datname='"+database+"'"],{encoding:'utf8'}).trim();
  if(!exists)execFileSync('docker',['exec','ans-dev-db','psql','-U',user,'-d','postgres','-c','CREATE DATABASE '+database],{stdio:'ignore'});
}
let args;if(mode==='migrate')args=['node_modules/prisma/build/index.js','migrate','deploy'];
else if(mode==='generate')args=['node_modules/prisma/build/index.js','generate'];
else if(mode==='build')args=['node_modules/next/dist/bin/next','build','--webpack'];
else if(mode==='start')args=['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3107'];
else if(mode==='verify'){
  const smokeDatabase=process.env.ANS_LOCAL_SMOKE_DB;
  if(!smokeDatabase||!/^ans_product_verify_[a-z0-9_]+$/.test(smokeDatabase)||smokeDatabase===database)throw new Error('Verify needs a separate explicitly isolated smoke database');
  env.SMOKE_DATABASE_URL='postgresql://'+encodeURIComponent(user)+':'+encodeURIComponent(password)+'@127.0.0.1:55437/'+smokeDatabase+'?schema=public';
  env.SMOKE_MODE='require';env.A11Y_MODE='require';env.PERF_MODE='require';env.AUDIT_MODE='require';
  env.ANS_PROJECT_WORKER_DISABLED='true';
  args=['scripts/verify.mjs'];
}
else if(mode==='script')args=['node_modules/tsx/dist/cli.mjs',process.argv[3]];
else throw new Error('Unknown local operation');
const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>process.stdout.write(data.toString().replaceAll(password,'[redacted]').replaceAll(encodeURIComponent(password),'[redacted]').replaceAll(env.AUTH_SECRET,'[local-secret]')));
child.on('exit',code=>{process.exitCode=code||0;});
