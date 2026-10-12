import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { VoiceClient, abortableDelay } from '../public/mascot/3d/voice-client.mjs';
const context = { actor: 'isolation-member', policyVersion: 'isolation-free' };
const input = { text: 'Public guide only', voice: 'Chloe' };
function store() { const values = new Map(); return { getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values }; }
const audio = () => new Response(new Uint8Array([1,2]), {headers:{'content-type':'audio/wav','x-ans-voice-expires':'2099-01-01T00:00:00Z'}});
test('lost POST response recovers through GET and replay uses the identical key across new client instances',async()=>{
 const calls=[],storage=store();const fetchImpl=async(url,options)=>{calls.push({url,options});if(options.method==='POST'&&calls.length===1)throw new Error('lost response');return audio();};
 const client=new VoiceClient({fetchImpl,storage,cryptoImpl:webcrypto});await client.audio(context,input);
 assert.equal(calls.length,2);assert.equal(calls[1].options.method,undefined);
 const key=JSON.parse(calls[0].options.body).idempotencyKey;assert.ok(calls[1].url.includes(key));
 const next=new VoiceClient({fetchImpl,storage,cryptoImpl:webcrypto});await next.audio(context,input);
 assert.equal(JSON.parse(calls[2].options.body).idempotencyKey,key);
 assert.ok([...storage.values.keys()].every(key=>/^ans:voice:[a-f0-9]{64}$/.test(key)));
 assert.ok([...storage.values.values()].every(value=>!value.includes(context.actor)&&!value.includes(input.text)));
});
test('unknown request keeps the same key beyond 24 hours and is never replaced by transport',async()=>{
 const calls=[],storage=store();let now=100000;
 const client=new VoiceClient({cryptoImpl:webcrypto,storage,now:()=>now,fetchImpl:async(url,options)=>{calls.push(options);return Response.json({state:'UNCERTAIN'},{status:409});}});
 await assert.rejects(()=>client.audio(context,input));now+=48*3600*1000;await assert.rejects(()=>client.audio(context,input));
 assert.equal(JSON.parse(calls[0].body).idempotencyKey,JSON.parse(calls[1].body).idempotencyKey);
});
test('pending response polls only reads and stops after a bounded number',async()=>{
 const methods=[];let reads=0;
 const client=new VoiceClient({cryptoImpl:webcrypto,pause:async()=>{},fetchImpl:async(url,options)=>{methods.push(options.method||'GET');if(options.method==='POST')return Response.json({state:'RUNNING'},{status:202});reads++;return reads===2?audio():Response.json({state:'RUNNING'},{status:202});}});
 await client.audio(context,input);assert.deepEqual(methods,['POST','GET','GET']);
});
test('account or policy changes create distinct purchase identities without sharing audio keys',async()=>{
 const keys=[];const client=new VoiceClient({cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{keys.push(JSON.parse(options.body).idempotencyKey);return audio();}});
 await client.audio(context,input);await client.audio({...context,actor:'other'},input);await client.audio({...context,policyVersion:'new-free'},input);
 assert.equal(new Set(keys).size,3);
});
test('aborted request does not read or send another POST, and later user retry retains the original key',async()=>{
 const controller=new AbortController(),calls=[];
 const client=new VoiceClient({cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{calls.push(options);if(calls.length===1){controller.abort();throw new DOMException('aborted','AbortError');}return audio();}});
 await assert.rejects(()=>client.audio(context,input,controller.signal));assert.equal(calls.length,1);
 await client.audio(context,input);assert.equal(JSON.parse(calls[0].body).idempotencyKey,JSON.parse(calls[1].body).idempotencyKey);
});
test('expiry permits only a subsequent explicit call to create a fresh request',async()=>{
 const calls=[];const client=new VoiceClient({cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{calls.push(options);return calls.length===1?Response.json({error:'VOICE_AUDIO_EXPIRED'},{status:410}):audio();}});
 await assert.rejects(()=>client.audio(context,input));assert.equal(calls.length,1);
 await client.audio(context,input);assert.notEqual(JSON.parse(calls[0].body).idempotencyKey,JSON.parse(calls[1].body).idempotencyKey);
});
test('abortable pause exits immediately for an already stopped signal',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(()=>abortableDelay(10000,controller.signal),{name:'AbortError'});
});
test('browser fetch never receives a VoiceClient receiver on either POST or recovery GET',async()=>{
 const methods=[];
 const fetchImpl=async function(url,options){assert.equal(this,undefined);methods.push(options.method||'GET');if(options.method==='POST')throw new Error('lost response');return audio();};
 await new VoiceClient({cryptoImpl:webcrypto,fetchImpl}).audio(context,input);assert.deepEqual(methods,['POST','GET']);
});
