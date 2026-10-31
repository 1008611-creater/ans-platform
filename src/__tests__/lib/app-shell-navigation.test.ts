import { describe, expect, it } from "vitest";
import { detectAppShell, isTabRootPath, sectionRootFor } from "@/domain/navigation/app-shell";

describe("mobile app shell navigation", () => {
  it.each(["/", "/explore", "/hubs", "/community", "/competitions", "/market", "/workspace", "/competitions/agrihackathon", "/workspace/"])("keeps the tab bar on %s", pathname => {
    expect(isTabRootPath(pathname)).toBe(true);
  });

  it.each(["/explore/some-project", "/hubs/cauhub", "/community/posts/1", "/competitions/agrihackathon/submissions", "/workspace/credits", "/projects/abc", "/privacy", "/login"])("treats %s as a pushed screen", pathname => {
    expect(isTabRootPath(pathname)).toBe(false);
  });

  it.each([
    ["/explore/some-project", "/explore"],
    ["/hubs/cauhub", "/hubs"],
    ["/community/posts/1", "/community"],
    ["/competitions/agrihackathon/submissions", "/competitions/agrihackathon"],
    ["/competitions/aigc", "/competitions"],
    ["/workspace/credits", "/workspace"],
    ["/projects/abc", "/workspace"],
    ["/privacy", "/"],
  ])("sends back from %s to %s without history", (pathname, root) => {
    expect(sectionRootFor(pathname)).toBe(root);
  });

  it("recognises the Android shell only by its user agent token", () => {
    expect(detectAppShell("Mozilla/5.0 (Linux; Android 14; wv) Chrome/126 Mobile Safari/537.36 ANSMobileApp/1.3.0")).toBe("android");
    expect(detectAppShell("Mozilla/5.0 (Linux; Android 14) Chrome/126 Mobile Safari/537.36")).toBeNull();
    expect(detectAppShell(null)).toBeNull();
  });
});
