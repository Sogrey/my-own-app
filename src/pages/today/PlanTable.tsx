import { ArrowBendDownRight, ArrowSquareOut, CalendarPlus, Check, Clock, DotsThree, Play, Trash, X } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, EmptyState } from "../../components/ui";
import { sourceFocusPath, sourceModuleLabels } from "../../moduleRoutes";
import { classNames, formatDate, type DateFormat } from "../../utils";

type Props = {
  items: Array<Record<string, any>>;
  view: "today" | "week" | "history";
  dateFormat: DateFormat;
  menu: string | null;
  setMenu: (id: string | null) => void;
  onComplete: (item: Record<string, any>) => void;
  onEdit: (item: Record<string, any>) => void;
  onStart: (item: Record<string, any>) => void;
  onPostponeTomorrow: (item: Record<string, any>) => void;
  onPostponePick: (item: Record<string, any>) => void;
  onCancel: (item: Record<string, any>) => void;
  onDelete: (item: Record<string, any>) => void;
  onCreate: () => void;
};

export function PlanTable({
  items, view, dateFormat, menu, setMenu,
  onComplete, onEdit, onStart, onPostponeTomorrow, onPostponePick, onCancel, onDelete, onCreate,
}: Props) {
  const navigate = useNavigate();
  if (!items.length) {
    return <EmptyState title="这个时间范围还没有计划" description="添加第一件需要执行的事情。" hint="可以从首页快速备忘一键转过来" action={<Button variant="secondary" onClick={onCreate}>添加事项</Button>} />;
  }
  return (
    <div className="plan-table">
      {items.map((item) => (
        <div className={classNames("plan-table-row", item.status === "done" && "is-done")} key={item.id}>
          <button className="complete-control" disabled={item.status === "done"} onClick={() => onComplete(item)}>
            {item.status === "done" ? <Check size={14} /> : item.status === "doing" ? <Play size={12} /> : null}
          </button>
          <div className="date-block">
            <strong>{item.start_time || "待安排"}</strong>
            {view !== "today" ? <small>{formatDate(item.plan_date, dateFormat)}</small> : null}
          </div>
          <div className="plan-copy">
            <strong>{item.display_title || item.title}</strong>
            <small>{item.notes || (item.source_module ? `来自 ${sourceModuleLabels[item.source_module] ?? item.source_module}` : "独立事项")}</small>
            {item.source_module ? (
              <button className="text-button source-link" onClick={() => navigate(sourceFocusPath(item.source_module, item.source_entity_id))}>
                打开来源 <ArrowSquareOut size={13} />
              </button>
            ) : null}
          </div>
          <Badge tone={item.priority === "high" ? "warning" : item.status === "done" ? "success" : "neutral"}>
            {item.status === "done" ? "已完成" : item.priority === "high" ? "高优先" : "待处理"}
          </Badge>
          <div className="row-menu-wrap">
            <button className="icon-button" onClick={() => setMenu(menu === item.id ? null : item.id)}><DotsThree size={20} /></button>
            {menu === item.id ? (
              <div className="row-menu">
                <button onClick={() => { onEdit(item); setMenu(null); }}><Clock size={15} />调整时间</button>
                <button onClick={() => onStart(item)}><Play size={15} />开始执行</button>
                <button onClick={() => { onPostponeTomorrow(item); setMenu(null); }}><ArrowBendDownRight size={15} />移到明天</button>
                <button onClick={() => { onPostponePick(item); setMenu(null); }}><CalendarPlus size={15} />延期到指定日期</button>
                <button onClick={() => onCancel(item)}><X size={15} />取消</button>
                <button className="danger" onClick={() => onDelete(item)}><Trash size={15} />移到回收站</button>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
