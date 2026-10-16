// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ auth: vi.fn(), improve: vi.fn(), translate: vi.fn(), sql: vi.fn(), enabled: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: m.user } } }));
vi.mock("@/lib/api-key", () => ({ isValidApiKeyFormat: (value: string) => value.startsWith("fixture-") }));
vi.mock("@/lib/ai/improve-prompt", () => ({ improvePrompt: m.improve }));
vi.mock("@/lib/ai/generation", () => ({ translateContent: m.translate, generateSQL: m.sql, isAIGenerationEnabled: m.enabled }));
import { POST as improve } from "@/app/api/improve-prompt/route";
import { POST as translate } from "@/app/api/prompts/translate/route";
import { POST as sql } from "@/app/api/generate/sql/route";

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1");
  m.auth.mockResolvedValue({ user: { id: "member" } });
  m.improve.mockResolvedValue({ improved: "improved" }); m.translate.mockResolvedValue("translated");
  m.enabled.mockResolvedValue(true); m.sql.mockResolvedValue("SELECT 1");
});
afterEach(() => vi.unstubAllEnvs());

it.each([improve, translate, sql])("rejects unified unmetered calls before reading input or using provider/config/embeddings", async handler => {
  const request = new NextRequest("https://ans.example.invalid/api/legacy", { method: "POST", body: "{malformed" });
  const read = vi.spyOn(request, "json");
  const response = await handler(request);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "POINTS_INTEGRATION_REQUIRED" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(read).not.toHaveBeenCalled();
  for (const provider of [m.improve, m.translate, m.sql, m.enabled]) expect(provider).not.toHaveBeenCalled();
});

it.each([improve, translate, sql])("still authenticates before returning a points boundary", async handler => {
  m.auth.mockResolvedValue(null);
  const response = await handler(new NextRequest("https://ans.example.invalid/api/legacy", { method: "POST" }));
  expect(response.status).toBe(401);
  for (const provider of [m.improve, m.translate, m.sql, m.enabled]) expect(provider).not.toHaveBeenCalled();
});

it("retains improve-prompt API key authentication before the billing boundary", async () => {
  m.auth.mockResolvedValue(null); m.user.mockResolvedValue({ id: "api-member", username: "member" });
  const response = await improve(new NextRequest("https://ans.example.invalid/api/improve-prompt", { method: "POST", headers: { "x-api-key": "fixture-key" } }));
  expect(m.user).toHaveBeenCalledWith({ where: { apiKey: "fixture-key" }, select: { id: true, username: true } });
  expect(response.status).toBe(503); expect(m.improve).not.toHaveBeenCalled();
});

it.each([
  { handler: improve, body: { prompt: "a" }, provider: m.improve, expected: { improved: "improved" } },
  { handler: translate, body: { content: "hello", targetLanguage: "zh" }, provider: m.translate, expected: { translatedContent: "translated" } },
  { handler: sql, body: { prompt: "query" }, provider: m.sql, expected: { sql: "SELECT 1" } },
])("preserves each legacy route when unified billing is disabled", async ({ handler, body, provider, expected }) => {
  vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "0");
  const response = await handler(new NextRequest("https://ans.example.invalid/api/legacy", { method: "POST", body: JSON.stringify(body) }));
  expect(response.status).toBe(200); expect(await response.json()).toEqual(expected); expect(provider).toHaveBeenCalledTimes(1);
});
