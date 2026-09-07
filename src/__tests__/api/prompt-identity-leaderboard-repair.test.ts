// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET } from "@/app/api/leaderboard/route";

vi.mock("@/lib/db", () => ({ db: { promptVote: { groupBy: vi.fn() }, prompt: { findMany: vi.fn() }, user: { findMany: vi.fn() } } }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

beforeEach(() => vi.resetAllMocks());

describe("榜单有效用户截断专属回归", () => {
  it("高票 deleted/flagged 用户在 Top20 截断前排除，不挤掉有效用户", async () => {
    const users = Array.from({ length: 25 }, (_, index) => ({
      id: `user-${index}`, username: `handle-${index}`, nickname: index === 2 ? " \t " : `昵称${index}`,
      name: "原始姓名", email: "secret@example.test", avatar: null,
      deletedAt: index === 0 ? new Date("2026-01-01") : null, flagged: index === 1,
      _count: { prompts: 1 },
    }));
    vi.mocked(db.promptVote.groupBy).mockResolvedValue(users.map((_, i) => ({ promptId: `prompt-${i}`, _count: { promptId: 100 - i } })) as never);
    vi.mocked(db.prompt.findMany).mockImplementation(async args => {
      const filter = args?.where?.author as { deletedAt?: unknown; flagged?: boolean } | undefined;
      return users.filter(user => (!filter || !("deletedAt" in filter) || user.deletedAt === filter.deletedAt) && (filter?.flagged === undefined || user.flagged === filter.flagged))
        .map(user => ({ id: user.id.replace("user", "prompt"), authorId: user.id })) as never;
    });
    vi.mocked(db.user.findMany).mockImplementation(async args => {
      const ids = (args?.where?.id as { in: string[] }).in;
      return users.filter(user => ids.includes(user.id) && user.deletedAt === args?.where?.deletedAt && user.flagged === args?.where?.flagged) as never;
    });
    const response = await GET(new Request("http://localhost/api/leaderboard"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leaderboard).toHaveLength(20);
    expect(data.leaderboard[0]).toMatchObject({ id: "user-2", username: "handle-2", name: "匿名同学", totalUpvotes: 98 });
    expect(data.leaderboard[19]).toMatchObject({ id: "user-21", name: "昵称21", totalUpvotes: 79 });
    expect(data.leaderboard.map((row: { id: string }) => row.id)).not.toContain("user-0");
    expect(data.leaderboard.map((row: { id: string }) => row.id)).not.toContain("user-1");
    expect(JSON.stringify(data)).not.toContain("原始姓名");
    expect(JSON.stringify(data)).not.toContain("secret@example.test");
    const select = vi.mocked(db.user.findMany).mock.calls[0][0]?.select;
    expect(select).toMatchObject({ nickname: true, username: true });
    expect(select).not.toHaveProperty("name");
    expect(select).not.toHaveProperty("email");
  });

  it.each(["all", "month", "week"])("%s 补位查询同样排除 deleted/flagged 并安全映射昵称", async period => {
    vi.mocked(db.promptVote.groupBy).mockResolvedValue([]);
    vi.mocked(db.prompt.findMany).mockResolvedValue([]);
    vi.mocked(db.user.findMany).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "fill", username: "fill_handle", nickname: null, name: "原始姓名", email: "secret@example.test", avatar: null, _count: { prompts: 1 } },
    ] as never);
    const response = await GET(new Request(`http://localhost/api/leaderboard?period=${period}`));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leaderboard).toEqual([{ id: "fill", username: "fill_handle", name: "匿名同学", avatar: null, promptCount: 1, totalUpvotes: 0 }]);
    const query = vi.mocked(db.user.findMany).mock.calls[1][0];
    expect(query?.where).toMatchObject({ deletedAt: null, flagged: false });
    expect(query?.take).toBe(10);
    expect(query?.select).toMatchObject({ nickname: true });
    expect(query?.select).not.toHaveProperty("name");
    expect(query?.select).not.toHaveProperty("email");
  });
});
