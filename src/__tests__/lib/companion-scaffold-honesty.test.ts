// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { project: { create: mocks.create } } }));

import { scaffoldProjectDraftViaPi } from "@/server/companion/pi-agent";

beforeEach(() => { vi.resetAllMocks(); mocks.create.mockResolvedValue({ id: "proj_1", title: "智慧温室环境监测" }); });

it("asks for a topic instead of creating a project from a preset topic", async () => {
  const result = await scaffoldProjectDraftViaPi("alice", "   ");
  expect(result.ok).toBe(false);
  expect(result.error).toBe("TOPIC_REQUIRED");
  expect(result.replyZh).toContain("主题");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("never writes Agent-generated guesses as CONFIRMED facts", async () => {
  const result = await scaffoldProjectDraftViaPi("alice", "智慧温室环境监测");
  expect(result.ok).toBe(true);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  const facts = mocks.create.mock.calls[0][0].data.facts.create as { confirmation: string }[];
  expect(facts).toHaveLength(2);
  expect(facts.map(fact => fact.confirmation)).toEqual(["UNCONFIRMED", "UNCONFIRMED"]);
  const title = mocks.create.mock.calls[0][0].data.title as string;
  expect(title).toBe("智慧温室环境监测");
});

it("returns English siblings for every link so the English UI never shows Chinese cards", async () => {
  const result = await scaffoldProjectDraftViaPi("alice", "智慧温室环境监测");
  expect(result.links.length).toBeGreaterThan(0);
  for (const link of result.links) {
    expect(link.titleEn, `${link.href} 缺少 titleEn`).toBeTruthy();
    expect(link.detailEn, `${link.href} 缺少 detailEn`).toBeTruthy();
    // 英文必须与中文原文不同：相同就说明只是把中文抄了一遍。
    expect(link.titleEn).not.toBe(link.title);
    expect(link.detailEn).not.toBe(link.detail);
  }
  // 至少一条链接的英文完全无中文（链接里可能插入用户自己的中文项目名，那属于用户数据，不算漏翻）。
  expect(result.links.some(link => !/[\u4e00-\u9fa5]/.test(link.detailEn!))).toBe(true);
});

it("keeps the Chinese originals intact next to the English siblings", async () => {
  const result = await scaffoldProjectDraftViaPi("alice", "智慧温室环境监测");
  expect(result.links.some(link => /[\u4e00-\u9fa5]/.test(link.title))).toBe(true);
});

it("returns an English execution trace alongside the Chinese one", async () => {
  const result = await scaffoldProjectDraftViaPi("alice", "智慧温室环境监测");
  expect(result.trace?.length).toBeGreaterThan(0);
  expect(result.traceEn?.length).toBe(result.trace!.length);
  result.trace!.forEach((step, index) => {
    expect(result.traceEn![index], `第 ${index + 1} 步缺少英文`).toBeTruthy();
    expect(result.traceEn![index]).not.toBe(step);
  });
  // 至少一步英文完全不含中文（步骤里可能插入用户自己的中文项目名，那属于用户数据）。
  expect(result.traceEn!.some(step => !/[\u4e00-\u9fa5]/.test(step))).toBe(true);
});
