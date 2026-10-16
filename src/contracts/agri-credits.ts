import { z } from "zod";
const id = z.string().trim().min(1).max(80);
export const agriCreditsQuerySchema = z.object({ teamCompetitionId: id }).strict();
export const agriCreditsClaimSchema = agriCreditsQuerySchema.extend({ action: z.literal("claim") }).strict();
export interface AgriTeamCredits {
  competitionId: string;
  teamCompetitionId: string;
  state: "UNCONFIGURED" | "AVAILABLE" | "GRANTED";
  amount: number;
  used: number;
  remaining: number;
  canClaim: boolean;
  spendingEnabled: boolean;
}
