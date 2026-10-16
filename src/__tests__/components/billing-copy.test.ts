import { describe, expect, it } from "vitest";
import { createTranslator } from "use-intl/core";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";
import learningZh from "../../../messages/learning/zh.json";
import learningEn from "../../../messages/learning/en.json";

const cases = [
  { locale: "zh", product: zh, learning: learningZh, recharge: "¥1 = 10 积分", formula: "官方美元费用 × 本次快照汇率 × 10 × 模型消耗倍率", once: "仅应用一次", historic: "原计价快照" },
  { locale: "en", product: en, learning: learningEn, recharge: "CNY 1 = 10 credits", formula: "official USD cost × snapshot USD/CNY exchange rate × 10 × model consumption multiplier", once: "once only", historic: "original pricing snapshot" },
];
describe("billing copy uses distinct USD, CNY and credit units", () => {
  it.each(cases)("keeps the verified conversion formula on all $locale billing surfaces", ({ locale, product, learning, recharge, formula, once, historic }) => {
    const t = createTranslator({ locale, messages: product });
    const copy = [
      t("vouchers.rules", { gpt: 0.16, deepseek: 1 }),
      t("quotaHistory.rules"),
      t("quotaHistory.billingBody"),
      learning.cost,
    ];
    for (const value of copy) {
      expect(value).toContain(recharge);
      expect(value).toContain(formula);
      expect(value).toContain(once);
      expect(value).toContain(historic);
      expect(value.match(/0\.16/g)).toHaveLength(1);
      expect(value).not.toMatch(/1\s*积分.{0,12}(?:\$1|1\s*美元)|(?:each|one) (?:point|credit).{0,30}(?:USD 1|one USD)/i);
    }
    expect(copy[1]).toContain("Opus ×1");
    expect(copy[1]).toContain("DeepSeek ×1");
  });
});