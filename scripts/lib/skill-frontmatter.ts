/**
 * SKILL.md 的轻量 frontmatter 解析（不引入 yaml 依赖）。
 *
 * 现实中 SKILL.md 的头部很脏，主要有三类问题，这里统一兜底：
 * 1. 存在多个 frontmatter 块 —— 第一个常常是脚本生成的占位块，其 description 值就是 `name: <slug>`；
 * 2. description 用引号包裹（`description: "..."` / `'...'`），直接入库会带上多余引号；
 * 3. 完全没有可用 description —— 需要从正文首段提取。
 */

/** 清洗取值：压缩空白 → 去掉首尾成对引号 → 去掉 YAML 块标量残留前缀 */
export function cleanText(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 2; i++) {
    if (
      t.length >= 2 &&
      ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
    ) {
      t = t.slice(1, -1).trim();
    }
  }
  return t.replace(/^[|>,\-]+\s*/, "").trim();
}

/** 描述是否畸形：空 / 键名残留（name: xxx）/ 只是标题或目录名的复读 */
export function isBadDescription(desc: string, name: string, dir: string): boolean {
  const d = desc.trim();
  if (!d) return true;
  if (/^(name|description|title|summary|slug|id)\s*:\s*/i.test(d)) return true;
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  const f = flat(d);
  if (!f) return true;
  return f === flat(name) || f === flat(dir);
}

/** 兜底描述：跳过所有 frontmatter 块，取正文第一段有效说明文字 */
export function fallbackDescription(raw: string, maxLen = 160): string {
  const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/gm, "");
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("```") || t === "---") continue;
    const txt = t
      .replace(/^[-*+>]\s*/, "")
      .replace(/\*\*?([^*]+)\*\*?/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
    if (txt.length < 12) continue;
    return txt.length > maxLen ? `${txt.slice(0, maxLen - 1).trimEnd()}…` : txt;
  }
  return "";
}

export interface SkillMeta {
  name: string;
  description: string;
  nameZh?: string;
  nameEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  contentZh?: string;
  contentEn?: string;
}

/**
 * 解析 SKILL.md 全文，返回可读的标题与描述。
 * @param raw SKILL.md 内容（换行已统一为 \n）
 * @param dir 技能目录名，用作标题与描述的最后兜底
 */
export function parseSkillFrontmatter(raw: string, dir: string): SkillMeta {
  // 收集所有 frontmatter 块的所有候选值（同键取最后一次出现的值）
  const headers = new Map<string, string[]>();
  for (const fm of raw.matchAll(/^---\s*\n([\s\S]*?)\n---/gm)) {
    const block = new Map<string, string[]>();
    let cur: string | null = null;
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
      if (m) {
        cur = m[1];
        block.set(cur, [m[2].trim()]);
        continue;
      }
      // YAML 块式值（`description: |` 后的缩进行）
      if (cur && /^\s{2,}/.test(line)) {
        const v = line.trim();
        if (v && !v.startsWith("#")) block.get(cur)!.push(v);
      }
    }
    for (const [k, v] of block.entries()) {
      const joined = cleanText(v.join(" "));
      if (joined) headers.set(k, [...(headers.get(k) ?? []), joined]);
    }
  }

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const arr = headers.get(k);
      if (arr && arr.length) {
        const text = arr[arr.length - 1];
        if (text) return text;
      }
    }
    return "";
  };

  const name = pick("name", "title") || dir;
  const nameZh = pick("nameZh", "titleZh", "name_zh", "title_zh");
  const nameEn = pick("nameEn", "titleEn", "name_en", "title_en");

  const candidates = [
    ...(headers.get("description") ?? []),
    ...(headers.get("summary") ?? []),
  ]
    .map(cleanText)
    .filter(Boolean);

  const description =
    candidates.find((d) => !isBadDescription(d, name, dir)) ?? (fallbackDescription(raw) || name);
  const descriptionZh = pick("descriptionZh", "summaryZh", "description_zh", "summary_zh");
  const descriptionEn = pick("descriptionEn", "summaryEn", "description_en", "summary_en");
  const contentZh = pick("contentZh", "content_zh");
  const contentEn = pick("contentEn", "content_en");

  return {
    name,
    description,
    ...(nameZh ? { nameZh: cleanText(nameZh) } : {}),
    ...(nameEn ? { nameEn: cleanText(nameEn) } : {}),
    ...(descriptionZh ? { descriptionZh: cleanText(descriptionZh) } : {}),
    ...(descriptionEn ? { descriptionEn: cleanText(descriptionEn) } : {}),
    ...(contentZh ? { contentZh: cleanText(contentZh) } : {}),
    ...(contentEn ? { contentEn: cleanText(contentEn) } : {}),
  };
}
