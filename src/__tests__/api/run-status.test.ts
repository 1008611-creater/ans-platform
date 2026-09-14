// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: { run: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/runs/[id]/route";

const context = { params: Promise.resolve({ id: "run1" }) };
const run = {
  id: "run1",
  status: "SUCCEEDED",
  outputText: "结果",
  error: null,
  costPoints: 3,
  createdAt: new Date("2026-09-14T00:00:00.000Z"),
  finishedAt: new Date("2026-09-14T00:01:00.000Z"),
  template: { slug: "demo", title: "演示模板" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.db.run.findFirst.mockResolvedValue(run);
});

describe("GET /api/runs/[id]", () => {
  it("未登录返回 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/runs/run1"), context);
    expect(response.status).toBe(401);
    expect(mocks.db.run.findFirst).not.toHaveBeenCalled();
  });

  it("本人可以读取运行结果", async () => {
    const response = await GET(new Request("http://localhost/api/runs/run1"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).run.outputText).toBe("结果");
    expect(mocks.db.run.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run1", userId: "user1" },
    }));
  });

  it("他人记录返回 404", async () => {
    mocks.db.run.findFirst.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/runs/run1"), context);
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("run_not_found");
  });

  it("管理员可以读取其他用户记录", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    const response = await GET(new Request("http://localhost/api/runs/run1"), context);
    expect(response.status).toBe(200);
    expect(mocks.db.run.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run1" },
    }));
  });
});
