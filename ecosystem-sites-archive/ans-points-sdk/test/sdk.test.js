import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createAnsPointsClient, AnsPointsError, ANS_ORIGIN } from '../src/index.js';
const key = `ansm_${randomBytes(32).toString('base64url')}`;
const input = { reference: 'order_reference_001', tierId: 'pro', returnUrl: 'https://example.com/return?reference=order_reference_001' };
const receipt = (patch = {}) => ({ id: 'checkout_001', reference: input.reference,
  checkoutUrl: `${ANS_ORIGIN}/market/checkout/checkout_001`, status: 'pending',
  pricePoints: 10, listingId: 'listing_001', listingVersion: 1, tierId: 'pro',
  orderId: null, paidAt: null, entitlementActive: false, ansUserId: null, ...patch });
const response = (data = receipt(), status = 200) => new Response(JSON.stringify({ ok: true, data, requestId: 'request_test_001' }), { status });
const failure = (status, code = 'INTERNAL_ERROR', message = 'private detail') => new Response(JSON.stringify({ ok: false, error: { code, message }, requestId: 'request_test_001' }), { status });
const client = (fetch, options = {}) => createAnsPointsClient({ apiKey: key, fetch, ...options });

async function rejectsCode(promise, code, uncertain) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof AnsPointsError);
    assert.equal(error.code, code);
    if (uncertain !== undefined) assert.equal(error.uncertain, uncertain);
    return true;
  });
}

test('server client uses only the fixed HTTPS origin and safe fetch settings', async () => {
  let call;
  const sdk = client(async (...args) => { call = args; return response(); });
  const actual = await sdk.createCheckout(input);
  assert.equal(call[0], `${ANS_ORIGIN}/api/integrations/market/v1/checkouts`);
  assert.equal(call[1].headers.Authorization, `Bearer ${key}`);
  assert.equal(call[1].headers['Content-Type'], 'application/json');
  assert.equal(call[1].redirect, 'error');
  assert.equal(call[1].credentials, 'omit');
  assert.equal(call[1].cache, 'no-store');
  assert.deepEqual(JSON.parse(call[1].body), input);
  assert.equal(actual.pricePoints, 10);
  assert.ok(Object.isFrozen(actual));
});

test('getCheckout sends no body or content-type, verifies queried receipt identity', async () => {
  let call;
  const sdk = client(async (...args) => { call = args; return response(); });
  await sdk.getCheckout('checkout_001');
  assert.equal(call[0], `${ANS_ORIGIN}/api/integrations/market/v1/checkouts/checkout_001`);
  assert.equal(call[1].method, 'GET');
  assert.equal(call[1].body, undefined);
  assert.equal(call[1].headers['Content-Type'], undefined);
  await rejectsCode(sdk.getCheckout('checkout_other'), 'INVALID_RESPONSE', true);
});

test('rejects custom API origin instead of forwarding a project secret', () => {
  assert.throws(() => createAnsPointsClient({ apiKey: key, baseUrl: 'https://evil.example' }), { code: 'INVALID_CONFIGURATION' });
});

test('rejects empty/malformed keys without rendering the secret in errors', () => {
  for (const apiKey of ['', 'client-secret-value', `${key}\n`]) {
    assert.throws(() => createAnsPointsClient({ apiKey }), (error) => {
      assert.equal(error.code, 'INVALID_CONFIGURATION');
      assert.ok(!String(error).includes(key));
      assert.ok(!String(error).includes('client-secret-value'));
      return true;
    });
  }
});

test('rejects use in a browser', () => {
  globalThis.window = {};
  try { assert.throws(() => createAnsPointsClient({ apiKey: key }), { code: 'INVALID_CONFIGURATION' }); }
  finally { delete globalThis.window; }
});

test('rejects client controlled amount/user, short reference, unsafe URLs and invalid tier before transport', async () => {
  let calls = 0;
  const sdk = client(async () => { calls++; return response(); });
  for (const bad of [{ ...input, amount: 1 }, { ...input, userId: 'victim' },
    { ...input, reference: 'short' }, { ...input, reference: 'invalid reference' },
    { ...input, reference: 'a'.repeat(81) }, { ...input, tierId: '../other' },
    { ...input, tierId: null }, { ...input, returnUrl: 'http://example.com' },
    { ...input, returnUrl: 'javascript:alert(1)' }, { ...input, returnUrl: 'https://user:pass@example.com/' }]) {
    await rejectsCode(sdk.createCheckout(bad), 'INVALID_INPUT', false);
  }
  await rejectsCode(sdk.getCheckout('../outside'), 'INVALID_INPUT', false);
  assert.equal(calls, 0);
});

test('legacy default tier omits tierId in body and expects null in receipt', async () => {
  const { tierId: _, ...legacyInput } = input;
  const sdk = client(async (_, init) => {
    assert.equal(Object.hasOwn(JSON.parse(init.body), 'tierId'), false);
    return response(receipt({ tierId: null }));
  });
  assert.equal((await sdk.createCheckout(legacyInput)).tierId, null);
});

test('strips all non-contract data including buyer email/name/phone', async () => {
  const actual = await client(async () => response(receipt({ email: 'private@example.com', phone: 'private', name: 'private' }))).createCheckout(input);
  assert.equal(Object.hasOwn(actual, 'email'), false);
  assert.equal(Object.hasOwn(actual, 'phone'), false);
  assert.equal(Object.hasOwn(actual, 'name'), false);
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(receipt()).sort());
});

test('valid paid, refunded, disputed and cancelled receipts are authoritative', async () => {
  const paid = { orderId: 'order_001', paidAt: '2026-10-12T12:00:00.000Z', ansUserId: 'opaque_001' };
  for (const status of ['paid', 'refunded', 'disputed', 'cancelled']) {
    const result = await client(async () => response(receipt({ ...paid, status, entitlementActive: status === 'paid' }))).getCheckout('checkout_001');
    assert.equal(result.entitlementActive, status === 'paid');
    assert.equal(result.paidAt, paid.paidAt);
  }
});

test('rejects non-authoritative or malformed receipt fields', async () => {
  const invalid = [{ listingVersion: '1' }, { listingVersion: 0 }, { pricePoints: -1 },
    { pricePoints: '10' }, { pricePoints: 0 }, { tierId: undefined }, { paidAt: 'yesterday' },
    { status: 'paid', entitlementActive: true }, { status: 'refunded', entitlementActive: true },
    { status: 'unknown' }, { checkoutUrl: 'https://evil.example/market/checkout/checkout_001' },
    { checkoutUrl: `${ANS_ORIGIN}/market/checkout/other` },
    { checkoutUrl: `${ANS_ORIGIN}/market/checkout/checkout_001?private=secret` }];
  for (const patch of invalid) await rejectsCode(client(async () => response(receipt(patch))).getCheckout('checkout_001'), 'INVALID_RESPONSE', true);
});

test('create validates reference and tier against submitted immutable body', async () => {
  for (const patch of [{ reference: 'other_reference' }, { tierId: 'other' }]) {
    await rejectsCode(client(async () => response(receipt(patch))).createCheckout(input), 'INVALID_RESPONSE', true);
  }
});

test('confirmed 4xx business rejection is not retried', async () => {
  let calls = 0;
  const sdk = client(async () => { calls++; return failure(409, 'REFERENCE_CONFLICT', key); });
  await rejectsCode(sdk.createCheckout(input, { maxAttempts: 3 }), 'REFERENCE_CONFLICT', false);
  assert.equal(calls, 1);
});

test('unknown 5xx result retries exactly the same serialized reference/body', async () => {
  const bodies = [];
  const sdk = client(async (_, init) => {
    bodies.push(init.body);
    return bodies.length === 1 ? failure(503) : response();
  });
  await sdk.createCheckout(input, { maxAttempts: 2 });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
});

test('input mutations during the first attempt cannot change the retry', async () => {
  const mutable = { ...input };
  const bodies = [];
  const sdk = client(async (_, init) => {
    bodies.push(init.body);
    if (bodies.length === 1) { mutable.reference = 'changed_reference'; mutable.tierId = 'other'; return failure(500); }
    return response();
  });
  await sdk.createCheckout(mutable, { maxAttempts: 2 });
  assert.equal(bodies[0], bodies[1]);
});

test('retry is opt in, bounded, and invalid attempt count never sends', async () => {
  let calls = 0;
  const sdk = client(async () => { calls++; throw new Error('untrusted fetch failure'); });
  await rejectsCode(sdk.createCheckout(input), 'NETWORK_ERROR', true);
  assert.equal(calls, 1);
  for (const maxAttempts of [0, 4, 1.5]) await rejectsCode(sdk.createCheckout(input, { maxAttempts }), 'INVALID_INPUT');
  assert.equal(calls, 1);
});

test('fetch errors, response messages/codes and response request IDs cannot expose credentials', async () => {
  const attempts = [
    client(async () => { throw new Error(`Authorization Bearer ${key} URL https://example.com/?secret=private-query`); }),
    client(async () => failure(500, key, key)),
    client(async () => new Response(JSON.stringify({ ok: false, error: { code: 'INTERNAL_ERROR', message: key }, requestId: key }), { status: 500 })),
    client(async () => new Response(key, { status: 200 })),
  ];
  for (const sdk of attempts) {
    await assert.rejects(sdk.createCheckout(input), (error) => {
      for (const rendered of [String(error), error.stack, JSON.stringify(error), JSON.stringify(error.toJSON())]) {
        assert.ok(!rendered.includes(key));
        assert.ok(!rendered.includes('private-query'));
      }
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('timeout aborts even an uncooperative transport and preserves unknown outcome', async () => {
  let signal;
  const sdk = client(async (_, init) => { signal = init.signal; return new Promise(() => {}); }, { timeoutMs: 10 });
  await rejectsCode(sdk.createCheckout(input), 'REQUEST_TIMEOUT', true);
  assert.equal(signal.aborted, true);
});

test('timeout covers reading the response body', async () => {
  const sdk = client(async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }), { timeoutMs: 10 });
  await rejectsCode(sdk.createCheckout(input), 'REQUEST_TIMEOUT', true);
});

test('timeout retries reuse exact reference, returnUrl and tier', async () => {
  const calls = [];
  const sdk = client(async (_, init) => {
    calls.push(init.body);
    return calls.length === 1 ? new Promise(() => {}) : response();
  }, { timeoutMs: 10 });
  await sdk.createCheckout(input, { maxAttempts: 2 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1]);
});

test('external cancellation stops retry and keeps outcome unknown', async () => {
  const controller = new AbortController();
  let calls = 0;
  const sdk = client(async () => { calls++; controller.abort(); return new Promise(() => {}); });
  await rejectsCode(sdk.createCheckout(input, { signal: controller.signal, maxAttempts: 3 }), 'REQUEST_CANCELLED', true);
  assert.equal(calls, 1);
});

test('pre-aborted request sends nothing', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const sdk = client(async () => { calls++; return response(); });
  await rejectsCode(sdk.createCheckout(input, { signal: controller.signal }), 'REQUEST_CANCELLED', true);
  assert.equal(calls, 0);
});

test('redirect/fetch rejection does not authorize or silently change credential destination', async () => {
  let origin;
  const sdk = client(async (url, init) => {
    origin = new URL(url).origin;
    assert.equal(init.redirect, 'error');
    throw new TypeError('redirect rejected');
  });
  await rejectsCode(sdk.createCheckout(input), 'NETWORK_ERROR', true);
  assert.equal(origin, ANS_ORIGIN);
});

test('uses actual ok envelope, rejects outdated success envelope', async () => {
  const sdk = client(async () => new Response(JSON.stringify({ success: true, data: receipt() }), { status: 200 }));
  await rejectsCode(sdk.createCheckout(input), 'HTTP_ERROR', true);
});

test('project keys require the actual 43-character base64url credential shape', () => {
  for (const length of [24, 42, 44, 64, 256]) assert.throws(() => createAnsPointsClient({ apiKey: `ansm_${'a'.repeat(length)}` }), { code: 'INVALID_CONFIGURATION' });
  assert.doesNotThrow(() => createAnsPointsClient({ apiKey: `ansm_${'a'.repeat(43)}` }));
});

test('tier boundary matches backend 60 characters and rejects longer IDs before transport', async () => {
  let calls = 0;
  const sdk = client(async (_, init) => { calls++; return response(receipt({ tierId: JSON.parse(init.body).tierId })); });
  const tierId = 'a'.repeat(60);
  assert.equal((await sdk.createCheckout({ ...input, tierId })).tierId, tierId);
  await rejectsCode(sdk.createCheckout({ ...input, tierId: 'a'.repeat(61) }), 'INVALID_INPUT', false);
  assert.equal(calls, 1);
  await rejectsCode(client(async () => response(receipt({ tierId: 'a'.repeat(61) }))).getCheckout('checkout_001'), 'INVALID_RESPONSE', true);
});

test('return URL boundary matches 1000 characters and forbids fragments before transport', async () => {
  const prefix = 'https://example.com/return?q=';
  let calls = 0;
  const sdk = client(async () => { calls++; return response(); });
  const returnUrl = prefix + 'a'.repeat(1000 - prefix.length);
  await sdk.createCheckout({ ...input, returnUrl });
  for (const invalid of [returnUrl + 'a', input.returnUrl + '#status=paid', input.returnUrl + '#']) await rejectsCode(sdk.createCheckout({ ...input, returnUrl: invalid }), 'INVALID_INPUT', false);
  assert.equal(calls, 1);
});

test('actual stable backend business codes survive safe error mapping without automatic 4xx retry', async () => {
  for (const [status, code] of [[409, 'IDEMPOTENCY_CONFLICT'], [400, 'RETURN_ORIGIN_FORBIDDEN'], [400, 'FREE_RESOURCE'], [403, 'SERVER_ONLY'], [403, 'ACCOUNT_UNAVAILABLE'], [413, 'REQUEST_TOO_LARGE'], [409, 'INVALID_LISTING_STATE'], [409, 'WORKFLOW_RUN_REQUIRED']]) {
    let calls = 0;
    const sdk = client(async () => { calls++; return failure(status, code, key); });
    await rejectsCode(sdk.createCheckout(input, { maxAttempts: 3 }), code, false);
    assert.equal(calls, 1);
  }
  await rejectsCode(client(async () => failure(503, 'INTEGRATION_NOT_CONFIGURED')).createCheckout(input), 'INTEGRATION_NOT_CONFIGURED', true);
});

test('a claimed unpaid order ID never implies an active purchase entitlement', async () => {
  const actual = await client(async () => response(receipt({ orderId: 'unpaid_order', ansUserId: 'claimed_user' }))).getCheckout('checkout_001');
  assert.equal(actual.orderId, 'unpaid_order'); assert.equal(actual.paidAt, null); assert.equal(actual.entitlementActive, false);
});
