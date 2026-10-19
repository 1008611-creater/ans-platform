import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DIRECTOR_PACK_LIMITS, parseDirectorPack } from "./director-pack";

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);

describe("CozyClay keyframe package bridge", () => {
  it("extracts only first-frame image and safe prompt/camera summary", async () => {
    const archive = zipSync({
      "shot-01/first.png": png,
      "shot-01/prompt.txt": new TextEncoder().encode("A couple walking at sunset"),
      "shot-01/camera.json": new TextEncoder().encode(JSON.stringify({ fps: 24, startFrame: 1, endFrame: 48, secret: "ignored" })),
      "shot-01/clip.mp4": new Uint8Array(2 * 1024 * 1024),
    });

    const pack = parseDirectorPack(archive);
    expect(pack.prompt).toBe("A couple walking at sunset");
    expect(pack.camera).toEqual({ fps: 24, startFrame: 1, endFrame: 48 });
    expect(pack.included).toEqual(["first.png", "prompt.txt", "camera.json（安全摘要）"]);
    expect(pack.image.type).toBe("image/png");
    expect([...new Uint8Array(await pack.image.arrayBuffer())]).toEqual([...png]);
  });

  it("rejects a package without a valid first-frame PNG", () => {
    expect(() => parseDirectorPack(zipSync({ "shot/prompt.txt": new TextEncoder().encode("camera move") })))
      .toThrow("没有 first.png");
    expect(() => parseDirectorPack(zipSync({ "shot/first.png": new TextEncoder().encode("not png") })))
      .toThrow("不是有效的 PNG");
  });

  it("rejects oversized archives before parsing", () => {
    expect(() => parseDirectorPack(new Uint8Array(DIRECTOR_PACK_LIMITS.archiveBytes + 1)))
      .toThrow("30 MB");
  });
});
