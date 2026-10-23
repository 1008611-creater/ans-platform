import { ANS_LEARNING_PATHS } from "@/domain/vibehub/ans-learning-paths";
import { ANS_PRACTICES, type AnsPracticeLink, type VibeLocale, type VibeText } from "@/domain/vibehub/ans-practices";
import { briefScenarioForPath, getBriefScenario } from "@/domain/vibehub/brief-scenarios";
import type { GuideTask } from "@/domain/vibehub/guide-routing";
import type { JourneyData } from "../journeys/journey-client";

export type GuideStep = { id: string; title: string; action: string; evidence?: string; checklist?: string[]; optional?: string; links: { href: string; label: string }[] };
export type GuideView = {
  id: string;
  task?: GuideTask;
  title: string;
  summary: string;
  audience: string;
  outcome: string;
  briefHref: string;
  steps: GuideStep[];
  prompt?: { title: string; text: string; note: string };
  terms: { slug: string; label: string }[];
  destinations: { href: string; label: string; description: string }[];
};

const TASK_PATH: Partial<Record<GuideTask, string>> = {
  website: "ans-first-website",
  "ui-design": "ans-ui-design",
  "skill-product": "ans-skill-product",
  "media-pipeline": "ans-media-pipeline",
  "agent-team": "ans-agent-team",
  creative: "ans-creative-delivery",
  "open-source": "ans-open-source",
  github: "ans-open-source",
};
const TASK_PRACTICE: Record<GuideTask, string> = {
  website: "portfolio",
  "ui-design": "ui-design-workflow",
  "skill-product": "skill-as-product",
  "media-pipeline": "media-content-flywheel",
  "agent-team": "agent-team-and-cost",
  creative: "creative-production",
  "open-source": "github-to-project",
  github: "github-to-project",
  brief: "clear-brief",
  evidence: "competition-evidence",
  competition: "competition-evidence",
  cost: "account-and-cost",
  account: "account-and-cost",
};
const PRACTICE_EVIDENCE: Record<string, VibeText[]> = {
  "clear-brief": [
    { zh: "一句话能说出给谁看、解决什么问题、哪些功能不做。", en: "One sentence names the audience, problem, and non-goals." },
    { zh: "参考截图、真实标题和待补充项已经列清。", en: "Reference screenshots, real titles, and missing items are listed." },
    { zh: "有 3 条用浏览器或键盘就能核对的完成标准。", en: "Three completion checks can be verified in a browser or with a keyboard." },
  ],
  "competition-evidence": [
    { zh: "一条主要演示路径能从输入走到结果。", en: "One primary demo path runs from input to output." },
    { zh: "线上链接、关键截图、录屏和成员分工放在同一处。", en: "The live link, screenshots, screen recording, and roles sit in one place." },
    { zh: "提交说明区分了已实现能力与赛后计划。", en: "The submission note separates shipped features from post-event plans." },
  ],
  "account-and-cost": [
    { zh: "客户端代码、截图和 Git 历史里没有真实密钥。", en: "Client code, screenshots, and Git history contain no live keys." },
    { zh: "批量生成前已用一条最小样本确认耗时与积分。", en: "One minimal sample run confirmed latency and credit usage before batching." },
    { zh: "失败时能查到状态、错误原因和账单记录。", en: "Failures can be traced through status, error reason, and ledger records." },
  ],
};

function localizeLinks(links: AnsPracticeLink[], lang: VibeLocale) {
  return links.map(item => ({ href: item.href, label: item.label[lang], description: item.description[lang] }));
}

export function taskGuide(task: GuideTask, lang: VibeLocale): GuideView {
  const path = ANS_LEARNING_PATHS.find(item => item.id === TASK_PATH[task]);
  const practice = ANS_PRACTICES.find(item => item.slug === TASK_PRACTICE[task]) || ANS_PRACTICES[0];
  const scenario = (path && briefScenarioForPath(path.id)) || getBriefScenario(task === "open-source" ? "github" : task === "website" || task === "creative" || task === "ui-design" || task === "skill-product" || task === "media-pipeline" || task === "agent-team" ? task : "custom");
  const steps = path
    ? path.steps.map((step, index) => ({
        id: step.id,
        title: step.title[lang],
        action: step.action[lang],
        evidence: step.evidence[lang],
        checklist: practice.sections[index]?.checklist?.[lang],
        links: step.links.filter(link => !link.href.startsWith("/vibe-hub/ans/")).map(link => ({ href: link.href, label: link.label[lang] })),
      }))
    : practice.sections.map((section, index) => ({
        id: section.id,
        title: section.title[lang],
        action: section.body[lang],
        evidence: PRACTICE_EVIDENCE[practice.slug]?.[index]?.[lang],
        checklist: section.checklist?.[lang],
        links: practice.relatedTerms.slice(index, index + 2).map(term => ({ href: `/vibe-hub/${term.slug}`, label: term.label[lang] })),
      }));
  return {
    id: `task:${task}`,
    task,
    title: (path || practice).title[lang],
    summary: (path || practice).summary[lang],
    audience: (path || practice).audience[lang],
    outcome: (path || practice).outcome[lang],
    briefHref: `/vibe-hub/vibehub-skill?scenario=${scenario.id}&lang=${lang}`,
    steps,
    prompt: { title: practice.requestExample.title[lang], text: practice.requestExample.prompt[lang], note: practice.requestExample.note[lang] },
    terms: practice.relatedTerms.map(term => ({ slug: term.slug, label: term.label[lang] })),
    destinations: localizeLinks(practice.nextDestinations.filter(item => item.href !== "/vibe-hub/vibehub-skill"), lang),
  };
}

export function topicGuide(journey: JourneyData): GuideView {
  return {
    id: `topic:${journey.id}`,
    title: journey.title,
    summary: journey.summary,
    audience: journey.whenToUse,
    outcome: journey.outcome,
    briefHref: "/vibe-hub/vibehub-skill?scenario=custom",
    steps: journey.stages.map(stage => ({
      id: `stage-${stage.stage}`,
      title: stage.title,
      action: stage.goal,
      optional: stage.optionalNote,
      links: stage.recommendedTerms.map(term => ({ href: `/vibe-hub/${term.id}`, label: term.title })),
    })),
    terms: journey.stages.flatMap(stage => stage.recommendedTerms).slice(0, 6).map(term => ({ slug: term.id, label: term.title })),
    destinations: [],
  };
}
