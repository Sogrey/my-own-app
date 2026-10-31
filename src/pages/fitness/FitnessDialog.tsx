import { api } from "../../api";
import { EntityForm, Modal, type FieldDefinition } from "../../components/ui";
import type { CollectionName, Entity } from "../../types";
import { localDate } from "../../utils";
import type { DialogState, WorkspaceRun } from "../pageTypes";

type Props = {
  dialog: DialogState;
  close: () => void;
  template?: Entity;
  run: WorkspaceRun;
};

export function FitnessDialog({ dialog, close, template, run }: Props) {
  if (!dialog) return null;
  const configs: Record<string, { title: string; collection: CollectionName; fields: FieldDefinition[]; defaults: Record<string, unknown> }> = {
    template: {
      title: "新建训练模板",
      collection: "workoutTemplates",
      fields: [
        { name: "name", label: "模板名称", required: true },
        { name: "body_part", label: "训练部位", required: true, placeholder: "例如：胸部、背部、腿部" },
        { name: "weekday", label: "计划星期（1-7）", type: "number" },
        { name: "notes", label: "说明", type: "textarea" },
      ],
      defaults: {},
    },
    exercise: {
      title: "添加训练动作",
      collection: "workoutTemplateExercises",
      fields: [
        { name: "name", label: "动作名称", required: true },
        { name: "target_sets", label: "目标组数", type: "number", required: true },
        { name: "target_reps", label: "目标次数", type: "number" },
        { name: "target_weight", label: "目标重量 kg", type: "number", step: "0.5" },
        { name: "rest_seconds", label: "休息秒数", type: "number" },
      ],
      defaults: { template_id: template?.id, target_sets: 3 },
    },
    workout: {
      title: "安排一次训练",
      collection: "workouts",
      fields: [
        { name: "name", label: "训练名称", required: true },
        { name: "body_part", label: "训练部位", required: true, placeholder: "例如：胸部、背部、腿部" },
        { name: "workout_date", label: "日期", type: "date", required: true },
        { name: "feeling", label: "备注", type: "textarea" },
      ],
      defaults: {
        template_id: template?.id,
        name: template?.name ?? "自主训练",
        body_part: template?.body_part ?? "",
        workout_date: localDate(),
        status: "planned",
      },
    },
    metric: {
      title: "记录身体数据",
      collection: "bodyMetrics",
      fields: [
        { name: "metric_date", label: "日期", type: "date", required: true },
        { name: "weight", label: "体重 kg", type: "number", step: "0.1" },
        { name: "waist", label: "腰围 cm", type: "number", step: "0.1" },
        { name: "chest", label: "胸围 cm", type: "number", step: "0.1" },
        { name: "body_fat", label: "体脂 %", type: "number", step: "0.1" },
        { name: "notes", label: "备注", type: "textarea" },
      ],
      defaults: { metric_date: localDate() },
    },
  };
  const config = configs[dialog.type] ?? configs.workout;
  const editing = Boolean(dialog.item?.id);
  return (
    <Modal open title={editing ? config.title.replace(/^(新建|添加|安排|记录)/, "编辑") : config.title} onClose={close}>
      <EntityForm
        fields={config.fields}
        initial={{ ...config.defaults, ...dialog.item }}
        onCancel={close}
        onSubmit={async (values) => {
          const payload = { ...config.defaults, ...values };
          const editingId = dialog.item?.id;
          if (editingId) await run(() => api.update(config.collection, editingId, payload));
          else await run(() => api.create(config.collection, payload));
          close();
        }}
      />
    </Modal>
  );
}
