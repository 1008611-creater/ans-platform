import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { db } from "@/lib/db";
import PromptPage from "@/app/prompts/[id]/page";
import AboutPage from "@/app/about/page";
import { PromptCard, type PromptCardProps } from "@/components/prompts/prompt-card";

vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/db", () => ({ db: {
  prompt: { findFirst: vi.fn() }, user: { findMany: vi.fn() },
  promptConnection: { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  changeRequest: { findMany: vi.fn() },
} }));
vi.mock("@/../prompts.config", () => ({ default: { homepage: { useCloneBranding: false }, features: {} } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => Object.assign((key: string) => key, { rich: (key: string) => key }) }));
vi.mock("@/components/prompts/interactive-prompt-content", () => ({ InteractivePromptContent: () => null }));
vi.mock("@/components/prompts/skill-viewer", () => ({ SkillViewer: () => null }));
vi.mock("@/components/prompts/prompt-flow-section", () => ({ PromptFlowSection: () => null }));
vi.mock("@/components/prompts/run-prompt-button", () => ({ RunPromptButton: () => null }));
vi.mock("@/components/ui/code-view", () => ({ CodeView: () => null }));
vi.mock("@/components/prompts/variable-fill-modal", () => ({ VariableFillModal: () => null, hasVariables: () => false, renderContentWithVariables: (value: string) => value }));
vi.mock("@/components/ui/tooltip", () => ({ Tooltip: ({ children }: { children: ReactNode }) => children, TooltipContent: ({ children }: { children: ReactNode }) => children, TooltipTrigger: ({ children }: { children: ReactNode }) => children }));

const identity = { id: "user-1", username: "private_handle", nickname: "  星河  ", name: "原始实名", email: "private@example.test", avatar: null, verified: true };
const prompt = {
  id: "prompt-1", title: "公开提示词", description: null, content: "内容", type: "TEXT", structuredFormat: null,
  authorId: identity.id, author: identity, contributors: [{ ...identity, id: "user-2", username: "contributor_handle", nickname: null }],
  versions: [{ id: "v1", version: 1, content: "内容", changeNote: null, createdAt: new Date(), author: { ...identity, username: "version_handle", nickname: "版本昵称" } }],
  category: null, tags: [], _count: { votes: 3 }, isPrivate: false, isUnlisted: false, deletedAt: null,
  createdAt: new Date(), updatedAt: new Date(), mediaUrl: null,
};

// 检查服务端组件传出的原始元素树，覆盖 Client props、文本、title、alt 和结构化数据。
function inspect(node: ReactNode, visible: string[] = [], props: Record<string, unknown>[] = []) {
  if (typeof node === "string" || typeof node === "number") visible.push(String(node));
  else if (Array.isArray(node)) node.forEach(child => inspect(child, visible, props));
  else if (isValidElement<Record<string, unknown>>(node)) {
    props.push(node.props);
    for (const key of ["title", "alt", "aria-label"]) if (typeof node.props[key] === "string") visible.push(node.props[key] as string);
    inspect(node.props.children as ReactNode, visible, props);
  }
  return { visible: visible.join(" "), props };
}
function safeQuery(relation: unknown) {
  expect(relation).toMatchObject({ select: { nickname: true } });
  expect(relation).not.toMatchObject({ select: { name: true } });
  expect(relation).not.toMatchObject({ select: { email: true } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.prompt.findFirst).mockResolvedValue(prompt as never);
  vi.mocked(db.promptConnection.findMany).mockResolvedValue([{ target: { ...prompt, author: { ...identity, username: "related_handle", nickname: "关联昵称" } } }] as never);
  vi.mocked(db.changeRequest.findMany).mockResolvedValue([{ id: "cr1", status: "PENDING", createdAt: new Date(), author: { ...identity, username: "change_handle", nickname: "修订昵称" } }] as never);
  vi.mocked(db.user.findMany).mockResolvedValue([{ ...identity, githubUsername: "github_private", _count: { prompts: 1, contributions: 1 } }] as never);
});

describe("公开页面身份显示", () => {
  it("详情页作者、贡献者、版本及修订只显示昵称，客户端 props 和 JSON-LD 不夹带原始身份", async () => {
    const tree = await PromptPage({ params: Promise.resolve({ id: prompt.id }) });
    const result = inspect(tree);
    for (const name of ["星河", "匿名同学", "版本昵称", "修订昵称"]) expect(result.visible).toContain(name);
    for (const handle of ["private_handle", "contributor_handle", "version_handle", "change_handle"]) expect(result.visible).not.toContain(handle);
    const serialized = JSON.stringify(tree);
    expect(serialized).not.toContain(identity.name);
    expect(serialized).not.toContain(identity.email);
    expect(serialized).toContain("/@private_handle");
    const structured = result.props.find(p => p.type === "prompt")?.data as { prompt: { author: string } };
    expect(structured.prompt.author).toBe("星河");
    const related = result.props.find(p => Array.isArray(p.prompts))?.prompts as { author: { name: string } }[];
    expect(related[0].author.name).toBe("关联昵称");
    const versions = result.props.find(p => Array.isArray(p.versions))?.versions as { author: { name: string } }[];
    expect(versions[0].author.name).toBe("版本昵称");
    const include = vi.mocked(db.prompt.findFirst).mock.calls[0][0]?.include;
    safeQuery(include?.author); safeQuery(include?.contributors);
    safeQuery((include?.versions as { select: { author: unknown } }).select.author);
    safeQuery(vi.mocked(db.changeRequest.findMany).mock.calls[0][0]?.include?.author);
    safeQuery((vi.mocked(db.promptConnection.findMany).mock.calls[0][0]?.include?.target as { select: { author: unknown } }).select.author);
  });

  it("卡片使用已安全映射的 name，用户名只保留链接，不作文本或头像替代文字", () => {
    const card = { ...prompt, voteCount: 3, author: { ...identity, name: "星河" }, contributors: [{ id: "user-2", username: "contributor_handle", name: null, avatar: null }] } as PromptCardProps["prompt"];
    render(<PromptCard prompt={card} />);
    expect(screen.getByRole("link", { name: /星河/ })).toHaveAttribute("href", "/@private_handle");
    expect(screen.getByRole("link", { name: /匿名同学/ })).toHaveAttribute("href", "/@contributor_handle");
    expect(document.body.textContent).not.toContain("private_handle");
    expect(document.body.textContent).not.toContain("contributor_handle");
    expect(document.querySelector('[alt="private_handle"]')).toBeNull();
  });

  it("About 的数据库贡献者仅传昵称，保留邮箱分类筛选但不查询或序列化邮箱", async () => {
    const tree = await AboutPage();
    const result = inspect(tree);
    expect(result.props.some(p => p.title === "星河" && p.href === "/@private_handle")).toBe(true);
    expect(result.visible).not.toContain("private_handle");
    expect(result.visible).not.toContain("github_private");
    const serialized = JSON.stringify(tree);
    expect(serialized).not.toContain(identity.name);
    expect(serialized).not.toContain(identity.email);
    expect(serialized).not.toContain("github_private");
    for (const [query] of vi.mocked(db.user.findMany).mock.calls) {
      expect(query?.where).toHaveProperty("email");
      expect(query?.select).toMatchObject({ nickname: true });
      expect(query?.select).not.toHaveProperty("email");
      expect(query?.select).not.toHaveProperty("name");
      expect(query?.select).not.toHaveProperty("githubUsername");
    }
  });
});
