import { describe, expect, it } from "vitest";
import { GET as getImageResult } from "../../api/image-result/route";
import { IMAGE_DELIVERY_TTL_MS, lookupDelivery, registerOpenLuxResult } from "./result-registry";

describe("temporary image delivery registry", () => {
  it("returns a short-lived proxy URL without exposing the provider URL", () => {
    const result = registerOpenLuxResult({
      provider: "openlux",
      demo: false,
      status: "succeeded",
      outputs: [{ id: "image-1", mediaType: "image", url: "https://cdn.example.test/signed-image.webp" }],
    }, 1_000);
    const output = result.outputs[0]!;
    expect(output.deliveryUrl).toMatch(/^\/api\/image-result\?token=[a-f0-9]{32}$/);
    expect(output.deliveryUrl).not.toContain("cdn.example.test");
    expect(output.expiresAt).toBe(new Date(1_000 + IMAGE_DELIVERY_TTL_MS).toISOString());
    expect(lookupDelivery(new URL(`https://app.test${output.deliveryUrl}`).searchParams.get("token")!, 1_001).state).toBe("ready");
  });

  it("serves base64 results through the proxy and expires them", async () => {
    const now = Date.now();
    const result = registerOpenLuxResult({
      provider: "openlux",
      demo: false,
      status: "succeeded",
      outputs: [{ id: "image-1", mediaType: "image", data: "/9j/4AA=" }],
    }, now);
    const deliveryUrl = new URL(`https://app.test${result.outputs[0]!.deliveryUrl}`);
    const response = await getImageResult(new Request(deliveryUrl));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]));

    const expired = lookupDelivery(deliveryUrl.searchParams.get("token")!, now + IMAGE_DELIVERY_TTL_MS + 1);
    expect(expired.state).toBe("missing");
    const expiredResponse = await getImageResult(new Request(deliveryUrl));
    expect(expiredResponse.status).toBe(410);
  });

  it("rejects unsafe provider URLs instead of creating an open proxy", () => {
    expect(() => registerOpenLuxResult({
      provider: "openlux",
      demo: false,
      status: "succeeded",
      outputs: [{ id: "image-1", mediaType: "image", url: "http://127.0.0.1/private.webp" }],
    })).toThrowError("safe temporary image result");
  });
});
