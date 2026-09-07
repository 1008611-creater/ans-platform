import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { db } from "@/lib/db";
import PromptPage from "@/app/prompts/[id]/page";
import { PromptCard, type PromptCardProps } from "@/components/prompts/prompt-card";

vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/db", () => ({ db: {
  prompt: { findFirst: vi.fn() },
  promptConnection: { findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  changeRequest: { findMany: vi.fn() },
} }));
vi.mock("@/../prompts.config", () => ({ default: { features: {} } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => (key: string) => key }));
vi.mock("@/components/prompts/interactive-prompt-content", () => ({ InteractivePromptContent: () => null }));
vi.mock("@/components/prompts/skill-viewer", () => ({ SkillViewer: () => null }));
vi.mock("@/components/prompts/prompt-flow-section", () => ({ PromptFlowSection: () => null }));
vi.mock("@/components/prompts/run-prompt-button", () => ({ RunPromptButton: () => null }));
vi.mock("@/components/ui/code-view", () => ({ CodeView: () => null }));
vi.mock("@/components/prompts/variable-fill-modal", () => ({ VariableFillModal: () => null, hasVariables: () => false, renderContentWithVariables: (value: string) => value }));
vi.mock("@/components/ui/tooltip", () => ({ Tooltip: ({ children }: { children: ReactNode }) => children, TooltipContent: ({ children }: { children: ReactNode }) => children, TooltipTrigger: ({ children }: { children: ReactNode }) => children }));

const identity = { id: "author-1", username: "author_handle", nickname: "  山岚  ", name: "不得公开的原名", email: "secret@example.test", avatar: null, verified: true };
const prompt = {
  id: "prompt-1", slug: "example", title: "测试提示词", description: null, content: "内容", type: "TEXT", structuredFormat: null,
  authorId: identity.id, author: identity, contributors: [{ ...identity, id: "contributor-1", username: "contributor_handle", nickname: null }],
  versions: [{ id: "version-1", version: 1, content: "版本内容", changeNote: "版本备注", createdAt: new Date("2026-01-01"), author: { ...identity, username: "version_handle", nickname: "  版本昵称  " } }],
  category: { id: "category-1", name: "分类名称", slug: "category" }, tags: [{ tag: { id: "tag-1", name: "标签名称", slug: "tag", color: "#123456" } }],
  _count: { votes: 3 }, isPrivate: false, isUnlisted: false, deletedAt: null,
  createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02"), mediaUrl: null,
};
const related = {
  id: "related-1", slug: "related", title: "关联标题", description: "关联描述", type: "TEXT",
  isPrivate: false, isUnlisted: false, deletedAt: null, category: prompt.category, _count: { votes: 2 },
  author: { ...identity, username: "related_handle", nickname: "  关联昵称  " },
};

function inspect(node: ReactNode, props: Record<string, unknown>[] = [], visible: string[] = []) {
  if (typeof node === "string" || typeof node === "number") visible.push(String(node));
  else if (Array.isArray(node)) node.forEach(child => inspect(child, props, visible));
  else if (isValidElement<Record<string, unknown>>(node)) {
    props.push(node.props);
    for (const key of ["title", "alt", "aria-label"]) if (typeof node.props[key] === "string") visible.push(node.props[key] as string);
    inspect(node.props.children as ReactNode, props, visible);
  }
  return { props, visible: visible.join(" ") };
}
const page = () => PromptPage({ params: Promise.resolve({ id: "prompt-1_example" }) });
function assertPublic(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const secret of [identity.name, identity.email, '"nickname"', '"email"']) expect(serialized).not.toContain(secret);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.prompt.findFirst).mockResolvedValue(prompt as never);
  vi.mocked(db.promptConnection.findMany).mockResolvedValue([{ target: related }] as never);
  vi.mocked(db.changeRequest.findMany).mockResolvedValue([{ id: "change-1", status: "PENDING", createdAt: new Date("2026-01-01"), author: { ...identity, username: "change_handle", nickname: "  修订昵称  " } }] as never);
});

describe("详情页公开身份边界补漏", () => {
  it.each(["  关联昵称  ", null, " \t "])("关联提示词在组件边界映射安全 name（nickname=%s）", async nickname => {
    vi.mocked(db.promptConnection.findMany).mockResolvedValue([{ target: { ...related, author: { ...related.author, nickname } } }] as never);
    const { props } = inspect(await page());
    const rows = props.find(p => Array.isArray(p.prompts))!.prompts as typeof related[];
    expect(rows[0].author).toEqual({ id: identity.id, username: "related_handle", name: nickname?.trim() ? "关联昵称" : "匿名同学", avatar: null });
    expect(rows[0]).toMatchObject({ id: "related-1", title: "关联标题", category: { name: "分类名称" }, _count: { votes: 2 } });
    assertPublic(rows);
  });

  it.each(["  版本昵称  ", null, " \t "])("版本比较 props 保留版本结构但不透传原始身份（nickname=%s）", async nickname => {
    vi.mocked(db.prompt.findFirst).mockResolvedValue({ ...prompt, versions: [{ ...prompt.versions[0], author: { ...prompt.versions[0].author, nickname } }] } as never);
    const { props } = inspect(await page());
    const rows = props.find(p => Array.isArray(p.versions))!.versions as typeof prompt.versions;
    expect(rows[0].author).toEqual({ username: "version_handle", name: nickname?.trim() ? "版本昵称" : "匿名同学" });
    expect(rows[0]).toMatchObject({ id: "version-1", version: 1, content: "版本内容", changeNote: "版本备注", createdAt: new Date("2026-01-01") });
    assertPublic(rows);
  });

  it.each(["  修订昵称  ", null, " \t "])("修订作者显示昵称或匿名而非 username（nickname=%s）", async nickname => {
    vi.mocked(db.changeRequest.findMany).mockResolvedValue([{ id: "change-1", status: "PENDING", createdAt: new Date("2026-01-01"), author: { ...identity, username: "change_handle", nickname } }] as never);
    const { visible } = inspect(await page());
    expect(visible).toContain(nickname?.trim() ? "修订昵称" : "匿名同学");
    expect(visible).not.toContain("change_handle");
    expect(visible).not.toContain(identity.name);
  });

  it("作者站内关联、JSON-LD 和分类标签 name 不变", async () => {
    const { props, visible } = inspect(await page());
    expect(props.some(p => p.href === "/@author_handle")).toBe(true);
    expect(props.some(p => p.href === "/@contributor_handle")).toBe(true);
    expect(visible).toContain("山岚");
    expect(visible).toContain("分类名称");
    expect(visible).toContain("标签名称");
    const data = props.find(p => p.type === "prompt")!.data;
    expect(data).toMatchObject({ prompt: { name: "测试提示词", author: "山岚", category: "分类名称", tags: ["标签名称"] } });
    assertPublic(data);
  });
});

describe("卡片消费已安全映射的 name", () => {
  it.each(["  公开昵称  ", null, " \t "])("主作者与贡献者不以 username 补位（name=%s）", name => {
    const card: PromptCardProps["prompt"] = {
      ...prompt, voteCount: 3,
      author: { id: identity.id, username: identity.username, name, avatar: null },
      contributors: [{ id: "contributor-1", username: "contributor_handle", name, avatar: null }],
    };
    const { container } = render(<PromptCard prompt={card} />);
    const links = screen.getAllByRole("link", { name: name?.trim() ? /公开昵称/ : /匿名同学/ });
    expect(links.map(link => link.getAttribute("href"))).toEqual(["/@author_handle", "/@contributor_handle"]);
    expect(container.textContent).not.toContain("author_handle");
    expect(container.textContent).not.toContain("contributor_handle");
    expect(container.querySelector('[alt="author_handle"]')).toBeNull();
  });
});
