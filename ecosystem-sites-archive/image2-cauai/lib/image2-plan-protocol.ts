// Shared browser handoff: viewing references never means they were uploaded for generation.
export const CASE_HANDOFF_KEY = 'image2-case-handoff:v1';
export const CASE_RETURN_KEY = 'image2-case-return:v2';
export type CasePlan = {
  schema?: 'image2-plan-v2'; owner: string | null; caseKey: string; title: string; prompt: string; original?: string;
  versionId?: string | null; note?: string; aspect?: string; resolution?: string; constraints?: string[];
  missingInputs?: string[]; returnUrl?: string; createdAt?: string; model?: string; provider?: string;
  referenceRequired: boolean; inputCompleteness: string;
  references: Array<{ url: string; label?: string; role?: string; exampleId?: string }>; sourceUrl?: string;
};
export function readCasePlan(value: unknown, owner: string | null): CasePlan | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as CasePlan;
  if (p.owner !== owner || typeof p.caseKey !== 'string' || typeof p.prompt !== 'string' || typeof p.title !== 'string' || !Array.isArray(p.references)) return null;
  return { ...p, references: p.references.filter(x => x && typeof x.url === 'string' && /^https?:\/\//.test(x.url)) };
}
export function caseReturnUrl(plan: CasePlan): string {
  try {
    const url = new URL(plan.returnUrl ?? '', 'https://image2.cauai.fun');
    if (url.origin === 'https://image2.cauai.fun' && url.pathname === '/image2-cases') {
      url.searchParams.set('case', plan.caseKey);
      return url.pathname + url.search;
    }
  } catch { /* Fall back to a stable case identity. */ }
  return '/image2-cases?case=' + encodeURIComponent(plan.caseKey);
}
