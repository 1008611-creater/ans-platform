import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all heavy dependencies before importing the route handlers.
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    prompt: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    tag: { findUnique: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  mcpGeneralLimiter: { check: vi.fn().mockReturnValue({ allowed: true }) },
  mcpToolCallLimiter: { check: vi.fn().mockReturnValue({ allowed: true }) },
  mcpWriteToolLimiter: { check: vi.fn().mockReturnValue({ allowed: true }) },
  mcpAiToolLimiter: { check: vi.fn().mockReturnValue({ allowed: true }) },
}));

vi.mock("@/lib/public-identity", () => ({
  getPublicDisplayName: vi.fn((name: string) => name),
}));

vi.mock("@/../prompts.config", () => ({
  default: {
    features: { mcp: true },
  },
}));

vi.mock("@/lib/api-key", () => ({
  isValidApiKeyFormat: vi.fn().mockReturnValue(false),
  hashApiKey: vi.fn((key: string) => `hashed:${key}`),
}));

vi.mock("@/lib/skill-files", () => ({
  parseSkillFiles: vi.fn(),
  serializeSkillFiles: vi.fn(),
  sanitizeFilename: vi.fn(),
  DEFAULT_SKILL_FILE: "main.md",
}));

// The MCP endpoint is an App Router route handler, so it exports Web-standard
// Request/Response functions instead of a pages-router (req, res) handler.
import * as mcpRoute from "@/app/api/mcp/route";
import { GET, DELETE } from "@/app/api/mcp/route";

describe("MCP API route - HTTP method routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET requests", () => {
    it("should return 405 Method Not Allowed per MCP Streamable HTTP spec", async () => {
      const response = await GET();

      expect(response.status).toBe(405);
    });

    it("should return JSON-RPC error body", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        jsonrpc: "2.0",
        error: expect.objectContaining({
          code: -32000,
          message: expect.stringContaining("Method not allowed"),
        }),
        id: null,
      });
    });

    it("should set Cache-Control: no-store to prevent caching stale 405s", async () => {
      const response = await GET();

      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("DELETE requests", () => {
    it("should return 204 No Content with an empty body", async () => {
      const response = await DELETE();

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
    });
  });

  describe("unsupported methods", () => {
    // The App Router only exposes handlers for the methods a route module
    // exports. With no PUT/PATCH export, Next.js itself answers 405, so the
    // regression guard is that these exports never appear.
    it("should not export PUT or PATCH handlers", () => {
      expect((mcpRoute as unknown as Record<string, unknown>).PUT).toBeUndefined();
      expect((mcpRoute as unknown as Record<string, unknown>).PATCH).toBeUndefined();
    });
  });

  describe("MCP disabled", () => {
    it("should return 404 from GET when MCP feature is disabled", async () => {
      vi.doMock("@/../prompts.config", () => ({
        default: { features: { mcp: false } },
      }));
      vi.resetModules();

      const mod = await import("@/app/api/mcp/route");
      const response = await mod.GET();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "MCP is not enabled" });

      vi.doMock("@/../prompts.config", () => ({
        default: { features: { mcp: true } },
      }));
      vi.resetModules();
    });

    it("should return 404 from POST when MCP feature is disabled", async () => {
      vi.doMock("@/../prompts.config", () => ({
        default: { features: { mcp: false } },
      }));
      vi.resetModules();

      const mod = await import("@/app/api/mcp/route");
      const request = new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      });
      const response = await mod.POST(request);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "MCP is not enabled" });

      vi.doMock("@/../prompts.config", () => ({
        default: { features: { mcp: true } },
      }));
      vi.resetModules();
    });
  });
});
