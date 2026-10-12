// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), offer: vi.fn(), generate: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/server/voice/service", () => ({ readVoiceOffer: m.offer, generateVoice: m.generate, readVoiceRequest: m.read }));
import { GET, POST } from "@/app/api/mascot/tts/route";
import { GET as readRequest } from "@/app/api/mascot/tts/requests/[key]/route";
import { HttpRequestError } from "@/server/http/json";
const key="4c824605-dfd2-4abd-8f73-e35d0b9fba71";
const metadata={ requestId:"private-voice-id", state:"SETTLED" as const, points:0, reservedPoints:0,modelId:"mimo-v2.5-tts",policyVersion:"fixture-free",characters:4,createdAt:"2026-10-12T00:00:00Z",finishedAt:"2026-10-12T00:00:01Z",audioAvailable:true,expiresAt:"2026-10-13T00:00:00Z" };
function request(method="GET",raw?:string,headers?:Record<string,string>) {
 return new Request("https://ans.cauai.fun/api/mascot/tts",{method,headers:{"x-ans-actor":"member","origin":"https://ans.cauai.fun","content-type":"application/json",...headers},...(raw!==undefined?{body:raw}:{})});
}
afterEach(()=>vi.unstubAllEnvs());
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("AUTH_URL","https://ans.cauai.fun");m.auth.mockResolvedValue({user:{id:"member"}});m.offer.mockResolvedValue({available:true,points:0,mode:"free"});m.generate.mockResolvedValue({metadata,audio:new Uint8Array([1,2])});m.read.mockResolvedValue({metadata,audio:new Uint8Array([1,2])});});
it.each([GET,POST])("rejects anonymous access before a provider service call",async handler=>{
 m.auth.mockResolvedValue(null);const response=await handler(request(handler===POST?"POST":"GET",handler===POST?"{}":undefined));
 expect(response.status).toBe(401);expect(m.generate).not.toHaveBeenCalled();expect(m.offer).not.toHaveBeenCalled();
});
it.each([GET,POST])("rejects a stale actor before reading or dispatching",async handler=>{
 const response=await handler(request(handler===POST?"POST":"GET",handler===POST?"{}":undefined,{"x-ans-actor":"other"}));
 expect(response.status).toBe(409);expect(m.generate).not.toHaveBeenCalled();expect(m.offer).not.toHaveBeenCalled();
});
it("rejects cross-origin writes",async()=>{
 const response=await POST(request("POST","{}",{origin:"https://evil.example","sec-fetch-site":"cross-site"}));expect(response.status).toBe(403);expect(m.generate).not.toHaveBeenCalled();
});
it.each(["not json","{",JSON.stringify({text:"x".repeat(100001)})])("rejects malformed/oversize body before dispatch",async body=>{
 const response=await POST(request("POST",body));expect([400,413]).toContain(response.status);expect(m.generate).not.toHaveBeenCalled();
});
it("returns private audio with replay expiry and no supplier credentials",async()=>{
 const response=await POST(request("POST","{}"));expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("content-type")).toBe("audio/wav");expect(response.headers.get("x-ans-voice-expires")).toBe(metadata.expiresAt);expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1,2]);expect(m.generate).toHaveBeenCalledWith("member",{});
});
it("preserves pending and unknown request states without claiming successful audio",async()=>{
 m.generate.mockResolvedValue({metadata:{...metadata,state:"RUNNING",points:null,audioAvailable:false},audio:null});expect((await POST(request("POST","{}"))).status).toBe(202);
 m.generate.mockResolvedValue({metadata:{...metadata,state:"UNCERTAIN",points:null,audioAvailable:false},audio:null});const response=await POST(request("POST","{}"));expect(response.status).toBe(409);expect(await response.json()).toMatchObject({state:"UNCERTAIN",reservedPoints:0});
});
it("reads only the authenticated owner's original request",async()=>{
 const response=await readRequest(new Request(`https://ans.cauai.fun/api/mascot/tts/requests/${key}?audio=1`,{headers:{"x-ans-actor":"member"}}),{params:Promise.resolve({key})});expect(response.status).toBe(200);expect(m.read).toHaveBeenCalledWith("member",key,true);expect(m.generate).not.toHaveBeenCalled();
});
it("sanitizes unknown failures and preserves known rate-limit status",async()=>{
 m.generate.mockRejectedValue(new Error("private provider key and database detail"));const response=await POST(request("POST","{}"));expect(response.status).toBe(503);expect(await response.json()).toEqual({error:"VOICE_UNAVAILABLE"});
 m.generate.mockRejectedValue(new HttpRequestError("VOICE_RATE_LIMITED",429));expect((await POST(request("POST","{}"))).status).toBe(429);
});