// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import UserProfilePage, { generateMetadata } from "@/app/[username]/page";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  user: { findFirst: vi.fn() },
  prompt: { findMany: vi.fn(), count: vi.fn() },
  promptVote: { count: vi.fn(), findMany: vi.fn() },
  pinnedPrompt: { findMany: vi.fn() },
  changeRequest: { findMany: vi.fn() },
  comment: { findMany: vi.fn() },
} }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => `${key}${values ? JSON.stringify(values) : ""}`,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/../prompts.config", () => ({ default: { features: { mcp: false } } }));
vi.mock("@/components/prompts/prompt-list", () => ({ PromptList: () => null }));
vi.mock("@/components/prompts/prompt-card", () => ({ PromptCard: () => null }));
vi.mock("@/components/ui/masonry", () => ({ Masonry: () => null }));
vi.mock("@/components/mcp/mcp-server-popup", () => ({ McpServerPopup: () => null }));
vi.mock("@/components/prompts/private-prompts-note", () => ({ PrivatePromptsNote: () => null }));
vi.mock("@/components/user/activity-chart-wrapper", () => ({ ActivityChartWrapper: () => null }));
vi.mock("@/components/user/profile-links", () => ({ ProfileLinks: () => null }));

const rawIdentity = {
  id: "member-id", username: "email_local_part", nickname: "  星河  ",
  name: "原始实名甲", email: "private-a@example.test", githubUsername: "private-github-a",
  bio: "原始实名甲 private-a@example.test https://private.example.test/me",
  customLinks: [{ type: "website", url: "https://private.example.test/me", label: "原始实名甲" }],
  avatar: null, role: "USER", verified: true, createdAt: new Date("2026-01-01"),
  _count: { prompts: 8, contributions: 3 },
};
const prompt = {
  id: "prompt-id", title: "公开提示词", slug: "public-prompt", description: null,
  content: "公开正文", type: "TEXT", mediaUrl: null, isPrivate: false,
  createdAt: new Date("2026-01-02"), author: rawIdentity, category: null, tags: [],
  _count: { votes: 7, contributors: 3, outgoingConnections: 0, incomingConnections: 0 },
};
const props = () => ({ params: Promise.resolve({ username: "@email_local_part" }), searchParams: Promise.resolve({}) });

function walk(node: ReactNode, visit: (props: Record<string, unknown>, type: unknown) => void) {
  if (Array.isArray(node)) { node.forEach(child => walk(child, visit)); return; }
  if (!isValidElement<Record<string, unknown>>(node)) return;
  visit(node.props, node.type);
  walk(node.props.children as ReactNode, visit);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(null as never);
  vi.mocked(db.user.findFirst).mockResolvedValue(rawIdentity as never);
  vi.mocked(db.prompt.findMany).mockImplementation((query) => Promise.resolve(
    query?.select && "createdAt" in query.select && !query.select.author
      ? [] : [{ ...prompt, ...(query?.include && "userExamples" in query.include ? { userExamples: [{ mediaUrl: "/example.png" }] } : {}) }]
  ) as never);
  vi.mocked(db.prompt.count).mockResolvedValue(8);
  vi.mocked(db.promptVote.count).mockResolvedValue(7);
  vi.mocked(db.promptVote.findMany).mockResolvedValue([]);
  vi.mocked(db.comment.findMany).mockResolvedValue([]);
  vi.mocked(db.pinnedPrompt.findMany).mockResolvedValue([{ prompt }] as never);
  vi.mocked(db.changeRequest.findMany).mockImplementation(query => Promise.resolve(query?.select ? [] : [{
    id: "change-id", status: "APPROVED", createdAt: new Date("2026-01-03"),
    author: { ...rawIdentity, nickname: null },
    prompt: { id: prompt.id, slug: prompt.slug, title: prompt.title, author: rawIdentity },
  }]) as never);
});

describe("profile metadata 公开身份", () => {
  it.each([null, "", " \t ", "  星河  "])("昵称 %j 不回退到 name 或 username", async nickname => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ ...rawIdentity, nickname } as never);
    const metadata = await generateMetadata(props());
    const label = nickname?.trim() || "匿名同学";
    expect(metadata.title).toBe(`${label} (@${rawIdentity.username})`);
    expect(metadata.description).toBe(`View ${label}'s prompts`);
    expect(vi.mocked(db.user.findFirst).mock.calls[0][0]?.select).toEqual({ nickname: true, username: true });
  });

  it("不存在及非 @ 路由不改变原有处理", async () => {
    expect(await generateMetadata({ ...props(), params: Promise.resolve({ username: "plain" }) })).toEqual({ title: "User Not Found" });
    expect(db.user.findFirst).not.toHaveBeenCalled();
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    expect(await generateMetadata(props())).toEqual({ title: "User Not Found" });
    await expect(UserProfilePage(props())).rejects.toThrow("NOT_FOUND");
  });
});

describe("profile 服务端到 client 的身份边界", () => {
  it.each([false, true])("owner=%s：页面与所有 client props 都不携带原始身份、bio 或自定义链接", async owner => {
    if (owner) vi.mocked(auth).mockResolvedValue({ user: { id: rawIdentity.id } } as never);
    const tree = await UserProfilePage(props());
    const serialized = JSON.stringify(tree, (_key, value) => isValidElement(value) ? value.props : value);
    for (const secret of [rawIdentity.name, rawIdentity.email, rawIdentity.githubUsername, "https://private.example.test/me", '"email"', '"customLinks"', '"bio"']) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).toContain("星河");
    expect(serialized).toContain("匿名同学");
    const cards: Array<Record<string, unknown>> = [];
    walk(tree, props => {
      if (props.prompt) cards.push(props.prompt as Record<string, unknown>);
      if (props.prompts) cards.push(...props.prompts as Array<Record<string, unknown>>);
    });
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.author).toEqual({ id: rawIdentity.id, username: rawIdentity.username, name: "星河", avatar: null, verified: true });
      expect(card.contributorCount).toBe(3);
      expect(card.voteCount).toBe(7);
    }
    expect(cards.some(card => card.mediaUrl === "/example.png")).toBe(true);
    expect(serialized).toContain("contributionsCount");
    expect(serialized).not.toContain("unclaimedUser");
  });

  it("所有用户查询只选实际需要字段，不为 unclaimed 标识读取或反推邮箱", async () => {
    await UserProfilePage(props());
    expect(vi.mocked(db.user.findFirst).mock.calls[0][0]?.select).toEqual({
      id: true, nickname: true, username: true, avatar: true, role: true, verified: true, createdAt: true,
      _count: { select: { prompts: true, contributions: true } },
    });
    const queries = [
      ...vi.mocked(db.prompt.findMany).mock.calls,
      ...vi.mocked(db.pinnedPrompt.findMany).mock.calls,
      ...vi.mocked(db.changeRequest.findMany).mock.calls,
    ];
    function inspect(value: unknown) {
      if (!value || typeof value !== "object") return;
      for (const [key, entry] of Object.entries(value)) {
        if (key === "author") {
          expect(entry).toHaveProperty("select.nickname", true);
          const selection = (entry as { select: Record<string, unknown> }).select;
          for (const field of ["name", "email", "githubUsername", "bio", "customLinks"]) expect(selection).not.toHaveProperty(field);
          if (!selection.verified) expect(selection).toEqual({ nickname: true });
        }
        inspect(entry);
      }
    }
    queries.forEach(inspect);
  });
});
