import type { FieldDefinition } from "../../components/ui";
import type { CollectionName, Entity } from "../../types";
import { localDate } from "../../utils";
import type { DialogConfig } from "../pageTypes";

export const projectFields: FieldDefinition[] = [
  { name: "name", label: "项目名称", required: true },
  { name: "description", label: "项目说明", type: "textarea" },
  { name: "status", label: "状态", type: "select", required: true, options: [{ value: "active", label: "进行中" }, { value: "paused", label: "暂停" }, { value: "completed", label: "已完成" }] },
  { name: "local_path", label: "本地目录", placeholder: "/Users/..." },
  { name: "repository_url", label: "代码仓库", placeholder: "https://..." },
  { name: "document_url", label: "文档链接", placeholder: "https://..." },
];

export function developmentFormConfig(
  type: string,
  project?: Entity,
  milestones: Entity[] = [],
): DialogConfig {
  if (type === "project") {
    return {
      title: "新建项目",
      editTitle: "编辑项目",
      collection: "devProjects",
      fields: projectFields,
      defaults: { status: "active" },
    };
  }
  if (type === "milestone") {
    return {
      title: "添加里程碑",
      editTitle: "编辑里程碑",
      collection: "devMilestones",
      fields: [
        { name: "name", label: "里程碑名称", required: true },
        { name: "target_date", label: "目标日期", type: "date" },
        { name: "status", label: "状态", type: "select", required: true, options: [{ value: "open", label: "进行中" }, { value: "done", label: "已完成" }] },
      ],
      defaults: { project_id: project?.id, status: "open" },
    };
  }
  if (type === "work") {
    return {
      title: "添加工作项",
      editTitle: "编辑工作项",
      collection: "devWorkItems",
      fields: [
        { name: "title", label: "标题", required: true },
        { name: "item_type", label: "类型", type: "select", required: true, options: [{ value: "feature", label: "功能" }, { value: "requirement", label: "需求" }, { value: "bug", label: "Bug" }, { value: "technical", label: "技术问题" }] },
        { name: "priority", label: "优先级", type: "select", required: true, options: [{ value: "low", label: "低" }, { value: "medium", label: "普通" }, { value: "high", label: "高" }] },
        { name: "status", label: "状态", type: "select", required: true, options: [{ value: "todo", label: "待办" }, { value: "doing", label: "进行中" }, { value: "done", label: "已完成" }] },
        { name: "milestone_id", label: "里程碑", type: "select", options: milestones.map((item) => ({ value: String(item.id), label: String(item.name) })) },
        { name: "description", label: "说明", type: "textarea" },
      ],
      defaults: { project_id: project?.id, item_type: "feature", priority: "medium", status: "todo" },
    };
  }
  return {
    title: "记录开发日志",
    editTitle: "编辑开发日志",
    collection: "devLogs" as CollectionName,
    fields: [
      { name: "log_date", label: "日期", type: "date", required: true },
      { name: "content", label: "日志内容", type: "textarea", required: true },
    ],
    defaults: { project_id: project?.id, log_date: localDate() },
  };
}
