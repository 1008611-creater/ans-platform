import { ANS_LEARNING_PATHS } from "@/domain/vibehub/ans-learning-paths";
import { getAnsPractice, type AnsPractice, type PracticeLocale } from "@/domain/vibehub/ans-practices";
import type { GuideTask } from "@/domain/vibehub/guide-routing";
import type { JourneyData } from "../journeys/journey-client";
export interface GuideStep {
  id: string; title: string; action: string; evidence?: string; optional?: string;
  checklist: string[]; resources: { href: string; label: string }[];
}
export interface GuideView {
  id: string; title: string; outcome: string; storageKey: string; scenario: string;
  steps: GuideStep[]; reference?: AnsPractice;
}
const taskPaths = { website: "ans-first-website", creative: "ans-creative-delivery", github: "ans-open-source" };
const taskPractices: Record<GuideTask, string> = { website: "portfolio", creative: "creative-production", github: "github-to-project", brief: "clear-brief", competition: "competition-evidence", account: "account-and-cost" };
const sectionMap: Record<string, Record<string, number>> = { website: { content: 0, interface: 1, delivery: 2 }, creative: { facts: 0, assets: 1, shots: 2 }, github: { source: 0, roles: 1, handoff: 2 } };
export function taskGuide(task: GuideTask, lang: PracticeLocale): GuideView {
  const reference = getAnsPractice(taskPractices[task])!;
  if (task === "website" || task === "creative" || task === "github") {
    const path = ANS_LEARNING_PATHS.find(item => item.id === taskPaths[task])!;
    return { id: task, title: path.title[lang], outcome: path.outcome[lang], storageKey: `ans:vibehub:path:${path.id}:v1`, scenario: task, reference,
      steps: path.steps.map(step => ({ id: step.id, title: step.title[lang], action: step.action[lang], evidence: step.evidence[lang],
        checklist: reference.sections[sectionMap[task][step.id]]?.items[lang] || [],
        resources: step.links.filter(link => !link.href.startsWith("/vibe-hub/ans/")).map(link => ({ href: link.href, label: link.label[lang] })),
      })),
    };
  }
  return { id: task, title: reference.title[lang], outcome: reference.outcome[lang], storageKey: `ans:vibehub:guide:${task}:v1`, scenario: "custom", reference,
    steps: reference.sections.map((section, index) => ({ id: `step-${index + 1}`, title: section.title[lang], action: section.body[lang], checklist: section.items[lang], resources: [] })),
  };
}
export function topicGuide(topic: JourneyData): GuideView {
  return { id: topic.id, title: topic.title, outcome: topic.outcome, storageKey: `vibehub:journey:${topic.id}`, scenario: "custom",
    steps: topic.stages.map(stage => ({ id: stage.id, title: stage.title, action: stage.action, evidence: stage.evidence, optional: stage.optionalWhen || undefined, checklist: [], resources: stage.lessons.map(lesson => ({ href: `/vibe-hub/${lesson.id}`, label: lesson.title })) })),
  };
}
