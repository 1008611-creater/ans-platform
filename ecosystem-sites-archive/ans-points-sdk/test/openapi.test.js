import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const api = JSON.parse(await readFile(new URL('../openapi.json', import.meta.url), 'utf8'));

test('OpenAPI describes the actual fixed routes, auth and envelope', () => {
  assert.equal(api.openapi, '3.1.0');
  assert.deepEqual(api.servers, [{ url: 'https://ans.cauai.fun' }]);
  assert.equal(api.components.securitySchemes.MerchantBearer.scheme, 'bearer');
  assert.deepEqual(Object.keys(api.paths).sort(), [
    '/api/integrations/market/v1/checkouts', '/api/integrations/market/v1/checkouts/{id}',
  ]);
  assert.equal(api.components.schemas.ReceiptEnvelope.properties.ok.const, true);
  assert.equal(api.components.schemas.ErrorEnvelope.properties.ok.const, false);
  assert.equal(api.components.schemas.CheckoutInput.additionalProperties, false);
  assert.deepEqual(Object.keys(api.components.schemas.CheckoutInput.properties).sort(), ['reference', 'returnUrl', 'tierId']);
  assert.equal(api.components.schemas.CheckoutReceipt.properties.listingVersion.type, 'integer');
  assert.deepEqual(api.components.schemas.CheckoutReceipt.properties.status.enum, ['pending', 'paid', 'refunded', 'disputed', 'cancelled']);
});

test('OpenAPI local references resolve and receipt exposes only the specified fields', () => {
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string') {
      assert.ok(value.$ref.startsWith('#/'));
      let resolved = api;
      for (const part of value.$ref.slice(2).split('/')) resolved = resolved?.[part.replaceAll('~1', '/').replaceAll('~0', '~')];
      assert.ok(resolved, `Unresolved local reference ${value.$ref}`);
    }
    for (const item of Object.values(value)) walk(item);
  }
  walk(api);
  const properties = api.components.schemas.CheckoutReceipt.properties;
  assert.deepEqual(Object.keys(properties).sort(), ['id', 'reference', 'checkoutUrl', 'status', 'pricePoints', 'listingId', 'listingVersion', 'tierId', 'orderId', 'paidAt', 'entitlementActive', 'ansUserId'].sort());
  assert.deepEqual(api.components.schemas.CheckoutReceipt.required.sort(), Object.keys(properties).sort());
  assert.equal(api.components.schemas.CheckoutReceipt.additionalProperties, false);
  assert.ok(new RegExp(properties.checkoutUrl.pattern).test('https://ans.cauai.fun/market/checkout/id_001'));
  assert.ok(!new RegExp(properties.checkoutUrl.pattern).test('https://ansxcauai.fun/market/checkout/id_001'));
});

test('OpenAPI input constraints match the backend tier and safe return URL contract', () => {
  const input = api.components.schemas.CheckoutInput.properties;
  assert.equal(input.tierId.maxLength, 60);
  assert.ok(new RegExp(input.tierId.pattern).test('a'.repeat(60)));
  assert.ok(!new RegExp(input.tierId.pattern).test('a'.repeat(61)));
  assert.equal(input.returnUrl.maxLength, 1000);
  assert.ok(!new RegExp(input.returnUrl.pattern).test('https://example.com/#paid'));
  assert.ok(!new RegExp(input.returnUrl.pattern).test('https://user:pass@example.com/return'));
  assert.ok(new RegExp(input.returnUrl.pattern).test('https://example.com/return?email=a@b.com'));
  assert.match(api.components.securitySchemes.MerchantBearer.description, /43/);
});

test('OpenAPI success status and bounded request errors match the real endpoints', () => {
  const post = api.paths['/api/integrations/market/v1/checkouts'].post.responses;
  const get = api.paths['/api/integrations/market/v1/checkouts/{id}'].get.responses;
  assert.ok(post['201']); assert.equal(post['200'], undefined);
  assert.ok(get['200']); assert.equal(get['201'], undefined);
  for (const code of ['413', '415', '503']) assert.ok(post[code]);
  assert.ok(get['503']);
});
