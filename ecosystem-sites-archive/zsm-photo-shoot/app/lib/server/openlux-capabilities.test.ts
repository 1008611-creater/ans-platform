import { describe, expect, it } from "vitest";
import { getOpenLuxCapability, listOpenLuxCapabilities } from "./openlux-capabilities";

describe("OpenLux capability registry", () => {
  it("keeps every user-provided model visible but disabled", () => {
    const capabilities = listOpenLuxCapabilities();
    expect(capabilities).toHaveLength(3);
    expect(capabilities.every((item) => item.enabled === false)).toBe(true);
    expect(capabilities.every((item) => item.supportsReferenceImage === "unknown")).toBe(true);
  });

  it("does not invent capabilities for an unknown model", () => {
    expect(getOpenLuxCapability("unverified-model")).toBeUndefined();
  });
});
