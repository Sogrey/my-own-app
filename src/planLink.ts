import { localDate } from "./utils";

/** 各模块「加入今日」共用字段，保证 source_* 一致。 */
export function todayPlanPayload(input: {
  title: string;
  sourceModule: string;
  sourceEntityType: string;
  sourceEntityId: string;
  priority?: "low" | "medium" | "high";
  notes?: string;
}) {
  return {
    title: input.title,
    plan_date: localDate(),
    source_module: input.sourceModule,
    source_entity_type: input.sourceEntityType,
    source_entity_id: input.sourceEntityId,
    priority: input.priority ?? "medium",
    notes: input.notes ?? "",
  };
}
