import type { FieldDefinition } from "../../components/ui";

export const stages = [
  { value: "idea", label: "灵感" },
  { value: "planning", label: "待策划" },
  { value: "producing", label: "制作中" },
  { value: "ready", label: "待发布" },
  { value: "published", label: "已发布" },
] as const;

export const stageLabel = Object.fromEntries(stages.map((stage) => [stage.value, stage.label]));

export const mediaFields: FieldDefinition[] = [
  { name: "title", label: "内容标题", required: true },
  { name: "platform", label: "平台", placeholder: "例如：B站、小红书" },
  { name: "content_format", label: "内容形式", placeholder: "例如：视频、图文" },
  { name: "stage", label: "制作阶段", type: "select", required: true, options: [...stages] },
  { name: "planned_publish_at", label: "计划发布日期", type: "date" },
  { name: "published_at", label: "实际发布日期", type: "date" },
  { name: "copy_text", label: "文案与内容笔记", type: "textarea" },
  { name: "asset_path", label: "素材位置", placeholder: "/Users/..." },
  { name: "publish_url", label: "发布链接", placeholder: "https://..." },
  { name: "views", label: "播放或阅读", type: "number" },
  { name: "likes", label: "点赞", type: "number" },
  { name: "comments", label: "评论", type: "number" },
];

export function formatMetric(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatCompactAxis(value: number): string {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
