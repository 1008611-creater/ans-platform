import { describe, expect, it } from "vitest";
import { CREDIT_DENOMINATIONS, getCreditProducts, LEGACY_CREDIT_PRODUCT } from "@/lib/credits-catalog";

describe("approved voucher product mappings", () => {
  it("provides the six verified face values while keeping unconfigured larger products unavailable", () => {
    expect(CREDIT_DENOMINATIONS).toEqual([10, 100, 500, 1000, 2000, 5000]);
    expect(getCreditProducts({})).toEqual([{...LEGACY_CREDIT_PRODUCT}, ...[100, 500, 1000, 2000, 5000].map(points => ({ points, faceValueYuan: points / 10, purchaseUrl: null }))]);
  });
  it("only exposes the matching independently configured public SKU", () => {
    expect(getCreditProducts({ ANS_CREDIT_PRODUCT_100_URL: "https://wzyp.cn/item/approved-100" })[1].purchaseUrl).toBe("https://wzyp.cn/item/approved-100");
    expect(getCreditProducts({ ANS_CREDIT_PRODUCT_100_URL: "https://wzyp.cn/item/approved-100" }).slice(2).every(product => product.purchaseUrl === null)).toBe(true);
  });
  it.each([
    "http://wzyp.cn/item/one", "https://wzyp.cn.evil.test/item/one", "https://evil.test/item/one",
    "https://wzyp.cn:444/item/one", "https://user:pass@wzyp.cn/item/one", "https://wzyp.cn/item/one?redirect=other",
    "https://wzyp.cn/item/one#other", "https://wzyp.cn/not-item/one", "https://wzyp.cn/item/one/extra",
    "https://wzyp.cn/item/%2F", "javascript:alert(1)", "not-a-url", LEGACY_CREDIT_PRODUCT.purchaseUrl,
  ])("rejects an unapproved or misleading mapping %s", purchaseUrl => {
    expect(getCreditProducts({ ANS_CREDIT_PRODUCT_100_URL: purchaseUrl })[1].purchaseUrl).toBeNull();
  });
  it("refuses to advertise one product as two different face values", () => {
    const products = getCreditProducts({ ANS_CREDIT_PRODUCT_100_URL: "https://wzyp.cn/item/same", ANS_CREDIT_PRODUCT_500_URL: "https://wzyp.cn/item/same" });
    expect(products.filter(product => product.points !== 10).every(product => product.purchaseUrl === null)).toBe(true);
  });
});
