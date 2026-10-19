import { describe, expect, it } from "vitest";
import { studioTemplates } from "./templates";

describe("studio template visual assets", () => {
  it("provides a project-local cover and provenance-safe alt text for every launch template", () => {
    expect(studioTemplates).toHaveLength(3);
    for (const template of studioTemplates) {
      expect(template.coverImage).toMatch(/^\/template-covers\/[a-z-]+\.webp$/);
      expect(template.coverAlt).toContain("样片");
    }
  });
});
