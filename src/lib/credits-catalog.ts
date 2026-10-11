/** Face values approved for the existing LDXP voucher redemption flow. */
export const CREDIT_DENOMINATIONS = [100, 500, 1000, 2000, 5000] as const;
export type CreditDenomination = (typeof CREDIT_DENOMINATIONS)[number];
export type CreditProduct = {
  points: CreditDenomination;
  faceValueYuan: number;
  purchaseUrl: string | null;
};
export const LEGACY_CREDIT_PRODUCT = {
  points: 10,
  faceValueYuan: 1,
  purchaseUrl: "https://wzyp.cn/item/zkm211",
} as const;

/** Configuring a URL is an operator assertion that this exact SKU has been checked.
 * No inference from another product, redirect or amount is performed here. */
function verifiedShopUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== "wzyp.cn" || url.port ||
        url.username || url.password || url.search || url.hash ||
        !/^\/item\/[a-zA-Z0-9_-]+$/.test(url.pathname)) return null;
    return url.href === LEGACY_CREDIT_PRODUCT.purchaseUrl ? null : url.href;
  } catch {
    return null;
  }
}

/** Called by the server with its approved product mapping; returns only public data. */
export function getCreditProducts(environment: Readonly<Record<string, string | undefined>>): CreditProduct[] {
  const products = CREDIT_DENOMINATIONS.map(points => ({
    points,
    faceValueYuan: points / 10,
    purchaseUrl: verifiedShopUrl(environment[`ANS_CREDIT_PRODUCT_${points}_URL`]),
  }));
  // One SKU must never be shown as two different face values.
  return products.map(product => ({ ...product, purchaseUrl: product.purchaseUrl &&
    products.filter(other => other.purchaseUrl === product.purchaseUrl).length === 1
      ? product.purchaseUrl : null }));
}
