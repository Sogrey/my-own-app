import { z } from "zod";
import {
  appearanceValues,
  dateFormatValues,
  knownSettingKeys,
  themeValues,
  weekStartValues,
  type CollectionName,
} from "../shared/schema.js";
import { ValidationError } from "./errors.js";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");
const optionalTime = z.union([z.string().regex(/^\d{2}:\d{2}$/, "时间格式应为 HH:MM"), z.literal(""), z.null()]).optional();

function optionalNonNegInt() {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (typeof value === "boolean") return value ? 1 : 0;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : value;
  }, z.union([z.number().int().nonnegative(), z.null()]).optional());
}

function optionalNonNegNumber() {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : value;
  }, z.union([z.number().nonnegative(), z.null()]).optional());
}

const optionalNullableString = z.union([z.string(), z.null()]).optional();
const optionalDate = z.union([dateString, z.literal(""), z.null()]).optional();

const planItemShape = {
  title: z.string().min(1, "事项名称不能为空"),
  plan_date: dateString,
  start_time: optionalTime,
  estimated_minutes: optionalNonNegInt(),
  priority: z.enum(["low", "medium", "high"]),
  /** 轻重缓急四象限；空字符串表示按 priority 推断 */
  matrix_quadrant: z.enum(["do", "schedule", "delegate", "park", ""]).optional(),
  status: z.enum(["todo", "doing", "done", "cancelled"]),
  source_module: z.union([z.string(), z.null()]).optional(),
  source_entity_type: z.union([z.string(), z.null()]).optional(),
  source_entity_id: z.union([z.string(), z.null()]).optional(),
  complete_source: optionalNonNegInt(),
  notes: z.string().optional(),
  completed_at: z.union([z.string(), z.null()]).optional(),
};

const mediaContentShape = {
  title: z.string().min(1, "标题不能为空"),
  platform: z.string().optional(),
  content_format: z.string().optional(),
  stage: z.enum(["idea", "planning", "producing", "ready", "published"]),
  planned_publish_at: optionalDate,
  published_at: optionalDate,
  copy_text: z.string().optional(),
  asset_path: z.string().optional(),
  publish_url: z.string().optional(),
  views: optionalNonNegInt(),
  likes: optionalNonNegInt(),
  comments: optionalNonNegInt(),
  archived_at: optionalNullableString,
};

const quickMemoShape = {
  content: z.string().min(1, "备忘内容不能为空"),
  archived_at: optionalNullableString,
  converted_type: optionalNullableString,
  converted_id: optionalNullableString,
};

const clientShape = {
  name: z.string().min(1, "客户名称不能为空"),
  notes: z.string().optional(),
  archived_at: optionalNullableString,
};

const consultingProjectShape = {
  client_id: z.string().min(1, "请选择客户"),
  name: z.string().min(1, "项目名称不能为空"),
  current_need: z.string().optional(),
  status: z.enum(["active", "waiting", "completed"]),
  archived_at: optionalNullableString,
};

const consultingFollowupShape = {
  project_id: z.string().min(1, "请选择项目"),
  followup_at: z.string().min(1, "请填写跟进时间"),
  content: z.string().min(1, "跟进内容不能为空"),
  status: z.enum(["todo", "done"]),
  completed_at: optionalNullableString,
};

const consultingDeliverableShape = {
  project_id: z.string().min(1, "请选择项目"),
  name: z.string().min(1, "交付物名称不能为空"),
  due_date: optionalDate,
  status: z.enum(["todo", "done"]),
};

const consultingInteractionShape = {
  project_id: z.string().min(1, "请选择项目"),
  occurred_at: z.string().min(1, "请填写沟通时间"),
  interaction_type: z.enum(["meeting", "call", "message"]),
  notes: z.string().optional(),
};

const devProjectShape = {
  name: z.string().min(1, "项目名称不能为空"),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed"]),
  local_path: z.string().optional(),
  repository_url: z.string().optional(),
  document_url: z.string().optional(),
  archived_at: optionalNullableString,
};

const devWorkItemShape = {
  project_id: z.string().min(1, "请选择项目"),
  milestone_id: optionalNullableString,
  title: z.string().min(1, "标题不能为空"),
  item_type: z.enum(["feature", "requirement", "bug", "technical"]),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["todo", "doing", "done"]),
  description: z.string().optional(),
};

const entertainmentItemShape = {
  name: z.string().min(1, "名称不能为空"),
  platform: z.string().optional(),
  activity_type: z.string().optional(),
  status: z.enum(["wishlist", "playing", "paused", "completed"]),
  progress: z.string().optional(),
  next_goal: z.string().optional(),
  notes: z.string().optional(),
  rating: optionalNonNegNumber(),
  completed_date: optionalDate,
};

const mealShape = {
  meal_date: dateString,
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  name: z.string().min(1, "餐食名称不能为空"),
  entry_kind: z.enum(["planned", "actual"]),
  notes: z.string().optional(),
};

const foodShape = {
  name: z.string().min(1, "食物名称不能为空"),
  default_portion: optionalNonNegNumber(),
  portion_unit: z.string().optional(),
  calories: optionalNonNegNumber(),
  protein: optionalNonNegNumber(),
  carbs: optionalNonNegNumber(),
  fat: optionalNonNegNumber(),
};

const workoutTemplateShape = {
  name: z.string().min(1, "模板名称不能为空"),
  body_part: z.string().optional(),
  weekday: optionalNonNegInt(),
  notes: z.string().optional(),
};

const workoutShape = {
  template_id: optionalNullableString,
  name: z.string().min(1, "训练名称不能为空"),
  body_part: z.string().optional(),
  workout_date: dateString,
  status: z.enum(["planned", "in_progress", "completed"]),
  feeling: z.string().optional(),
  started_at: optionalNullableString,
  completed_at: optionalNullableString,
};

type SchemaPair = {
  create: z.ZodType<Record<string, unknown>>;
  update: z.ZodType<Record<string, unknown>>;
};

function pair<T extends z.ZodRawShape>(shape: T, required: Array<keyof T & string>): SchemaPair {
  const createShape: Record<string, z.ZodTypeAny> = {};
  for (const [key, schema] of Object.entries(shape)) {
    createShape[key] = required.includes(key as keyof T & string)
      ? (schema as z.ZodTypeAny)
      : (schema as z.ZodTypeAny).optional();
  }
  return {
    create: z.object(createShape).strict(),
    update: z.object(shape).partial().strict(),
  };
}

const collectionSchemas: Partial<Record<CollectionName, SchemaPair>> = {
  planItems: pair(planItemShape, ["title", "plan_date"]),
  mediaContents: pair(mediaContentShape, ["title"]),
  quickMemos: pair(quickMemoShape, ["content"]),
  clients: pair(clientShape, ["name"]),
  consultingProjects: pair(consultingProjectShape, ["client_id", "name"]),
  consultingFollowups: pair(consultingFollowupShape, ["project_id", "followup_at", "content"]),
  consultingDeliverables: pair(consultingDeliverableShape, ["project_id", "name"]),
  consultingInteractions: pair(consultingInteractionShape, ["project_id", "occurred_at"]),
  devProjects: pair(devProjectShape, ["name"]),
  devWorkItems: pair(devWorkItemShape, ["project_id", "title"]),
  entertainmentItems: pair(entertainmentItemShape, ["name"]),
  meals: pair(mealShape, ["meal_date", "meal_type", "name"]),
  foods: pair(foodShape, ["name"]),
  workoutTemplates: pair(workoutTemplateShape, ["name"]),
  workouts: pair(workoutShape, ["name", "workout_date"]),
};

const knownSettingsSchema = z.object({
  theme: z.enum(themeValues),
  appearance: z.enum(appearanceValues),
  weekStart: z.enum(weekStartValues),
  dateFormat: z.enum(dateFormatValues),
  dashboardModules: z.array(z.string()),
  consultingStaleDays: z.number().int().min(1).max(365),
}).partial();

export function validateCollectionInput(name: CollectionName, input: Record<string, unknown>, mode: "create" | "update"): Record<string, unknown> {
  const schema = collectionSchemas[name];
  if (!schema) return input;
  const parsed = (mode === "create" ? schema.create : schema.update).safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "字段校验失败");
  }
  return parsed.data as Record<string, unknown>;
}

export function validateSettingsInput(input: Record<string, unknown>): Record<string, unknown> {
  const knownKeys = knownSettingKeys as readonly string[];
  const knownInput = Object.fromEntries(Object.entries(input).filter(([key]) => knownKeys.includes(key)));
  const parsed = knownSettingsSchema.safeParse(knownInput);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "设置校验失败");
  }
  // 保留尚未纳入白名单的旧键（例如测试用 launcherPersistence），但对已知键强制枚举。
  return { ...input, ...parsed.data };
}
