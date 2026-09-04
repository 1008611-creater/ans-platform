/**
 * 把本地 ai-video-skill-route-export 的 14 套 AI 视频技能灌入 prompts.chat 数据库，
 * 并生成 Agent 可发现的技能 manifest（plugins/claude/prompts.chat/skills）。
 *
 * 用法（在仓库根目录）：
 *   npx tsx scripts/import-ai-video-skills.ts
 *
 * 幂等：按 slug 复用，重复运行只更新不重复插入。
 * 需要可用的 DATABASE_URL（本地用 docker compose 起的 postgres）。
 */

import { PrismaClient, PromptType } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  SKILL_LAYERS,
  SKILL_DIR_LAYER,
  SKILL_EXTRA_TAGS,
  SKILL_LAYER_RULES,
  SKILL_TAG_RULES,
  LEGACY_LAYER_LABELS,
} from "../src/data/ai-video-skill-route";
import { parseSkillFrontmatter } from "./lib/skill-frontmatter";
import { buildSkillBilingualMeta } from "../src/lib/skill-bilingual";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const prisma = new PrismaClient();

/** 文本扩展名白名单：仅复制这些，避免把二进制（图片/视频/zip）塞进 Agent manifest */
const TEXT_EXT = new Set([
  ".md", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".txt",
  ".yaml", ".yml", ".sh", ".css", ".html", ".csv",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 分层优先级：SKILL_DIR_LAYER 显式映射 > SKILL_LAYER_RULES 关键词规则 > other。
 * 新技能无需改代码即可落进合适分层；规则改坏也只影响未显式映射的技能。
 */
function resolveLayer(dir: string, name: string, description: string): string {
  const explicit = SKILL_DIR_LAYER[dir];
  if (explicit) return explicit;
  const hay = `${dir} ${name} ${description}`.toLowerCase();
  for (const rule of SKILL_LAYER_RULES) {
    if (rule.keywords.some((k) => hay.includes(k.toLowerCase()))) return rule.layer;
  }
  return "other";
}

/** 按关键词规则自动补标签（在层标签与显式标签之外），提升检索命中率 */
function autoTags(dir: string, name: string, description: string, layerLabel: string): string[] {
  const hay = `${dir} ${name} ${description}`.toLowerCase();
  const out: string[] = [];
  for (const rule of SKILL_TAG_RULES) {
    if (rule.keywords.some((k) => hay.includes(k.toLowerCase()))) out.push(rule.tag);
  }
  // 规则标签可能与层标签/显式标签重复，这里只去重，保留层标签优先级
  return out.filter((t) => t !== layerLabel);
}

/** 递归收集文本文件（相对 rootDir 的路径），跳过 .git/node_modules */
function collectTextFiles(dir: string, base: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "__pycache__") continue;
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      collectTextFiles(full, rel, out);
    } else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(rel);
    }
  }
  return out;
}

/** 导入完成后通知运行中的 Next 应用失效页面缓存（可选，需配置环境变量） */
async function revalidateApp(): Promise<void> {
  const url = process.env.REVALIDATE_URL;
  const token = process.env.REVALIDATE_TOKEN;
  if (!url || !token) {
    console.log(
      "ℹ️  未配置 REVALIDATE_URL/REVALIDATE_TOKEN，跳过主动刷新（页面缓存最多 5 分钟后自动过期）"
    );
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-token": token },
      body: JSON.stringify({
        tags: ["prompts", "categories", "tags"],
        paths: ["/skills", "/prompts", "/skills/map"],
      }),
    });
    console.log(`✅ 已通知应用刷新缓存：HTTP ${res.status}`);
  } catch (e) {
    console.warn(
      `⚠️  缓存刷新失败（可忽略，缓存会在 5 分钟内自动过期）：${(e as Error).message}`
    );
  }
}

async function ensureAdmin() {
  const password = await bcrypt.hash("password123", 12);
  return prisma.user.upsert({
    where: { email: "admin@prompts.chat" },
    update: {},
    create: {
      email: "admin@prompts.chat",
      username: "admin",
      name: "Admin User",
      password,
      role: "ADMIN",
      locale: "zh",
    },
  });
}

async function ensureCategories() {
  const idBySlug: Record<string, string> = {};
  for (const layer of SKILL_LAYERS.sort((a, b) => a.order - b.order)) {
    const slug = layer.key;
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { name: layer.label, description: layer.description, order: layer.order },
      create: {
        name: layer.label,
        slug,
        description: layer.description,
        order: layer.order,
      },
    });
    idBySlug[slug] = cat.id;
  }
  return idBySlug;
}

async function ensureTags(names: string[]) {
  // slugify 对中文名会得到空串，且不同中文名可能撞同一 slug。
  // 因此以 name（DB 唯一约束）为 upsert 键，slug 做唯一化 fallback。
  const idByName: Record<string, string> = {};
  // 预载已有 slug，避免与历史导入的 tag.slug 冲突（否则 create 阶段唯一约束失败）。
  const usedSlugs = new Set<string>(
    (await prisma.tag.findMany({ select: { slug: true } })).map((t) => t.slug)
  );
  for (const name of new Set(names)) {
    let slug = slugify(name) || "tag";
    let n = 1;
    while (usedSlugs.has(slug)) slug = `tag-${++n}`;
    usedSlugs.add(slug);
    const tag = await prisma.tag.upsert({
      where: { name },
      update: { slug },
      create: { name, slug, color: "#6366f1" },
    });
    idByName[name] = tag.id;
  }
  return idByName;
}

async function main() {
  const srcRoot = process.env.AI_VIDEO_SKILLS_SRC
    ? path.resolve(process.env.AI_VIDEO_SKILLS_SRC)
    : path.resolve(ROOT, "ai-video-skills-source");

  if (!fs.existsSync(srcRoot)) {
    throw new Error(`技能源目录不存在: ${srcRoot}`);
  }

  console.log(`📂 技能源: ${srcRoot}`);

  const admin = await ensureAdmin();
  console.log("✅ admin 就绪");

  const categoryIdBySlug = await ensureCategories();
  console.log(`✅ 已确保 ${SKILL_LAYERS.length} 个分层 Category`);

  // 先做一次「规划」：解析每个技能目录的元数据、分层与标签。
  // 必须在 ensureTags 之前完成，否则自动标签来不及建，写库时会拿到 undefined 的 tagId。
  const skillDirs = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .filter((dir) => fs.existsSync(path.join(srcRoot, dir, "SKILL.md")))
    .sort();

  interface SkillPlan {
    dir: string;
    name: string;
    description: string;
    nameZh?: string;
    nameEn?: string;
    descriptionZh?: string;
    descriptionEn?: string;
    layerKey: string;
    layerLabel: string;
    tagNames: string[];
    raw: string;
    contentZh?: string;
    contentEn?: string;
  }

  const plans: SkillPlan[] = [];
  for (const dir of skillDirs) {
    const skillMd = path.join(srcRoot, dir, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      console.warn(`⚠️  跳过 ${dir}：缺少 SKILL.md`);
      continue;
    }
    const raw = fs.readFileSync(skillMd, "utf-8").replace(/\r\n/g, "\n");
    // frontmatter 解析统一交给 scripts/lib/skill-frontmatter.ts：
    // 它会合并多个 frontmatter 块、剥离多余引号，并对 `name: xxx` 占位值做正文兜底。
    const { name, description, nameZh, nameEn, descriptionZh, descriptionEn, contentZh, contentEn } = parseSkillFrontmatter(raw, dir);
    const layerKey = resolveLayer(dir, name, description);
    const layerLabel = SKILL_LAYERS.find((l) => l.key === layerKey)?.label ?? layerKey;
    const extra = SKILL_EXTRA_TAGS[dir] ?? [];
    const tagNames = Array.from(
      new Set(["ai-video", layerLabel, ...extra, ...autoTags(dir, name, description, layerLabel)])
    );
    plans.push({ dir, name, description, nameZh, nameEn, descriptionZh, descriptionEn, contentZh, contentEn, layerKey, layerLabel, tagNames, raw });
  }

  // 收集所有需要的标签：ai-video + 每层名 + 每技能附加/自动标签
  const tagNameSet = new Set<string>(["ai-video"]);
  for (const layer of SKILL_LAYERS) tagNameSet.add(layer.label);
  for (const tags of Object.values(SKILL_EXTRA_TAGS)) tags.forEach((t) => tagNameSet.add(t));
  for (const p of plans) p.tagNames.forEach((t) => tagNameSet.add(t));
  const tagIdByName = await ensureTags([...tagNameSet]);
  console.log(`✅ 已确保 ${tagNameSet.size} 个 Tag`);

  // 分层分布预览：一眼看出是否有技能异常地全落进「其他」
  console.log("📊 分层分布：");
  const layerCount = new Map<string, number>();
  for (const p of plans) layerCount.set(p.layerLabel, (layerCount.get(p.layerLabel) ?? 0) + 1);
  for (const layer of SKILL_LAYERS) {
    const n = layerCount.get(layer.label) ?? 0;
    if (n > 0) console.log(`   · ${layer.label}: ${n}`);
  }

  // Agent manifest 目录
  const agentSkillsDir = path.resolve(ROOT, "plugins/claude/prompts-chat/skills");
  fs.mkdirSync(agentSkillsDir, { recursive: true });

  // 从官方插件目录继承原生技能（prompt-lookup / skill-lookup），保证 manifest 目录自洽：
  // 若带横线目录缺失对应技能文件，则从 plugins/claude/prompts.chat/skills 复制过来。
  const nativeSkillsDir = path.resolve(ROOT, "plugins/claude/prompts.chat/skills");
  const nativeIndexPath = path.join(nativeSkillsDir, "index.json");
  let nativeSkills: Array<{ name: string; description: string; files: string[] }> = [];
  if (fs.existsSync(nativeIndexPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(nativeIndexPath, "utf-8"));
      if (Array.isArray(existing?.skills)) nativeSkills = existing.skills;
    } catch {
      /* 损坏则忽略原生继承 */
    }
  }
  for (const s of nativeSkills) {
    const srcDir = path.join(nativeSkillsDir, s.name);
    const dstDir = path.join(agentSkillsDir, s.name);
    if (fs.existsSync(srcDir) && !fs.existsSync(dstDir)) {
      for (const rel of collectTextFiles(srcDir, "")) {
        const to = path.join(dstDir, rel);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(srcDir, rel), to);
      }
    }
  }

  // 读取已有 index.json（保留原生技能 + 已导入的 AI 视频技能）
  const indexPath = path.join(agentSkillsDir, "index.json");
  let manifestSkills = nativeSkills;
  if (fs.existsSync(indexPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      if (Array.isArray(existing?.skills)) manifestSkills = existing.skills;
    } catch {
      /* 损坏则回退到原生技能 */
    }
  }
  const manifestByName = new Map(manifestSkills.map((s) => [s.name, s]));

  let created = 0;
  let updated = 0;

  // 按前面算好的 plans 写库（元数据/分层/标签已在规划阶段解析完毕）。
  for (const plan of plans) {
    const { dir, name, description, nameZh, nameEn, descriptionZh, descriptionEn, contentZh, contentEn, raw, layerKey, layerLabel, tagNames } = plan;
    const skillDir = path.join(srcRoot, dir);

    const categoryId = categoryIdBySlug[layerKey];

    const tagIds = tagNames
      .map((n) => tagIdByName[n])
      .filter(Boolean) as string[];

    const slug = `skill-${dir}`;
    const existing = await prisma.prompt.findFirst({ where: { slug } });

    const bilingual = buildSkillBilingualMeta({
      dir,
      name,
      description,
      raw,
      nameZh,
      nameEn,
      descriptionZh,
      descriptionEn,
      contentZh,
      contentEn,
    });
    const data = {
      title: bilingual.titleZh,
      titleZh: bilingual.titleZh,
      titleEn: bilingual.titleEn,
      slug,
      description: bilingual.descriptionZh,
      descriptionZh: bilingual.descriptionZh,
      descriptionEn: bilingual.descriptionEn,
      // 保持旧 content 为英文原文，兼容现有 API、版本和执行/下载链路。
      content: bilingual.contentEn,
      contentZh: bilingual.contentZh,
      contentEn: bilingual.contentEn,
      type: PromptType.SKILL,
      isPrivate: false,
      isUnlisted: false,
      authorId: admin.id,
      categoryId,
      tags: {
        create: tagIds.map((tagId) => ({ tagId })),
      },
    };

    let prompt;
    if (existing) {
      // Prisma 6 嵌套写不支持 deleteMany：先用顶层 deleteMany 清旧关联，再 update 重建
      await prisma.promptTag.deleteMany({ where: { promptId: existing.id } });
      prompt = await prisma.prompt.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      prompt = await prisma.prompt.create({ data });
      await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          content: raw,
          changeNote: "初始版本（AI 视频技能导入）",
          createdBy: admin.id,
        },
      });
      created++;
    }

    // ---- 生成 Agent manifest：复制文本文件到 plugins/claude/prompts.chat/skills/<dir>/ ----
    const targetDir = path.join(agentSkillsDir, dir);
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    const relFiles = collectTextFiles(skillDir, "");
    for (const rel of relFiles) {
      const from = path.join(skillDir, rel);
      const to = path.join(targetDir, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
    const manifestFiles = relFiles.length ? relFiles : ["SKILL.md"];

    manifestByName.set(dir, {
      name: dir,
      description: bilingual.descriptionEn,
      files: manifestFiles,
    });

    console.log(`  • ${dir} -> ${layerLabel} (${existing ? "更新" : "新建"})`);
  }

  // 写回 manifest：原生技能（官方插件目录）+ 本次导入的 AI 视频技能。
  // 以 nativeSkills 为基底，再叠加本次实际导入的技能，历史残留（源目录已删的技能）自然被清理。
  const mergedByName = new Map(nativeSkills.map((s) => [s.name, s]));
  for (const [name, s] of manifestByName) mergedByName.set(name, s);
  const merged = [...mergedByName.values()];
  fs.writeFileSync(indexPath, JSON.stringify({ skills: merged }, null, 2) + "\n");

  // 清理空分层：分层结构调整后，旧层可能不再挂任何技能，留着会污染筛选器。
  // 只删「属于当前分层定义且确实 0 技能」的 Category，用户自建分类不受影响。
  const layerSlugs = SKILL_LAYERS.map((l) => l.key);
  const empties = await prisma.category.findMany({
    where: { slug: { in: layerSlugs } },
    select: { id: true, name: true, slug: true, _count: { select: { prompts: true } } },
  });
  const emptyCats = empties.filter((c) => c._count.prompts === 0);
  if (emptyCats.length) {
    await prisma.category.deleteMany({ where: { id: { in: emptyCats.map((c) => c.id) } } });
    console.log(`🧹 已清理 ${emptyCats.length} 个空分层：${emptyCats.map((c) => c.name).join("、")}`);
  }

  // 清理孤儿层标签：层改名/重构后，旧层标签仍在 tags 表但已无任何提示词引用，
  // 会污染标签云与筛选器。只清理「层名」标签，用户自建标签不受影响。
  const layerLabels = new Set<string>([
    ...SKILL_LAYERS.map((l) => l.label),
    ...LEGACY_LAYER_LABELS,
  ]);
  const orphanTags = await prisma.tag.findMany({
    where: { name: { in: [...layerLabels] }, prompts: { none: {} } },
    select: { id: true, name: true },
  });
  if (orphanTags.length) {
    await prisma.tag.deleteMany({ where: { id: { in: orphanTags.map((t) => t.id) } } });
    console.log(`🧹 已清理 ${orphanTags.length} 个孤儿层标签：${orphanTags.map((t) => t.name).join("、")}`);
  }

  console.log(`\n🎉 完成：新建 ${created} 套，更新 ${updated} 套技能`);
  console.log(`📦 Agent manifest 已写入 ${path.relative(ROOT, indexPath)}（共 ${merged.length} 条）`);

  await revalidateApp();
}

main()
  .catch((e) => {
    console.error("❌ 导入失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
