import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAddress, destination, createRelayServer } from "./egress.mjs";
test("egress denies loopback, cloud metadata, private, mapped and special networks", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.17.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "198.18.1.1", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::"]) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true); assert.equal(publicAddress("2606:4700:4700::1111"), true);
});
test("DNS names with any internal answer fail closed and checked public DNS is pinned", async () => {
  await assert.rejects(destination("rebind.test", async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]));
  await assert.rejects(destination("metadata.test", async () => [{ address: "169.254.169.254", family: 4 }]));
  const answer = { address: "8.8.8.8", family: 4 };
  assert.deepEqual(await destination("public.test", async () => [answer]), answer);
});

test("public DNS prefers IPv4 without accepting a private alternative", async () => {
  const v4={address:"8.8.8.8",family:4};
  assert.deepEqual(await destination("public.test",async()=>[{address:"2606:4700:4700::1111",family:6},v4]),v4);
});
test("inbound relay forwards only to its own worker even with a hostile Host or URL", async t => {
  const http=await import("node:http"); const seen=[];
  const worker=http.createServer((request,response)=>{seen.push({url:request.url,host:request.headers.host});response.end("tenant-a");});
  await new Promise(resolve=>worker.listen(0,"127.0.0.1",resolve));
  const relay=createRelayServer((options,callback)=>{assert.equal(options.hostname,"worker");assert.equal(options.port,7860);return http.request({...options,hostname:"127.0.0.1",port:worker.address().port},callback);});
  await new Promise(resolve=>relay.listen(0,"127.0.0.1",resolve));
  t.after(async()=>{relay.closeAllConnections();worker.closeAllConnections();await Promise.all([new Promise(resolve=>relay.close(resolve)),new Promise(resolve=>worker.close(resolve))]);});
  const base="http://127.0.0.1:"+relay.address().port;
  assert.equal(await (await fetch(base+"/api/personas",{headers:{host:"another-tenant:7860"}})).text(),"tenant-a");
  assert.deepEqual(seen,[{url:"/api/personas",host:"127.0.0.1:7860"}]);
  assert.equal((await fetch(base+"//another-worker/api/env")).status,400);assert.equal(seen.length,1);
});
