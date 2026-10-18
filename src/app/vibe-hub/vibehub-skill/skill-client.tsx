"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers, Sparkles, Terminal, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRIEF_SCENARIOS, getBriefScenario, type BriefFields } from "@/domain/vibehub/brief-scenarios";
import {
  ANS_DAILY_SKILLS,
  ANS_REWRITE_EXAMPLES,
  ANS_SKILL_PIPELINES,
  ANS_SKILL_PRODUCT_PRINCIPLES,
} from "@/domain/vibehub/ans-skill-matrix";
import { buildCoverStudioSvg } from "@/domain/vibehub/ans-site-optimizers";
import { SkillCopyButton } from "../skill-copy-button";
import { usePersistedSetting } from "../use-persisted-setting";
import { useVibeLanguage } from "../use-vibe-language";

type FieldKey = keyof BriefFields;
const fieldOrder: { key: FieldKey; title: string; placeholder: string }[] = [
  { key: "goal", title: "briefFieldGoal", placeholder: "briefPlaceholderGoal" },
  { key: "audience", title: "briefFieldAudience", placeholder: "briefPlaceholderAudience" },
  { key: "references", title: "briefFieldReferences", placeholder: "briefPlaceholderReferences" },
  { key: "acceptance", title: "briefFieldAcceptance", placeholder: "briefPlaceholderAcceptance" },
];

function parseFields(raw: string): BriefFields {
  try {
    const value = JSON.parse(raw) as Partial<BriefFields>;
    return {
      goal: typeof value.goal === "string" ? value.goal : "",
      audience: typeof value.audience === "string" ? value.audience : "",
      references: typeof value.references === "string" ? value.references : "",
      acceptance: typeof value.acceptance === "string" ? value.acceptance : "",
    };
  } catch {
    return { goal: "", audience: "", references: "", acceptance: "" };
  }
}

export function SkillClient(props: { initialScenario?: string }) {
  return <Skill {...props} />;
}

export default function Skill({ initialScenario }: { initialScenario?: string }) {
  const lang = useVibeLanguage();
  const t = useTranslations("vibehub");
  const initial = getBriefScenario(initialScenario);
  const [scenarioId, setScenarioId] = useState(initial.id);
  const [templateNotice, setTemplateNotice] = useState("");
  const [activeRewriteId, setActiveRewriteId] = useState(ANS_REWRITE_EXAMPLES[0].id);
  const [activePipeline, setActivePipeline] = useState<"all" | "engineering" | "media" | "content">("engineering");
  const [coverDemoSlug, setCoverDemoSlug] = useState<"cauai-one" | "niannian-drama" | "liu-resume">("cauai-one");
  const [customCoverTitle, setCustomCoverTitle] = useState("CAU 农情病虫害多模态诊断终端");
  const scenario = getBriefScenario(scenarioId);
  const [saved, setSaved, persisted] = usePersistedSetting(
    `ans:vibehub:brief:${scenario.id}:${lang}:v1`,
    JSON.stringify(scenario.template[lang]),
  );
  const fields = parseFields(saved);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLTextAreaElement | null>>>({});
  const lines = fieldOrder
    .map(item => [t(item.title), fields[item.key].trim()] as const)
    .filter(([, text]) => text.length > 0);
  const missing = fieldOrder.filter(item => !fields[item.key].trim());
  const brief = lines.map(([label, text]) => `${label}：${text}`).join("\n\n");
  const destination = (href: string) =>
    href.startsWith("/vibe-hub") ? `${href}${href.includes("?") ? "&" : "?"}lang=${lang}` : href;

  const activeRewrite = ANS_REWRITE_EXAMPLES.find(item => item.id === activeRewriteId) || ANS_REWRITE_EXAMPLES[0];
  const visibleSkills =
    activePipeline === "all"
      ? ANS_DAILY_SKILLS
      : ANS_DAILY_SKILLS.filter(skill => skill.pipelineId === activePipeline);

  function selectScenario(id: typeof scenarioId) {
    setScenarioId(id);
    setTemplateNotice(
      id === "custom"
        ? t("briefBlankReady")
        : t("briefTemplateLoaded", { name: getBriefScenario(id).label[lang] }),
    );
  }

  return (
    <main className="ans-knowledge-container ans-editorial-page">
      <header className="ans-knowledge-page-heading">
        <p className="ans-knowledge-eyebrow">{t("skillEyebrow")}</p>
        <h1>{t("skillTitle")}</h1>
        <p>{t("skillSubtitle")}</p>
        <nav className="ans-skill-quicknav" aria-label={t("onThisPage")}>
          <a href="#ans-brief-builder" className="ans-editorial-link">
            <Wrench size={15} aria-hidden="true" />
            {t("skillNavBrief")}
          </a>
          <a href="#ans-expression-rewriter" className="ans-editorial-link">
            <Sparkles size={15} aria-hidden="true" />
            {t("skillNavRewrite")}
          </a>
          <a href="#ans-skill-matrix" className="ans-editorial-link">
            <Layers size={15} aria-hidden="true" />
            {t("skillNavMatrix")}
          </a>
          <a href="#ans-skill-principles" className="ans-editorial-link">
            <Terminal size={15} aria-hidden="true" />
            {t("skillNavPrinciples")}
          </a>
          <a
            href="/architecture/ans-never-stops-architecture.html"
            target="_blank"
            rel="noreferrer"
            className="ans-editorial-link"
          >
            <ArrowUpRight size={15} aria-hidden="true" />
            {lang === "en" ? "ANS (AI Never Stops) Architecture Map" : "ANS (AI Never Stops) 全景交互架构图"}
          </a>
          <a
            href="/architecture/ans-oil-style-storyboard.html"
            target="_blank"
            rel="noreferrer"
            className="ans-editorial-link"
          >
            <ArrowUpRight size={15} aria-hidden="true" />
            {lang === "en" ? "16:9 Dynamic Storyboard Canvas" : "16:9 横屏六幕动态导览画布"}
          </a>
        </nav>
      </header>

      <section id="ans-brief-builder" aria-labelledby="ans-brief-builder-heading">
        <div className="ans-brief-start" aria-label={t("briefScenarioLabel")}>
          <div className="ans-brief-scenarios" role="group" aria-label={t("briefScenarioLabel")}>
            {BRIEF_SCENARIOS.map(item => (
              <button
                type="button"
                key={item.id}
                aria-pressed={scenario.id === item.id}
                onClick={() => selectScenario(item.id)}
              >
                {item.label[lang]}
              </button>
            ))}
          </div>
          <p className="ans-brief-template-status" role="status" aria-live="polite">
            {templateNotice || scenario.summary[lang]}
          </p>
        </div>
        <div className="ans-brief-workbench" aria-label={t("skillWorkbench")}>
          <div className="ans-brief-inputs">
            <div className="ans-brief-heading">
              <h2 id="ans-brief-builder-heading">{t("skillWorkbenchTitle")}</h2>
              <span className="ans-device-state" role="status">
                {t(persisted ? "deviceSaved" : "deviceSaveFailed")}
              </span>
            </div>
            {fieldOrder.map(item => (
              <label key={item.key}>
                {t(item.title)}
                <textarea
                  ref={node => {
                    fieldRefs.current[item.key] = node;
                  }}
                  value={fields[item.key]}
                  placeholder={t(item.placeholder)}
                  onChange={event => {
                    setTemplateNotice("");
                    setSaved(JSON.stringify({ ...fields, [item.key]: event.target.value }));
                  }}
                />
              </label>
            ))}
          </div>
          <aside className="ans-brief-preview" aria-live="polite">
            <div>
              <h3>{t("briefPreviewTitle")}</h3>
              <SkillCopyButton
                text={brief}
                label={t("briefCopy")}
                copiedLabel={t("copied")}
              />
            </div>
            <div className="ans-brief-missing" role="status">
              {missing.length > 0 ? (
                <>
                  <span>{t("briefMissingLabel")}</span>
                  {missing.map(item => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => fieldRefs.current[item.key]?.focus()}
                    >
                      {t(item.title)}
                    </button>
                  ))}
                </>
              ) : (
                <span className="ans-brief-ready">{t("briefCompleteStatus")}</span>
              )}
            </div>
            {brief ? (
              <pre>{brief}</pre>
            ) : (
              <p className="ans-brief-empty">{t("briefEmptyState")}</p>
            )}
            <nav className="ans-brief-next" aria-label={t("ansDestinations")}>
              <Link className="ans-editorial-link" href={destination(scenario.nextHref)}>
                {scenario.nextLabel[lang]}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <Link
                className="ans-editorial-link ans-editorial-link-secondary"
                href={`/vibe-hub/guides?lang=${lang}`}
              >
                {t("guides")}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </nav>
          </aside>
        </div>
      </section>

      <section
        id="ans-expression-rewriter"
        className="ans-skill-section"
        aria-labelledby="ans-rewrite-heading"
      >
        <div className="ans-knowledge-section-heading">
          <div>
            <p className="ans-knowledge-eyebrow">{t("skillRewriteEyebrow")}</p>
            <h2 id="ans-rewrite-heading">{t("skillRewriteTitle")}</h2>
          </div>
          <p>{t("skillRewriteSubtitle")}</p>
        </div>
        <div className="ans-brief-scenarios" role="group" aria-label={t("skillRewriteTitle")}>
          {ANS_REWRITE_EXAMPLES.map(example => (
            <button
              key={example.id}
              type="button"
              aria-pressed={activeRewrite.id === example.id}
              onClick={() => setActiveRewriteId(example.id)}
            >
              {example.label[lang]}
            </button>
          ))}
        </div>
        <div className="ans-rewrite-compare" aria-live="polite">
          <article className="ans-rewrite-card ans-rewrite-before">
            <span className="ans-knowledge-eyebrow">{t("skillRewriteBefore")}</span>
            <p>“{activeRewrite.before[lang]}”</p>
          </article>
          <article className="ans-rewrite-card ans-rewrite-after">
            <div className="ans-rewrite-after-head">
              <span className="ans-knowledge-eyebrow">{t("skillRewriteAfter")}</span>
              <SkillCopyButton
                text={activeRewrite.after[lang]}
                label={t("copyRequest")}
                copiedLabel={t("copied")}
              />
            </div>
            <p>{activeRewrite.after[lang]}</p>
            <small className="ans-rewrite-why">{activeRewrite.why[lang]}</small>
            <nav className="ans-rewrite-terms" aria-label={t("relatedTerms")}>
              {activeRewrite.terms.map(term => (
                <Link key={term.slug} href={`/vibe-hub/${term.slug}?lang=${lang}`}>
                  {term.label[lang]}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </article>
        </div>
      </section>

      <section
        id="ans-skill-matrix"
        className="ans-skill-section"
        aria-labelledby="ans-matrix-heading"
      >
        <div className="ans-knowledge-section-heading">
          <div>
            <p className="ans-knowledge-eyebrow">{t("skillMatrixEyebrow")}</p>
            <h2 id="ans-matrix-heading">{t("skillMatrixTitle")}</h2>
          </div>
          <p>{t("skillMatrixSubtitle")}</p>
        </div>

        <div className="ans-pipeline-grid">
          {ANS_SKILL_PIPELINES.map(pipeline => (
            <article key={pipeline.id} className="ans-pipeline-card">
              <div className="ans-pipeline-head">
                <span className="ans-practice-number">{pipeline.number}</span>
                <h3>{pipeline.title[lang]}</h3>
              </div>
              <p>{pipeline.summary[lang]}</p>
              <ol className="ans-pipeline-steps">
                {pipeline.flowSteps.map(step => (
                  <li key={step.en}>{step[lang]}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>

        <div className="ans-brief-scenarios ans-skill-filter" role="group" aria-label={t("skillMatrixFilterLabel")}>
          {(
            [
              { id: "all", label: t("skillFilterAll") },
              { id: "engineering", label: t("skillFilterEngineering") },
              { id: "media", label: t("skillFilterMedia") },
              { id: "content", label: t("skillFilterContent") },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activePipeline === tab.id}
              onClick={() => setActivePipeline(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ans-daily-skills-grid">
          {visibleSkills.map(skill => {
            const pipeline = ANS_SKILL_PIPELINES.find(p => p.id === skill.pipelineId)!;
            return (
              <article key={skill.id} id={skill.id} className="ans-daily-skill-card">
                <header className="ans-daily-skill-head">
                  <div>
                    <p className="ans-knowledge-eyebrow">
                      <span>{skill.number}</span>
                      <span aria-hidden="true">·</span>
                      <code>{skill.code}</code>
                      <span aria-hidden="true">·</span>
                      <span>{pipeline.title[lang]}</span>
                    </p>
                    <h3>{skill.title[lang]}</h3>
                  </div>
                  <Link className="ans-editorial-link" href={destination(skill.guideHref)}>
                    {t("skillOpenGuide")}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </header>
                <dl className="ans-daily-skill-meta">
                  <div>
                    <dt>{t("skillWhenToUse")}</dt>
                    <dd>{skill.trigger[lang]}</dd>
                  </div>
                  <div>
                    <dt>{t("skillHowItWorks")}</dt>
                    <dd>{skill.mechanism[lang]}</dd>
                  </div>
                  <div>
                    <dt>{t("skillBoundaryLabel")}</dt>
                    <dd>{skill.boundary[lang]}</dd>
                  </div>
                </dl>
                <div className="ans-daily-skill-prompt">
                  <div className="ans-daily-skill-prompt-head">
                    <strong>{t("skillPromptLabel")}</strong>
                    <SkillCopyButton
                      text={skill.agentPrompt[lang]}
                      label={t("copyRequest")}
                      copiedLabel={t("copied")}
                    />
                  </div>
                  <p>{skill.agentPrompt[lang]}</p>
                </div>
                <nav className="ans-rewrite-terms" aria-label={t("relatedTerms")}>
                  {skill.relatedTerms.map(term => (
                    <Link key={term.slug} href={`/vibe-hub/${term.slug}?lang=${lang}`}>
                      {term.label[lang]}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  ))}
                </nav>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="ans-dual-cover-studio"
        data-testid="ans-dual-cover-studio"
        className="ans-skill-section"
        aria-labelledby="ans-dual-cover-heading"
      >
        <div className="ans-knowledge-section-heading">
          <div>
            <p className="ans-knowledge-eyebrow">
              {lang === "en" ? "DUAL-COVER SKILL ENGINE · OIL + GITGLOW" : "双封面 SKILL 协同引擎 · 点进去前一套 / 点进去后一套"}
            </p>
            <h2 id="ans-dual-cover-heading">
              {lang === "en"
                ? "Same Project, Two Cover Skills: oil Poster Before Click · GitGlow 3D After Click"
                : "同一个项目两份封面：点进去前用 oil 大字海报 Skill，点进去后用 GitGlow 3D 实景 Skill"}
            </h2>
          </div>
          <p>
            {lang === "en"
              ? "Outer browse cards use the oil Cover Skill for instant topic recognition; inner detail pages use the GitGlow 3D Skill to reveal the real running interface."
              : "外层列表卡片用 oil 封面 Skill（暖米白网格底 + 粗黑描边硬阴影 + 超大标题 + 主题插画），一眼看懂它是干嘛的；点进详情页切换为 GitGlow 封面 Skill（深色聚光灯 + 3D 透视界面实景），看清项目真实长相。"}
          </p>
        </div>

        <div className="ans-brief-scenarios" role="group" aria-label="双封面示范项目切换">
          {([
            { id: "cauai-one", label: "🚀 示例 1：CAUAI.one 个人主页生成器", title: "CAUAI.one 30秒个人主页生成" },
            { id: "niannian-drama", label: "🎬 示例 2：念念漫剧 AI 短剧流水线", title: "念念漫剧 AI 短剧分镜工坊" },
            { id: "liu-resume", label: "📄 示例 3：个人交互式简历主页", title: "刘曙宾 交互式数字简历站" },
          ] as const).map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={coverDemoSlug === item.id}
              onClick={() => {
                setCoverDemoSlug(item.id);
                setCustomCoverTitle(item.title);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="ans-rewrite-compare" style={{ marginTop: "1rem" }}>
          <article className="ans-rewrite-card">
            <div className="ans-rewrite-after-head">
              <span className="ans-knowledge-eyebrow">🎨 点进去之前（列表卡片外封）· oil 封面 Skill</span>
              <Link className="ans-editorial-link" href={`/explore/${coverDemoSlug}`}>
                查看详情页切换效果 <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", marginTop: "0.75rem" }}>
              <img
                src={`/catalog/oil-v1/${coverDemoSlug}.svg`}
                alt="oil 外封海报示例"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <small className="ans-rewrite-why">
              暖米白编辑部网格 + 墨黑粗描边硬阴影 + 超大中文标题 + 赛道手绘插画，解决缩略图字小看不清、暗黑卡片撞脸问题。
            </small>
          </article>

          <article className="ans-rewrite-card">
            <div className="ans-rewrite-after-head">
              <span className="ans-knowledge-eyebrow">🌌 点进去之后（详情页主图内封）· GitGlow 3D 封面 Skill</span>
              <Link className="ans-editorial-link" href={`/explore/${coverDemoSlug}`}>
                进入详情页实测 <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", marginTop: "0.75rem" }}>
              <img
                src={`/catalog/gitglow-v1/${coverDemoSlug}.webp`}
                alt="GitGlow 3D 内封实景示例"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <small className="ans-rewrite-why">
              深色聚光灯 + 3D 透视斜切真实软件界面截图，点进详情页后直观展示工作台与真实运行界面，左上角支持一键切换外封/内封。
            </small>
          </article>
        </div>

        <div className="ans-rewrite-compare" style={{ marginTop: "1rem" }}>
          <article className="ans-rewrite-card">
            <span className="ans-knowledge-eyebrow">⚡ 在线实时生成预览 · oil 外封 Skill (SVG 引擎)</span>
            <div
              style={{ borderRadius: "14px", overflow: "hidden", marginTop: "0.75rem" }}
              dangerouslySetInnerHTML={{
                __html: buildCoverStudioSvg("editorial", customCoverTitle, "确定性脚本校验 + 受约束 Agent + 本地沙箱预览", "ANS · OIL COVER SKILL"),
              }}
            />
          </article>
          <article className="ans-rewrite-card">
            <span className="ans-knowledge-eyebrow">⚡ 在线实时生成预览 · GitGlow 3D 内封 Skill (SVG 引擎)</span>
            <div
              style={{ borderRadius: "14px", overflow: "hidden", marginTop: "0.75rem" }}
              dangerouslySetInnerHTML={{
                __html: buildCoverStudioSvg("dark-tech", customCoverTitle, "确定性脚本校验 + 受约束 Agent + 本地沙箱预览", "ANS · GITGLOW 3D SKILL"),
              }}
            />
          </article>
        </div>
      </section>

      <section
        id="ans-skill-principles"
        className="ans-skill-section"
        aria-labelledby="ans-principles-heading"
      >
        <div className="ans-knowledge-section-heading">
          <div>
            <p className="ans-knowledge-eyebrow">{t("skillPrinciplesEyebrow")}</p>
            <h2 id="ans-principles-heading">{t("skillPrinciplesTitle")}</h2>
          </div>
          <p>{t("skillPrinciplesSubtitle")}</p>
        </div>
        <div className="ans-principles-grid">
          {ANS_SKILL_PRODUCT_PRINCIPLES.map(item => (
            <article key={item.id} className="ans-principle-card">
              <span className="ans-practice-number">{item.number}</span>
              <h3>{item.title[lang]}</h3>
              <p className="ans-principle-problem">
                <strong>{t("skillPrinciplePitfall")}：</strong>
                {item.problem[lang]}
              </p>
              <p className="ans-principle-solution">
                <strong>{t("skillPrincipleSolution")}：</strong>
                {item.solution[lang]}
              </p>
            </article>
          ))}
        </div>
        <nav className="ans-skill-bottom-links" aria-label={t("ansDestinations")}>
          <Link className="ans-editorial-link" href={`/vibe-hub/guides?task=skill-product&lang=${lang}`}>
            {t("skillOpenProductGuide")}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="ans-editorial-link" href={`/vibe-hub/anti-ai-flavor?lang=${lang}`}>
            {t("antiAi")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link className="ans-editorial-link" href={`/vibe-hub/lab?lang=${lang}`}>
            {t("lab")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </section>
    </main>
  );
}
