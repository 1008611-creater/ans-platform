// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import UserProfilePage, { generateMetadata } from "@/app/[username]/page";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getGrowthProfile } from "@/server/growth/service";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { MarketOfferCard } from "@/components/marketplace/offer-card";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/growth/service", () => ({ getGrowthProfile: vi.fn(), safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  user: { findFirst: vi.fn() },
  prompt: { findMany: vi.fn(), count: vi.fn() },
  promptVote: { count: vi.fn(), findMany: vi.fn() },
  pinnedPrompt: { findMany: vi.fn() },
  changeRequest: { findMany: vi.fn() },
  artifactPublication: { findMany: vi.fn() },
  marketListing: { findMany: vi.fn() },
} }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, unknown>) => `${key}${values ? JSON.stringify(values) : ""}`,
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

const rawIdentity = {
  id: "member-id", username: "email_local_part", nickname: "  星河  ",
  name: "原始实名甲", email: "private-a@example.test", githubUsername: "private-github-a",
  bio: "原始实名甲 private-a@example.test https://private.example.test/me",
  customLinks: [{ type: "website", url: "https://private.example.test/me", label: "原始实名甲" }],
  xp: 125, communityPoints: 20, checkInStreak: 2, lastCheckInAt: null, avatarFrameKey: "mint", chatBubbleKey: "default",
  avatar: null, role: "USER", verified: true, createdAt: new Date("2026-01-01"),
};
const publishedListing = {
  slug: "public-service", title: "已审核公开服务", summary: "提供已经公开审核的真实服务说明。", description: "服务内容、交付形式与使用范围均在公开版本中说明，隐藏草稿。",
  category: "web", subcategory: "网站开发", fulfillment: "service", priceMinor: 9900,
  currency: "CNY", deliveryDays: 3, revisionLimit: 1, computeIncluded: false,
  deliverables: ["公开交付说明"], licenseTerms: "本公开版本按双方约定使用。",
};
const privateEvent = { id: "private-event-id", type: "COMMENT", xp: 3, points: 0, sourceType: "comment", createdAt: new Date("2026-01-02") };
const privateCheckIn = { id: "private-checkin-id", day: "2026-01-02", streak: 2, xpAwarded: 5, createdAt: new Date("2026-01-02") };
const props = () => ({ params: Promise.resolve({ username: "@email_local_part" }), searchParams: Promise.resolve({}) });
function walk(node: ReactNode, visit: (props: Record<string, unknown>, type: unknown) => void) {
  if (Array.isArray(node)) { node.forEach(child => walk(child, visit)); return; }
  if (!isValidElement<Record<string, unknown>>(node)) return;
  visit(node.props, node.type); walk(node.props.children as ReactNode, visit);
}
function serialize(tree: ReactNode) { return JSON.stringify(tree, (_key, value) => isValidElement(value) ? value.props : value); }

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(null as never);
  // Extra identity fields emulate an unsafe upstream row: the page must project its client props explicitly.
  vi.mocked(db.user.findFirst).mockResolvedValue(rawIdentity as never);
  vi.mocked(getGrowthProfile).mockResolvedValue({ ...rawIdentity, recentEvents: [privateEvent], checkIns: [privateCheckIn] } as never);
  vi.mocked(db.artifactPublication.findMany).mockResolvedValue([{ artifactVersion: {
    id: "public-version", version: 3, artifact: { title: "已审核公开作品", project: { title: "不应公开的项目名" } },
  } }] as never);
  vi.mocked(db.marketListing.findMany).mockResolvedValue([{
    id: "public-offer", slug: "public-service", official: false, status: "PUBLISHED", publishedVersion: 2,
    seller: { id: rawIdentity.id, username: rawIdentity.username, nickname: "星河", avatar: null },
    versions: [{ version: 3, payload: { ...publishedListing, title: "未发布服务草稿" } }, { version: 2, payload: publishedListing }],
  }] as never);
});

describe("profile metadata 公开身份", () => {
  it.each([null, "", " \t ", "  星河  "])("昵称 %j 不回退到 name 或 username", async nickname => {
    vi.mocked(db.user.findFirst).mockResolvedValue({ ...rawIdentity, nickname } as never);
    const metadata = await generateMetadata(props());
    const label = nickname?.trim() || "匿名同学";
    expect(metadata.title).toBe(`${label} (@${rawIdentity.username})`);
    expect(metadata.description).toBe(`profile · ${label}`);
    const selection = vi.mocked(db.user.findFirst).mock.calls[0][0]?.select;
    expect(selection).toMatchObject({ nickname: true, username: true });
    for (const field of ["name", "email", "githubUsername", "bio", "customLinks"]) expect(selection).not.toHaveProperty(field);
  });
  it.each(["plain", "@", "%E0%A4%A"])("非法路由 %s 不读取用户", async username => {
    const input = { params: Promise.resolve({ username }) };
    expect(await generateMetadata(input)).toEqual({ title: "notFound" });
    await expect(UserProfilePage(input)).rejects.toThrow("NOT_FOUND");
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });
  it("不存在用户保持 404", async () => {
    vi.mocked(db.user.findFirst).mockResolvedValue(null);
    expect(await generateMetadata(props())).toEqual({ title: "notFound" });
    await expect(UserProfilePage(props())).rejects.toThrow("NOT_FOUND");
    expect(db.artifactPublication.findMany).not.toHaveBeenCalled();
  });
});

describe("profile 服务端到 client 的身份与发布边界", () => {
  it.each([false, true])("owner=%s：仅传递公开作品、已发布服务和安全身份", async owner => {
    if (owner) vi.mocked(auth).mockResolvedValue({ user: { id: rawIdentity.id } } as never);
    const tree = await UserProfilePage(props()), serialized = serialize(tree);
    for (const secret of [rawIdentity.name, rawIdentity.email, rawIdentity.githubUsername, "https://private.example.test/me", '"email"', '"customLinks"', '"bio"', "不应公开的项目名", "未发布服务草稿"]) expect(serialized).not.toContain(secret);
    expect(serialized).toContain("星河"); expect(serialized).toContain("已审核公开作品");
    const links: string[] = [], cards: Array<Record<string, unknown>> = [], growth: Array<Record<string, unknown>> = [];
    walk(tree, (componentProps, type) => {
      if (typeof componentProps.href === "string") links.push(componentProps.href);
      if (type === MarketOfferCard) cards.push(componentProps);
      if (type === ProfileGrowthPanel) growth.push(componentProps);
    });
    expect(links).toContain("/showcase/public-version");
    expect(links).not.toEqual(expect.arrayContaining([expect.stringMatching(/^\/(prompts|templates)(?:\/|$)/)]));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ headingLevel: 3, offer: { id: "public-offer", version: 2, listing: { title: publishedListing.title }, seller: { id: rawIdentity.id, nickname: "星河" } } });
    expect(growth).toHaveLength(1);
    expect(growth[0]).toMatchObject({ editable: owner, actorId: owner ? rawIdentity.id : undefined, user: {
      xp: rawIdentity.xp, communityPoints: rawIdentity.communityPoints,
      recentEvents: owner ? [privateEvent] : [], checkIns: owner ? [privateCheckIn] : [],
    } });
    expect(getGrowthProfile).toHaveBeenCalledTimes(owner ? 1 : 0);
    if (owner) expect(getGrowthProfile).toHaveBeenCalledWith(rawIdentity.id);
    else { expect(serialized).not.toContain(privateEvent.id); expect(serialized).not.toContain(privateCheckIn.id); }
    expect(db.prompt.findMany).not.toHaveBeenCalled(); expect(db.promptVote.findMany).not.toHaveBeenCalled();
    expect(db.pinnedPrompt.findMany).not.toHaveBeenCalled(); expect(db.changeRequest.findMany).not.toHaveBeenCalled();
  });
  it("另一个登录账号不取得主页所有者的私密成长历史", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "different-member" } } as never);
    const serialized = serialize(await UserProfilePage(props()));
    expect(getGrowthProfile).not.toHaveBeenCalled(); expect(serialized).not.toContain(privateEvent.id);
    expect(serialized).not.toContain("/settings"); expect(serialized).toContain('"editable":false');
  });
  it("严格查询投影只读正常公开账号和审核后未撤回的作品", async () => {
    await UserProfilePage(props());
    expect(vi.mocked(db.user.findFirst).mock.calls[0][0]).toEqual({
      where: { username: { equals: rawIdentity.username, mode: "insensitive" }, deletedAt: null, flagged: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, nickname: true, username: true, avatar: true, verified: true, createdAt: true,
        xp: true, communityPoints: true, checkInStreak: true, lastCheckInAt: true, avatarFrameKey: true, chatBubbleKey: true },
    });
    expect(vi.mocked(db.artifactPublication.findMany).mock.calls[0][0]).toEqual({
      where: { status: "APPROVED", withdrawnAt: null, artifactVersion: { createdById: rawIdentity.id, createdBy: { deletedAt: null, flagged: false } } },
      orderBy: { reviewedAt: "desc" }, take: 24,
      select: { artifactVersion: { select: { id: true, version: true, artifact: { select: { title: true } } } } },
    });
    const query = vi.mocked(db.marketListing.findMany).mock.calls[0][0];
    expect(query?.where).toEqual({ sellerId: rawIdentity.id, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } });
    expect(query?.include).toEqual({ versions: true, seller: { select: { id: true, username: true, nickname: true, avatar: true } } });
  });
  it("无公开成果时真实空态不补示例项目或服务", async () => {
    vi.mocked(db.artifactPublication.findMany).mockResolvedValue([]); vi.mocked(db.marketListing.findMany).mockResolvedValue([]);
    const serialized = serialize(await UserProfilePage(props()));
    expect(serialized).toContain("noPublicWorks"); expect(serialized).toContain("noPublicOffers");
    expect(serialized).not.toContain("public-version"); expect(serialized).not.toContain("public-offer");
  });
});
