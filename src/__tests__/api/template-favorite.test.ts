// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    template: { findFirst: vi.fn() },
    templateFavorite: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  },
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: mocks.writeAuditLog }));

import { DELETE, GET, POST } from "@/app/api/templates/[id]/favorite/route";

const context = { params: Promise.resolve({ id: "demo" }) };
const template = { id: "tpl1", slug: "demo", title: "演示模板" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.db.template.findFirst.mockResolvedValue(template);
  mocks.db.templateFavorite.findUnique.mockResolvedValue(null);
  mocks.db.templateFavorite.upsert.mockResolvedValue({
    userId: "user1",
    templateId: "tpl1",
    createdAt: new Date("2026-09-14T00:00:00.000Z"),
  });
  mocks.db.templateFavorite.deleteMany.mockResolvedValue({ count: 1 });
});

describe("/api/templates/[id]/favorite", () => {
  it("未登录返回 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/templates/demo/favorite"), context);
    expect(response.status).toBe(401);
  });

  it("GET 返回当前收藏状态", async () => {
    mocks.db.templateFavorite.findUnique.mockResolvedValue({ createdAt: new Date() });
    const response = await GET(new Request("http://localhost/api/templates/demo/favorite"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(true);
  });

  it("POST 收藏并写审计", async () => {
    const response = await POST(new Request("http://localhost/api/templates/demo/favorite", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10", "user-agent": "test" },
    }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(true);
    expect(mocks.db.templateFavorite.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_templateId: { userId: "user1", templateId: "tpl1" } },
    }));
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "TEMPLATE_FAVORITED",
      resourceId: "tpl1",
      ipAddress: "203.0.113.10",
    }));
  });

  it("DELETE 取消收藏并写审计", async () => {
    const response = await DELETE(new Request("http://localhost/api/templates/demo/favorite", { method: "DELETE" }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(false);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "TEMPLATE_UNFAVORITED",
      resourceId: "tpl1",
    }));
  });

  it("不存在的模板返回 404", async () => {
    mocks.db.template.findFirst.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/templates/nope/favorite", { method: "POST" }), context);
    expect(response.status).toBe(404);
  });
});
