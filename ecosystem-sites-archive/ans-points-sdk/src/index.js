/** Fixed destination: a project credential must never be forwarded to another origin. */
export const ANS_ORIGIN = 'https://ans.cauai.fun';
const API_PREFIX = '/api/integrations/market/v1/checkouts';
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TIER_ID = /^[A-Za-z0-9_-]{1,60}$/;
const REFERENCE = /^[A-Za-z0-9_-]{8,80}$/;
const STATUSES = new Set(['pending', 'paid', 'refunded', 'disputed', 'cancelled']);
const MESSAGES = {
  INVALID_CONFIGURATION: 'Invalid server-side ANS client configuration.',
  INVALID_INPUT: 'Invalid checkout input.',
  REQUEST_TIMEOUT: 'ANS request timed out. Its outcome is unknown; reuse the original reference.',
  REQUEST_CANCELLED: 'ANS request was cancelled. Its outcome is unknown; reuse the original reference.',
  NETWORK_ERROR: 'ANS request could not be completed. Its outcome is unknown; reuse the original reference.',
  INVALID_RESPONSE: 'ANS returned an invalid receipt. Do not grant access.',
  HTTP_ERROR: 'ANS rejected or could not complete the request.',
};

/** Deliberately excludes response bodies, request URLs, keys and underlying fetch errors. */
export class AnsPointsError extends Error {
  constructor(code, { httpStatus, requestId, uncertain = false, retryable = false } = {}) {
    super(MESSAGES[code] ?? MESSAGES.HTTP_ERROR);
    this.name = 'AnsPointsError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.requestId = requestId;
    this.uncertain = uncertain;
    this.retryable = retryable;
  }
  toJSON() {
    return { name: this.name, code: this.code, httpStatus: this.httpStatus,
      requestId: this.requestId, uncertain: this.uncertain, retryable: this.retryable };
  }
}

const inputError = () => new AnsPointsError('INVALID_INPUT');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nullableId = (value) => value === null || (typeof value === 'string' && ID.test(value));
const safeRequestId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
// Only known public codes are retained. An arbitrary upstream code can contain credentials.
const PUBLIC_CODES = new Set(['INVALID_INPUT', 'INVALID_JSON', 'UNAUTHORIZED', 'FORBIDDEN',
  'NOT_FOUND', 'CONFLICT', 'REFERENCE_CONFLICT', 'INTEGRATION_REVOKED', 'INVALID_RETURN_URL',
  'RETURN_ORIGIN_NOT_ALLOWED', 'LISTING_NOT_AVAILABLE', 'INVALID_TIER', 'TIER_NOT_FOUND',
  'POINTS_ONLY', 'INTERNAL_ERROR', 'RATE_LIMITED', 'INTEGRATION_DISABLED', 'CHECKOUT_NOT_FOUND',
  'IDEMPOTENCY_CONFLICT', 'RETURN_ORIGIN_FORBIDDEN', 'FREE_RESOURCE', 'SERVER_ONLY',
  'INTEGRATION_NOT_CONFIGURED', 'WORKFLOW_RUN_REQUIRED', 'INVALID_LISTING_STATE', 'REQUEST_TOO_LARGE', 'ACCOUNT_UNAVAILABLE']);

function normalizeInput(input) {
  if (!record(input) || Object.keys(input).some((key) => !['reference', 'tierId', 'returnUrl'].includes(key))) throw inputError();
  if (typeof input.reference !== 'string' || !REFERENCE.test(input.reference)) throw inputError();
  if (input.tierId !== undefined && (typeof input.tierId !== 'string' || !TIER_ID.test(input.tierId))) throw inputError();
  if (typeof input.returnUrl !== 'string' || input.returnUrl.trim().length > 1000) throw inputError();
  let url;
  try { url = new URL(input.returnUrl); } catch { throw inputError(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.includes("#") || url.href.length > 1000) throw inputError();
  return Object.freeze({ reference: input.reference, ...(input.tierId === undefined ? {} : { tierId: input.tierId }), returnUrl: url.href });
}

function receipt(data) {
  const bad = () => { throw new AnsPointsError('INVALID_RESPONSE', { uncertain: true }); };
  if (!record(data) || typeof data.id !== 'string' || !ID.test(data.id)
      || typeof data.reference !== 'string' || !REFERENCE.test(data.reference)
      || !STATUSES.has(data.status) || typeof data.pricePoints !== 'number' || !Number.isFinite(data.pricePoints) || data.pricePoints <= 0
      || typeof data.listingId !== 'string' || !ID.test(data.listingId)
      || !Number.isSafeInteger(data.listingVersion) || data.listingVersion < 1
      || !(data.tierId === null || (typeof data.tierId === 'string' && TIER_ID.test(data.tierId))) || !nullableId(data.orderId) || !nullableId(data.ansUserId)
      || typeof data.entitlementActive !== 'boolean'
      || !(data.paidAt === null || (typeof data.paidAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(data.paidAt) && Number.isFinite(Date.parse(data.paidAt))))) bad();
  let url;
  try { url = new URL(data.checkoutUrl); } catch { bad(); }
  if (url.origin !== ANS_ORIGIN || url.username || url.password || url.pathname !== `/market/checkout/${data.id}` || url.search || url.hash) bad();
  if (data.entitlementActive && (data.status !== 'paid' || data.orderId === null || data.ansUserId === null || data.paidAt === null)) bad();
  // Do not spread upstream data: future additions must not silently expose buyer PII.
  return Object.freeze({ id: data.id, reference: data.reference, checkoutUrl: url.href,
    status: data.status, pricePoints: data.pricePoints, listingId: data.listingId,
    listingVersion: data.listingVersion, tierId: data.tierId, orderId: data.orderId,
    paidAt: data.paidAt, entitlementActive: data.entitlementActive, ansUserId: data.ansUserId });
}

/** Node.js server only. Browser bundles must never import a configured client. */
export function createAnsPointsClient(options = {}) {
  if (typeof window !== 'undefined') throw new AnsPointsError('INVALID_CONFIGURATION');
  const { apiKey, timeoutMs = 15000, fetch: transport = globalThis.fetch } = options;
  if (Object.keys(options).some((key) => !['apiKey', 'timeoutMs', 'fetch'].includes(key))
      || typeof apiKey !== 'string' || !/^ansm_[A-Za-z0-9_-]{43}$/.test(apiKey)
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000 || typeof transport !== 'function') {
    throw new AnsPointsError('INVALID_CONFIGURATION');
  }

  async function request(path, method, body, signal) {
    if (signal?.aborted) throw new AnsPointsError('REQUEST_CANCELLED', { uncertain: true });
    const controller = new AbortController();
    let timer;
    let onCancel;
    const interrupted = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AnsPointsError('REQUEST_TIMEOUT', { uncertain: true, retryable: true }));
      }, timeoutMs);
      if (signal) {
        onCancel = () => {
          controller.abort();
          reject(new AnsPointsError('REQUEST_CANCELLED', { uncertain: true }));
        };
        signal.addEventListener('abort', onCancel, { once: true });
      }
    });
    const operation = (async () => {
      let response;
      try {
        response = await transport(`${ANS_ORIGIN}${path}`, {
          method, headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          ...(body === undefined ? {} : { body }), redirect: 'error',
          credentials: 'omit', cache: 'no-store', signal: controller.signal,
        });
      } catch {
        throw new AnsPointsError('NETWORK_ERROR', { uncertain: true, retryable: true });
      }
      let envelope;
      try { envelope = await response.json(); } catch {
        throw new AnsPointsError('INVALID_RESPONSE', { httpStatus: response.status, uncertain: true });
      }
      if (!record(envelope)) throw new AnsPointsError('INVALID_RESPONSE', { uncertain: true });
      const requestId = safeRequestId(envelope.requestId);
      if (!response.ok || envelope.ok !== true) {
        const status = response.status;
        const uncertain = status >= 500 || status === 408 || status === 429 || (response.ok && envelope.ok !== false);
        const code = record(envelope.error) && PUBLIC_CODES.has(envelope.error.code) ? envelope.error.code : 'HTTP_ERROR';
        throw new AnsPointsError(code, { httpStatus: status, requestId, uncertain, retryable: uncertain && (!response.ok) });
      }
      return receipt(envelope.data);
    })();
    try { return await Promise.race([operation, interrupted]); }
    finally { clearTimeout(timer); if (signal && onCancel) signal.removeEventListener('abort', onCancel); }
  }

  return Object.freeze({
    async createCheckout(input, requestOptions = {}) {
      const normalized = normalizeInput(input);
      const { maxAttempts = 1, signal } = requestOptions;
      if (Object.keys(requestOptions).some((key) => !['maxAttempts', 'signal'].includes(key))
          || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw inputError();
      // Serialize exactly once. A retry cannot change reference, return URL or tier.
      const body = JSON.stringify(normalized);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await request(API_PREFIX, 'POST', body, signal);
          if (result.reference !== normalized.reference || result.tierId !== (normalized.tierId ?? null)) {
            throw new AnsPointsError('INVALID_RESPONSE', { uncertain: true });
          }
          return result;
        } catch (error) {
          if (!(error instanceof AnsPointsError) || !error.retryable || attempt === maxAttempts || signal?.aborted) throw error;
        }
      }
      throw new AnsPointsError('NETWORK_ERROR', { uncertain: true });
    },
    async getCheckout(id, { signal } = {}) {
      if (typeof id !== 'string' || !ID.test(id)) throw inputError();
      const result = await request(`${API_PREFIX}/${encodeURIComponent(id)}`, 'GET', undefined, signal);
      if (result.id !== id) throw new AnsPointsError('INVALID_RESPONSE', { uncertain: true });
      return result;
    },
  });
}
