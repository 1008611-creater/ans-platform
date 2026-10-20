import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoAdoptionPod } from "@/components/mascot/dino-adoption-pod";
import companionZh from "../../../messages/companion/zh.json";
import companionEn from "../../../messages/companion/en.json";

let locale: "zh" | "en" = "zh";

vi.mock("next-intl", () => ({
  useLocale: () => locale,
  useTranslations: (namespace: string) => {
    const source = namespace === "companion" ? (locale === "zh" ? companionZh : companionEn) : {};
    const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => (value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined), source);
    const t = (key: string, values?: Record<string, string | number>) => {
      let result = String(lookup(key) ?? key);
      for (const [name, value] of Object.entries(values ?? {})) result = result.split("{" + name + "}").join(String(value));
      return result;
    };
    t.has = (key: string) => typeof lookup(key) === "string";
    return t;
  },
}));

afterEach(() => { cleanup(); locale = "zh"; });

it("renders the adoption pod copy in English without hardcoded Chinese", () => {
  locale = "en";
  render(<DinoAdoptionPod compact />);
  expect(screen.getByLabelText(companionEn.adopt.panelAriaLabel)).toBeTruthy();
  expect(screen.queryByLabelText(companionZh.adopt.panelAriaLabel)).toBeNull();
  expect(screen.getByText(new RegExp(companionEn.adopt.pickTitle))).toBeTruthy();
});

it("renders the adoption pod copy in Chinese for zh", () => {
  locale = "zh";
  render(<DinoAdoptionPod compact />);
  expect(screen.getByLabelText(companionZh.adopt.panelAriaLabel)).toBeTruthy();
  expect(screen.queryByLabelText(companionEn.adopt.panelAriaLabel)).toBeNull();
});
