// Local, explainable retrieval. Alias groups are OR; independent task terms are AND.
// No inference about popularity, generation success, or vector similarity.
const aliases = [
  ['电商主图', '商品主图', '产品主图', '主图', 'hero image', 'e-commerce main image', 'product photography', 'product hero', 'marketplace listing', 'ecommerce'],
  ['电商', 'e-commerce', 'ecommerce', 'commerce', 'marketplace', '商品'],
  ['护肤品', '护肤', '化妆品', 'skincare', 'skin care', 'cosmetic', 'beauty product'],
  ['海报', 'poster', 'posters'], ['详情页', 'product detail', 'listing image', 'infographic'],
  ['美甲', '指甲', 'manicure', 'nail', 'nails'], ['香水', 'perfume', 'fragrance'], ['咖啡', 'coffee'],
  ['包装', 'packaging', 'package design'], ['服装', '服饰', '穿搭', 'fashion', 'apparel', 'outfit'],
  ['头像', 'avatar', 'profile picture'], ['人像', 'portrait'], ['角色一致', '人物一致', 'identity', 'consistent'],
  ['参考照片', '参考图', 'reference', 'uploaded photo'], ['虚拟现实', 'vr', 'virtual reality'],
  ['插画', 'illustration', 'illustrated'], ['头显', 'headset'], ['线稿', 'line art'], ['水彩', 'watercolor', 'watercolour'], ['故事书', 'storybook'], ['漫画', 'comic'],
  ['广告', 'advertisement', 'advertising', 'ad campaign'], ['食品', '食物', 'food'],
  ['珠宝', 'jewelry', 'jewellery'], ['极简', 'minimalist', 'minimal'], ['字体', 'typography'],
  ['横版', '横屏', 'landscape', '16:9'], ['竖版', '竖屏', 'portrait orientation', '9:16']
];
const filler = /我(?:现在)?(?:想要|想|要)|帮我|请帮|请|给|做(?:一张|一套|一个)?|制作|设计|生成|用于|适合|的|一张|一套|一个|i want to|help me|create|make|generate|\b(?:a|an|the|for|with|please|to|image|design)\b/gi;
const separator = /[\s,，、;；|/\\+_\-()（）[\]【】"'“”]+/;
export function taskSearchTerms(query: string): string[][] {
  let rest = query.normalize('NFKC').toLowerCase().trim();
  const groups: string[][] = [];
  // Match longer expressions before their subsets (e.g. 电商主图 before 电商).
  const candidates = aliases.flatMap((group, index) => group.map(term => ({term, index}))).sort((a,b) => b.term.length - a.term.length);
  const selected = new Set<number>();
  for (const { term, index } of candidates) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(/^[a-z]/.test(term) ? '\\b' + escaped + '\\b' : escaped, 'g');
    if (!pattern.test(rest)) continue;
    rest = rest.replace(pattern, ' ');
    if (!selected.has(index)) { groups.push(aliases[index]); selected.add(index); }
  }
  rest = rest.replace(filler, ' ');
  for (const token of rest.split(separator).filter(Boolean)) groups.push([token]);
  return groups;
}
export function taskSearchScore(text: string, query: string, title = ''): number | null {
  const normalized = text.normalize('NFKC').toLowerCase();
  const heading = title.normalize('NFKC').toLowerCase();
  const groups = taskSearchTerms(query);
  if (!groups.length) return query.trim() ? null : 0;
  let score = 0; let headingMatches = 0;
  for (const terms of groups) {
    const contains = (value: string, term: string) => /^[a-z0-9]/.test(term)
      ? new RegExp("\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(value)
      : value.includes(term);
    const matches = terms.filter(term => contains(normalized, term));
    if (!matches.length) return null;
    const headingMatch = matches.some(term => contains(heading, term));
    if (headingMatch) headingMatches++;
    score += headingMatch ? 5 : 1;
  }
  if (headingMatches === groups.length) score += 8;
  if (normalized.includes(query.trim().toLowerCase())) score += 10;
  return score;
}