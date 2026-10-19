import { describe, expect, it } from "vitest";
import { planDirectorScene, ScenePlanSchema } from "./director-agent";

describe("director agent", () => {
  it("turns a natural-language brief into three validated scene plans", () => {
    const result = planDirectorScene({ brief: "两个人在海边日落拥抱，人物要清楚，竖幅" });
    expect(result.plans).toHaveLength(3);
    expect(result.plans.every((plan) => ScenePlanSchema.safeParse(plan).success)).toBe(true);
    expect(result.plans[0]?.scene.presetId).toBe("coast");
    expect(result.plans[0]?.camera.aspectRatio).toBe("9:16");
    expect(result.plans[0]?.constraints).toContain("不得把 3D 灰模或黏土材质当作最终成片风格");
  });

  it("keeps the plan deterministic and changes shot intent across variants", () => {
    const result = planDirectorScene({ brief: "旧城街巷里的情侣旅行合影", peopleCount: 2, aspectRatio: "3:4" });
    expect(result.plans.map((plan) => plan.camera.shotScale)).toEqual(["双人中景", "双人全身", "半身近景"]);
    expect(result.plans.every((plan) => plan.camera.aspectRatio === "3:4")).toBe(true);
    expect(planDirectorScene({ brief: "旧城街巷里的情侣旅行合影" }).plans).toEqual(planDirectorScene({ brief: "旧城街巷里的情侣旅行合影" }).plans);
  });
});
