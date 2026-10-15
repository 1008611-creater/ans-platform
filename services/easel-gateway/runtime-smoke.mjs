/** Explicit local acceptance: real Docker workers, synthetic identities, no model or publishing calls. */
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Containers } from "./containers.mjs";
import { configuration, createGateway } from "./server.mjs";
import { seal, now, tenantId } from "./auth.mjs";

const execute = promisify(execFile);
async function docker(args) {
  try { const result=await execute("docker", args, { timeout:60000, maxBuffer:1024*1024, windowsHide:true }); return (result.stdout+(args[0]==="logs"?result.stderr:"")).trim(); }
  catch (error) { throw new Error("Synthetic fixture docker " + args[0] + " failed: " + (error.stderr || error.message).slice(0,2000)); }
}
if (process.argv[2] !== "--run") throw new Error("Pass --run only on an authorized local Docker acceptance host");
const namespace = "ans-easel-check-" + randomBytes(4).toString("hex");
const frontend = await mkdtemp(join(tmpdir(), "ans-easel-acceptance-"));
await writeFile(join(frontend,"index.html"), "<html><head></head><body>synthetic acceptance</body></html>");
const config = configuration({ EASEL_ALLOW_HTTP_DEV:"1", EASEL_PUBLIC_ORIGIN:"http://127.0.0.1:17871", EASEL_OIDC_ISSUER:"http://127.0.0.1:17872",
  EASEL_OIDC_CLIENT_ID:"synthetic-local-check", EASEL_OIDC_CLIENT_SECRET:randomBytes(32).toString("base64url"),
  EASEL_COOKIE_KEY:randomBytes(32).toString("base64url"), EASEL_TENANT_KEY:randomBytes(32).toString("base64url"),
  EASEL_FRONTEND_DIR:frontend, EASEL_NAMESPACE:namespace, EASEL_MAX_ACTIVE:"2", EASEL_MAX_USERS:"2" });
const pool = new Containers(config, docker);
const users = ["synthetic-a", "synthetic-b"];
const tenants = users.map(user => tenantId(user,config.tenantKey));
const names = tenants.map(tenant => namespace + "-" + tenant);
const gateway = createGateway(config,{containers:pool, remote:async(_url,options)=>({sub:options.headers.Authorization.slice("Bearer check-".length)})});
await new Promise(resolve=>gateway.listen(0,"127.0.0.1",resolve));
const base = "http://127.0.0.1:" + gateway.address().port;
let hostRequests=0;
const hostProbe=http.createServer((_request,response)=>{hostRequests++;response.end("synthetic host probe");});
await new Promise(resolve=>hostProbe.listen(0,"0.0.0.0",resolve));
const reports=[];
const record = name => {reports.push(name); console.log("PASS " + name);};
function headers(index,extra={}) {
  return {cookie:config.sessionCookie+"="+seal({sub:users[index],accessToken:"check-"+users[index],exp:now()+240},config.cookieKey,"session"),
    "X-ANS-Easel-Workspace":users[index],origin:config.publicOrigin,...extra};
}
async function request(index,path,options={}) {
  return fetch(base+path,{...options,headers:headers(index,options.headers),signal:AbortSignal.timeout(180000)});
}
async function python(index,code) {return docker(["exec",names[index],"python","-c",code]);}
try {
  for(let i=0;i<2;i++) {
    const start=await request(i,"/ans/runtime",{method:"POST"});
    assert.equal(start.status,200,await start.text());
    const status=await request(i,"/api/status");assert.equal(status.status,200); const data=await status.json();
    assert(data && typeof data === "object");
    await python(i,"import time,urllib.request\nfor attempt in range(40):\n try:\n  r=urllib.request.urlopen('http://127.0.0.1:37289/healthz',timeout=0.3); assert r.status==200; break\n except Exception:\n  time.sleep(1)\nelse: raise AssertionError('OpenClaw did not become healthy')\nprint('healthy')");
    await python(i,"import os; assert all(key not in os.environ for key in ['OPENAI_API_KEY','AUTH_SECRET','DATABASE_URL','EASEL_COOKIE_KEY','EASEL_OIDC_CLIENT_SECRET'])");
    await docker(["exec",names[i],"/workspace/.venv/bin/python","-c","import requests,fastapi; print('skill interpreter healthy')"]);
    record("real worker " + users[i] + " and OpenClaw healthy; API reachable; no inherited ANS credentials");
  }
  for(let i=0;i<2;i++) {
    await python(i,"from pathlib import Path; p=Path('/workspace/outputs/ans-acceptance.txt'); p.parent.mkdir(exist_ok=True); p.write_text('"+users[i]+"'); (Path.home()/'ans-acceptance.txt').write_text('"+users[i]+"')");
    assert.equal(await python(i,"from pathlib import Path; print(Path('/workspace/outputs/ans-acceptance.txt').read_text()+':'+(Path.home()/'ans-acceptance.txt').read_text())"),users[i]+":"+users[i]);
  }
  record("separate writable workspace and home volumes");
  await python(0,"from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); page=b.new_page(); page.set_content('<title>synthetic</title>'); assert page.title()=='synthetic'; b.close()\nprint('chromium healthy')");
  record("Chromium can launch in the constrained worker without external navigation");
  assert.equal((await fetch(base+"/api/status")).status,401);
  assert.equal((await request(1,"/api/status",{headers:{"X-ANS-Easel-Workspace":users[0]}})).status,401);
  assert.equal((await request(1,"/ans/media/"+users[0]+"/ans-acceptance.txt")).status,401);
  for(let i=0;i<2;i++) {
    const media=await request(i,"/ans/media/"+users[i]+"/ans-acceptance.txt");assert.equal(media.status,200);assert.equal(await media.text(),users[i]);
  }
  record("gateway and media reject anonymous and cross-account requests");
  const other=JSON.parse(await docker(["inspect",names[1]]))[0];
  const otherIp=other.NetworkSettings.Networks[names[1]].IPAddress;
  const networkCheck = "import socket, json\nresults={}\nfor host,port in "+JSON.stringify([[otherIp,7860],["host.docker.internal",hostProbe.address().port],["1.1.1.1",443]])+":\n try:\n  s=socket.create_connection((host,port),timeout=2); s.close(); results[host]=True\n except OSError: results[host]=False\nassert not any(results.values()), results\nprint(json.dumps(results))";
  await python(0,networkCheck);assert.equal(hostRequests,0);record("worker cannot directly reach another tenant, the host or public Internet");
  const denied=JSON.parse(await python(0,"import requests,json; p={'http':'http://egress:8090','https':'http://egress:8090'}; r=requests.get('http://169.254.169.254/latest/meta-data/',proxies=p,timeout=5); print(json.dumps({'status':r.status_code})); assert r.status_code==403"));
  assert.equal(denied.status,403);record("egress proxy denies cloud metadata");
  const external=await python(0,"import requests; r=requests.get('https://example.com/',timeout=20); assert r.status_code==200; print(r.status_code)");
  assert.equal(external,"200");record("worker can access a public HTTPS site through its proxy");
  await assert.rejects(pool.resolve("c".repeat(64)),e=>e.code==="ACTIVE_CAPACITY");record("capacity limit rejects a third active worker");
  await docker(["stop","--time","10",names[0]]);await docker(["stop","--time","5",names[0]+"-egress"]);
  await pool.resolve(tenants[0]);
  assert.equal(await python(0,"from pathlib import Path; print(Path('/workspace/outputs/ans-acceptance.txt').read_text())"),users[0]);
  record("stopped worker and egress restart with persisted data");
  const restartedPool=new Containers(config, docker);await restartedPool.resolve(tenants[0]);record("gateway restart safely adopts its existing labelled worker");
  console.log(JSON.stringify({namespace,passed:reports.length,scope:"real Docker with synthetic sessions; production ANS OIDC and model/publishing are not tested"}));
} catch(error) {
  console.error("Acceptance failed: "+error.message);process.exitCode=1;
  for (const name of names) {
    const state=await docker(["inspect",name]).then(value=>JSON.parse(value)[0]).catch(()=>null);
    if(state?.Config.Labels?.["ans.easel.namespace"]===namespace) {
      console.error("Synthetic worker status: "+JSON.stringify({name,running:state.State.Running,exitCode:state.State.ExitCode}));
      console.error(await docker(["logs","--tail","12",name]).catch(()=>"Synthetic worker logs unavailable"));
    }
  }
} finally {
  hostProbe.closeAllConnections();await new Promise(resolve=>hostProbe.close(resolve));
  gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));
  // Cleanup is limited to these synthetic fixtures and only after label ownership is verified.
  for(const name of names.flatMap(name=>[name,name+"-egress"])) {
    const state=await docker(["inspect",name]).then(value=>JSON.parse(value)[0]).catch(()=>null);
    if(state?.Config.Labels?.["ans.easel.namespace"]===namespace) await docker(["rm","--force",name]);
  }
  for(const volume of names.flatMap(name=>[name+"-workspace",name+"-home"])) {
    const state=await docker(["volume","inspect",volume]).then(value=>JSON.parse(value)[0]).catch(()=>null);
    if(state?.Labels?.["ans.easel.namespace"]===namespace) await docker(["volume","rm",volume]);
  }
  for(const network of [...names,namespace+"-outbound"]) {
    const state=await docker(["network","inspect",network]).then(value=>JSON.parse(value)[0]).catch(()=>null);
    if(state?.Labels?.["ans.easel.namespace"]===namespace) await docker(["network","rm",network]);
  }
  await unlink(join(frontend,"index.html")); await rmdir(frontend);
}