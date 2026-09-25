// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  listRecentRunsForUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/runs/service", () => ({
  listRecentRunsForUser: mocks.listRecentRunsForUser,
}));

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
  mocks.listRecentRunsForUser.mockResolvedValue({
    runs: [run("r1"), run("r2")],
    nextCursor: "r2",
    balance: 9,
  });
});

describe("GET /api/me/runs", () => {
  it("返回分页结果、下一游标和余额", async () => {
    const response = await GET(new Request("http://localhost/api/me/runs?limit=2"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.runs).toHaveLength(2);
    expect(data.nextCursor).toBe("r2");
    expect(data.balance).toBe(9);
    expect(mocks.listRecentRunsForUser).toHaveBeenCalledWith("user1", {
      limit: 2,
      cursor: null,
    });
  });

  it("使用游标读取下一页", async () => {
    mocks.listRecentRunsForUser.mockResolvedValue({
      runs: [run("r3")],
      nextCursor: null,
      balance: 9,
    });
    const response = await GET(new Request("http://localhost/api/me/runs?limit=2&cursor=r2"));
    expect(response.status).toBe(200);
    expect((await response.json()).runs[0].id).toBe("r3");
    expect(mocks.listRecentRunsForUser).toHaveBeenCalledWith("user1", {
      limit: 2,
      cursor: "r2",
    });
  });

  it("非法页大小返回 400", async () => {
    const response = await GET(new Request("http://localhost/api/me/runs?limit=0"));
    expect(response.status).toBe(400);
    expect(mocks.listRecentRunsForUser).not.toHaveBeenCalled();
  });

  it("失效游标返回 400", async () => {
    mocks.listRecentRunsForUser.mockRejectedValue(new Error("cursor"));
    const response = await GET(new Request("http://localhost/api/me/runs?cursor=gone"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_cursor");
  });
});
