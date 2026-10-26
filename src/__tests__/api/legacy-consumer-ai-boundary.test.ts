// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({auth:vi.fn(),config:vi.fn(),provider:vi.fn()}));
vi.mock("@/lib/auth",()=>({auth:m.auth}));
vi.mock("@/lib/config",()=>({getConfig:m.config}));
vi.mock("openai",()=>({default:m.provider}));
vi.mock("@/lib/ai/load-prompt",()=>({loadPrompt:vi.fn(()=>({})),getSystemPrompt:vi.fn(()=>"fixture"),interpolatePrompt:vi.fn(()=>"fixture")}));
import { POST as chat } from "@/app/api/prompt-builder/chat/route";
import { POST as example } from "@/app/api/prompt-builder/generate-example/route";
import { blockUnmeteredConsumerAI } from "@/server/integrations/legacy-consumer-ai";
import { NextRequest } from "next/server";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED","1");vi.stubEnv("OPENAI_API_KEY","isolated-fixture-key");m.auth.mockResolvedValue({user:{id:"isolated-member"}});m.config.mockResolvedValue({features:{aiGeneration:true}});});
afterEach(()=>vi.unstubAllEnvs());
it.each([chat,example])("blocks an unmetered legacy provider even when a key and feature flag exist",async handler=>{
 const response=await handler(new NextRequest("https://ans.example.invalid/api/legacy",{method:"POST",body:"{malformed"}));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({error:"POINTS_INTEGRATION_REQUIRED"});expect(response.headers.get("cache-control")).toBe("private, no-store");expect(m.provider).not.toHaveBeenCalled();expect(m.config).not.toHaveBeenCalled();
});
it.each([chat,example])("keeps legacy authenticated-route access checks",async handler=>{
 m.auth.mockResolvedValue(null);expect((await handler(new NextRequest("https://ans.example.invalid/api/legacy",{method:"POST"}))).status).toBe(401);expect(m.provider).not.toHaveBeenCalled();
});
it("does not silently change non-unified installations",()=>{vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED","0");expect(blockUnmeteredConsumerAI()).toBeNull();});
