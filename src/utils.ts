import { isDateFormat, isWeekStart, type DateFormat, type WeekStart } from "../shared/schema";

export type { DateFormat, WeekStart };

export function localDate(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDate(value);
}

export function normalizeDateFormat(value: unknown): DateFormat {
  return isDateFormat(value) ? value : "zh-CN";
}

export function normalizeWeekStart(value: unknown): WeekStart {
  return isWeekStart(value) ? value : "monday";
}

/** 返回包含指定日期的本周起止（按 weekStart）。 */
export function weekRange(date: string, weekStart: WeekStart = "monday"): { start: string; end: string } {
  const value = new Date(`${date}T12:00:00`);
  const day = value.getDay();
  const offset = weekStart === "sunday" ? day : (day + 6) % 7;
  value.setDate(value.getDate() - offset);
  const start = localDate(value);
  return { start, end: addDays(start, 6) };
}

export function formatDate(date?: string | null, dateFormat: DateFormat = "zh-CN"): string {
  if (!date) return "未设置";
  if (dateFormat === "iso") return date.length >= 10 ? date.slice(0, 10) : date;
  const value = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: date.length === 10 ? "short" : undefined }).format(value);
}

export function formatDateTime(date?: string | null, dateFormat: DateFormat = "zh-CN"): string {
  if (!date) return "未设置";
  if (dateFormat === "iso") {
    const value = new Date(date);
    const stamp = new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString();
    return `${stamp.slice(0, 10)} ${stamp.slice(11, 16)}`;
  }
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function formatDuration(minutes?: number | null): string {
  const value = Number(minutes || 0);
  if (value < 60) return `${value} 分钟`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

export function formatBytes(bytes?: number): string {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
