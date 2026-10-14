export type ProjectGuideLocale = {
  audience: string;
  difficulty: string;
  access: string;
  cost: string;
  result: string;
  steps: readonly { title: string; body: string; href?: string }[];
  cautions: readonly string[];
};

/** Editorial advice is tied to an exact public source, never to private member facts. */
export type ProjectGuide = {
  slug: string;
  sourceUrl: string;
  checkedAt: string;
  experienceUrl?: string;
  evidence: readonly { label: string; href: string }[];
  zh: ProjectGuideLocale;
  en: ProjectGuideLocale;
};

