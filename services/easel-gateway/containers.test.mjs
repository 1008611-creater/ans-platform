import { test } from "node:test";
import assert from "node:assert/strict";
import { runtimeArgs, Containers, validateWorker } from "./containers.mjs";
const config = { namespace: "ans-easel", publicOrigin: "https://easel.example.test", image: "worker:1", egressImage: "egress:1", maxActive: 1, maxUsers: 2, idleMs: 600000 };
test("two users cannot share home, project mounts or networking and expose no public worker ports", () => {
  const a = runtimeArgs(config, "a".repeat(64)); const b = runtimeArgs(config, "b".repeat(64));
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
  const calls = []; const pool = new Containers(config, async args => { calls.push(args); if (args[0] === "version") return "28.5.0"; return args[0] === "ps" && !args.includes("-a") ? "ans-easel-other" : ""; });
  await assert.rejects(pool.resolve("a".repeat(64)), error => error.code === "ACTIVE_CAPACITY");
  assert(!calls.some(args => ["run", "stop", "rm"].includes(args[0])));
});
test("an existing container with the wrong owner is never adopted", async () => {
  const pool = new Containers(config, async args => args[0] === "version" ? "28.5.0" : args[0] === "ps" ? "existing" : JSON.stringify([{ Config: { Labels: { "ans.easel.tenant": "other" } } }]));
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
  const state = {Config:{User:"10001:10001"}, HostConfig:{ReadonlyRootfs:true,NetworkMode:name,CapDrop:["ALL"],SecurityOpt:["no-new-privileges:true"]},
    NetworkSettings:{Networks:{[name]:{}}},Mounts:[{Type:"volume",Name:name+"-workspace",Destination:"/workspace"},{Type:"volume",Name:name+"-home",Destination:"/home/easel"}]};
  validateWorker(config, tenant, state);
  for (const change of [copy => {copy.HostConfig.PortBindings={"7860/tcp":[{HostIp:"127.0.0.1"}]};},copy => {copy.Mounts.push({Type:"bind",Source:"/",Destination:"/host"});},copy => {copy.NetworkSettings.Networks.other={};}]) {
    const copy = structuredClone(state); change(copy); assert.throws(() => validateWorker(config,tenant,copy),e=>e.code==="UNSAFE_EXISTING_WORKER");
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
