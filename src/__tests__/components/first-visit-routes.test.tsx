import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, it, vi } from "vitest";
import zh from "../../../messages/preview/zh.json";
import en from "../../../messages/preview/en.json";
import { FIRST_VISIT_ROUTES, FirstVisitRoutes } from "@/components/homepage/first-visit-routes";

vi.mock("next-intl", async original => await original<typeof import("next-intl")>());
vi.mock("next/link", () => ({ default: (props: ComponentProps<"a">) => <a {...props} /> }));

afterEach(cleanup);

function mount(locale: "zh" | "en", onNavigate = vi.fn()) {
  render(
    <NextIntlClientProvider locale={locale} messages={{ preview: locale === "zh" ? zh : en }}>
      <FirstVisitRoutes onNavigate={onNavigate} />
    </NextIntlClientProvider>,
  );
  return onNavigate;
}

it("五张卡各去一个不同的站内去处，且去处页面真实存在", () => {
  const hrefs = FIRST_VISIT_ROUTES.map(r => r.href);
  expect(hrefs).toHaveLength(5);
  expect(new Set(hrefs).size).toBe(5);
  for (const href of hrefs) {
    expect(href.startsWith("/")).toBe(true);
    const dir = join(process.cwd(), "src/app", href);
    expect(existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "[[...segments]]", "page.tsx"))).toBe(true);
  }
});

it("每张卡是一个链接：一句需求 + 一句结果，点下去通知外层退场", () => {
  const onNavigate = mount("zh");
  const links = within(screen.getByRole("navigation", { name: zh.firstVisit.routes.label })).getAllByRole("link");
  expect(links).toHaveLength(5);
  FIRST_VISIT_ROUTES.forEach(({ key, href }, i) => {
    const copy = zh.firstVisit.routes[key];
    expect(links[i].getAttribute("href")).toBe(href);
    expect(links[i].textContent).toBe(copy.need + copy.result);
  });
  fireEvent.click(links[2]);
  expect(onNavigate).toHaveBeenCalledWith("team");
});

it("卡面结果句与落地页第一眼同词同义", () => {
  const r = zh.firstVisit.routes;
  // 落地页上的原话：/explore 标题「项目广场」+「先看真实效果」；/vibe-hub/courses「边学边做」+ 第一门课「做一个产品官网」；
  // /teams 标题「组队参赛，平台给算力」；/competitions/agrihackathon「农客松」「三大赛道」；/explore/submit「上传我的项目」「审核后公开展示」。
  expect(r.explore.result).toContain("项目广场");
  expect(r.explore.result).toContain("先看真实效果");
  expect(r.learn.result).toContain("边学边做");
  expect(r.learn.result).toContain("做一个产品官网");
  expect(r.team.result).toBe("组队参赛，平台给算力");
  expect(r.compete.result).toContain("农客松");
  expect(r.compete.result).toContain("三大赛道");
  expect(r.publish.result).toContain("审核后公开展示");
});

it("卡面不写会过期的数字和状态，不用禁用词", () => {
  for (const messages of [zh, en]) {
    for (const { key } of FIRST_VISIT_ROUTES) {
      const { need, result } = messages.firstVisit.routes[key];
      expect(`${need}${result}`).not.toMatch(/\d|报名中|进行中|赋能|矩阵|闭环|底座|Pi[ -]?Agent|工作台/);
    }
  }
});

it("中英文案齐全且英文界面不漏中文", () => {
  mount("en");
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(5);
  for (const link of links) {
    expect(link.textContent?.trim()).toBeTruthy();
    expect(link.textContent).not.toMatch(/[一-鿿]/);
  }
});

it("需求句文字不淡于 /70，保证在卡面上对比度达到 4.5:1（axe color-contrast）", () => {
  mount("zh");
  const links = within(screen.getByRole("navigation", { name: zh.firstVisit.routes.label })).getAllByRole("link");
  FIRST_VISIT_ROUTES.forEach(({ key }, i) => {
    const need = within(links[i]).getByText(zh.firstVisit.routes[key].need);
    const alpha = need.className.match(/text-\[#12211C\]\/(\d+)/)?.[1];
    expect(alpha === undefined || Number(alpha) >= 70).toBe(true);
  });
});
