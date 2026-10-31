import { describe, expect, it } from "vitest";
import { buildMediaWeekSchedule, countScheduledInWeek } from "../../src/features/mediaSchedule";

describe("buildMediaWeekSchedule", () => {
  it("places planned items into the Monday-start week columns", () => {
    const days = buildMediaWeekSchedule(
      [
        { id: "a", title: "周一稿", planned_publish_at: "2026-08-03", stage: "ready" },
        { id: "b", title: "周日稿", planned_publish_at: "2026-08-09", platform: "B站" },
        { id: "c", title: "下周", planned_publish_at: "2026-08-10" },
        { id: "d", title: "无日期", planned_publish_at: null },
      ],
      "2026-08-05",
      "monday",
    );
    expect(days.map((day) => day.date)).toEqual([
      "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09",
    ]);
    expect(days[0].items.map((item) => item.id)).toEqual(["a"]);
    expect(days[6].items[0]).toMatchObject({ id: "b", platform: "B站" });
    expect(countScheduledInWeek(days)).toBe(2);
  });
});
