import type { BetaFeedback } from "./beta-experiment";

export type ExperienceOrderStatus = "processing" | "ready" | "failed";

/** Anonymous, browser-session order metadata. It intentionally contains no prompt, image, or identity data. */
export type ExperienceOrderRecord = {
  id: string;
  jobId: string;
  templateId: string;
  templateTitle: string;
  templateVersion: string;
  shotTitle: string;
  provider: "mock" | "openlux";
  mode: "quick" | "expert";
  status: ExperienceOrderStatus;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  hasOutput: boolean;
  deliveryExpiresAt?: string;
  failureCode?: string;
  feedback?: BetaFeedback;
};

export const SESSION_ORDER_STORAGE_KEY = "zsm-photo-studio:orders:v1";
export const MAX_SESSION_ORDERS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrder(value: unknown): value is ExperienceOrderRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.jobId === "string"
    && typeof value.templateId === "string"
    && typeof value.templateTitle === "string"
    && typeof value.templateVersion === "string"
    && typeof value.shotTitle === "string"
    && (value.provider === "mock" || value.provider === "openlux")
    && (value.mode === "quick" || value.mode === "expert")
    && (value.status === "processing" || value.status === "ready" || value.status === "failed")
    && typeof value.createdAt === "string"
    && typeof value.hasOutput === "boolean";
}

function sanitizeFeedback(value: unknown): BetaFeedback | undefined {
  if (!isRecord(value)) return undefined;
  const feedback: BetaFeedback = {};
  if (value.satisfaction === 1 || value.satisfaction === 2 || value.satisfaction === 3 || value.satisfaction === 4 || value.satisfaction === 5) feedback.satisfaction = value.satisfaction;
  if (value.publishIntent === "yes" || value.publishIntent === "no" || value.publishIntent === "revise") feedback.publishIntent = value.publishIntent;
  if (value.recommendIntent === "yes" || value.recommendIntent === "no") feedback.recommendIntent = value.recommendIntent;
  return Object.keys(feedback).length > 0 ? feedback : undefined;
}

export function readSessionOrders(storage: Pick<Storage, "getItem"> | undefined): ExperienceOrderRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SESSION_ORDER_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isOrder).slice(0, MAX_SESSION_ORDERS).map((item) => ({ ...item, feedback: sanitizeFeedback(item.feedback) }))
      : [];
  } catch {
    return [];
  }
}

export function writeSessionOrders(
  storage: Pick<Storage, "setItem"> | undefined,
  orders: ExperienceOrderRecord[],
): void {
  if (!storage) return;
  const safe = orders.slice(0, MAX_SESSION_ORDERS).map((order) => ({
    id: order.id,
    jobId: order.jobId,
    templateId: order.templateId,
    templateTitle: order.templateTitle,
    templateVersion: order.templateVersion,
    shotTitle: order.shotTitle,
    provider: order.provider,
    mode: order.mode,
    status: order.status,
    createdAt: order.createdAt,
    ...(order.completedAt ? { completedAt: order.completedAt } : {}),
    ...(order.durationMs !== undefined ? { durationMs: order.durationMs } : {}),
    hasOutput: order.hasOutput,
    ...(order.deliveryExpiresAt ? { deliveryExpiresAt: order.deliveryExpiresAt } : {}),
    ...(order.failureCode ? { failureCode: order.failureCode } : {}),
    ...(order.feedback ? { feedback: sanitizeFeedback(order.feedback) } : {}),
  }));
  storage.setItem(SESSION_ORDER_STORAGE_KEY, JSON.stringify(safe));
}
