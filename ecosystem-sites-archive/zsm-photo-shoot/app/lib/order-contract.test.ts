import { describe, expect, it } from "vitest";
import { MAX_SESSION_ORDERS, SESSION_ORDER_STORAGE_KEY, readSessionOrders, writeSessionOrders, type ExperienceOrderRecord } from "./order-contract";

const order: ExperienceOrderRecord = {
  id: "order-1",
  jobId: "job-1",
  templateId: "travel-sunset",
  templateTitle: "海边日落",
  templateVersion: "1.0.0",
  shotTitle: "双人中景",
  provider: "mock",
  mode: "quick",
  status: "ready",
  createdAt: "2026-10-02T00:00:00.000Z",
  hasOutput: true,
  feedback: { satisfaction: 5, publishIntent: "yes", recommendIntent: "yes", note: "请联系我" },
};

describe("session order contract", () => {
  it("stores only anonymous order metadata and restores valid records", () => {
    const values = new Map<string, string>();
    writeSessionOrders({ setItem: (key, value) => values.set(key, value) }, [order]);
    expect(values.has(SESSION_ORDER_STORAGE_KEY)).toBe(true);
    expect(values.get(SESSION_ORDER_STORAGE_KEY)).not.toContain("prompt");
    expect(values.get(SESSION_ORDER_STORAGE_KEY)).not.toContain("请联系我");
    expect(readSessionOrders({ getItem: (key) => values.get(key) ?? null })[0]?.feedback).toEqual({ satisfaction: 5, publishIntent: "yes", recommendIntent: "yes" });
  });

  it("drops malformed entries and caps session history", () => {
    const many = Array.from({ length: MAX_SESSION_ORDERS + 4 }, (_, index) => ({ ...order, id: `order-${index}` }));
    const raw = JSON.stringify([{ bad: true }, ...many]);
    const restored = readSessionOrders({ getItem: () => raw });
    expect(restored).toHaveLength(MAX_SESSION_ORDERS);
    expect(restored[0]?.id).toBe("order-0");
  });
});
