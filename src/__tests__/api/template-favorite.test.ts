// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPublishedTemplateByKey: vi.fn(),
  isTemplateFavorited: vi.fn(),
  favoriteTemplate: vi.fn(),
  unfavoriteTemplate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/templates/favorites", () => ({
  getPublishedTemplateByKey: mocks.getPublishedTemplateByKey,
  isTemplateFavorited: mocks.isTemplateFavorited,
  favoriteTemplate: mocks.favoriteTemplate,
  unfavoriteTemplate: mocks.unfavoriteTemplate,
}));

import { DELETE, GET, POST } from "@/app/api/templates/[id]/favorite/route";

const context = { params: Promise.resolve({ id: "demo" }) };
const template = { id: "tpl1", slug: "demo", title: "演示模板" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.getPublishedTemplateByKey.mockResolvedValue(template);
  mocks.isTemplateFavorited.mockResolvedValue(false);
});

describe("/api/templates/[id]/favorite", () => {
  it("未登录返回 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/templates/demo/favorite"), context);
    expect(response.status).toBe(401);
    expect(mocks.getPublishedTemplateByKey).not.toHaveBeenCalled();
  });

  it("GET 返回当前收藏状态", async () => {
    mocks.isTemplateFavorited.mockResolvedValue(true);
    const response = await GET(new Request("http://localhost/api/templates/demo/favorite"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(true);
    expect(mocks.isTemplateFavorited).toHaveBeenCalledWith("user1", "tpl1");
  });

  it("POST 收藏并写审计", async () => {
    const response = await POST(new Request("http://localhost/api/templates/demo/favorite", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10", "user-agent": "test" },
    }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(true);
    expect(mocks.favoriteTemplate).toHaveBeenCalledWith("user1", template, {
      ipAddress: "203.0.113.10",
      userAgent: "test",
    });
  });

  it("DELETE 取消收藏并写审计", async () => {
    const response = await DELETE(new Request("http://localhost/api/templates/demo/favorite", { method: "DELETE" }), context);
    expect(response.status).toBe(200);
    expect((await response.json()).favorited).toBe(false);
    expect(mocks.unfavoriteTemplate).toHaveBeenCalledWith("user1", template, {
      ipAddress: null,
      userAgent: null,
    });
  });

  it("不存在的模板返回 404", async () => {
    mocks.getPublishedTemplateByKey.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/templates/nope/favorite", { method: "POST" }), context);
    expect(response.status).toBe(404);
    expect(mocks.favoriteTemplate).not.toHaveBeenCalled();
  });
});
