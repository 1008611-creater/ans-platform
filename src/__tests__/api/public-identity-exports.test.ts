// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { GET as csvGET } from "@/app/prompts.csv/route";
import { GET as jsonGET } from "@/app/prompts.json/route";
import { db } from "@/lib/db";

const author = {
  id: "author-id", username: "member_01", nickname: "  星河  ",
  name: "原始实名甲", email: "private-a@example.test", githubUsername: "private-github-a",
  avatar: null, verified: true,
};
const contributors = [
  author,
  { ...author, id: "other-id", username: "member_02", nickname: "星河" },
  { ...author, id: "anonymous-1", username: "email_local_part", nickname: null },
  { ...author, id: "anonymous-2", username: "imported_user", nickname: " \t ", email: "imported_user@unclaimed.prompts.chat", githubUsername: null },
];
const updatedAt = new Date("2026-09-01T00:00:00Z");
const prompt = {
  id: "prompt-id", title: "公开提示词", content: "x".repeat(600), slug: "public-prompt",
  type: "TEXT", structuredFormat: null, category: { id: "category", name: "编程", slug: "coding", icon: null },
  tags: [], _count: { votes: 3, comments: 2 }, author, contributors, updatedAt,
};

function request(query = "", etag?: string) {
  return new NextRequest(`http://localhost/prompts.json${query}`, {
    headers: etag ? { "If-None-Match": etag } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.prompt.findMany).mockResolvedValue([prompt] as never);
  vi.mocked(db.prompt.count).mockResolvedValue(1);
  vi.mocked(db.prompt.findFirst).mockResolvedValue({ updatedAt } as never);
});

describe("公开 CSV 身份边界", () => {
  it("仅输出昵称署名，按 ID 排除作者，不合并同昵称及匿名贡献者", async () => {
    const response = await csvGET();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain(',"星河,星河,匿名同学,匿名同学"');
    for (const secret of [author.name, author.email, author.githubUsername, "unclaimed.prompts.chat", "email_local_part", "imported_user"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("身份查询只读取去重 ID 和 nickname，保留公开过滤条件", async () => {
    await csvGET();
    const query = vi.mocked(db.prompt.findMany).mock.calls[0][0];
    expect(query?.select?.author).toEqual({ select: { id: true, nickname: true } });
    expect(query?.select?.contributors).toEqual({ select: { id: true, nickname: true } });
    expect(query?.where).toEqual({ isPrivate: false, isUnlisted: false, deletedAt: null });
  });

  it("昵称内逗号、引号和换行仍遵循 CSV 转义", async () => {
    vi.mocked(db.prompt.findMany).mockResolvedValue([{ ...prompt, author: { ...author, nickname: '星,"河\n同学' }, contributors: [] }] as never);
    expect(await (await csvGET()).text()).toContain('"星,""河\n同学"');
  });
});

describe("公开 JSON 身份边界", () => {
  it.each(["", "?page=1&limit=2", "?full_content=true"])("%s 保留关联和贡献人数，但不输出真实身份", async (query) => {
    const response = await jsonGET(request(query));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.prompts[0].author).toEqual({ username: author.username, name: "星河", avatar: null, identifier: author.username, verified: true });
    expect(data.prompts[0].contributors).toHaveLength(4);
    expect(data.prompts[0].contributors.map((c: { name: string }) => c.name)).toEqual(["星河", "星河", "匿名同学", "匿名同学"]);
    expect(data.prompts[0].contributors.map((c: { username: string }) => c.username)).toEqual(contributors.map(c => c.username));
    expect(data.prompts[0].contributors.map((c: { identifier: string }) => c.identifier)).toEqual(contributors.map(c => c.username));
    const serialized = JSON.stringify(data);
    for (const secret of [author.name, author.email, author.githubUsername, "unclaimed.prompts.chat", "githubUsername", '"email"']) {
      expect(serialized).not.toContain(secret);
    }
    expect(data.prompts[0].contentPreview).toBe("x".repeat(500) + "...");
    if (query.includes("full_content")) expect(data.prompts[0].content).toBe(prompt.content);
    else expect(data.prompts[0]).not.toHaveProperty("content");
    if (query.includes("page")) expect(data).toMatchObject({ page: 1, limit: 2, totalPages: 1, hasMore: false });
  });

  it("作者和贡献者 select 只保留公开响应实际使用的字段", async () => {
    await jsonGET(request());
    const query = vi.mocked(db.prompt.findMany).mock.calls[0][0];
    const identitySelect = { username: true, nickname: true, avatar: true, verified: true };
    expect(query?.select?.author).toEqual({ select: identitySelect });
    expect(query?.select?.contributors).toEqual({ select: identitySelect });
    expect(query?.where).toEqual({ isPrivate: false, isUnlisted: false, deletedAt: null });
  });

  it("旧身份格式的 ETag 不返回 304，以免客户端继续使用泄露缓存", async () => {
    const legacy = '"' + createHash("md5").update(`1-${updatedAt.toISOString()}`).digest("hex") + '"';
    const response = await jsonGET(request("", legacy));
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).not.toBe(legacy);
  });
});
