export type VibeLanguage = "en" | "zh";
export type SourcePage = { name?: string; title?: string; description?: string; quote?: string; agentPrompt?: string; markdown?: string; html: string; sourceUrl: string };
export type FlowLesson = { steps: { id: string; label: string; owner: string; detail: string; focused: boolean }[]; practice?: { title: string; options: { label: string; feedback: string; correct: boolean }[] }; agentPrompt?: string };
export type Lesson = {
  id: string; title: string; secondaryTitle?: string; tagline?: string; description?: string; category?: string;
  agentPrompt?: string; flowLesson?: FlowLesson | null;
  lessonPractice?: { title: string; options: { label: string; feedback: string; correct: boolean }[] } | null;
  references?: { title: string; source?: string; url: string }[];
};
export type AgentEnvelope<T> = { schemaVersion: string; revision: string; data: T };
