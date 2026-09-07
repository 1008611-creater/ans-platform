// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { triggerWebhooks } from "@/lib/webhook";
import { GET as list, POST as create } from "@/app/api/prompts/route";
import { GET as detail, PATCH as update } from "@/app/api/prompts/[id]/route";
import { GET as comments, POST as comment } from "@/app/api/prompts/[id]/comments/route";
import { GET as examples, POST as example } from "@/app/api/prompts/[id]/examples/route";
import { POST as mcp } from "@/app/api/mcp/route";
import { isSimilarContent } from "@/lib/similarity";

vi.mock("@/lib/db", () => ({ db: {
  user: { findUnique: vi.fn() },
  prompt: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
  promptVersion: { create: vi.fn() }, promptVote: { findUnique: vi.fn() },
  comment: { findMany: vi.fn(), create: vi.fn() }, notification: { create: vi.fn() },
  userPromptExample: { findMany: vi.fn(), create: vi.fn() },
} }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/webhook", () => ({ triggerWebhooks: vi.fn() }));
vi.mock("@/lib/ai/embeddings", () => ({ generatePromptEmbedding: vi.fn().mockResolvedValue(undefined), findAndSaveRelatedPrompts: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/quality-check", () => ({ checkPromptQuality: vi.fn().mockResolvedValue({ shouldDelist: false }) }));
vi.mock("@/lib/slug", () => ({ generatePromptSlug: vi.fn().mockResolvedValue("public-prompt") }));
vi.mock("@/lib/similarity", () => ({ normalizeContent: (value: string) => value, isSimilarContent: vi.fn().mockReturnValue(false) }));
vi.mock("@/../prompts.config", () => ({ default: { features: { mcp: true } } }));
vi.mock("@/lib/rate-limit", () => ({
  mcpGeneralLimiter: { check: () => ({ allowed: true }) }, mcpToolCallLimiter: { check: () => ({ allowed: true }) },
  mcpWriteToolLimiter: { check: () => ({ allowed: true }) }, mcpAiToolLimiter: { check: () => ({ allowed: true }) },
}));

const identity = { id: "user-1", username: "private_handle", nickname: "  星河  ", name: "原始实名", email: "private@example.test", avatar: null, verified: true, role: "USER" };
const publicAuthor = { id: "user-1", username: "private_handle", name: "星河", avatar: null, verified: true };
const prompt = {
  id: "prompt-1", slug: "public-prompt", title: "公开提示词", description: null, content: "公开内容", type: "IMAGE",
  authorId: identity.id, author: identity, contributors: [identity, { ...identity, id: "user-2", nickname: null }],
  userExamples: [{ id: "example-1", mediaUrl: "https://example.test/image.png", user: { ...identity, nickname: " \t " } }],
  category: null, tags: [], versions: [], _count: { votes: 3, contributors: 2 },
  isPrivate: false, isUnlisted: false, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const commentRow = { id: "comment-1", content: "评论", authorId: identity.id, author: identity, parentId: null, flagged: false, score: 0, votes: [], _count: { replies: 0 } };
const exampleRow = { id: "example-1", mediaUrl: "https://example.test/image.png", user: identity };
const params = { params: Promise.resolve({ id: prompt.id }) };
const request = (body?: unknown) => new NextRequest("http://localhost/api/prompts", body ? { method: "POST", body: JSON.stringify(body) } : undefined);
function noPrivateFields(value: unknown) {
  const text = JSON.stringify(value);
  for (const secret of [identity.name, identity.email, '"email"', '"nickname"']) expect(text).not.toContain(secret);
}
function publicSelect(relation: unknown) {
  expect(relation).toMatchObject({ select: { nickname: true } });
  expect(relation).not.toMatchObject({ select: { name: true } });
  expect(relation).not.toMatchObject({ select: { email: true } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(db.user.findUnique).mockResolvedValue({ flagged: false } as never);
  vi.mocked(db.prompt.findMany).mockResolvedValue([prompt] as never);
  vi.mocked(db.prompt.count).mockResolvedValue(1);
  vi.mocked(db.prompt.findFirst).mockResolvedValue(null);
  vi.mocked(db.prompt.findUnique).mockResolvedValue(prompt as never);
  vi.mocked(db.prompt.create).mockResolvedValue({ ...prompt, contributors: undefined, userExamples: undefined } as never);
  vi.mocked(db.prompt.update).mockResolvedValue({ ...prompt, contributors: undefined, userExamples: undefined } as never);
  vi.mocked(db.comment.findMany).mockResolvedValue([commentRow] as never);
  vi.mocked(db.comment.create).mockResolvedValue(commentRow as never);
  vi.mocked(db.userPromptExample.findMany).mockResolvedValue([exampleRow] as never);
  vi.mocked(db.userPromptExample.create).mockResolvedValue(exampleRow as never);
  vi.mocked(isSimilarContent).mockReturnValue(false);
});
function login() { vi.mocked(auth).mockResolvedValue({ user: { id: identity.id, role: "USER" } } as never); }

describe("限定公开 API 身份边界", () => {
  it("列表的作者、贡献者和示例作者只输出昵称或匿名，保留关联 ID", async () => {
    const response = await list(request());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.prompts[0].author).toEqual(publicAuthor);
    expect(data.prompts[0].contributors.map((u: { name: string }) => u.name)).toEqual(["星河", "匿名同学"]);
    expect(data.prompts[0].userExamples[0].user.name).toBe("匿名同学");
    noPrivateFields(data);
    const include = vi.mocked(db.prompt.findMany).mock.calls[0][0]?.include;
    publicSelect(include?.author); publicSelect(include?.contributors);
    publicSelect((include?.userExamples as { select: { user: unknown } }).select.user);
  });
  it("详情响应使用作者白名单而非原始用户对象", async () => {
    vi.mocked(db.prompt.findUnique).mockResolvedValue({ ...prompt, contributors: undefined, userExamples: undefined } as never);
    const response = await detail(request(), params);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.author).toEqual(publicAuthor);
    noPrivateFields(data);
    publicSelect(vi.mocked(db.prompt.findUnique).mock.calls[0][0]?.include?.author);
  });
  it("创建响应及 webhook 都映射昵称，不透传用户私有字段", async () => {
    login();
    const response = await create(request({ title: "新提示词", content: "内容", type: "TEXT", tagIds: [], isPrivate: false }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.author).toEqual(publicAuthor);
    noPrivateFields(data);
    const payload = vi.mocked(triggerWebhooks).mock.calls[0][1];
    expect(payload.author).toEqual(publicAuthor);
    noPrivateFields(payload);
    publicSelect(vi.mocked(db.prompt.create).mock.calls[0][0]?.include?.author);
  });
  it("重复内容提示的作者显示不使用 username", async () => {
    login(); vi.mocked(isSimilarContent).mockReturnValue(true);
    const response = await create(request({ title: "新提示词", content: "x".repeat(60), type: "TEXT", tagIds: [], isPrivate: false }));
    expect(response.status).toBe(409);
    expect((await response.json()).existingPromptAuthor).toBe("星河");
    publicSelect(vi.mocked(db.prompt.findMany).mock.calls[0][0]?.select?.author);
  });
  it("编辑响应维持 name 字段但仅映射 nickname", async () => {
    login();
    const response = await update(request({ isPrivate: false }), params);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.author).toEqual({ id: identity.id, username: identity.username, name: "星河" });
    noPrivateFields(data);
    publicSelect(vi.mocked(db.prompt.update).mock.calls[0][0]?.include?.author);
  });
  it.each([false, true])("评论读写身份安全（写入=%s）", async (write) => {
    if (write) login();
    const response = await (write ? comment(request({ content: "评论" }), params) : comments(request(), params));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect((write ? data.comment : data.comments[0]).author).toEqual({ id: identity.id, username: identity.username, name: "星河", avatar: null, role: "USER" });
    noPrivateFields(data);
    publicSelect(write ? vi.mocked(db.comment.create).mock.calls[0][0]?.include?.author : vi.mocked(db.comment.findMany).mock.calls[0][0]?.include?.author);
  });
  it.each([false, true])("示例读写不泄露用户资料（写入=%s）", async (write) => {
    if (write) login();
    const response = await (write ? example(request({ mediaUrl: exampleRow.mediaUrl }), params) : examples(request(), params));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect((write ? data.example : data.examples[0]).user).toEqual({ id: identity.id, username: identity.username, name: "星河", avatar: null });
    noPrivateFields(data);
    publicSelect(write ? vi.mocked(db.userPromptExample.create).mock.calls[0][0]?.include?.user : vi.mocked(db.userPromptExample.findMany).mock.calls[0][0]?.include?.user);
  });
});

describe("真实 MCP HTTP 响应的作者显示", () => {
  it.each(["search_prompts", "get_prompt", "search_skills", "get_skill"])("%s 不回退原名或 username", async (name) => {
    const row = { ...prompt, author: { ...identity, nickname: null } };
    vi.mocked(db.prompt.findMany).mockResolvedValue([row] as never);
    vi.mocked(db.prompt.findFirst).mockResolvedValue(row as never);
    const response = await mcp(new Request("http://localhost/api/mcp", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: { query: "公开", id: prompt.id } } }),
    }));
    expect(response.status).toBe(200);
    const rpc = await response.json();
    expect(rpc.result.isError).not.toBe(true);
    const data = JSON.parse(rpc.result.content[0].text);
    expect((data.prompts?.[0] ?? data.skills?.[0] ?? data).author).toBe("匿名同学");
    expect(rpc.result.content[0].text).not.toContain(identity.username);
    expect(rpc.result.content[0].text).not.toContain(identity.name);
    expect(rpc.result.content[0].text).not.toContain(identity.email);
    const query = name.startsWith("search") ? vi.mocked(db.prompt.findMany).mock.calls[0][0] : vi.mocked(db.prompt.findFirst).mock.calls[0][0];
    publicSelect(query?.select?.author);
  });
});
