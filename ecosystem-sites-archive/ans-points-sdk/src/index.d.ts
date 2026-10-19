export const ANS_ORIGIN: 'https://ans.cauai.fun';
export type CheckoutStatus = 'pending' | 'paid' | 'refunded' | 'disputed' | 'cancelled';
export interface CheckoutInput {
  reference: string;
  /** 1–60 ASCII letters, digits, underscores or hyphens. Required for tiered listings. */
  tierId?: string;
  /** HTTPS, at most 1000 characters; no credentials or URL fragment. */
  returnUrl: string;
}
export interface CheckoutReceipt {
  readonly id: string;
  readonly reference: string;
  readonly checkoutUrl: string;
  readonly status: CheckoutStatus;
  /** ANS points, not CNY, USD or minor units. */
  readonly pricePoints: number;
  readonly listingId: string;
  readonly listingVersion: number;
  readonly tierId: string | null;
  readonly orderId: string | null;
  readonly paidAt: string | null;
  readonly entitlementActive: boolean;
  /** Stable opaque ANS account identifier; no email, phone or name. */
  readonly ansUserId: string | null;
}
export interface ClientOptions {
  /** Server-only project credential: ansm_ plus exactly 43 base64url characters. */
  apiKey: string;
  timeoutMs?: number;
  /** Optional server-side transport for controlled testing; never browser code. */
  fetch?: typeof globalThis.fetch;
}
export interface CreateRequestOptions { maxAttempts?: 1 | 2 | 3; signal?: AbortSignal }
export interface AnsPointsClient {
  createCheckout(input: CheckoutInput, options?: CreateRequestOptions): Promise<CheckoutReceipt>;
  getCheckout(id: string, options?: { signal?: AbortSignal }): Promise<CheckoutReceipt>;
}
export class AnsPointsError extends Error {
  readonly code: string;
  readonly httpStatus: number | undefined;
  readonly requestId: string | undefined;
  readonly uncertain: boolean;
  readonly retryable: boolean;
  constructor(code: string, options?: { httpStatus?: number; requestId?: string; uncertain?: boolean; retryable?: boolean });
  toJSON(): { name: string; code: string; httpStatus?: number; requestId?: string; uncertain: boolean; retryable: boolean };
}
export function createAnsPointsClient(options: ClientOptions): AnsPointsClient;
