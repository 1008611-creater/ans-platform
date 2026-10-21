import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorkbenchOnboardingModal, markWorkbenchOnboardingSeen, readWorkbenchOnboardingSeen } from "@/components/workspace/workbench-onboarding-modal";
import workbenchMessages from "../../../messages/workbench/zh.json";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const source: unknown = namespace === "workbench" ? workbenchMessages : {};
    const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source);
    const t = (key: string, values?: Record<string, string | number>) => {
      let result = String(lookup(key) ?? key);
      for (const [name, value] of Object.entries(values ?? {})) result = result.split("{" + name + "}").join(String(value));
      return result;
    };
    t.has = (key: string) => typeof lookup(key) === "string";
    return t;
  },
}));

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { cleanup(); window.localStorage.clear(); });

const samples = [{ id: "s1", title: "🌾 农田温湿度监测看板", artifactFile: "agri-digital-twin-dashboard.html" }];

it("首次进入展示 3 步引导与参考范例", () => {
  render(<WorkbenchOnboardingModal open actorId="member" samples={samples} onOpenChange={() => {}} />);
  expect(screen.getByTestId("workbench-onboarding-modal")).toBeTruthy();
  expect(screen.getByText(workbenchMessages.onboarding.title)).toBeTruthy();
  expect(screen.getByText(workbenchMessages.onboarding.step1Title)).toBeTruthy();
  expect(screen.getByText(workbenchMessages.onboarding.step3Title)).toBeTruthy();
  expect(screen.getByText(workbenchMessages.onboarding.samplesTitle)).toBeTruthy();
  expect(screen.getByRole("button", { name: samples[0].title })).toBeTruthy();
});

it("点「开始使用」后记住已看过，并按账号隔离", () => {
  const onOpenChange = vi.fn();
  render(<WorkbenchOnboardingModal open actorId="member" samples={samples} onOpenChange={onOpenChange} />);
  expect(readWorkbenchOnboardingSeen("member")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: workbenchMessages.onboarding.done }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(readWorkbenchOnboardingSeen("member")).toBe(true);
  expect(readWorkbenchOnboardingSeen("other")).toBe(false);
});

it("勾掉「以后不再自动弹出」后不再写入已看过标记", () => {
  const onOpenChange = vi.fn();
  render(<WorkbenchOnboardingModal open actorId="member" samples={samples} onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: workbenchMessages.onboarding.done }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(readWorkbenchOnboardingSeen("member")).toBe(false);
});

it("选范例会带着 id 回调并关闭弹窗", () => {
  const onOpenChange = vi.fn();
  const onPickSample = vi.fn();
  render(<WorkbenchOnboardingModal open actorId="member" samples={samples} onOpenChange={onOpenChange} onPickSample={onPickSample} />);
  fireEvent.click(screen.getByRole("button", { name: samples[0].title }));
  expect(onPickSample).toHaveBeenCalledWith("s1");
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(readWorkbenchOnboardingSeen("member")).toBe(true);
});

it("标记写入失败时不应抛出（隐私模式 localStorage 被禁）", () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(() => markWorkbenchOnboardingSeen("member")).not.toThrow();
  setItem.mockRestore();
});
