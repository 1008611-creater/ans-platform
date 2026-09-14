// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    run: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/me/runs/route";

function run(id: string) {
  return {
    id,
    status: "SUCCEEDED",
    costPoints: 1,
    outputText: "结果",
    error: null,
    createdAt: new Date(),
    finishedAt: new Date(),
    template: { slug: "demo", title: "演示模板" },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1", role: "USER" } });
  mocks.db.run.findMany.mockResolvedValue([run("r1"), run("r2"), run("r3")]);
  mocks.db.user.findUnique.mockResolvedValue({ quotaPoints: 9 });
});

describe("GET /api/me/runs", () => {
  it("返回分页结果、下一游标和余额", async () => {
    const response = await GET(new Request("http://localhost/api/me/runs?limit=2"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.runs).toHaveLength(2);
    expect(data.nextCursor).toBe("r2");
    expect(data.balance).toBe(9);
    expect(mocks.db.run.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 3,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
  });

  it("使用游标读取下一页", async () => {
    mocks.db.run.findMany.mockResolvedValue([run("r3")]);
    const response = await GET(new Request("http://localhost/api/me/runs?limit=2&cursor=r2"));
    expect(response.status).toBe(200);
    expect((await response.json()).runs[0].id).toBe("r3");
    expect(mocks.db.run.findMany).toHaveBeenCalledWith(expect.objectContaining({
      cursor: { id: "r2" },
      skip: 1,
      take: 3,
    }));
  });

  it("非法页大小返回 400", async () => {
    const response = await GET(new Request("http://localhost/api/me/runs?limit=0"));
    expect(response.status).toBe(400);
    expect(mocks.db.run.findMany).not.toHaveBeenCalled();
  });
});
