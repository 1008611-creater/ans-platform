import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useVoiceOffer } from "@/components/mascot/use-voice-offer";
const offer=()=>({available:true,mode:"free",points:0,modelId:"mimo-v2.5-tts",policyVersion:"fixture-free",checkedAt:new Date().toISOString(),reviewBy:new Date(Date.now()+60000).toISOString(),cacheHours:24,maxCharacters:1200});
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal("fetch",vi.fn());});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
async function flush(){await act(async()=>{await Promise.resolve();await Promise.resolve();});}
it("does not fetch a policy for an anonymous account or voice opt-out",()=>{
 const view=renderHook(({actor,enabled})=>useVoiceOffer(actor,enabled),{initialProps:{actor:null as string|null,enabled:true}});expect(fetch).not.toHaveBeenCalled();
 view.rerender({actor:"member",enabled:false});expect(fetch).not.toHaveBeenCalled();expect(view.result.current).toBeNull();
});
it("shows only a reviewed zero-price policy and removes it at the deadline",async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json(offer()));const view=renderHook(()=>useVoiceOffer("member",true));await flush();
 expect(view.result.current?.points).toBe(0);expect(fetch).toHaveBeenCalledWith("/api/mascot/tts",expect.objectContaining({headers:{"x-ans-actor":"member"}}));
 act(()=>vi.advanceTimersByTime(60001));expect(view.result.current).toBeNull();
});
it("never uses a paid or expired quote under the free voice preference",async()=>{
 vi.mocked(fetch).mockResolvedValue(Response.json({...offer(),mode:"paid",points:1}));const view=renderHook(()=>useVoiceOffer("member",true));await flush();expect(view.result.current).toBeNull();
});
it("ignores a late previous-account quote and does not share its policy with the new actor",async()=>{
 let first!:(response:Response)=>void;const deferred=new Promise<Response>(resolve=>{first=resolve;});vi.mocked(fetch).mockReturnValueOnce(deferred).mockResolvedValueOnce(Response.json({...offer(),policyVersion:"second-account-policy"}));
 const view=renderHook(({actor})=>useVoiceOffer(actor,true),{initialProps:{actor:"first"}});view.rerender({actor:"second"});await flush();expect(view.result.current?.policyVersion).toBe("second-account-policy");
 first(Response.json({...offer(),policyVersion:"stale-first"}));await flush();expect(view.result.current?.policyVersion).toBe("second-account-policy");
});