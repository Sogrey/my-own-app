import { Button, Modal } from "./ui";
import type { SourceSyncOffer } from "../planComplete";

type Props = {
  open: boolean;
  title: string;
  offer: SourceSyncOffer;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (syncSource: boolean) => void | Promise<void>;
};

/** 完成关联计划时显式询问是否回写来源；禁止静默改业务状态。 */
export function PlanCompleteDialog({ open, title, offer, busy = false, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} title="完成计划事项" description={`「${title}」来自其他模块。是否同时更新来源状态？`} onClose={onClose}>
      <p className="quiet-line" style={{ margin: "0 22px 4px" }}>{offer.detail}</p>
      <footer className="modal-actions">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>取消</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => void onConfirm(false)}>仅完成计划</Button>
        <Button type="button" disabled={busy} loading={busy} onClick={() => void onConfirm(true)}>{offer.actionLabel}</Button>
      </footer>
    </Modal>
  );
}
