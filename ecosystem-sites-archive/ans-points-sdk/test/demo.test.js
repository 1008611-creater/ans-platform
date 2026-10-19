import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../examples/server.mjs';

async function running(config, run) {
  const server = createDemoServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function session(base) {
  const response = await fetch(base);
  const body = await response.text();
  return { cookie: response.headers.get('set-cookie').split(';')[0], csrf: body.match(/name="csrf" value="([^"]+)"/)?.[1], body };
}

const sample = (input, patch = {}) => ({ id: 'checkout_demo', reference: input.reference,
  checkoutUrl: 'https://ans.cauai.fun/market/checkout/checkout_demo', status: 'pending',
  listingId: 'listing_demo', listingVersion: 1, tierId: 'pro', pricePoints: 10,
  entitlementActive: false, ansUserId: null, orderId: null, paidAt: null, ...patch });
const configured = (client) => ({ appOrigin: 'https://example.com', client,
  listingId: 'listing_demo', tierId: 'pro', pricePoints: 10 });
async function post(base, path, auth, origin = 'https://example.com') {
  return fetch(base + path, { method: 'POST', headers: { origin, cookie: auth.cookie,
    'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: auth.csrf ?? '' }), redirect: 'manual' });
}

test('unconfigured demo starts and does not initiate real ANS requests', async () => {
  await running({}, async (base) => {
    const { body } = await session(base);
    assert.match(body, /尚未配置/);
    assert.match(body, /内存演示会话/);
    assert.doesNotMatch(body, /ansm_/);
  });
});

test('requires HTTPS for remote demo and exact configured origin for CSRF', async () => {
  assert.throws(() => createDemoServer({ appOrigin: 'http://example.com' }), /HTTPS/);
  let calls = 0;
  await running(configured({ createCheckout: async () => { calls++; } }), async (base) => {
    const auth = await session(base);
    assert.equal((await post(base, '/checkout', auth, 'https://evil.example')).status, 403);
    assert.equal((await post(base, '/checkout', { ...auth, csrf: 'invalid' })).status, 403);
    assert.equal(calls, 0);
  });
});

test('duplicate checkout posts and unknown outcomes retain same local account-bound reference', async () => {
  const inputs = [];
  const sdk = { createCheckout: async (input) => {
    inputs.push(input);
    if (inputs.length === 1) throw new Error('upstream-secret-that-must-not-render');
    return sample(input);
  } };
  await running(configured(sdk), async (base) => {
    const auth = await session(base);
    const first = await post(base, '/checkout', auth);
    assert.equal(first.status, 503);
    assert.doesNotMatch(await first.text(), /upstream-secret-that-must-not-render/);
    const second = await post(base, '/checkout', auth);
    assert.equal(second.status, 303);
    assert.equal(second.headers.get('location'), 'https://ans.cauai.fun/market/checkout/checkout_demo');
    assert.deepEqual(inputs[0], inputs[1]);
    assert.equal(new URL(inputs[0].returnUrl).origin, 'https://example.com');
  });
});

test('return query cannot grant access; verification grants once and refund immediately suspends', async () => {
  let original;
  let status = 'pending';
  let reads = 0;
  const sdk = { createCheckout: async (input) => { original = input; return sample(input); },
    getCheckout: async () => { reads++; return sample(original, { status, entitlementActive: status === 'paid',
      ansUserId: status === 'pending' ? null : 'opaque_demo', orderId: status === 'pending' ? null : 'order_demo',
      paidAt: status === 'pending' ? null : '2026-10-12T12:00:00.000Z' }); } };
  await running(configured(sdk), async (base) => {
    const auth = await session(base);
    await post(base, '/checkout', auth);
    const callback = await fetch(base + '/return?status=paid&orderId=forged', { headers: { cookie: auth.cookie } });
    assert.equal(callback.status, 200);
    assert.equal(reads, 0);
    assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 403);
    status = 'paid';
    for (let i = 0; i < 2; i++) assert.equal((await post(base, '/verify', auth)).status, 200);
    assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 200);
    status = 'refunded';
    assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 403);
    const other = await session(base);
    const stolen = await fetch(base + `/return?reference=${original.reference}`, { headers: { cookie: other.cookie } });
    assert.equal(stolen.status, 403);
  });
});

test('wrong listing/price/identity and unknown authority fail closed', async () => {
  let original;
  let patch = { listingId: 'different' };
  const sdk = { createCheckout: async (input) => { original = input; return sample(input); },
    getCheckout: async () => sample(original, { status: 'paid', entitlementActive: true,
      ansUserId: 'opaque_demo', orderId: 'order_demo', paidAt: '2026-10-12T12:00:00.000Z', ...patch }) };
  await running(configured(sdk), async (base) => {
    const auth = await session(base);
    await post(base, '/checkout', auth);
    for (const next of [{ listingId: 'different' }, { pricePoints: 1 }, { tierId: 'other' }]) {
      patch = next;
      assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 503);
    }
    patch = {};
    assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 200);
    patch = { ansUserId: 'swapped_opaque' };
    assert.equal((await fetch(base + '/protected', { headers: { cookie: auth.cookie } })).status, 503);
  });
});

test('form CSP permits only the fixed ANS redirect source and its own origin', async () => {
  await running(configured({ createCheckout: async input => sample(input) }), async base => {
    const home = await fetch(base);
    const csp = home.headers.get('content-security-policy');
    assert.match(csp, /form-action 'self' https:\/\/ans\.cauai\.fun;/);
    assert.doesNotMatch(csp, /form-action[^;]*\*/);
    assert.match(csp, /base-uri 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
  });
});
