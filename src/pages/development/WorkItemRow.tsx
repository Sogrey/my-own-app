import { Bug, CalendarPlus, Check, Lightbulb, Trash, Wrench } from "@phosphor-icons/react";
import { Badge } from "../../components/ui";
import { classNames } from "../../utils";

type Props = {
  item: Record<string, any>;
  milestone?: Record<string, any>;
  selected?: boolean;
  onEdit: () => void;
  onDone: () => void;
  onPlan: () => void;
  onDelete: () => void;
};

export function WorkItemRow({ item, milestone, selected, onEdit, onDone, onPlan, onDelete }: Props) {
  const icons = { feature: Lightbulb, requirement: Wrench, bug: Bug, technical: Wrench } as const;
  const Icon = icons[item.item_type as keyof typeof icons] ?? Wrench;
  return (
    <article className={classNames("work-item", item.status === "done" && "is-done", selected && "is-selected")}>
      <button className="complete-control" disabled={item.status === "done"} onClick={onDone}>{item.status === "done" ? <Check size={14} /> : null}</button>
      <Icon size={18} />
      <div className="work-copy">
        <button type="button" onClick={onEdit}>{item.title}</button>
        <small>{milestone?.name || "未关联里程碑"}{item.description ? ` · ${item.description}` : ""}</small>
      </div>
      <Badge tone={item.priority === "high" ? "warning" : "neutral"}>
        {item.item_type === "bug" ? "Bug" : item.item_type === "feature" ? "功能" : item.item_type === "requirement" ? "需求" : "技术"}
      </Badge>
      <button className="icon-button" title="加入今日计划" onClick={onPlan}><CalendarPlus size={17} /></button>
      <button className="icon-button danger-text" title="移到回收站" onClick={onDelete}><Trash size={17} /></button>
    </article>
  );
}
