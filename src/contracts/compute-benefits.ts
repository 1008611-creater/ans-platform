import { z } from "zod";

export const ONBOARDING_QUESTIONNAIRE_VERSION = "onboarding-v1" as const;
export const AGRI_APPLICATION_VERSION = "agri-v1" as const;
export const ONBOARDING_CAMPAIGN = "ans-onboarding-2026-v1";
export const AGRI_CAMPAIGN = "ans-agrihackathon-2026-v1";
export const BENEFIT_KINDS = ["DEEPSEEK_ONBOARDING", "TERRA_AGRI", "GPT_AGRI", "OPUS_AGRI"] as const;
export type BenefitKind = typeof BENEFIT_KINDS[number];
export const EXPERIENCE_VALUES = ["NEW", "LEARNING", "BUILDING", "PROFESSIONAL"] as const;
export const ROLE_VALUES = ["DEVELOPER", "DESIGNER", "STUDENT", "RESEARCHER", "FOUNDER", "OTHER"] as const;
export const AGENT_VALUES = ["ANS", "CODEX", "CLAUDE_CODE", "OPENCLAW", "OTHER", "UNDECIDED"] as const;
const text = (min: number, max: number) => z.string().trim().min(min).max(max).refine(v => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v));
export const onboardingQuestionnaireSchema = z.object({
  version: z.literal(ONBOARDING_QUESTIONNAIRE_VERSION),
  role: z.enum(ROLE_VALUES), experience: z.enum(EXPERIENCE_VALUES), agent: z.enum(AGENT_VALUES),
  useCase: text(10, 1000), acceptedRules: z.literal(true),
}).strict();
export const agriApplicationSchema = z.object({
  version: z.literal(AGRI_APPLICATION_VERSION),
  teamName: text(1, 80), projectTitle: text(2, 120), role: z.enum(ROLE_VALUES),
  problem: text(20, 1500), plan: text(20, 2000), acceptedRules: z.literal(true),
}).strict();
export const benefitReviewSchema = z.object({
  revision: z.number().int().min(1).max(1_000_000),
  decision: z.enum(["APPROVED", "REJECTED"]), note: text(2, 1000),
}).strict();
export type OnboardingQuestionnaire = z.infer<typeof onboardingQuestionnaireSchema>;
export type AgriApplicationAnswers = z.infer<typeof agriApplicationSchema>;
export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface BenefitApplication {
  id: string; status: ApplicationStatus; revision: number; submittedAt: string;
  reviewedAt: string | null; reviewNote: string | null; answers: AgriApplicationAnswers;
}
export interface BenefitGrant {
  id: string; kind: BenefitKind; campaignId: string; modelIds: string[];
  totalUsdMicros: string; usedUsdMicros: string; reservedUsdMicros: string;
  availableUsdMicros: string; expiredUsdMicros: string;
  grantedAt: string; expiresAt: string; status: "ACTIVE" | "EXPIRED" | "EXHAUSTED";
}
export interface BenefitActivity {
  requestId: string; modelId: string; state: "RESERVED" | "SETTLED" | "RELEASED";
  reservedUsdMicros: string; actualUsdMicros: string | null; chargedUsdMicros: string | null;
  platformUsdMicros: string | null; createdAt: string; completedAt: string | null;
}
export interface ComputeBenefitsSummary {
  enabled: boolean; questionnaireVersion: typeof ONBOARDING_QUESTIONNAIRE_VERSION;
  applicationVersion: typeof AGRI_APPLICATION_VERSION;
  onboarding: { submittedAt: string } | null; application: BenefitApplication | null;
  grants: BenefitGrant[]; activity: BenefitActivity[];
}
export interface AdminBenefitApplication extends BenefitApplication { userId: string; username: string }
export interface AdminComputeBenefitsStats {
  onboardingUsersCount: number;
  agriApprovedUsersCount: number;
  totalGrantedUsdMicros: string;
  totalUsedUsdMicros: string;
  arcadeParticipantCount: number;
  arcadeTotalPointsGranted: number;
  arcadeAvgPointsPerUser: number;
  estimatedAvgAllAnsPoints: number;
  jackpotHits: {
    spCount: number;
    urCount: number;
    ssrCount: number;
  };
  recentJackpots: Array<{
    username: string;
    rarity: "SP" | "UR" | "SSR" | "SR";
    points: number;
    createdAt: string;
  }>;
}
export interface AdminComputeBenefitsList { enabled: boolean; applications: AdminBenefitApplication[]; stats?: AdminComputeBenefitsStats }
export class ComputeBenefitError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); this.name = "ComputeBenefitError"; }
}
export type PersonalApiRequestView = {
  id: string;
  modelId: string;
  state: "AUTHORIZED" | "RUNNING" | "UNCERTAIN" | "SETTLED" | "RELEASED";
  funding?: "gift" | "paid";
  authorizedPoints: number;
  settledPoints: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};
export type PersonalApiHistory = PersonalApiRequestView[];

