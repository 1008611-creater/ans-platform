// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();
describe("lint configuration boundaries", () => {
  it("does not apply unregistered React rules to CommonJS files", async () => {
    const [result] = await eslint.lintText("module.exports = {};", { filePath: "local-config.cjs" });
    expect(result.messages.filter((message) => message.severity === 2)).toEqual([]);
    const config = await eslint.calculateConfigForFile("local-config.cjs");
    expect(config.rules["react-hooks/set-state-in-effect"]).toBeUndefined();
  });
  it("retains plugin checks for application TSX", async () => {
    const config = await eslint.calculateConfigForFile("src/components/catalog/project-card.tsx");
    expect(config.plugins["react-hooks"]).toBeDefined();
    expect(config.rules["react-hooks/set-state-in-effect"][0]).toBe(1);
    expect(config.rules["react-hooks/error-boundaries"][0]).toBe(2);
  });
  it("ignores generated evidence, without ignoring application source", async () => {
    expect(await eslint.isPathIgnored(".workbuddy/evidence/probe.cjs")).toBe(true);
    expect(await eslint.isPathIgnored("src/components/catalog/project-card.tsx")).toBe(false);
  });
});