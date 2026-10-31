import { type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CalendarBlank, CalendarPlus, ChartLine, DotsThree, LinkSimple, PencilSimple, Trash } from "@phosphor-icons/react";
import { Badge } from "../../components/ui";
import { classNames, formatDate } from "../../utils";
import { stages } from "./mediaConstants";

type MediaItem = Record<string, any>;

type Props = {
  items: MediaItem[];
  menu: string | null;
  setMenu: Dispatch<SetStateAction<string | null>>;
  onEdit: (item: MediaItem) => void;
  onMove: (id: string, stage: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onPlan: (item: MediaItem) => void;
  onDragEnd: (event: DragEndEvent) => void;
};

export function MediaKanban({ items, menu, setMenu, onEdit, onMove, onDelete, onPlan, onDragEnd }: Props) {
  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {stages.map((stage) => (
          <StageColumn
            key={stage.value}
            stage={stage}
            items={items.filter((item) => item.stage === stage.value)}
            onEdit={onEdit}
            onMove={onMove}
            onDelete={onDelete}
            onPlan={onPlan}
            menu={menu}
            setMenu={setMenu}
          />
        ))}
      </div>
    </DndContext>
  );
}

function StageColumn({ stage, items, onEdit, onMove, onDelete, onPlan, menu, setMenu }: {
  stage: (typeof stages)[number];
  items: MediaItem[];
  onEdit: (item: MediaItem) => void;
  onMove: (id: string, stage: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onPlan: (item: MediaItem) => void;
  menu: string | null;
  setMenu: Dispatch<SetStateAction<string | null>>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  return (
    <section ref={setNodeRef} className={classNames("kanban-column", isOver && "is-over")}>
      <header>
        <div><span className={`stage-dot stage-${stage.value}`} /><h2>{stage.label}</h2></div>
        <Badge>{items.length}</Badge>
      </header>
      <div className="kanban-stack">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} onEdit={onEdit} onMove={onMove} onDelete={onDelete} onPlan={onPlan} menu={menu} setMenu={setMenu} />
        ))}
        {items.length === 0 ? <p className="drop-hint">拖到这里</p> : null}
      </div>
    </section>
  );
}

function MediaCard({ item, onEdit, onMove, onDelete, onPlan, menu, setMenu }: {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onMove: (id: string, stage: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  onPlan: (item: MediaItem) => void;
  menu: string | null;
  setMenu: Dispatch<SetStateAction<string | null>>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  return (
    <article ref={setNodeRef} style={style} className={classNames("media-card", isDragging && "is-dragging")} {...listeners} {...attributes}>
      <div className="media-card-top">
        <Badge tone="accent">{item.platform || "未指定平台"}</Badge>
        <div className="row-menu-wrap">
          <button className="icon-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setMenu(menu === item.id ? null : item.id); }}><DotsThree size={18} /></button>
          {menu === item.id ? (
            <div className="row-menu" onPointerDown={(event) => event.stopPropagation()}>
              <button onClick={() => onEdit(item)}><PencilSimple size={15} />编辑详情</button>
              <button onClick={() => onPlan(item)}><CalendarPlus size={15} />加入今日计划</button>
              <select aria-label="改变制作阶段" value={item.stage} onChange={(event) => onMove(item.id, event.target.value)}>
                {stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
              <button className="danger" onClick={() => onDelete(item.id)}><Trash size={15} />移到回收站</button>
            </div>
          ) : null}
        </div>
      </div>
      <h3>{item.title}</h3>
      <p>{item.copy_text || "尚未添加内容笔记"}</p>
      <div className="media-meta">
        {item.planned_publish_at ? <span><CalendarBlank size={14} />{formatDate(item.planned_publish_at)}</span> : null}
        {item.publish_url ? <span><LinkSimple size={14} />已发布</span> : null}
        {item.views !== null && item.views !== undefined ? <span><ChartLine size={14} />{item.views}</span> : null}
      </div>
    </article>
  );
}
