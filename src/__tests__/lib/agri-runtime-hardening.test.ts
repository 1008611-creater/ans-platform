import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { shouldAutoBootstrapAgriEdition, DEFAULT_AGRI_EDITION_ID } from "@/server/competitions/agrihackathon/bootstrap";
import { githubRepository } from "@/server/competitions/agrihackathon/evidence-network";

describe("AgriHackathon runtime hardening & PostgreSQL constraint alignment", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVitest = process.env.VITEST;
  const originalAutoDisable = process.env.AGRI_AUTO_BOOTSTRAP_DISABLED;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    (process.env as Record<string, string | undefined>).VITEST = originalVitest;
    (process.env as Record<string, string | undefined>).AGRI_AUTO_BOOTSTRAP_DISABLED = originalAutoDisable;
  });

  it("shouldAutoBootstrapAgriEdition never triggers in test/vitest or for non-default competition IDs", () => {
    expect(shouldAutoBootstrapAgriEdition(DEFAULT_AGRI_EDITION_ID)).toBe(false);

    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).VITEST = "false";
    delete (process.env as Record<string, string | undefined>).AGRI_AUTO_BOOTSTRAP_DISABLED;

    expect(shouldAutoBootstrapAgriEdition(DEFAULT_AGRI_EDITION_ID)).toBe(true);
    expect(shouldAutoBootstrapAgriEdition("agri-it-custom")).toBe(false);
    expect(shouldAutoBootstrapAgriEdition("")).toBe(false);
    expect(shouldAutoBootstrapAgriEdition(null)).toBe(false);

    (process.env as Record<string, string | undefined>).AGRI_AUTO_BOOTSTRAP_DISABLED = "true";
    expect(shouldAutoBootstrapAgriEdition(DEFAULT_AGRI_EDITION_ID)).toBe(false);
  });

  it("githubRepository accepts GitHub, Gitee, and GitLab HTTPS repository URLs and rejects invalid hosts", () => {
    expect(githubRepository("https://github.com/cau-ai/smart-irrigation.git")).toEqual({
      host: "github.com",
      owner: "cau-ai",
      repo: "smart-irrigation",
      url: "https://github.com/cau-ai/smart-irrigation.git",
    });

    expect(githubRepository("https://gitee.com/cau-team/crop-vision")).toEqual({
      host: "gitee.com",
      owner: "cau-team",
      repo: "crop-vision",
      url: "https://gitee.com/cau-team/crop-vision",
    });

    expect(githubRepository("https://gitlab.com/agri-lab/soil-agent")).toEqual({
      host: "gitlab.com",
      owner: "agri-lab",
      repo: "soil-agent",
      url: "https://gitlab.com/agri-lab/soil-agent",
    });

    expect(() => githubRepository("https://example.com/cau/repo")).toThrow();
  });
});
