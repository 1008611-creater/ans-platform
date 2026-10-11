import { describe, expect, it, vi } from "vitest";
import { supportedLocales } from "@/lib/i18n/config";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";

const state = vi.hoisted(() => ({ locale: "zh" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.locale }) }) }));
vi.mock("next-intl/server", () => ({ getRequestConfig: (callback: unknown) => callback }));
import requestConfig from "@/i18n/request";

const namespaces = ["agriOnsite", "agriDemo", "agriArchives"] as const;
const codes = ["AGRI_EDITION_NOT_CONFIGURED", "AGRI_WORKSPACE_NOT_CONFIGURED"] as const;

describe("competition configuration product translation routing", () => {
  it.each(supportedLocales)("%s resolves both configuration errors through the real product loader", async locale => {
    state.locale = locale;
    const config = await requestConfig({ requestLocale: Promise.resolve(locale) });
    const expected = locale === "zh" ? zh : en;
    expect(config.locale).toBe(locale);
    expect(config.messages?.product).toEqual(expected);
    for (const namespace of namespaces) {
      for (const code of codes) {
        const message = expected[namespace].errors[code];
        expect(message.trim()).not.toBe("");
        expect(message).not.toBe(expected[namespace].errors.INTERNAL_ERROR);
      }
    }
  });

  it.each([["zh", zh], ["en", en]] as const)("%s reuses existing configuration copy and preserves the archive workspace wording", (_locale, product) => {
    for (const namespace of namespaces) {
      expect(product[namespace].errors.AGRI_EDITION_NOT_CONFIGURED).toBe(product.agriReviews.errors.AGRI_EDITION_NOT_CONFIGURED);
    }
    for (const namespace of ["agriOnsite", "agriDemo"] as const) {
      expect(product[namespace].errors.AGRI_WORKSPACE_NOT_CONFIGURED).toBe(product.agriReviews.errors.AGRI_WORKSPACE_NOT_CONFIGURED);
    }
    expect(product.agriArchives.errors.AGRI_WORKSPACE_NOT_CONFIGURED).toBe(
      _locale === "zh" ? "本届比赛工作区尚未配置。" : "The competition workspace is not configured.",
    );
  });
});