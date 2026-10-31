import type { FieldDefinition } from "../../components/ui";

export const planFields: FieldDefinition[] = [
  { name: "title", label: "事项名称", required: true, placeholder: "例如：完成咨询方案" },
  { name: "plan_date", label: "日期", type: "date", required: true },
  { name: "start_time", label: "开始时间", type: "time" },
  { name: "estimated_minutes", label: "预计分钟", type: "number", placeholder: "60" },
  { name: "priority", label: "优先级", type: "select", required: true, options: [{ value: "low", label: "低" }, { value: "medium", label: "普通" }, { value: "high", label: "高" }] },
  {
    name: "matrix_quadrant",
    label: "轻重缓急",
    type: "select",
    options: [
      { value: "", label: "按优先级推断" },
      { value: "do", label: "重要且紧急" },
      { value: "schedule", label: "重要不紧急" },
      { value: "delegate", label: "紧急不重要" },
      { value: "park", label: "不重要不紧急" },
    ],
  },
  { name: "notes", label: "备注", type: "textarea", placeholder: "补充执行说明" },
];
