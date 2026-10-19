import { Image2EvidenceImage } from "@/components/image2-evidence-image";
import { resolveImage2SiteUrl } from "@/lib/image2-site-target";
import { localizedCaseText } from "@/lib/image2-language";
import styles from "./case-page.module.css";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * 独立案例详情页：按索引提供来源、原文与复用条件。
 * 精选案例预生成，其余按需生成；实际收录范围由 sitemap 决定。
 */

export const revalidate = 86400;

const DATA_DIR = path.join(process.cwd(), "public", "data");
const SITE_URL = resolveImage2SiteUrl();

type CaseItem = {
  detailKey: string;
  sourceDetailKey?: string;
  id?: number;
  caseCode?: string;
  title: string;
  categoryLabel?: string;
  category?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageStatus?: string;
  sourceLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  githubUrl?: string;
  author?: string;
  model?: string;
  modelEvidence?: { note: string };
  referenceRequired?: boolean;
  inputCompleteness?: string;
  sourceLicense?: string;
  promptKind?: string;
  promptPreview?: string;
  valueTier?: string;
  featured?: boolean;
};

type CaseDetail = {
  imageRoles?: Array<{ url: string; role: string; label?: string }>;
  detailKey: string;
  prompt?: string;
  sourceUrl?: string;
  githubUrl?: string;
  sourceLabel?: string;
  sourceNote?: string;
  riskNote?: string;
  sourceRecord?: { credit?: string; position?: string; links?: string[] };
  sourceRights?: { upstreamStatedTerms?: string; rightsNotice?: string };
  promptStructure?: Record<string, string>;
  reuseProfile?: Record<string, unknown>;
  replicationGuide?: Record<string, unknown>;
};

let indexCache: CaseItem[] | null = null;

function readIndex(): CaseItem[] {
  if (indexCache) return indexCache;
  const raw = fs.readFileSync(path.join(DATA_DIR, "image2-case-library.index.json"), "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  indexCache = (parsed.cases || []) as CaseItem[];
  return indexCache;
}

function readDetail(detailKey: string): CaseDetail | null {
  const file = path.join(DATA_DIR, "image2-cases", `${detailKey}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as CaseDetail;
  } catch {
    return null;
  }
}

function findCase(code: string): CaseItem | undefined {
  return readIndex().find((item) => item.detailKey === code || item.sourceDetailKey === code || item.caseCode === code || String(item.id) === code);
}

function proxySrc(url?: string): string {
  if (!url) return "";
  return url.startsWith("/") ? url : `/api/image2/proxy?url=${encodeURIComponent(url)}`;
}

export async function generateStaticParams() {
  // 只预生成精选层，其余按需 ISR；避免 838 页全量 SSG 拖长构建。
  return readIndex()
    .filter((item) => item.featured && item.imageUrl)
    .map((item) => ({ code: item.detailKey }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const item = findCase(code);
  if (!item) return { title: "案例未找到 - Image2 案例灵感库" };

  const title = `${item.title} - Image2 案例与提示词`;
  const description = (item.promptPreview || "").slice(0, 150) || `${item.title}，来自 ${item.sourceLabel || item.sourceName || "Image2 案例库"} 的可复用提示词案例。`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: `/image2-cases/${item.detailKey}` },
    openGraph: {
      type: "article",
      url: `/image2-cases/${item.detailKey}`,
      siteName: "Image2",
      title,
      description,
      images: item.imageUrl ? [{ url: proxySrc(item.imageUrl) }] : undefined
    }
  };
}

const labels: Record<string, string> = {
  subject: "主体", style: "风格", composition: "构图", lighting: "光线", materials: "材质", text: "文字",
  label: "复用建议", difficulty: "上手难度", stability: "稳定性", sourceConfidence: "来源可信度", note: "说明",
  workflow: "工作流", bestFor: "适用场景", requiredInputs: "准备素材", editableVariables: "可改变量",
  keepFixed: "保留要点", verification: "验收标准", failureWatchouts: "常见失败点"
};

function Facts({ values }: { values?: Record<string, unknown> }) {
  if (!values) return null;
  return <dl className={styles.facts}>{Object.entries(values)
    .filter(([key, value]) => key !== "verdict" && value != null && value !== "" && (!Array.isArray(value) || value.length))
    .map(([key, value]) => <div key={key}>
      <dt>{labels[key] ?? key}</dt>
      <dd>{Array.isArray(value) ? <ul>{value.map((entry, index) => <li key={index}>{String(entry)}</li>)}</ul>
        : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
    </div>)}</dl>;
}

export default async function CaseDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = findCase(code);
  if (!item) notFound();
  const detail = readDetail(item.detailKey);
  const localized = localizedCaseText({ ...item, categoryLabel: item.categoryLabel ?? "", promptPreview: item.promptPreview ?? "" }, "zh");
  const related = readIndex()
    .filter((other) => other.category === item.category && other.detailKey !== item.detailKey && other.imageUrl)
    .slice(0, 8);
  const caseHref = `/image2-cases?case=${encodeURIComponent(item.detailKey)}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "CreativeWork", name: localized.title,
    description: localized.promptPreview, url: `${SITE_URL}/image2-cases/${item.detailKey}`,
    ...(item.imageUrl ? { image: new URL(proxySrc(item.imageUrl), SITE_URL).toString() } : {}),
    ...(detail?.sourceUrl ? { isBasedOn: detail.sourceUrl } : {})
  };
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/">Image2</Link><span>/</span><Link href="/image2-cases">案例灵感库</Link><span>/</span>
        <span>{item.categoryLabel || item.category || "案例"}</span>
      </nav>
      <header className={styles.header}>
        <div className={styles.badges}><span>{item.categoryLabel || "案例"}</span>{item.valueTier ? <span>{item.valueTier}</span> : null}</div>
        <h1>{localized.title}</h1>
        {localized.title !== item.title ? <p className={styles.originalTitle}>{item.title}</p> : null}
        <p>{localized.promptPreview}</p>
        <div className={styles.meta}>
          {item.author ? <span>作者：{item.author}</span> : null}
          {item.model ? <span>来源模型：{item.model}</span> : null}
          {item.promptKind ? <span>{item.promptKind}</span> : null}
        </div>
        <div className={styles.actions}>
          <Link className={styles.primary} href={caseHref}>改写提示词与复用</Link>
          <a href={`/api/integrations/ans/cases/${encodeURIComponent(item.detailKey)}?download=1`} download>导出 ANS 案例包</a>
        </div>
      </header>
      <div className={styles.hero}>
        <div className={styles.cover}>
          {item.imageUrl ? <Image2EvidenceImage src={proxySrc(item.imageUrl)} label={item.imageAlt || localized.title} sourceUrl={detail?.sourceUrl || item.sourceUrl} eager />
            : <div className={styles.noImage}>来源未附效果图，本案例提供提示词文本。</div>}
          <p className={styles.caption}>{item.imageUrl ? "来源示例图 · 复用前请核对原始素材与授权" : "仅提示词案例"}</p>
        </div>
        <aside className={styles.card}>
          <h2>从案例到自己的作品</h2>
          <ol className={styles.steps}>
            <li><strong>看结构</strong><p>拆解主体、构图、光线与文字层级。</p></li>
            <li><strong>换成自己的内容</strong><p>准备素材，替换品牌、产品和文案。</p></li>
            <li><strong>复用与验收</strong><p>进入案例库改写，或导出到 ANS；按复现指南检查结果。</p></li>
          </ol>
          {detail?.reuseProfile ? <Facts values={detail.reuseProfile} /> : null}
        </aside>
      </div>
      <section className={styles.card}>
        <h2>图片与复用条件</h2>
        <p>上游模型：{item.model || '未知'} · 本站未实测</p>
        {item.modelEvidence ? <p>{item.modelEvidence.note}</p> : null}
        {item.referenceRequired ? <p>需要参考图 · {item.inputCompleteness === 'provided' ? '上游已提供输入图' : '输入图未完整提供，请自行准备'}</p> : null}
        {([['output', '效果图'], ['reference', '输入参考图'], ['comparison', '跨模型对照']] as const).map(([role, label]) => {
          const pictures = (detail?.imageRoles || []).filter(image => image.role === role);
          return pictures.length ? <div key={role}><h3>{label}</h3><div className={styles.imageSet}>{pictures.map(image => <Image2EvidenceImage key={image.url} src={proxySrc(image.url)} label={image.label || label} sourceUrl={detail?.sourceUrl || item.sourceUrl} />)}</div></div> : null;
        })}
      </section>
      {detail?.prompt ? <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>原始提示词</h2><span>{item.promptKind ?? "保留原文"}</span></div>
        <pre className={styles.prompt}>{detail.prompt}</pre>
      </section> : <section className={styles.card}><h2>原始提示词暂时不可用</h2><p>请返回案例库重试，或查看原始来源。</p></section>}
      <div className={styles.columns}>
        {detail?.promptStructure ? <section className={styles.card}><h2>提示词结构</h2><Facts values={detail.promptStructure} /></section> : null}
        {detail?.replicationGuide ? <section className={styles.card}><h2>复现指南</h2><Facts values={detail.replicationGuide} /></section> : null}
      </div>
      <section className={styles.card}>
        <h2>来源与授权</h2>
        <p>{item.sourceLabel || item.sourceName || "Image2 案例库"}</p>
        {detail?.sourceUrl || item.sourceUrl ? <p><a href={detail?.sourceUrl || item.sourceUrl} target="_blank" rel="noreferrer noopener">查看原始来源 ↗</a></p> : null}
        {detail?.githubUrl || item.githubUrl ? <p><a href={detail?.githubUrl || item.githubUrl} target="_blank" rel="noreferrer noopener">查看收录仓库 ↗</a></p> : null}
        {detail?.sourceNote ? <p>{detail.sourceNote}</p> : null}
        {detail?.sourceRecord?.credit ? <p>{detail.sourceRecord.credit}</p> : null}
        {detail?.sourceRecord?.links?.map(link => <p key={link}><a href={link} target="_blank" rel="noreferrer noopener">来源证据：{link}</a></p>)}
        {detail?.sourceRights?.rightsNotice ? <p>{detail.sourceRights.rightsNotice}</p> : null}
        <p>{item.sourceLicense || "收录不代表获得素材授权，使用范围以原始来源为准。"}</p>
        {detail?.riskNote ? <p className={styles.caution}>{detail.riskNote}</p> : null}
      </section>
      {related.length ? <section className={styles.related}>
        <h2>同类案例</h2>
        <ul>{related.map((other) => <li key={other.detailKey}>
          <Link href={`/image2-cases/${encodeURIComponent(other.detailKey)}`}>
            <img src={proxySrc(other.imageUrl)} alt={other.imageAlt || other.title} loading="lazy" />
            <span>{localizedCaseText({ ...other, categoryLabel: other.categoryLabel ?? "", promptPreview: other.promptPreview ?? "" }, "zh").title}</span>
          </Link>
        </li>)}</ul>
      </section> : null}
      <footer className={styles.footer}><Link href="/image2-cases">← 返回案例库</Link><Link href={caseHref}>继续复用这个案例 →</Link></footer>
    </main>
  );
}
