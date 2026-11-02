// @vitest-environment node
import { expect, it } from "vitest";
import { isSampleWork } from "@/server/community/feed";

it("keeps acceptance and test works out of the public feed", () => {
  expect(isSampleWork({ id: "v1", title: "README 草稿", projectTitle: "ANS 社区闭环验收作品" }, [])).toBe(true);
  expect(isSampleWork({ id: "v2", title: "smoke run", projectTitle: "Demo" }, [])).toBe(true);
  expect(isSampleWork({ id: "v3", title: "README 草稿", projectTitle: "校园二手书小程序" }, [])).toBe(false);
  // 标题看不出来的，用配置按作品 ID 排除。
  expect(isSampleWork({ id: "v3", title: "README 草稿", projectTitle: "校园二手书小程序" }, ["v3"])).toBe(true);
});
