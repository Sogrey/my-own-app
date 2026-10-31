import { api } from "../../api";
import { EntityForm, Modal, type FieldDefinition } from "../../components/ui";
import type { CollectionName, Entity } from "../../types";
import type { DialogState, WorkspaceRun } from "../pageTypes";
import { mealTypes } from "./dietConstants";

type Props = {
  dialog: DialogState;
  close: () => void;
  date: string;
  foods: Entity[];
  run: WorkspaceRun;
};

export function DietDialog({ dialog, close, date, foods, run }: Props) {
  if (!dialog) return null;
  const configs: Record<string, { title: string; collection: CollectionName; fields: FieldDefinition[]; defaults: Record<string, unknown> }> = {
    target: {
      title: "设置营养目标",
      collection: "nutritionTargets",
      fields: [
        { name: "effective_date", label: "生效日期", type: "date", required: true },
        { name: "calories", label: "热量 kcal", type: "number" },
        { name: "protein", label: "蛋白质 g", type: "number" },
        { name: "carbs", label: "碳水 g", type: "number" },
        { name: "fat", label: "脂肪 g", type: "number" },
      ],
      defaults: { effective_date: date },
    },
    food: {
      title: dialog.item?.id ? "编辑常用食物" : "添加常用食物",
      collection: "foods",
      fields: [
        { name: "name", label: "食物名称", required: true },
        { name: "default_portion", label: "默认份量", type: "number", step: "0.1" },
        { name: "portion_unit", label: "单位", placeholder: "份、克、个" },
        { name: "calories", label: "热量 kcal", type: "number" },
        { name: "protein", label: "蛋白质 g", type: "number", step: "0.1" },
        { name: "carbs", label: "碳水 g", type: "number", step: "0.1" },
        { name: "fat", label: "脂肪 g", type: "number", step: "0.1" },
      ],
      defaults: { default_portion: 1, portion_unit: "份" },
    },
    meal: {
      title: "记录餐食",
      collection: "meals",
      fields: [
        { name: "meal_date", label: "日期", type: "date", required: true },
        { name: "meal_type", label: "餐次", type: "select", required: true, options: [...mealTypes] },
        { name: "name", label: "餐食名称", required: true },
        { name: "entry_kind", label: "记录类型", type: "select", required: true, options: [{ value: "planned", label: "计划" }, { value: "actual", label: "实际摄入" }] },
        { name: "notes", label: "备注", type: "textarea" },
      ],
      defaults: { meal_date: date, meal_type: dialog.item?.meal_type ?? "breakfast", entry_kind: "planned" },
    },
    mealItem: {
      title: "添加食物明细",
      collection: "mealItems",
      fields: [
        { name: "food_id", label: "常用食物", type: "select", options: foods.map((food) => ({ value: food.id, label: String(food.name) })) },
        { name: "food_name", label: "食物名称", required: true },
        { name: "quantity", label: "份量", type: "number", step: "0.1" },
        { name: "calories", label: "热量 kcal", type: "number" },
        { name: "protein", label: "蛋白质 g", type: "number", step: "0.1" },
        { name: "carbs", label: "碳水 g", type: "number", step: "0.1" },
        { name: "fat", label: "脂肪 g", type: "number", step: "0.1" },
      ],
      defaults: { meal_id: dialog.item?.meal_id, quantity: 1 },
    },
  };
  const config = configs[dialog.type] ?? configs.meal;
  return (
    <Modal open title={config.title} description="没有掌握的营养数据可以留空。" onClose={close}>
      <EntityForm
        fields={config.fields}
        initial={{ ...config.defaults, ...dialog.item }}
        onCancel={close}
        onSubmit={async (values) => {
          let payload: Record<string, unknown> = { ...config.defaults, ...values };
          if (dialog.type === "mealItem" && payload.food_id) {
            const food = foods.find((item) => item.id === payload.food_id);
            if (food) {
              payload = {
                ...food,
                ...payload,
                id: undefined,
                created_at: undefined,
                updated_at: undefined,
                meal_id: config.defaults.meal_id,
                food_name: payload.food_name || food.name,
              };
            }
          }
          const editingId = dialog.item?.id;
          if (editingId) await run(() => api.update(config.collection, editingId, payload));
          else await run(() => api.create(config.collection, payload));
          close();
        }}
      />
    </Modal>
  );
}
