import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/projects/resume-website", () => ({ ResumeWebsiteError: class extends Error { constructor(public code: string, public status: number) { super(code); } } }));
import { websiteResponse } from "@/server/projects/website-http";

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); auth.mockReset(); });
describe("private website error diagnostics", () => {
 it("correlates an unexpected database error without exposing private diagnostics", async () => {
  auth.mockResolvedValue({ user: { id: "private-owner" } });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await websiteResponse(async () => { throw Object.assign(new Error("private SQL and input"), { code: "P2028", meta: { secret: "private data" } }); });
  const body = await response.json();
  expect(response.status).toBe(500);
  expect(body.error).toEqual({ code: "INTERNAL_ERROR", message: "INTERNAL_ERROR" });
  expect(log).toHaveBeenCalledExactlyOnceWith("ANS website request failed.", { requestId: body.requestId, databaseCode: "P2028" });
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|secret/);
 });
 it("does not log arbitrary upstream code strings", async () => {
  auth.mockResolvedValue({ user: { id: "owner" } });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await websiteResponse(async () => { throw Object.assign(new Error("hidden"), { code: "private-input" }); });
  expect(log.mock.calls[0][1]).toMatchObject({ databaseCode: "UNKNOWN" });
 });
 it("keeps expected ownership errors unchanged and out of diagnostic logs", async () => {
  auth.mockResolvedValue({ user: { id: "owner" } });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await websiteResponse(async () => { throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND", status: 404 }); });
  expect(response.status).toBe(404);
  expect((await response.json()).error.code).toBe("NOT_FOUND");
  expect(log).not.toHaveBeenCalled();
 });
});
