import { api } from "../../api";
import { EntityForm, Modal } from "../../components/ui";
import type { Entity } from "../../types";
import type { DialogState, WorkspaceRun } from "../pageTypes";
import { consultingFormConfig } from "./formConfig";

type Props = {
  dialog: DialogState;
  close: () => void;
  clientId: string | null;
  project?: Entity;
  run: WorkspaceRun;
};

/** 仅用于新建；已有记录的编辑走页面右侧 DetailPanel。 */
export function ConsultingDialog({ dialog, close, clientId, project, run }: Props) {
  if (!dialog || dialog.item?.id) return null;
  const config = consultingFormConfig(dialog.type, clientId, project);
  return (
    <Modal open title={config.title} description="记录会保存在当前电脑的数据文件中。" onClose={close}>
      <EntityForm
        fields={config.fields}
        initial={{ ...config.defaults }}
        onCancel={close}
        onSubmit={async (values) => {
          await run(() => api.create(config.collection, { ...config.defaults, ...values }));
          close();
        }}
      />
    </Modal>
  );
}
