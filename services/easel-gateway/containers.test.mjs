import { test } from "node:test";
import assert from "node:assert/strict";
import { runtimeArgs, Containers, validateWorker, validateEgress } from "./containers.mjs";
const config = { namespace: "ans-easel", publicOrigin: "https://easel.example.test", image: "worker:1", egressImage: "egress:1", maxActive: 1, maxUsers: 2, idleMs: 600000 };

const workerImage = {Id:"sha256:"+"1".repeat(64),Os:"linux",Config:{Entrypoint:["python","/opt/ans-easel-entrypoint.py"],Cmd:null,WorkingDir:"/workspace",Env:["PATH=/usr/bin","HOME=/home/easel"]}};
const egressImage = {Id:"sha256:"+"2".repeat(64),Os:"linux",Config:{Entrypoint:["node","/app/egress.mjs"],Cmd:null,WorkingDir:"/app",Env:["PATH=/usr/bin"]}};
const imageResponse = args => JSON.stringify([args[2]===config.image?workerImage:egressImage]);
function hostConfig(memory,swap,cpus,pids) {
  return {ReadonlyRootfs:true,Privileged:false,Init:true,PidMode:"",IpcMode:"private",UTSMode:"",UsernsMode:"",CgroupnsMode:"private",CapDrop:["ALL"],SecurityOpt:["no-new-privileges:true"],
    Memory:memory,MemorySwap:swap,NanoCpus:cpus,PidsLimit:pids,RestartPolicy:{Name:"no"}};
}
function workerState(tenant) {
  const name=config.namespace+"-"+tenant, args=runtimeArgs(config,tenant,workerImage.Id);
  const env=args.flatMap((arg,index)=>arg==="--env"?[args[index+1]]:[]);
  return {Image:workerImage.Id,Config:{...structuredClone(workerImage.Config),Env:[...workerImage.Config.Env,...env],User:"10001:10001",Labels:labels(tenant,"worker")},
    HostConfig:{...hostConfig(4294967296,4294967296,1500000000,256),NetworkMode:name,ShmSize:268435456,Tmpfs:{"/tmp":"rw,nosuid,nodev,size=512m,mode=1777"}},
    NetworkSettings:{Networks:{[name]:{}}},State:{Running:false},
    Mounts:[{Type:"volume",Name:name+"-workspace",Destination:"/workspace",RW:true},{Type:"volume",Name:name+"-home",Destination:"/home/easel",RW:true}]};
}
function labels(tenant,kind) {return {"ans.easel.namespace":config.namespace,"ans.easel.tenant":tenant,"ans.easel.kind":kind};}
function egressState(tenant) {
  const name=config.namespace+"-"+tenant;
  return {Image:egressImage.Id,Config:{...structuredClone(egressImage.Config),User:"1000:1000",Labels:labels(tenant,"egress")},
    HostConfig:{...hostConfig(134217728,268435456,250000000,32),NetworkMode:config.namespace+"-outbound",ShmSize:67108864,Sysctls:{"net.ipv4.ip_forward":"0"},PortBindings:{"8091/tcp":[{HostIp:"127.0.0.1",HostPort:""}]}},
    Mounts:[],State:{Running:false},NetworkSettings:{Networks:{[name]:{},[config.namespace+"-outbound"]:{}}}};
}
test("two users cannot share home, project mounts or networking and expose no public worker ports", () => {
  const a = runtimeArgs(config, "a".repeat(64), workerImage.Id); const b = runtimeArgs(config, "b".repeat(64), workerImage.Id);
  assert.notEqual(a[a.indexOf("--network") + 1], b[b.indexOf("--network") + 1]);
  for (const arg of a.filter(item => item.startsWith("type=volume"))) assert(!b.includes(arg));
  assert(!a.includes("--publish")); assert.equal(a[a.indexOf("--network-alias") + 1], "worker");
  assert(a.includes("--read-only")); assert(a.includes("ALL")); assert(a.includes("no-new-privileges:true"));
  assert(!a.some(item => item.includes("docker.sock") || item.includes("OIDC") || item.includes("API_KEY") || item.includes("COOKIE_KEY")));
  assert(a.includes("10001:10001")); assert(a.includes("HTTP_PROXY=http://egress:8090"));
});
test("invalid tenant names never reach Docker", async () => {
  let calls = 0; const pool = new Containers(config, async () => { calls++; return ""; });
  await assert.rejects(pool.resolve("../../other")); assert.equal(calls, 0);
});
test("a full pool rejects creation and never evicts or deletes another user's data", async () => {
  const calls = []; const pool = new Containers(config, async args => { calls.push(args); if (args[0] === "version") return "28.5.0"; if(args[0] === "image") return imageResponse(args); return args[0] === "ps" && !args.includes("-a") ? "ans-easel-other" : ""; });
  await assert.rejects(pool.resolve("a".repeat(64)), error => error.code === "ACTIVE_CAPACITY");
  assert(!calls.some(args => ["run", "stop", "rm"].includes(args[0])));
});
test("an existing container with the wrong owner is never adopted", async () => {
  const pool = new Containers(config, async args => args[0] === "version" ? "28.5.0" : args[0] === "image" ? imageResponse(args) : args[0] === "ps" ? "existing" : JSON.stringify([{ Config: { Labels: { "ans.easel.tenant": "other" } } }]));
  await assert.rejects(pool.resolve("a".repeat(64)), error => error.code === "RUNTIME_OWNERSHIP_CONFLICT");
});

test("old engines fail before creating any resources", async () => {
  const calls = []; const pool = new Containers(config, async args => { calls.push(args); return "27.5.0"; });
  await assert.rejects(pool.resolve("a".repeat(64)), error => error.code === "UNSUPPORTED_DOCKER_VERSION");
  assert.equal(calls.length, 1);
});
test("private networks and existing volumes must have matching ownership and isolation", async () => {
  const tenant = "a".repeat(64); const metadata = { Driver:"bridge", Internal:true, EnableIPv6:false,
    Labels:{"ans.easel.namespace":config.namespace,"ans.easel.tenant":tenant,"ans.easel.kind":"private-network"},
    Options:{"com.docker.network.bridge.gateway_mode_ipv4":"isolated","com.docker.network.bridge.gateway_mode_ipv6":"isolated"} };
  const calls = []; let wrongNetwork = true;
  const pool = new Containers(config, async args => {
    calls.push(args);
    if (args[1] === "ls") return "existing";
    if (args[0] === "network") return JSON.stringify([{...metadata, Internal:!wrongNetwork}]);
    return JSON.stringify([{Driver:"local",Labels:{"ans.easel.namespace":"other"}}]);
  });
  await assert.rejects(pool.ensureResources(tenant), e => e.code === "UNSAFE_RUNTIME_NETWORK");
  wrongNetwork = false;
  await assert.rejects(pool.ensureResources(tenant), e => e.code === "VOLUME_OWNERSHIP_CONFLICT");
  assert(!calls.some(args => args.includes("create") || args.includes("rm")));
});
test("labelled workers cannot retain a host port, bind mount or a second network", () => {
  const tenant = "a".repeat(64); const name = config.namespace + "-" + tenant;
  const state = workerState(tenant);
  validateWorker(config, tenant, state, workerImage);
  for (const change of [copy => {copy.HostConfig.PortBindings={"7860/tcp":[{HostIp:"127.0.0.1"}]};},copy => {copy.Mounts.push({Type:"bind",Source:"/",Destination:"/host"});},copy => {copy.NetworkSettings.Networks.other={};}]) {
    const copy = structuredClone(state); change(copy); assert.throws(() => validateWorker(config,tenant,copy,workerImage),e=>e.code==="UNSAFE_EXISTING_WORKER");
  }
});
test("active requests and pending startup prevent idle shutdown", async () => {
  const tenant = "a".repeat(64); const name = config.namespace + "-" + tenant; const calls=[];
  const pool = new Containers(config, async args => {calls.push(args);return args[0]==="ps"?name:"";});
  pool.touched.set(tenant,Date.now()-config.idleMs-1000); const release=pool.lease(tenant);
  await pool.stopIdle(); assert(!calls.some(args=>args[0]==="stop")); release();
  pool.touched.set(tenant,Date.now()-config.idleMs-1000);pool.pending.set(tenant,Promise.resolve());
  await pool.stopIdle();assert(!calls.some(args=>args[0]==="stop"));pool.pending.delete(tenant);
  await pool.stopIdle();assert.deepEqual(calls.filter(args=>args[0]==="stop").map(args=>args.at(-1)),[name,name+"-egress"]);
});

const driftCases = [
  ["different immutable image", s=>{s.Image="sha256:"+"9".repeat(64);} ],
  ["overridden entrypoint", s=>{s.Config.Entrypoint=["/bin/sh"];} ],
  ["overridden command", s=>{s.Config.Cmd=["-c","sleep infinity"];} ],
  ["overridden working directory", s=>{s.Config.WorkingDir="/tmp";} ],
  ["overridden healthcheck", s=>{s.Config.Healthcheck={Test:["CMD","/bin/sh"]};} ],
  ["extra environment", s=>{s.Config.Env.push("NODE_OPTIONS=--require=/tmp/attack.js");} ],
  ["duplicate environment", s=>{s.Config.Env.push(s.Config.Env[0]);} ],
  ["host PID namespace", s=>{s.HostConfig.PidMode="host";} ],
  ["host IPC namespace", s=>{s.HostConfig.IpcMode="host";} ],
  ["host UTS namespace", s=>{s.HostConfig.UTSMode="host";} ],
  ["host user namespace", s=>{s.HostConfig.UsernsMode="host";} ],
  ["host cgroup namespace", s=>{s.HostConfig.CgroupnsMode="host";} ],
  ["foreign cgroup", s=>{s.HostConfig.CgroupParent="/foreign";} ],
  ["unlimited memory", s=>{s.HostConfig.Memory=0;} ],
  ["unlimited swap", s=>{s.HostConfig.MemorySwap=-1;} ],
  ["unlimited CPU", s=>{s.HostConfig.NanoCpus=0;} ],
  ["unlimited PID count", s=>{s.HostConfig.PidsLimit=0;} ],
  ["alternate CPU quota", s=>{s.HostConfig.CpuQuota=100000;} ],
  ["disabled OOM killer", s=>{s.HostConfig.OomKillDisable=true;} ],
  ["device mount", s=>{s.HostConfig.Devices=[{PathOnHost:"/dev/kvm"}];} ],
  ["device request", s=>{s.HostConfig.DeviceRequests=[{Count:-1}];} ],
  ["device cgroup rule", s=>{s.HostConfig.DeviceCgroupRules=["a *:* rwm"];} ],
  ["supplemental host group", s=>{s.HostConfig.GroupAdd=["0"];} ],
  ["capability add", s=>{s.HostConfig.CapAdd=["SYS_ADMIN"];} ],
  ["missing capability drop", s=>{s.HostConfig.CapDrop=[];} ],
  ["unconfined security option", s=>{s.HostConfig.SecurityOpt.push("seccomp=unconfined");} ],
  ["privileged", s=>{s.HostConfig.Privileged=true;} ],
  ["writable rootfs", s=>{s.HostConfig.ReadonlyRootfs=false;} ],
  ["missing init", s=>{s.HostConfig.Init=false;} ],
  ["root user", s=>{s.Config.User="0:0";} ],
  ["bind request", s=>{s.HostConfig.Binds=["/:/host"];} ],
  ["foreign volumes", s=>{s.HostConfig.VolumesFrom=["foreign"];} ],
  ["host network", s=>{s.HostConfig.NetworkMode="host";} ],
  ["extra network", s=>{s.NetworkSettings.Networks.foreign={};} ],
  ["host alias", s=>{s.HostConfig.ExtraHosts=["metadata:169.254.169.254"];} ],
  ["custom DNS", s=>{s.HostConfig.Dns=["169.254.169.254"];} ],
  ["restart always", s=>{s.HostConfig.RestartPolicy.Name="always";} ],
];
for (const [role, fixture, validate, image] of [["worker",workerState,validateWorker,workerImage],["egress",egressState,validateEgress,egressImage]]) {
  test(role+" accepts only its resolved image and creation contract",()=>validate(config,"a".repeat(64),fixture("a".repeat(64)),image));
  for (const [description,change] of driftCases) test(role+" refuses "+description,()=>{
    const state=fixture("a".repeat(64));change(state);
    assert.throws(()=>validate(config,"a".repeat(64),state,image));
  });
}
test("worker refuses altered proxies, writable mount flags and tmpfs policy",()=>{
  const tenant="a".repeat(64);
  for(const change of [s=>{s.Config.Env=s.Config.Env.map(e=>e.startsWith("HTTPS_PROXY=")?"HTTPS_PROXY=http://attacker:8090":e);},s=>{s.Mounts[0].RW=false;},s=>{s.HostConfig.Tmpfs["/tmp"]="rw,suid,dev";},s=>{s.HostConfig.Sysctls={"net.ipv4.ip_forward":"1"};}]) {
    const state=workerState(tenant);change(state);assert.throws(()=>validateWorker(config,tenant,state,workerImage));
  }
});
test("egress refuses changed proxy code, public listener and forwarding",()=>{
  const tenant="a".repeat(64);
  for(const change of [s=>{s.Config.Env.push("NODE_USE_ENV_PROXY=1");},s=>{s.HostConfig.PortBindings["8091/tcp"][0].HostIp="0.0.0.0";},s=>{s.HostConfig.Sysctls={"net.ipv4.ip_forward":"1"};},s=>{s.Mounts=[{Type:"bind",Destination:"/app"}];}]) {
    const state=egressState(tenant);change(state);assert.throws(()=>validateEgress(config,tenant,state,egressImage));
  }
});
test("image references are pinned once and cannot silently follow tag replacement",async()=>{
  const calls=[];let moved=false;
  const pool=new Containers(config,async args=>{calls.push(args);const image=structuredClone(args[2]===config.image?workerImage:egressImage);if(moved)image.Id="sha256:"+"9".repeat(64);return JSON.stringify([image]);});
  const resolved=await pool.resolveImages();moved=true;
  assert.strictEqual(await pool.resolveImages(),resolved);assert.equal(calls.length,2);
  assert.equal(runtimeArgs(config,"a".repeat(64),resolved.worker.Id).at(-1),workerImage.Id);
  assert.throws(()=>runtimeArgs(config,"a".repeat(64),config.image),e=>e.code==="UNRESOLVED_RUNTIME_IMAGE");
  assert.throws(()=>validateWorker(config,"a".repeat(64),workerState("a".repeat(64)),{...workerImage,Id:"sha256:"+"9".repeat(64)}));
});
test("unresolvable or malformed image metadata fails before any resource creation",async()=>{
  for(const response of ["", "null", "{}", "[]", "[null]", JSON.stringify([{...workerImage,Id:"worker:1"}]), JSON.stringify([{...workerImage,Os:"windows"}])]) {
    const calls=[];const pool=new Containers(config,async args=>{calls.push(args);return args[0]==="version"?"28.5.0":response;});
    await assert.rejects(pool.resolve("a".repeat(64)),e=>e.code==="UNRESOLVED_RUNTIME_IMAGE");
    assert(!calls.some(args=>["run","start","rm","network","volume"].includes(args[0])));
  }
});
test("unsafe labelled worker is rejected before start, attach, or deletion",async()=>{
  const tenant="a".repeat(64),state=workerState(tenant);state.HostConfig.PidMode="host";
  const calls=[];const pool=new Containers(config,async args=>{calls.push(args);if(args[0]==="version")return "28.5.0";if(args[0]==="image")return imageResponse(args);if(args[0]==="ps")return config.namespace+"-"+tenant;return JSON.stringify([state]);});
  await assert.rejects(pool.resolve(tenant),e=>e.code==="UNSAFE_EXISTING_WORKER");
  assert(!calls.some(args=>["run","start","rm","stop","network","volume"].includes(args[0])));
});
test("unsafe labelled egress is rejected before start, attach, or deletion",async()=>{
  const tenant="a".repeat(64),state=egressState(tenant);state.Image="sha256:"+"9".repeat(64);
  delete state.NetworkSettings.Networks[config.namespace+"-"+tenant];const calls=[];
  const pool=new Containers(config,async args=>{calls.push(args);if(args[0]==="image")return imageResponse(args);if(args[1]==="ls"||args[0]==="ps")return "existing";if(args[0]==="network")return JSON.stringify([{Driver:"bridge",Internal:false,EnableIPv6:false,Labels:{"ans.easel.namespace":config.namespace},Options:{"com.docker.network.bridge.enable_icc":"false"}}]);return JSON.stringify([state]);});
  await assert.rejects(pool.ensureEgress(tenant),e=>e.code==="UNSAFE_EXISTING_EGRESS");
  assert(!calls.some(args=>["run","start","rm","stop","volume"].includes(args[0])||args.includes("connect")||args.includes("create")));
});
test("new egress runs the immutable ID under the same resource and namespace contract",async()=>{
  const calls=[];const pool=new Containers(config,async args=>{calls.push(args);if(args[0]==="image")return imageResponse(args);if(args[0]==="ps")return "";if(args[1]==="ls")return "existing";if(args[0]==="network"&&args[1]==="inspect")return JSON.stringify([{Driver:"bridge",Internal:false,EnableIPv6:false,Labels:{"ans.easel.namespace":config.namespace},Options:{"com.docker.network.bridge.enable_icc":"false"}}]);return "";});
  await pool.ensureEgress("a".repeat(64));const args=calls.find(a=>a[0]==="run");
  assert.equal(args.at(-1),egressImage.Id);assert.equal(args[args.indexOf("--ipc")+1],"private");assert.equal(args[args.indexOf("--cgroupns")+1],"private");assert.equal(args[args.indexOf("--memory-swap")+1],"256m");
});
