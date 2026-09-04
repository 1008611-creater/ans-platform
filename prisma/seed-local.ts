import { PrismaClient, PromptType } from "@prisma/client";
import { createHash } from "crypto";
import { readFile, readdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const promptRoot = path.resolve(process.cwd(), "../../prompts");

const categories = [
  { name: "Seedance 2.5", slug: "seedance-2-5", description: "Seedance 2.5 图生视频与文生视频提示词", icon: "🎬" },
  { name: "AI 视频", slug: "ai-video", description: "通用 AI 视频提示词", icon: "🎥" },
  { name: "AI 图片", slug: "ai-image", description: "AI 图片生成提示词", icon: "🖼️" },
  { name: "日常工作", slug: "general-work", description: "代码、文档、分析与日常工作提示词", icon: "🧰" },
  { name: "提示词模板", slug: "prompt-templates", description: "可复制、可复用的提示词模板与适配规则", icon: "📐" },
];

const tags = [
  { name: "Seedance 2.5", slug: "seedance-2-5", color: "#8b5cf6" },
  { name: "国风", slug: "guofeng", color: "#059669" },
  { name: "天宫", slug: "celestial-palace", color: "#d97706" },
  { name: "图生视频", slug: "image-to-video", color: "#2563eb" },
  { name: "文生视频", slug: "text-to-video", color: "#7c3aed" },
  { name: "模板", slug: "template", color: "#db2777" },
];

type LocalPrompt = {
  file: string;
  category: string;
  title: string;
  description: string;
  content: string;
  type: PromptType;
  tags: string[];
};

function titleOf(markdown: string, fallback: string) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return (match?.[1] || fallback)
    .replace(/^提示词模板：\s*/, "")
    .replace(/^提示词：\s*/, "")
    .trim();
}

function section(markdown: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`));
  return match?.[1].trim() || "";
}

async function readLocalPrompts(): Promise<LocalPrompt[]> {
  const files = [
    { file: "seedance-2.5/prompt-chinese-guofeng-15s.md", category: "seedance-2-5", tags: ["seedance-2-5", "guofeng", "text-to-video"], type: "VIDEO" as PromptType },
    { file: "seedance-2.5/prompt-4img-tiangong-splus-6s.md", category: "seedance-2-5", tags: ["seedance-2-5", "celestial-palace", "image-to-video"], type: "VIDEO" as PromptType },
  ];

  const prompts: LocalPrompt[] = [];
  for (const item of files) {
    const content = await readFile(path.join(promptRoot, item.file), "utf8");
    prompts.push({
      file: item.file,
      category: item.category,
      title: titleOf(content, path.basename(item.file, ".md")),
      description: section(content, "用途") || "已从本地提示词库导入。",
      content,
      type: item.type,
      tags: item.tags,
    });
  }

  const rootFiles = await readdir(promptRoot);
  for (const file of rootFiles.filter((name) => /^_template.*\.md$/.test(name))) {
    const content = await readFile(path.join(promptRoot, file), "utf8");
    prompts.push({
      file,
      category: "prompt-templates",
      title: titleOf(content, path.basename(file, ".md")),
      description: section(content, "用途") || "可复用提示词模板，内含适配规则与必填字段。",
      content,
      type: "STRUCTURED",
      tags: ["template"],
    });
  }
  return prompts;
}

async function main() {
  console.log("🌱 导入本地提示词与模板到 prompts.chat...");

  const owner = await prisma.user.upsert({
    where: { email: "prompt-vault@local.invalid" },
    update: { name: "念念提示词库" },
    create: {
      email: "prompt-vault@local.invalid",
      username: "prompt_vault",
      name: "念念提示词库",
      role: "ADMIN",
      locale: "zh",
      verified: true,
    },
  });

  const categoryIds = new Map<string, string>();
  for (const [order, category] of categories.entries()) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, icon: category.icon, order, pinned: true },
      create: { ...category, order, pinned: true },
    });
    categoryIds.set(category.slug, saved.id);
  }

  const tagIds = new Map<string, string>();
  for (const tag of tags) {
    const saved = await prisma.tag.upsert({ where: { slug: tag.slug }, update: { name: tag.name, color: tag.color }, create: tag });
    tagIds.set(tag.slug, saved.id);
  }

  const localPrompts = await readLocalPrompts();
  let created = 0;
  let updated = 0;
  for (const item of localPrompts) {
    const slug = `local-${createHash("sha1").update(item.file).digest("hex").slice(0, 12)}`;
    const categoryId = categoryIds.get(item.category)!;
    const tagLinks = item.tags.filter((tag) => tagIds.has(tag)).map((tag) => ({ tagId: tagIds.get(tag)! }));
    const existing = await prisma.prompt.findFirst({ where: { slug } });

    if (existing) {
      await prisma.prompt.update({
        where: { id: existing.id },
        data: { title: item.title, description: item.description, content: item.content, type: item.type, categoryId, isPrivate: false },
      });
      await prisma.promptTag.deleteMany({ where: { promptId: existing.id } });
      await prisma.promptTag.createMany({ data: tagLinks.map((tag) => ({ promptId: existing.id, tagId: tag.tagId })), skipDuplicates: true });
      updated++;
    } else {
      const createdPrompt = await prisma.prompt.create({
        data: {
          title: item.title,
          slug,
          description: item.description,
          content: item.content,
          type: item.type,
          isPrivate: false,
          authorId: owner.id,
          categoryId,
          tags: { create: tagLinks },
        },
      });
      await prisma.promptVersion.create({
        data: { promptId: createdPrompt.id, version: 1, content: item.content, changeNote: "从本地提示词库迁入", createdBy: owner.id },
      });
      created++;
    }
  }

  console.log(`✅ 本地提示词库就绪：${created} 条新增，${updated} 条更新，${localPrompts.length} 条可搜索内容。`);
}

main()
  .catch((error) => { console.error("❌ 本地提示词导入失败:", error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
