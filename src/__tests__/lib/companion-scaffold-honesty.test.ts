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
