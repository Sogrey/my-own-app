import type { CollectionName } from "./types";
import { localDate } from "./utils";

export type SourceSyncOffer = {
  collection: CollectionName;
  /** 对话框主按钮文案，说明会改什么 */
  actionLabel: string;
  /** 说明文字 */
  detail: string;
  patch: Record<string, unknown>;
};

/**
 * 完成关联计划时，可显式询问是否回写的来源类型。
 * 无明确单一状态变化的类型（如模板训练、餐食）不提供同步。
 */
export function sourceSyncOffer(sourceEntityType: string | null | undefined): SourceSyncOffer | null {
  switch (sourceEntityType) {
    case "consulting_deliverable":
      return {
        collection: "consultingDeliverables",
        actionLabel: "同步：交付物完成",
        detail: "将来源交付物状态改为「已完成」。",
        patch: { status: "done" },
      };
    case "consulting_followup":
      return {
        collection: "consultingFollowups",
        actionLabel: "同步：跟进完成",
        detail: "将来源跟进状态改为「已完成」。",
        patch: { status: "done", completed_at: new Date().toISOString() },
      };
    case "dev_work_item":
      return {
        collection: "devWorkItems",
        actionLabel: "同步：工作项完成",
        detail: "将来源工作项状态改为「已完成」。",
        patch: { status: "done" },
      };
    case "media_content":
      return {
        collection: "mediaContents",
        actionLabel: "同步：内容已发布",
        detail: "将来源内容阶段改为「已发布」。",
        patch: { stage: "published", published_at: localDate() },
      };
    case "entertainment_item":
      return {
        collection: "entertainmentItems",
        actionLabel: "同步：娱乐项完成",
        detail: "将来源娱乐项状态改为「已完成」。",
        patch: { status: "completed", completed_date: localDate() },
      };
    default:
      return null;
  }
}

export function canOfferSourceSync(item: {
  source_entity_type?: string | null;
  source_entity_id?: string | null;
}): boolean {
  return Boolean(item.source_entity_id && sourceSyncOffer(item.source_entity_type));
}
