import { describe, expect, it } from "vitest";
import { buildWeekReview } from "../../src/features/weekReview";

describe("buildWeekReview", () => {
  it("aggregates plan, workout, publish and follow-up counts for the week", () => {
    const stats = buildWeekReview(
      {
        planItems: [
          { plan_date: "2026-08-03", status: "done" },
          { plan_date: "2026-08-05", status: "todo" },
          { plan_date: "2026-08-10", status: "done" },
        ],
        workouts: [{ workout_date: "2026-08-04" }, { workout_date: "2026-07-01" }],
        mediaContents: [
          { stage: "published", published_at: "2026-08-06" },
          { stage: "ready", published_at: "2026-08-06" },
        ],
        consultingFollowups: [
          { status: "done", completed_at: "2026-08-07T10:00:00.000Z" },
          { status: "todo", followup_at: "2026-08-07T10:00:00.000Z" },
        ],
      },
      "2026-08-05",
      "monday",
    );
    expect(stats).toMatchObject({
      start: "2026-08-03",
      end: "2026-08-09",
      planCompleted: 1,
      planTotal: 2,
      planProgress: 50,
      workouts: 1,
      published: 1,
      followupsDone: 1,
    });
  });
});
