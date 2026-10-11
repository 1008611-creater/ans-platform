import type { AgriStageDetail } from "./agri-submissions";

export type AgriPhaseName = "REGISTRATION" | "PRELIMINARY" | "FINAL";
export interface AgriPhaseWindow {
  stage: AgriPhaseName; state: AgriStageDetail["windowState"];
  opensAt: string | null; closesAt: string | null; includesDeadline: boolean | null;
}
export interface AgriPhaseTeam {
  id: string; teamId: string; teamName: string; role: string;
  finalist: NonNullable<AgriStageDetail["finalEligibility"]>["state"];
  stages: Array<{ id: string; stage: "PRELIMINARY" | "FINAL"; sequence: number | null; acceptedAt: string | null; frozen: boolean }>;
}
export interface AgriCompetitionPhaseView {
  competitionId: string; title: string; organizer: string | null;
  configuration: "READY" | "DISABLED" | "UNBOUND" | "WORKSPACE_PENDING" | "RULES_PENDING" | "UNAVAILABLE";
  serverNow: string; rule: { version: number; guidanceMarkdown: string } | null;
  windows: AgriPhaseWindow[];
  viewer: { available: boolean; teams: Array<{ id: string; name: string; slug: string; role: string }>; entries: AgriPhaseTeam[] } | null;
}