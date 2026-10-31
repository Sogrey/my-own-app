import { describe, expect, it } from "vitest";
import { nutritionDelta } from "../../src/features/nutritionDelta";

describe("nutritionDelta", () => {
  it("describes remaining, over and missing targets", () => {
    expect(nutritionDelta(1200, 1800)).toMatchObject({ tone: "under", label: "还差 600" });
    expect(nutritionDelta(2000, 1800)).toMatchObject({ tone: "over", label: "超出 200" });
    expect(nutritionDelta(100, null).tone).toBe("none");
    expect(nutritionDelta(1800, 1800).tone).toBe("ok");
  });
});
