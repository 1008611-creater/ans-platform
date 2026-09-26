import type { FactRecord } from "@/domain/projects/pack";

export type SensitiveKind = "phone" | "email" | "id" | "secret" | "private-link";

export type SensitiveFinding = {
  kind: SensitiveKind;
  label: string;
};

const RULES: Array<{ kind: SensitiveKind; label: string; pattern: RegExp }> = [
  { kind: "phone", label: "手机号", pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/ },
  { kind: "email", label: "邮箱", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { kind: "id", label: "证件号", pattern: /(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/ },
  { kind: "secret", label: "密钥或访问令牌", pattern: /(?:sk|rk|ak|ghp|github_pat|xox[baprs])-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|secret|token|password)\s*[:=]\s*\S{8,}/i },
  { kind: "private-link", label: "私有仓库地址", pattern: /https?:\/\/(?:github\.com|gitlab\.com|gitee\.com)\/[^\s)]+(?:private|internal)|git@[^\s:]+:[^\s]+\.git/i },
];

export function detectSensitiveContent(text: string): SensitiveFinding[] {
  return RULES.filter((rule) => rule.pattern.test(text)).map(({ kind, label }) => ({ kind, label }));
}

export function publicReviewBlockers(facts: FactRecord[], markdown: string): string[] {
  const blockers: string[] = [];
  const unconfirmed = facts.filter((fact) => fact.value.trim() && fact.confirmation !== "confirmed");
  if (unconfirmed.length > 0) blockers.push("存在尚未确认的事实。");
  const findings = detectSensitiveContent(`${facts.map((fact) => fact.value).join("\n")}\n${markdown}`);
  if (findings.length > 0) blockers.push(`检测到${findings.map((item) => item.label).join("、")}。`);
  return blockers;
}
