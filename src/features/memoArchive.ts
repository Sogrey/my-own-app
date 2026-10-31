import type { CollectionName } from "../types";

export const memoConvertedLabels: Record<string, string> = {
  planItems: "今日事项",
  mediaContents: "内容灵感",
  clients: "客户线索",
  entertainmentItems: "游戏娱乐",
  workoutTemplates: "训练模板",
  foods: "食材",
};

export function isArchivedMemo(item: Record<string, any>): boolean {
  return Boolean(item.archived_at || item.converted_id);
}

export function recentArchivedMemos(memos: Array<Record<string, any>>, limit = 8): Array<Record<string, any>> {
  return [...memos]
    .filter(isArchivedMemo)
    .sort((a, b) => String(b.archived_at || b.updated_at || "").localeCompare(String(a.archived_at || a.updated_at || "")))
    .slice(0, limit);
}

export function memoConvertedLabel(convertedType: string | null | undefined): string {
  if (!convertedType) return "已归档";
  return memoConvertedLabels[convertedType] ?? convertedType;
}

export function canOpenConverted(convertedType: string | null | undefined, convertedId: string | null | undefined): convertedType is CollectionName {
  return Boolean(convertedType && convertedId);
}
