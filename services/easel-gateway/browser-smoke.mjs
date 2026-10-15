/** Local opt-in acceptance using real ANS credentials/OIDC, PostgreSQL and Docker.
 * No deployment credentials, model calls or social accounts are used. */
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, readdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, generateKeyPairSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import puppeteer from "puppeteer";
import { resolveBrowser } from "../../scripts/lib/preview-server.mjs";
import { configuration, createGateway } from "./server.mjs";
import { Containers } from "./containers.mjs";
import { tenantId, GatewayError } from "./auth.mjs";

if (process.argv[2] !== "--run" || !path.isAbsolute(process.argv[3] ?? "")) throw new Error("Usage: node services/easel-gateway/browser-smoke.mjs --run ABSOLUTE_FIXED_FRONTEND_DIRECTORY [--skip-build]");
const root = process.cwd();
assert(await readFile(path.join(root,"package.json"),"utf8").then(text=>JSON.parse(text).name === "ans-platform"));
const execute = promisify(execFile);
const namespace = "ans-easel-web-" + randomBytes(4).toString("hex");
const temp = await mkdtemp(path.join(tmpdir(),namespace+"-"));
const password = randomBytes(20).toString("base64url");
const reports = [], servers = [], children = [];
let browser, prisma, config;
let runtimeUnavailable = false;
let serviceLog = "";
const record = text => { reports.push(text); console.log("PASS " + text); };
async function docker(args) {
  try { return (await execute("docker",args,{timeout:90000,maxBuffer:2*1024*1024,windowsHide:true})).stdout.trim(); }
  catch (error) { throw new Error("Fixture docker "+args[0]+" failed: "+(error.stderr||error.message).slice(0,1000)); }
}
async function listen(server) {
  servers.push(server); await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});return server.address().port;
}
async function until(check, timeout=60000) {
  const end=Date.now()+timeout;
  while(Date.now()<end) { if(await check()) return; await new Promise(resolve=>setTimeout(resolve,250)); }
  throw new Error("Acceptance condition timed out");
}
function isolatedEnvironment() {
  const env={};
  for(const key of ["PATH","Path","SystemRoot","SYSTEMROOT","WINDIR","TEMP","TMP","USERPROFILE","LOCALAPPDATA","APPDATA","COMSPEC","PATHEXT","NUMBER_OF_PROCESSORS"]) if(process.env[key]) env[key]=process.env[key];
  return env;
}
const env=isolatedEnvironment();
// Empty every dotenv name before Next loads files; never read or inherit its values.
for(const filename of await readdir(root)) if(/^\.env(?:\..*)?$/.test(filename)) {
  for(const line of (await readFile(path.join(root,filename),"utf8")).split(/\r?\n/)) {
    const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);if(match)env[match[1]]="";
  }
}
async function nodeCommand(args, timeout=180000) {
  try { await execute(process.execPath,args,{cwd:root,env,timeout,maxBuffer:20*1024*1024,windowsHide:true}); }
  catch(error) { throw new Error("Local "+path.basename(args[0])+" failed: "+(error.stdout+error.stderr).slice(-4500)); }
}
async function proxy(target,tlsOptions) {
  return listen(https.createServer(tlsOptions,(request,response)=>{
    const upstream=http.request({hostname:"127.0.0.1",port:target,path:request.url,method:request.method,headers:{...request.headers,"x-forwarded-proto":"https","x-forwarded-host":request.headers.host}},source=>{
      response.writeHead(source.statusCode,source.headers);source.pipe(response);
    });
    upstream.on("error",()=>{response.writeHead(502);response.end();});request.pipe(upstream);
  }));
}
async function remote(url,options={}) {
  const result=await new Promise((resolve,reject)=>{
    const request=https.request(url,{method:options.method??"GET",headers:options.headers,ca:certificate,family:4,timeout:10000},response=>{
      let text="";response.on("data",chunk=>{text+=chunk;if(text.length>64000)request.destroy(new Error("Identity response too large"));});
      response.on("end",()=>{if(response.statusCode!==200)reject(new GatewayError("IDENTITY_UNAVAILABLE",response.statusCode===401?401:503));else{try{resolve(JSON.parse(text));}catch{reject(new Error("Invalid identity JSON"));}}});
    });request.on("error",reject);request.on("timeout",()=>request.destroy(new Error("Identity timeout")));request.end(options.body);
  });return result;
}
let certificate;
try {
  await readFile(path.join(process.argv[3],"index.html"));
  const dbName="ans_easel_verify";
  await docker(["run","--pull","never","--detach","--name",namespace+"-db","--label","ans.easel.namespace="+namespace,"--publish","127.0.0.1::5432","--tmpfs","/var/lib/postgresql/data:rw","--env","POSTGRES_USER=easel_verify","--env","POSTGRES_HOST_AUTH_METHOD=trust","--env","POSTGRES_DB="+dbName,"postgres:16-alpine"]);
  const dbState=JSON.parse(await docker(["inspect",namespace+"-db"]))[0];
  const dbPort=dbState.NetworkSettings.Ports["5432/tcp"][0].HostPort;
  const databaseUrl=`postgresql://easel_verify@127.0.0.1:${dbPort}/${dbName}?schema=public`;
  await until(async()=>await docker(["exec",namespace+"-db","pg_isready","-U","easel_verify"]).then(()=>true,()=>false));
  // Ports are assigned by the OS; the temporary listeners are replaced before use.
  const reserve=http.createServer();const ansHttpPort=await listen(reserve);await new Promise(resolve=>reserve.close(resolve));
  const placeholder=http.createServer();const gatewayHttpPort=await listen(placeholder);await new Promise(resolve=>placeholder.close(resolve));
  const certPath=path.join(temp,"localhost.pem"),keyPath=path.join(temp,"localhost-key.pem");
  const openssl=process.platform==="win32"?"C:/Program Files/Git/usr/bin/openssl.exe":"openssl";
  await execute(openssl,["req","-x509","-newkey","rsa:2048","-nodes","-days","1","-subj","/CN=localhost","-addext","subjectAltName=DNS:localhost","-keyout",keyPath,"-out",certPath],{windowsHide:true});
  certificate=await readFile(certPath);
  const tlsOptions={key:await readFile(keyPath),cert:certificate};
  const ansPort=await proxy(ansHttpPort,tlsOptions),gatewayPort=await proxy(gatewayHttpPort,tlsOptions);
  const ansOrigin="https://localhost:"+ansPort,easelOrigin="https://localhost:"+gatewayPort;
  const clientId="easel-local-verify",clientSecret=randomBytes(32).toString("base64url");
  const {privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
  Object.assign(env,{DATABASE_URL:databaseUrl,DIRECT_URL:databaseUrl,AUTH_SECRET:randomBytes(32).toString("hex"),AUTH_TRUST_HOST:"true",AUTH_URL:ansOrigin,NEXTAUTH_URL:ansOrigin,NEXT_PUBLIC_APP_URL:ansOrigin,OIDC_ISSUER:ansOrigin,OIDC_CLIENTS_JSON:JSON.stringify([{client_id:clientId,client_secret:clientSecret,redirect_uri:easelOrigin+"/ans/oidc/callback",scopes:["openid","profile"]}]),OIDC_SIGNING_KEY_ID:"local-verify",OIDC_SIGNING_PRIVATE_KEY:privateKey.export({format:"pem",type:"pkcs8"}),ANS_PROJECT_WORKER_DISABLED:"true",ANS_TOONFLOW_COMPUTE_ENABLED:"0",ANS_TOONFLOW_EMBED_ENABLED:"0",ANS_EASEL_ENABLED:"1",ANS_EASEL_ORIGIN:easelOrigin,NEXT_TELEMETRY_DISABLED:"1",NODE_ENV:"production"});
  await nodeCommand(["node_modules/prisma/build/index.js","db","push","--skip-generate"]);
  prisma=new PrismaClient({datasources:{db:{url:databaseUrl}}});
  const users=[];
  for(const suffix of ["a","b"]) users.push(await prisma.user.create({data:{email:`easel-${suffix}@example.test`,username:"easel_verify_"+suffix,name:"Easel verify "+suffix,password:await bcrypt.hash(password,10),emailVerified:new Date(),locale:"zh"}}));
  if(!process.argv.includes("--skip-build")) {
    console.log("Building ANS with isolated local configuration");
    await nodeCommand(["node_modules/next/dist/bin/next","build","--webpack"],600000);
    record("production build with disposable database and no deployment credentials");
  }
  const next=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-H","127.0.0.1","-p",String(ansHttpPort)],{cwd:root,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});children.push(next);
  next.stdout.on("data",chunk=>{serviceLog=(serviceLog+chunk).slice(-12000);});next.stderr.on("data",chunk=>{serviceLog=(serviceLog+chunk).slice(-12000);});
  await until(async()=>await fetch("http://127.0.0.1:"+ansHttpPort+"/api/auth/csrf").then(response=>response.ok,()=>false));
  config=configuration({EASEL_PUBLIC_ORIGIN:easelOrigin,EASEL_OIDC_ISSUER:ansOrigin,EASEL_OIDC_CLIENT_ID:clientId,EASEL_OIDC_CLIENT_SECRET:clientSecret,EASEL_COOKIE_KEY:randomBytes(32).toString("base64url"),EASEL_TENANT_KEY:randomBytes(32).toString("base64url"),EASEL_NAMESPACE:namespace,EASEL_FRONTEND_DIR:process.argv[3],EASEL_MAX_ACTIVE:"2",EASEL_MAX_USERS:"2"});
  const pool=new Containers(config,docker);
  const containers={resolve:tenant=>{if(runtimeUnavailable)throw new GatewayError("RUNTIME_UNAVAILABLE");return pool.resolve(tenant);},lease:tenant=>pool.lease(tenant),stopIdle:()=>pool.stopIdle()};
  const gateway=createGateway(config,{containers,remote});servers.push(gateway);await new Promise(resolve=>gateway.listen(gatewayHttpPort,"127.0.0.1",resolve));
  browser=await puppeteer.launch({headless:true,executablePath:await resolveBrowser(),acceptInsecureCerts:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const context=await browser.createBrowserContext();const page=await context.newPage();page.setDefaultTimeout(60000);await page.setViewport({width:1280,height:900});
  // Only accelerate the 3-minute renewal timer; no auth/token lifetimes are changed.
  await page.evaluateOnNewDocument(()=>{const timeout=window.setTimeout;window.setTimeout=function(fn,delay,...args){return timeout(fn,delay===180000?12000:delay,...args);};});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  async function login(target,user) {
    await target.goto(ansOrigin+"/login",{waitUntil:"networkidle0"});
    await target.type('input[type="email"]',user.email);await target.type('input[type="password"]',password);
    await Promise.all([target.waitForNavigation({waitUntil:"networkidle0"}),target.click('button[type="submit"]')]);
    assert(!new URL(target.url()).pathname.includes("login"));
  }
  async function workspace(target,user) {
    await target.goto(ansOrigin+"/workflows/easel",{waitUntil:"domcontentloaded"});
    await until(async()=>{
      for(const frame of target.frames()) if(frame.url().startsWith(easelOrigin+"/?ans_owner="+encodeURIComponent(user.id))) {
        if(await frame.$("#root > *"))return true;
      }
      return false;
    },120000);
    const inner=target.frames().find(frame=>frame.url().startsWith(easelOrigin+"/?ans_owner="+encodeURIComponent(user.id)));
    await target.waitForFunction(()=>{const frame=document.querySelector('iframe[title="Easel 社媒工作台"]');return !!frame&&!frame.hidden;});
    return inner;
  }
  await page.goto(ansOrigin+"/workflows/easel",{waitUntil:"networkidle0"});assert(new URL(page.url()).pathname.includes("login"));record("anonymous ANS entry redirects to real login");
  await login(page,users[0]);let frame=await workspace(page,users[0]);
  assert((await frame.evaluate(()=>document.body.innerText)).includes("设置"));
  assert((await page.evaluate(()=>document.body.innerText)).includes("首次使用准备"));
  record("real credentials login, OIDC code/PKCE/token/JWKS/userinfo and immutable Easel frontend");
  // A real API round trip traverses the verified gateway and the user's Docker worker.
  assert.equal(await frame.evaluate(async()=> (await fetch("/api/status")).status),200);
  const workerA=namespace+"-"+tenantId(users[0].id,config.tenantKey);
  await docker(["exec",workerA,"python","-c","from pathlib import Path; p=Path('/workspace/outputs/ans-web-verify.txt'); p.parent.mkdir(exist_ok=True); p.write_text('private-a')"]);
  assert.equal(await frame.evaluate(async owner=>await fetch('/ans/media/'+owner+'/ans-web-verify.txt').then(r=>r.text()),users[0].id),"private-a");
  await frame.evaluate(()=>{localStorage.setItem("ans_verify_draft","private-a");const input=document.createElement("textarea");input.id="ans-verify-unsaved";input.value="unsaved acceptance draft";document.body.append(input);window.ansVerifyMarker={};window.ansVerifyOriginal=window.ansVerifyMarker;});
  // Observe messages independently of callback navigation, whose old URL varies by browser.
  await page.evaluate(()=>{window.ansVerifyRenewed=false;window.ansVerifyRefreshing=false;window.addEventListener("message",event=>{if(event.data?.type==="ans:easel:refresh")window.ansVerifyRefreshing=true;if(window.ansVerifyRefreshing&&event.data?.type==="ans:easel:ready")window.ansVerifyRenewed=true;});});
  await page.waitForFunction(()=>window.ansVerifyRenewed,{timeout:45000});
  assert(await frame.evaluate(()=>window.ansVerifyOriginal===window.ansVerifyMarker&&document.querySelector("#ans-verify-unsaved")?.value==="unsaved acceptance draft"));
  assert(await page.$eval('iframe[title="Easel 社媒工作台"]',node=>!node.hidden));record("silent renewal preserves visible iframe, original DOM and unsaved text");
  await page.screenshot({path:path.join(temp,"desktop.png"),fullPage:true});
  await page.setViewport({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:path.join(temp,"mobile.png"),fullPage:true});record("390px ANS shell has no horizontal overflow");
  // Logout in another ANS tab through NextAuth's real CSRF endpoint.
  const logout=await context.newPage();await logout.goto(ansOrigin+"/workspace",{waitUntil:"domcontentloaded"});
  await logout.evaluate(async()=>{const {csrfToken}=await fetch("/api/auth/csrf").then(r=>r.json());await fetch("/api/auth/signout",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({csrfToken,callbackUrl:"/login"})});});
  // NextAuth refresh on focus triggers the same production session update as a tab switch.
  await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event("visibilitychange")));
  await until(async()=>!await page.$('iframe[title="Easel 社媒工作台"]'),45000);record("real ANS signout removes the prior private workspace DOM");
  await login(page,users[1]);const second=await workspace(page,users[1]);
  assert.equal(await second.evaluate(()=>localStorage.getItem("ans_verify_draft")),null);
  await second.evaluate(()=>localStorage.setItem("ans_verify_draft","private-b"));
  assert.equal(await second.evaluate(async owner=>(await fetch("/api/status",{headers:{"X-ANS-Easel-Workspace":owner}})).status,users[0].id),200); // bootstrap deliberately replaces forged owner with its loaded account
  const old=await context.newPage();await old.goto(easelOrigin+"/?ans_owner="+encodeURIComponent(users[0].id));
  assert.equal(await old.evaluate(()=>document.body.innerText).then(text=>JSON.parse(text).error),"ACCOUNT_MISMATCH");
  assert.equal(await second.evaluate(async owner=>(await fetch('/ans/media/'+owner+'/ans-web-verify.txt')).status,users[0].id),401);
  assert.equal(await second.evaluate(async owner=>(await fetch('/ans/media/'+owner+'/ans-web-verify.txt')).status,users[1].id),404);
  record("account switch starts another real worker, isolates browser drafts/materials and rejects the old owner");
  // Simulate cookies unavailable in the embedded gateway. This does not claim to
  // reproduce every browser's third-party policy on production sibling domains.
  const blocked=await context.newPage();await blocked.setViewport({width:1280,height:900});
  await blocked.evaluateOnNewDocument(()=>{const timeout=window.setTimeout;window.setTimeout=function(fn,delay,...args){return timeout(fn,delay===90000?8000:delay,...args);};});
  await blocked.setRequestInterception(true);
  blocked.on("request",request=>{const headers=request.headers();if(request.url().startsWith(easelOrigin+"/"))headers.cookie="";request.continue({headers});});
  await blocked.goto(ansOrigin+"/workflows/easel",{waitUntil:"domcontentloaded"});
  await blocked.waitForFunction(()=>document.body.innerText.includes("\u6682\u65f6\u65e0\u6cd5\u8fde\u63a5\u5de5\u4f5c\u7a7a\u95f4")||document.body.innerText.includes("\u9700\u8981\u8854\u63a5 ANS \u767b\u5f55"),{timeout:20000});
  assert.equal(await blocked.$('iframe[src*="/ans/embed"]'),null);
  const fallback=await blocked.$eval('a[target="_blank"][href*="/ans/oidc/start"]',node=>node.href);
  const normal=await context.newPage();await normal.goto(fallback,{waitUntil:"domcontentloaded"});
  await until(async()=>{const inner=normal.frames().find(f=>f.url().startsWith(easelOrigin+"/?ans_owner="+users[1].id));return !!inner&&!!await inner.$("#root > *");},120000);
  await blocked.close();await normal.close();
  record("unavailable embedded cookies fail closed and the account-bound standalone window works");
  // A failed start must never be presented as an initialized workspace.
  runtimeUnavailable=true;await page.goto(ansOrigin+"/workflows/easel",{waitUntil:"networkidle0"});
  await page.waitForFunction(()=>document.body.innerText.includes("暂时无法连接工作空间"));
  assert.equal(await page.$('iframe[title="Easel 社媒工作台"]'),null);
  const standalone=await page.$eval('a[target="_blank"][href*="/ans/oidc/start"]',node=>node.href);
  assert.equal(new URL(standalone).searchParams.get("expected"),users[1].id);runtimeUnavailable=false;
  await page.goto(standalone,{waitUntil:"domcontentloaded"});
  await until(async()=>{const inner=page.frames().find(f=>f.url().startsWith(easelOrigin+"/?ans_owner="+users[1].id));return !!inner&&!!await inner.$("#root > *");},120000);
  record("runtime failure unmounts workspace and provides an account-bound standalone login");
  assert.equal(errors.length,0,"unexpected browser errors: "+errors.join("; "));
  await writeFile(path.join(temp,"report.json"),JSON.stringify({namespace,passed:reports,scope:"real ANS login/OIDC and Docker, local HTTPS origins; renewal timer accelerated and cookie loss simulated; no models, platform publishing or production deployment"},null,2));
  console.log("Evidence directory: "+temp);
} catch(error) {
  console.error("FAIL "+error.message);if(serviceLog)console.error(serviceLog.slice(-4000));process.exitCode=1;
  if(browser) for(const page of await browser.pages()) { console.error("Page: "+new URL(page.url()).pathname);console.error((await page.evaluate(()=>document.body.innerText).catch(()=>"")).slice(-1500));for(const frame of page.frames())console.error("Frame: "+new URL(frame.url()||"about:blank").pathname+" "+(await frame.evaluate(()=>document.body.innerText).catch(()=>"")).slice(0,700)); }
} finally {
  if(browser)await browser.close();if(prisma)await prisma.$disconnect();
  for(const child of children)child.kill();
  for(const server of servers.reverse()) {server.closeAllConnections?.();if(server.listening)await new Promise(resolve=>server.close(resolve));}
  // Only remove fixtures with this unpredictable namespace and verified ownership labels.
  const names=(await docker(["ps","-aq","--filter","label=ans.easel.namespace="+namespace]).catch(()=>"")).split(/\r?\n/).filter(Boolean);
  for(const name of names) {const state=JSON.parse(await docker(["inspect",name]))[0];if(state.Config.Labels?.["ans.easel.namespace"]===namespace)await docker(["rm","--force",name]);}
  for(const kind of ["volume","network"]) {
    const names=(await docker([kind,"ls","-q","--filter","label=ans.easel.namespace="+namespace]).catch(()=>"")).split(/\r?\n/).filter(Boolean);
    for(const name of names){const state=JSON.parse(await docker([kind,"inspect",name]))[0];if(state.Labels?.["ans.easel.namespace"]===namespace)await docker([kind,"rm",name]);}
  }
  // Remove the test private key/certificate; keep only screenshots and a sanitized report.
  for(const file of ["localhost-key.pem","localhost.pem"])await unlink(path.join(temp,file)).catch(()=>{});
  if((await readdir(temp)).length===0)await rmdir(temp);
}
