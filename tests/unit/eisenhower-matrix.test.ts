import { describe, expect, it } from "vitest";
import {
  buildEisenhowerMatrix,
  matrixOpenCount,
  quadrantFromPriority,
  resolveMatrixQuadrant,
} from "../../src/features/eisenhowerMatrix";

describe("eisenhower matrix", () => {
  it("maps priority to a default quadrant when unset", () => {
    expect(quadrantFromPriority("high")).toBe("do");
    expect(quadrantFromPriority("medium")).toBe("schedule");
    expect(quadrantFromPriority("low")).toBe("park");
    expect(resolveMatrixQuadrant({ priority: "high" })).toBe("do");
    expect(resolveMatrixQuadrant({ matrix_quadrant: "delegate", priority: "high" })).toBe("delegate");
  });

  it("groups today's open plans into four quadrants", () => {
    const buckets = buildEisenhowerMatrix(
      [
        { id: "1", title: "立刻交付", plan_date: "2026-10-31", status: "todo", priority: "high" },
        { id: "2", title: "写周报", plan_date: "2026-10-31", status: "doing", priority: "medium", start_time: "10:00" },
        { id: "3", title: "回杂讯", plan_date: "2026-10-31", status: "todo", matrix_quadrant: "delegate" },
        { id: "4", title: "刷短视频", plan_date: "2026-10-31", status: "todo", priority: "low" },
        { id: "5", title: "已完成", plan_date: "2026-10-31", status: "done", priority: "high" },
        { id: "6", title: "明天的事", plan_date: "2026-11-01", status: "todo", priority: "high" },
      ],
      "2026-10-31",
    );
    expect(matrixOpenCount(buckets)).toBe(4);
    expect(buckets.find((b) => b.quadrant === "do")?.items.map((i) => i.id)).toEqual(["1"]);
    expect(buckets.find((b) => b.quadrant === "schedule")?.items.map((i) => i.id)).toEqual(["2"]);
    expect(buckets.find((b) => b.quadrant === "delegate")?.items.map((i) => i.id)).toEqual(["3"]);
    expect(buckets.find((b) => b.quadrant === "park")?.items.map((i) => i.id)).toEqual(["4"]);
  });
});
