import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE, PATCH } from "@/app/api/user/api-key/route";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-key";
function keyRequest(method: string, body?: unknown, actor = "user1", origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/user/api-key", {
    method, headers: { "Content-Type": "application/json", "Origin": origin, "x-ans-actor": actor },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}


// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/api-key", () => ({
  generateApiKey: vi.fn(),
  hashApiKey: vi.fn((key: string) => `hashed:${key}`),
}));

describe("GET /api/user/api-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return hasApiKey: false when no key exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      apiKey: null,
      mcpPromptsPublicByDefault: true,
    } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasApiKey).toBe(false);
    expect(data.apiKey).toBeNull();
  });

  it("should return hasApiKey: true without exposing the stored key", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      apiKey: "pchat_abc123def456",
      mcpPromptsPublicByDefault: true,
    } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasApiKey).toBe(true);
    expect(data.apiKey).toBeNull();
  });

  it("should return mcpPromptsPublicByDefault setting", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      apiKey: "pchat_abc123",
      mcpPromptsPublicByDefault: false,
    } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mcpPromptsPublicByDefault).toBe(false);
  });
});

describe("POST /api/user/api-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await POST(keyRequest("POST"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should generate and return new API key", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(generateApiKey).mockReturnValue("pchat_newkey123");
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const response = await POST(keyRequest("POST"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apiKey).toBe("pchat_newkey123");
  });

  it("should update user with new key", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(generateApiKey).mockReturnValue("pchat_newkey123");
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await POST(keyRequest("POST"));

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { apiKey: "hashed:pchat_newkey123" },
    });
  });

  it("should call generateApiKey function", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(generateApiKey).mockReturnValue("pchat_test");
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await POST(keyRequest("POST"));

    expect(generateApiKey).toHaveBeenCalled();
  });
});

describe("DELETE /api/user/api-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await DELETE(keyRequest("DELETE"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should set apiKey to null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    await DELETE(keyRequest("DELETE"));

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { apiKey: null },
    });
  });

  it("should return success: true", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const response = await DELETE(keyRequest("DELETE"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("PATCH /api/user/api-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({ mcpPromptsPublicByDefault: true }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for missing mcpPromptsPublicByDefault", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({}),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 400 for non-boolean value", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({ mcpPromptsPublicByDefault: "true" }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 400 for number value", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({ mcpPromptsPublicByDefault: 1 }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should update mcpPromptsPublicByDefault to true", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({ mcpPromptsPublicByDefault: true }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { mcpPromptsPublicByDefault: true },
    });
  });

  it("should update mcpPromptsPublicByDefault to false", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never);
    vi.mocked(db.user.update).mockResolvedValue({} as never);

    const request = new NextRequest("http://localhost:3000/api/user/api-key", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" },
      body: JSON.stringify({ mcpPromptsPublicByDefault: false }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { mcpPromptsPublicByDefault: false },
    });
  });
});

describe("key changes are bound to the displayed account and same origin", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(auth).mockResolvedValue({ user: { id: "user1" } } as never); });
  it.each([POST, DELETE, PATCH])("rejects stale-account writes before generating or updating a key", async handler => {
    const response = await handler(keyRequest("POST", { mcpPromptsPublicByDefault: true }, "previous-user"));
    expect(response.status).toBe(409); expect((await response.json()).error).toBe("ACCOUNT_CHANGED");
    expect(generateApiKey).not.toHaveBeenCalled(); expect(db.user.update).not.toHaveBeenCalled();
  });
  it.each([POST, DELETE, PATCH])("rejects cross-site writes", async handler => {
    const response = await handler(keyRequest("POST", {}, "user1", "https://other.invalid"));
    expect(response.status).toBe(403); expect(db.user.update).not.toHaveBeenCalled();
  });
  it("never caches a generated plaintext key or private read", async () => {
    vi.mocked(generateApiKey).mockReturnValue("isolated-fixture-key");
    vi.mocked(db.user.findUnique).mockResolvedValue({ apiKey: "hash", mcpPromptsPublicByDefault: false } as never);
    for (const response of [await POST(keyRequest("POST")), await GET()]) expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("handles malformed JSON without a server error or mutation", async () => {
    const request = new NextRequest("http://localhost:3000/api/user/api-key", { method: "PATCH", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-ans-actor": "user1" }, body: "{" });
    expect((await PATCH(request)).status).toBe(400); expect(db.user.update).not.toHaveBeenCalled();
  });
});
