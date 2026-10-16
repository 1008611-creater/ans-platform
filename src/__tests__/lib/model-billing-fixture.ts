/** Synthetic fixture only. FX=0.1 deliberately keeps old numeric assertions
 * comparable; this is not a production exchange rate or model price quote. */
export function fixtureModelBillingPolicy(usdCny = 0.1) {
  const evidence = { source: "https://fixture.invalid/isolated-evidence", observedAt: "2026-10-15T00:00:00Z" };
  const model = (input: number, output: number, consumptionMultiplier: number, procurementMultiplier = 1) => ({
    requestMaxPoints: 1000, consumptionMultiplier, receiptConsumptionMultiplier: consumptionMultiplier, procurementMultiplier,
    reserveRatesUsdPerMillion: { input, output }, priceEvidence: evidence, receiptEvidence: evidence,
  });
  return { version: "isolated-test-only-v2", fx: { usdCny, ...evidence }, models: {
    "deepseek-v4.1-flash": model(0.3, 1.2, 1),
    "gpt-6-astra": model(45, 75, 0.16),
    "gpt-6.1-sol": model(9, 15, 0.16),
    "claude-opus-5-5": model(6, 17, 1, 0.8),
  } };
}
