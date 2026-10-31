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

const planItemShape = {
  title: z.string().min(1, "事项名称不能为空"),
  plan_date: dateString,
  start_time: optionalTime,
  estimated_minutes: optionalNonNegInt(),
  priority: z.enum(["low", "medium", "high"]),
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
  planned_publish_at: z.union([z.string(), z.null()]).optional(),
  published_at: z.union([z.string(), z.null()]).optional(),
  copy_text: z.string().optional(),
  asset_path: z.string().optional(),
  publish_url: z.string().optional(),
  views: optionalNonNegInt(),
  likes: optionalNonNegInt(),
  comments: optionalNonNegInt(),
  archived_at: z.union([z.string(), z.null()]).optional(),
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
};

const knownSettingsSchema = z.object({
  theme: z.enum(themeValues),
  appearance: z.enum(appearanceValues),
  weekStart: z.enum(weekStartValues),
  dateFormat: z.enum(dateFormatValues),
  dashboardModules: z.array(z.string()),
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
