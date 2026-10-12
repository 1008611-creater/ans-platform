/** Legacy consumer routes have no durable ANS quote/settlement integration.
 * Configuring an upstream key must not bypass the site's authoritative points ledger.
 */
export function blockUnmeteredConsumerAI(): Response | null {
  if (process.env.ANS_UNIFIED_POINTS_ENABLED !== "1") return null;
  return Response.json({ error: "POINTS_INTEGRATION_REQUIRED" }, {
    status: 503, headers: { "Cache-Control": "private, no-store" },
  });
}
