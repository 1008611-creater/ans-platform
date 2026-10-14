import type { ModelJobStage } from "@/contracts/visual-generation";
export const STAGE_PROGRESS: Record<ModelJobStage, number> = { queued: 0, upload: 10, submit: 20, wait: 35, download: 80, persist: 95 };
const stages: ModelJobStage[] = ["queued", "upload", "submit", "wait", "download", "persist"];
/** Never step back across a provider submission. A lost submission is reviewed, not retried. */
export function canAdvanceStage(from: ModelJobStage, to: ModelJobStage): boolean { return stages.indexOf(to) === stages.indexOf(from) || stages.indexOf(to) === stages.indexOf(from) + 1; }
export function safeToRetry(stage: ModelJobStage, providerTaskId: string | null): boolean { return !providerTaskId && ["queued", "upload"].includes(stage); }
export function canRefund(stage: ModelJobStage, providerTaskId: string | null): boolean { return safeToRetry(stage, providerTaskId); }
