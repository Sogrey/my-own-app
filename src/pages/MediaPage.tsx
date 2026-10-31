import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DragEndEvent } from "@dnd-kit/core";
import { Plus } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { buildMediaAnalytics } from "../features/mediaAnalytics";
import { buildMediaWeekSchedule, countScheduledInWeek } from "../features/mediaSchedule";
import { localDate, normalizeWeekStart } from "../utils";
import { todayPlanPayload } from "../planLink";
import { Button, EmptyState, EntityForm, Modal, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import { mediaFields } from "./media/mediaConstants";
import { MediaWeekSchedule } from "./media/MediaWeekSchedule";
import { MediaAnalyticsSection } from "./media/MediaAnalyticsSection";
import { MediaKanban } from "./media/MediaKanban";

export function MediaPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const today = localDate();
  const weekStart = normalizeWeekStart(data.settings.weekStart);
  const analytics = useMemo(() => buildMediaAnalytics(data.mediaContents), [data.mediaContents]);
  const schedule = useMemo(
    () => buildMediaWeekSchedule(data.mediaContents, today, weekStart),
    [data.mediaContents, today, weekStart],
  );
  const scheduledCount = countScheduledInWeek(schedule);
  const hasContent = data.mediaContents.length > 0;

  useEffect(() => { if (params.get("new") === "1") setEditing({ stage: "idea" }); }, [params]);
  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const item = data.mediaContents.find((content) => content.id === focusId);
    if (!item) return;
    setEditing(item);
    setParams({});
  }, [data.mediaContents, params, setParams]);

  const close = () => { setEditing(null); setParams({}); };
  const openItem = (id: string) => {
    setEditing(data.mediaContents.find((entry) => entry.id === id) ?? { id, stage: "idea" });
  };
  const move = async (id: string, stage: string) => {
    const input: Record<string, any> = { stage };
    if (stage === "published") input.published_at = localDate();
    await run(() => api.update("mediaContents", id, input));
  };
  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id) void move(String(event.active.id), String(event.over.id));
  };

  return (
    <div>
      <PageHeader
        icon={<ModuleArtwork module="media" />}
        eyebrow="创作流程"
        title="自媒体"
        description="从灵感、制作到发布，把内容放在真正的创作流程里。"
        actions={<Button onClick={() => setEditing({ stage: "idea" })}><Plus size={18} />记录内容</Button>}
      />
      {!hasContent ? (
        <EmptyState
          title="还没有内容灵感"
          description="先记录一个标题，并可选填写计划发布日期；有数据后再展开看板与排期。"
          hint="只填标题也能开始，发布日期以后再补"
          action={<Button variant="secondary" onClick={() => setEditing({ stage: "idea" })}>记录灵感</Button>}
        />
      ) : (
        <>
          <div className="media-kpis">
            <div><span>正在制作</span><strong>{data.mediaContents.filter((item) => item.stage === "producing").length}</strong></div>
            <div><span>等待发布</span><strong>{data.mediaContents.filter((item) => item.stage === "ready").length}</strong></div>
            <div><span>本月已发布</span><strong>{data.mediaContents.filter((item) => item.stage === "published" && item.published_at?.slice(0, 7) === today.slice(0, 7)).length}</strong></div>
          </div>
          <MediaWeekSchedule
            schedule={schedule}
            today={today}
            scheduledCount={scheduledCount}
            onOpen={openItem}
          />
          <MediaAnalyticsSection analytics={analytics} />
          <Section title="创作看板" description="按阶段拖拽推进；空列只保留轻提示。">
            <MediaKanban
              items={data.mediaContents}
              menu={menu}
              setMenu={setMenu}
              onEdit={setEditing}
              onMove={move}
              onDelete={(id) => void run(() => api.remove("mediaContents", id))}
              onPlan={(item) => void run(() => api.create("planItems", todayPlanPayload({
                title: `推进内容：${item.title}`,
                sourceModule: "media",
                sourceEntityType: "media_content",
                sourceEntityId: item.id,
              })))}
              onDragEnd={handleDragEnd}
            />
          </Section>
        </>
      )}
      <Modal open={editing !== null} title={editing?.id ? "编辑内容" : "记录内容"} description="内容阶段和发布信息会影响首页摘要。" onClose={close} wide>
        <EntityForm
          fields={mediaFields}
          initial={editing ?? { stage: "idea" }}
          onCancel={close}
          onSubmit={async (values) => {
            if (editing?.id) await run(() => api.update("mediaContents", editing.id, values));
            else await run(() => api.create("mediaContents", values));
            close();
          }}
        />
      </Modal>
    </div>
  );
}
