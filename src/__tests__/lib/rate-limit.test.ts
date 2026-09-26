import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter weighted checks", () => {
  it("charges the requested number of units and reports remaining capacity", () => {
    const limiter = new RateLimiter({ max: 6, windowSeconds: 60 });

    expect(limiter.check("client", 3)).toEqual({ allowed: true, remaining: 3 });
    expect(limiter.check("client", 2)).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check("client", 2)).toMatchObject({ allowed: false });
    expect(limiter.check("another-client", 6)).toEqual({ allowed: true, remaining: 0 });
  });

  it("defaults to one unit and rejects invalid costs", () => {
    const limiter = new RateLimiter({ max: 2, windowSeconds: 60 });

    expect(limiter.check("client")).toEqual({ allowed: true, remaining: 1 });
    expect(() => limiter.check("client", 0)).toThrow(RangeError);
    expect(() => limiter.check("client", 3)).toThrow(RangeError);
  });
});
