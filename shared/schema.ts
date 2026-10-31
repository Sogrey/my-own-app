/** 前后端共用的集合名与已知设置白名单，避免双份漂移。 */

export const collectionNames = [
  "planItems",
  "quickMemos",
  "mediaContents",
  "devProjects",
  "devMilestones",
  "devWorkItems",
  "devLogs",
  "clients",
  "consultingProjects",
  "consultingInteractions",
  "consultingDeliverables",
  "consultingFollowups",
  "consultingTimeEntries",
  "workoutTemplates",
  "workoutTemplateExercises",
  "workouts",
  "workoutExercises",
  "workoutSets",
  "bodyMetrics",
  "nutritionTargets",
  "foods",
  "meals",
  "mealItems",
  "entertainmentItems",
  "playSessions",
] as const;

export type CollectionName = (typeof collectionNames)[number];

export const themeValues = ["light", "dark"] as const;
export type Theme = (typeof themeValues)[number];

export const appearanceValues = ["liquid", "notebook", "neo"] as const;
export type Appearance = (typeof appearanceValues)[number];

export const weekStartValues = ["monday", "sunday"] as const;
export type WeekStart = (typeof weekStartValues)[number];

export const dateFormatValues = ["zh-CN", "iso"] as const;
export type DateFormat = (typeof dateFormatValues)[number];

export const knownSettingKeys = [
  "theme",
  "appearance",
  "weekStart",
  "dateFormat",
  "dashboardModules",
  "consultingStaleDays",
] as const;

export const DEFAULT_CONSULTING_STALE_DAYS = 14;

export function normalizeConsultingStaleDays(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CONSULTING_STALE_DAYS;
  return Math.min(365, Math.max(1, Math.round(number)));
}

export type KnownSettingKey = (typeof knownSettingKeys)[number];

export function isCollectionName(value: string): value is CollectionName {
  return (collectionNames as readonly string[]).includes(value);
}

export function isAppearance(value: unknown): value is Appearance {
  return typeof value === "string" && (appearanceValues as readonly string[]).includes(value);
}

export function isWeekStart(value: unknown): value is WeekStart {
  return typeof value === "string" && (weekStartValues as readonly string[]).includes(value);
}

export function isDateFormat(value: unknown): value is DateFormat {
  return typeof value === "string" && (dateFormatValues as readonly string[]).includes(value);
}
