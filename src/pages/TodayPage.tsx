import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { addDays, formatDate, formatDuration, localDate, normalizeDateFormat, normalizeWeekStart, weekRange } from "../utils";
import { Button, EntityForm, Modal, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import { PlanCompleteDialog } from "../components/PlanCompleteDialog";
import { canOfferSourceSync, sourceSyncOffer, type SourceSyncOffer } from "../planComplete";
import { planFields } from "./today/todayFields";
import { PlanTable } from "./today/PlanTable";

export function TodayPage() {
  const { data, registerSaveHandler, run, notifySuccess } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"today" | "week" | "history">("today");
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [postpone, setPostpone] = useState<{ id: string; date: string } | null>(null);
  const [review, setReview] = useState("");
  const [savedReview, setSavedReview] = useState("");
  const [completeTarget, setCompleteTarget] = useState<{ id: string; title: string; source_entity_id: string; offer: SourceSyncOffer } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const reviewInput = useRef<HTMLTextAreaElement>(null);
  const newOpen = params.get("new") === "1";
  const openForm = (item: Record<string, any> | null = null) => { setEditing(item ?? {}); if (!item) setParams({ new: "1" }); };
  const closeForm = () => { setEditing(null); setParams({}); };

  const requestComplete = (item: Record<string, any>) => {
    if (!canOfferSourceSync(item)) {
      void run(() => api.completePlan(item.id)).then(() => notifySuccess("已完成", String(item.display_title || item.title || "计划事项")));
      return;
    }
    const offer = sourceSyncOffer(item.source_entity_type)!;
    setCompleteTarget({
      id: item.id,
      title: String(item.display_title || item.title || "计划事项"),
      source_entity_id: String(item.source_entity_id),
      offer,
    });
  };

  const confirmComplete = async (syncSource: boolean) => {
    if (!completeTarget || completeBusy) return;
    setCompleteBusy(true);
    try {
      await run(async () => {
        await api.completePlan(completeTarget.id);
        if (syncSource) await api.update(completeTarget.offer.collection, completeTarget.source_entity_id, completeTarget.offer.patch);
      });
      notifySuccess(syncSource ? "已完成并同步来源" : "已完成计划", completeTarget.title);
      setCompleteTarget(null);
    } finally {
      setCompleteBusy(false);
    }
  };

  useEffect(() => {
    void api.getReview(selectedDate).then((value) => {
      const content = value?.content ?? "";
      setReview(content);
      setSavedReview(content);
    });
  }, [selectedDate]);

  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const item = data.planItems.find((plan) => plan.id === focusId);
    if (!item) return;
    setSelectedDate(item.plan_date || localDate());
    setView("today");
    setEditing(item);
    setParams({});
  }, [data.planItems, params, setParams]);

  useEffect(() => {
    if (params.get("review") !== "1") return;
    setView("today");
    setSelectedDate(localDate());
    setParams({});
    const frame = window.requestAnimationFrame(() => {
      reviewInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      reviewInput.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [params, setParams]);

  const persistReview = useCallback(async () => {
    if (review === savedReview) return;
    await run(() => api.setReview(selectedDate, review));
    setSavedReview(review);
  }, [review, run, savedReview, selectedDate]);

  useEffect(() => registerSaveHandler(persistReview), [persistReview, registerSaveHandler]);

  const dateFormat = normalizeDateFormat(data.settings.dateFormat);
  const weekStart = normalizeWeekStart(data.settings.weekStart);
  const currentWeek = useMemo(() => weekRange(selectedDate, weekStart), [selectedDate, weekStart]);
  const items = useMemo(() => {
    if (view === "today") return data.planItems.filter((item) => item.plan_date === selectedDate && item.status !== "cancelled");
    if (view === "week") {
      return data.planItems.filter((item) => item.plan_date >= currentWeek.start && item.plan_date <= currentWeek.end && item.status !== "cancelled");
    }
    return data.planItems.filter((item) => item.plan_date < selectedDate || ["done", "cancelled"].includes(item.status));
  }, [currentWeek.end, currentWeek.start, data.planItems, selectedDate, view]);
  const ordered = [...items].sort((a, b) => `${a.plan_date}${a.start_time || "99:99"}`.localeCompare(`${b.plan_date}${b.start_time || "99:99"}`));
  const complete = items.filter((item) => item.status === "done").length;

  return (
    <div>
      <PageHeader icon={<ModuleArtwork module="today" />} eyebrow="日常执行" title="今日计划" description="只安排今天何时执行什么，业务详情仍留在对应模块。" actions={<Button onClick={() => openForm()}><CalendarPlus size={18} />添加事项</Button>} />
      <div className="plan-toolbar">
        <div className="segmented" role="tablist">{(["today", "week", "history"] as const).map((key) => <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>{key === "today" ? "今日" : key === "week" ? "本周" : "历史"}</button>)}</div>
        <label className="date-control"><span>起始日期</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
        <div className="plan-stat"><span>完成</span><strong>{complete}/{items.length}</strong></div>
        <div className="plan-stat"><span>预计</span><strong>{formatDuration(items.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0))}</strong></div>
      </div>
      <Section title={view === "today" ? formatDate(selectedDate, dateFormat) : view === "week" ? `${formatDate(currentWeek.start, dateFormat)} – ${formatDate(currentWeek.end, dateFormat)}` : "历史记录"} description={view === "today" ? "按时间顺序处理；没有时间的事项排在最后。" : view === "week" ? `按${weekStart === "sunday" ? "周日" : "周一"}开始的自然周查看。` : "按日期查看计划状态。"}>
        <PlanTable
          items={ordered}
          view={view}
          dateFormat={dateFormat}
          menu={menu}
          setMenu={setMenu}
          onComplete={requestComplete}
          onEdit={openForm}
          onStart={(item) => void run(() => api.update("planItems", item.id, { status: "doing" }))}
          onPostponeTomorrow={(item) => {
            void run(() => api.postponePlan(item.id, addDays(item.plan_date, 1))).then(() => notifySuccess("已移到明天"));
          }}
          onPostponePick={(item) => setPostpone({ id: item.id, date: addDays(item.plan_date, 1) })}
          onCancel={(item) => void run(() => api.update("planItems", item.id, { status: "cancelled" }))}
          onDelete={(item) => void run(() => api.remove("planItems", item.id))}
          onCreate={() => openForm()}
        />
      </Section>
      {view === "today" ? <Section title="当日复盘" description="一句话记录今天做得如何"><textarea id="daily-review" ref={reviewInput} className="review-input" aria-label="当日复盘" value={review} onChange={(event) => setReview(event.target.value)} onBlur={() => void persistReview().catch(() => undefined)} placeholder="今天最值得记住的进展、问题或调整……" /></Section> : null}
      <Modal open={newOpen || editing !== null} title={editing?.id ? "编辑计划事项" : "添加计划事项"} description="时间可以暂时留空，之后再安排。" onClose={closeForm}>
        <EntityForm fields={planFields} initial={{ plan_date: selectedDate, priority: "medium", ...editing }} onCancel={closeForm} onSubmit={async (values) => { if (editing?.id) await run(() => api.update("planItems", editing.id, values)); else await run(() => api.create("planItems", values)); closeForm(); }} />
      </Modal>
      <Modal open={Boolean(postpone)} title="延期到指定日期" description="事项会移到所选日期，并回到未开始状态。" onClose={() => setPostpone(null)}>
        <form className="entity-form" onSubmit={(event) => {
          event.preventDefault();
          if (!postpone?.date) return;
          void run(() => api.postponePlan(postpone.id, postpone.date)).then(() => {
            notifySuccess("已延期", postpone.date);
            setPostpone(null);
          });
        }}>
          <label className="form-field">
            <span>目标日期<em>必填</em></span>
            <input type="date" autoFocus required value={postpone?.date ?? ""} onChange={(event) => setPostpone((current) => current ? { ...current, date: event.target.value } : current)} />
          </label>
          <footer className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setPostpone(null)}>取消</Button>
            <Button type="submit">确认延期</Button>
          </footer>
        </form>
      </Modal>
      {completeTarget ? (
        <PlanCompleteDialog
          open
          title={completeTarget.title}
          offer={completeTarget.offer}
          busy={completeBusy}
          onClose={() => { if (!completeBusy) setCompleteTarget(null); }}
          onConfirm={confirmComplete}
        />
      ) : null}
    </div>
  );
}
