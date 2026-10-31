import { api } from "../../api";
import { EntityForm, Modal, type FieldDefinition } from "../../components/ui";
import type { CollectionName, Entity } from "../../types";
import { localDate } from "../../utils";
import type { DialogState, WorkspaceRun } from "../pageTypes";

type Props = {
  dialog: DialogState;
  close: () => void;
  clientId: string | null;
  project?: Entity;
  run: WorkspaceRun;
};

export function ConsultingDialog({ dialog, close, clientId, project, run }: Props) {
  if (!dialog) return null;
  const editing = Boolean(dialog.item?.id);
  const map: Record<string, { title: string; editTitle: string; collection: CollectionName; fields: FieldDefinition[]; defaults: Record<string, unknown> }> = {
    client: {
      title: "添加客户",
      editTitle: "编辑客户",
      collection: "clients",
      fields: [
        { name: "name", label: "客户名称", required: true },
        { name: "notes", label: "基础备注", type: "textarea" },
      ],
      defaults: {},
    },
    project: {
      title: "新建咨询项目",
      editTitle: "编辑咨询项目",
      collection: "consultingProjects",
      fields: [
        { name: "name", label: "项目名称", required: true },
        { name: "current_need", label: "当前需求", type: "textarea" },
        { name: "status", label: "状态", type: "select", required: true, options: [{ value: "active", label: "进行中" }, { value: "waiting", label: "等待中" }, { value: "completed", label: "已完成" }] },
      ],
      defaults: { client_id: clientId, status: "active" },
    },
    interaction: {
      title: "记录沟通",
      editTitle: "编辑沟通",
      collection: "consultingInteractions",
      fields: [
        { name: "occurred_at", label: "时间", type: "datetime-local", required: true },
        { name: "interaction_type", label: "形式", type: "select", required: true, options: [{ value: "meeting", label: "会议" }, { value: "call", label: "电话" }, { value: "message", label: "消息" }] },
        { name: "notes", label: "沟通记录", type: "textarea" },
      ],
      defaults: { project_id: project?.id, occurred_at: new Date().toISOString().slice(0, 16), interaction_type: "meeting" },
    },
    deliverable: {
      title: "添加交付物",
      editTitle: "编辑交付物",
      collection: "consultingDeliverables",
      fields: [
        { name: "name", label: "交付物名称", required: true },
        { name: "due_date", label: "截止日期", type: "date" },
      ],
      defaults: { project_id: project?.id, status: "todo" },
    },
    followup: {
      title: "安排跟进",
      editTitle: "编辑跟进",
      collection: "consultingFollowups",
      fields: [
        { name: "followup_at", label: "跟进时间", type: "datetime-local", required: true },
        { name: "content", label: "跟进内容", type: "textarea", required: true },
      ],
      defaults: { project_id: project?.id, followup_at: `${localDate()}T10:00`, status: "todo" },
    },
    time: {
      title: "记录咨询时长",
      editTitle: "编辑咨询时长",
      collection: "consultingTimeEntries",
      fields: [
        { name: "entry_date", label: "日期", type: "date", required: true },
        { name: "minutes", label: "分钟", type: "number", required: true },
        { name: "fee_cents", label: "费用（分）", type: "number", helper: "例如 120000 表示 1200 元" },
        { name: "settled", label: "已经结算", type: "checkbox" },
        { name: "notes", label: "备注", type: "textarea" },
      ],
      defaults: { project_id: project?.id, entry_date: localDate(), minutes: 60, settled: false },
    },
  };
  const config = map[dialog.type] ?? map.followup;
  return (
    <Modal open title={editing ? config.editTitle : config.title} description="记录会保存在当前电脑的数据文件中。" onClose={close}>
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
