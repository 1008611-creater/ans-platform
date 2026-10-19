import { createAnsPointsClient, AnsPointsError, type CheckoutReceipt } from '../src/index.js';
const client = createAnsPointsClient({ apiKey: '<server-only-key>' });
async function typeContract() {
  const receipt: CheckoutReceipt = await client.createCheckout({ reference: 'local_order_001', returnUrl: 'https://example.com/return', tierId: 'pro' }, { maxAttempts: 2 });
  const version: number = receipt.listingVersion;
  const status: 'pending' | 'paid' | 'refunded' | 'disputed' | 'cancelled' = receipt.status;
  await client.getCheckout(receipt.id);
  return { version, status };
}
void typeContract;
const failure = new AnsPointsError('NETWORK_ERROR', { uncertain: true });
const uncertain: boolean = failure.uncertain;
void uncertain;
// @ts-expect-error amount cannot override the ANS published tier price
void client.createCheckout({ reference: 'local_order_001', returnUrl: 'https://example.com/return', amount: 1 });
// @ts-expect-error buyer identity must be bound by authenticated ANS checkout
void client.createCheckout({ reference: 'local_order_001', returnUrl: 'https://example.com/return', userId: 'other' });
// @ts-expect-error custom credential destination is unsupported
void createAnsPointsClient({ apiKey: '<server-only-key>', baseUrl: 'https://other.example' });
