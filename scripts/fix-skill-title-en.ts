/**
 * 一次性修复：把技能库里"slug 形态"的英文标题规范成可读英文标题。
 *
 * 背景：buildSkillBilingualMeta 早期把 SKILL.md 的原始 name（多为目录名/slug，
 * 如 xiaohongshu-ops）直接写进 titleEn，导致切到英文视图时标题显示成
 * 小写连字符 slug。这里按 englishizeSkillName 重新生成。
 *
 * 幂等：重复运行不会把已经规范好的标题改坏（englishizeSkillName 对
 * "Xiaohongshu Ops" 这类已规范文本是恒等变换）。
 *
 * 用法（仓库根目录）：
 *   npx tsx scripts/fix-skill-title-en.ts [--apply]
 * 默认只预览差异；加 --apply 才写库。
 */

import { PrismaClient } from "@prisma/client";
import { englishizeSkillName } from "../src/lib/skill-bilingual";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const skills = await prisma.prompt.findMany({
    where: { type: "SKILL", deletedAt: null },
    select: { id: true, title: true, titleEn: true, slug: true },
    orderBy: { createdAt: "desc" },
  });

  /**
   * 优先用 slug 派生的目录名（去掉 `skill-` 前缀）作为输入：
   * SKILL_NAME_EN_OVERRIDES 是按目录名建键的，用 titleEn 会命中不到
   * （例如存量错误标题 "Sd2 5skill" 归一化后变 "Sd2-5skill"）。
   */
  const dirOf = (slug: string | null): string | null => {
    if (!slug) return null;
    return slug.startsWith("skill-") ? slug.slice("skill-".length) : slug;
  };

  let changed = 0;
  const samples: Array<{ before: string; after: string }> = [];

  /**
   * 只在原标题"明显有问题"时才重建，避免把已经不错的标题改坏：
   *  - 空值
   *  - 连字符 slug 形态（如 xiaohongshu-ops）
   *  - 版本号被分隔符拆断（如 "Sd2 5skill"，本应是 Seedance 2.5）
   * 形如 "Design Taste Frontend" / "Ciwei Star Method" 这类已有可读英文标题
   * 一律保留（用 slug 重建反而会得到 "Taste Skill" / 中文目录名）。
   */
  const needsRebuild = (titleEn: string | null): boolean => {
    const t = (titleEn ?? "").trim();
    if (!t) return true;
    if (t.includes("-")) return true; // slug 形态
    if (/\d\s+\d/.test(t)) return true; // 版本号被拆断，如 "Sd2 5skill"
    return false;
  };

  for (const skill of skills) {
    if (!needsRebuild(skill.titleEn)) continue;

    const source = dirOf(skill.slug) || skill.titleEn || skill.slug || skill.title || "";
    const next = englishizeSkillName(source);
    // 重建结果退化为中文时（目录名本身是中文），保留原标题
    if (/[㐀-鿿]/.test(next) && !/[㐀-鿿]/.test(skill.titleEn ?? "")) continue;
    if (next && next !== skill.titleEn) {
      changed += 1;
      if (samples.length < 12) {
        samples.push({ before: skill.titleEn ?? "(null)", after: next });
      }
      if (apply) {
        await prisma.prompt.update({
          where: { id: skill.id },
          data: { titleEn: next },
        });
      }
    }
  }

  console.log(`技能总数: ${skills.length}`);
  console.log(`需要更新: ${changed}`);
  console.log(apply ? "已写入数据库。" : "（预览模式，未写库；加 --apply 生效）");
  for (const s of samples) {
    console.log(`  ${s.before}  ->  ${s.after}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
