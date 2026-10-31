import { weekRange, type WeekStart } from "../utils";

export type WeekReviewStats = {
  start: string;
  end: string;
  planCompleted: number;
  planTotal: number;
  planProgress: number;
  workouts: number;
  published: number;
  followupsDone: number;
};

function inRange(date: string | null | undefined, start: string, end: string): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  return day >= start && day <= end;
}

/** 只读周回顾：完成率、训练次数、发布数、跟进完成数。 */
export function buildWeekReview(
  input: {
    planItems: Array<Record<string, any>>;
    workouts: Array<Record<string, any>>;
    mediaContents: Array<Record<string, any>>;
    consultingFollowups: Array<Record<string, any>>;
  },
  anchorDate: string,
  weekStart: WeekStart = "monday",
): WeekReviewStats {
  const { start, end } = weekRange(anchorDate, weekStart);
  const plans = input.planItems.filter(
    (item) => inRange(item.plan_date, start, end) && item.status !== "cancelled",
  );
  const planCompleted = plans.filter((item) => item.status === "done").length;
  const planTotal = plans.length;
  return {
    start,
    end,
    planCompleted,
    planTotal,
    planProgress: planTotal ? Math.round((planCompleted / planTotal) * 100) : 0,
    workouts: input.workouts.filter((item) => inRange(item.workout_date, start, end)).length,
    published: input.mediaContents.filter((item) => item.stage === "published" && inRange(item.published_at, start, end)).length,
    followupsDone: input.consultingFollowups.filter(
      (item) => item.status === "done" && inRange(item.completed_at || item.followup_at, start, end),
    ).length,
  };
}
