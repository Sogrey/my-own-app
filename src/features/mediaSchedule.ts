import { addDays, weekRange, type WeekStart } from "../utils";

export type MediaScheduleItem = {
  id: string;
  title: string;
  platform?: string | null;
  stage?: string | null;
  planned_publish_at: string;
};

export type MediaScheduleDay = {
  date: string;
  items: MediaScheduleItem[];
};

/** 按 planned_publish_at 落在本周的内容排成 7 天列。 */
export function buildMediaWeekSchedule(
  items: Array<Record<string, any>>,
  anchorDate: string,
  weekStart: WeekStart = "monday",
): MediaScheduleDay[] {
  const { start } = weekRange(anchorDate, weekStart);
  const days: MediaScheduleDay[] = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(start, index),
    items: [],
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const item of items) {
    const date = typeof item.planned_publish_at === "string" ? item.planned_publish_at.slice(0, 10) : "";
    const bucket = byDate.get(date);
    if (!bucket) continue;
    bucket.items.push({
      id: String(item.id),
      title: String(item.title || "未命名内容"),
      platform: item.platform,
      stage: item.stage,
      planned_publish_at: date,
    });
  }
  for (const day of days) {
    day.items.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }
  return days;
}

export function countScheduledInWeek(days: MediaScheduleDay[]): number {
  return days.reduce((sum, day) => sum + day.items.length, 0);
}
