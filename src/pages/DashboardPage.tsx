import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, Clock, ArrowRight, NotePencil, CalendarBlank, Plus, Barbell, ListPlus, Bug, ForkKnife, ArrowBendDownRight, Notebook } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { collectionFocusPath, moduleFocusPath, sourceFocusPath, withFocus } from "../moduleRoutes";
import type { CollectionName } from "../types";
import { addDays, localDate, formatDuration, formatDate, classNames, normalizeDateFormat, normalizeWeekStart } from "../utils";
import { Badge, Button, EmptyState, ErrorState, PageHeader, Section, Skeleton } from "../components/ui";
import { ModuleArtwork, type ModuleArtworkName } from "../components/ModuleArtwork";
import { PlanCompleteDialog } from "../components/PlanCompleteDialog";
import { canOfferSourceSync, sourceSyncOffer, type SourceSyncOffer } from "../planComplete";
import { shouldPromptDailyReview } from "../dailyReview";
import { buildWeekReview } from "../features/weekReview";
import { canOpenConverted, memoConvertedLabel, recentArchivedMemos } from "../features/memoArchive";
import { buildEisenhowerMatrix } from "../features/eisenhowerMatrix";
import { EisenhowerMatrix } from "./dashboard/EisenhowerMatrix";

const memoConvertTargets: Array<{ collection: CollectionName; label: string; fields?: Record<string, unknown> }> = [
  { collection: "clients", label: "客户线索" },
  { collection: "entertainmentItems", label: "游戏娱乐", fields: { status: "playing" } },
  { collection: "workoutTemplates", label: "训练模板" },
  { collection: "foods", label: "食材" },
];

const summaryMeta: Record<string, { title: string; route: string; module: ModuleArtworkName; empty: string }> = {
  media: { title: "自媒体", route: "/media", module: "media", empty: "暂无待发布内容" },
  development: { title: "开发工作", route: "/development", module: "development", empty: "暂无高优先级问题" },
  consulting: { title: "咨询工作", route: "/consulting", module: "consulting", empty: "暂无待跟进事项" },
  fitness: { title: "健身计划", route: "/fitness", module: "fitness", empty: "暂无近期训练" },
  diet: { title: "饮食计划", route: "/diet", module: "diet", empty: "今天还没有餐食记录" },
  entertainment: { title: "游戏娱乐", route: "/entertainment", module: "entertainment", empty: "暂无正在进行的游戏" },
};

export function DashboardPage() {
  const date = localDate();
  const dashboard = useQuery({ queryKey: ["dashboard", date], queryFn: () => api.dashboard(date) });
  const review = useQuery({ queryKey: ["daily-review", date], queryFn: () => api.getReview(date), staleTime: 30_000 });
  const { data, registerSaveHandler, run, notifySuccess } = useWorkspace();
  const navigate = useNavigate();
  const activeMemo = useMemo(() => data.quickMemos.find((item) => !item.archived_at && !item.converted_id), [data.quickMemos]);
  const archivedMemos = useMemo(() => recentArchivedMemos(data.quickMemos), [data.quickMemos]);
  const [memo, setMemo] = useState(activeMemo?.content ?? "");
  const [memoId, setMemoId] = useState<string | null>(activeMemo?.id ?? null);
  const [savedMemo, setSavedMemo] = useState(activeMemo?.content ?? "");
  const [memoError, setMemoError] = useState("");
  const [showMemoArchive, setShowMemoArchive] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<{ id: string; title: string; source_entity_id: string; offer: SourceSyncOffer } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const memoInput = useRef<HTMLTextAreaElement>(null);

  const restoreMemo = async (item: Record<string, any>) => {
    await run(async () => {
      if (memoId && memoId !== item.id) {
        await api.update("quickMemos", memoId, { archived_at: new Date().toISOString() });
      }
      await api.update("quickMemos", item.id, { archived_at: null, converted_type: null, converted_id: null });
    });
    setMemo(String(item.content || ""));
    setSavedMemo(String(item.content || ""));
    setMemoId(item.id);
    setShowMemoArchive(false);
    memoInput.current?.focus();
  };

  const reconvertMemo = async (item: Record<string, any>, collection: CollectionName, fields: Record<string, unknown> = {}) => {
    // 先恢复为可转换态，再走同一套 convert 接口，保留「再次转出」语义。
    await run(async () => {
      await api.update("quickMemos", item.id, { archived_at: null, converted_type: null, converted_id: null });
      await api.convertMemo(item.id, collection, fields);
    });
  };

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

  const postponeItem = async (item: Record<string, any>) => {
    await run(() => api.postponePlan(item.id, addDays(item.plan_date || date, 1)));
    notifySuccess("已移到明天", String(item.display_title || item.title || "计划事项"));
  };

  useEffect(() => {
    if (activeMemo && !memoId) { setMemo(activeMemo.content); setSavedMemo(activeMemo.content); setMemoId(activeMemo.id); }
  }, [activeMemo, memoId]);

  const persistMemo = useCallback(async () => {
    if (memo === savedMemo || (!memo.trim() && !memoId)) return;
    try {
      setMemoError("");
      if (memoId) await run(() => api.update("quickMemos", memoId, { content: memo }));
      else {
        const created = await run(() => api.create("quickMemos", { content: memo }));
        setMemoId(created.id);
      }
      setSavedMemo(memo);
    } catch (error) {
      setMemoError((error as Error).message);
      throw error;
    }
  }, [memo, memoId, run, savedMemo]);

  useEffect(() => {
    if (memo === savedMemo || (!memo.trim() && !memoId)) return;
    const timer = window.setTimeout(() => void persistMemo().catch(() => undefined), 700);
    return () => window.clearTimeout(timer);
  }, [memo, memoId, persistMemo, savedMemo]);

  useEffect(() => registerSaveHandler(persistMemo), [persistMemo, registerSaveHandler]);

  if (dashboard.isLoading) return <><PageHeader icon={<ModuleArtwork module="dashboard" />} eyebrow="今天" title="正在整理你的工作台" description="读取今天的计划和各模块状态" /><Skeleton lines={8} /></>;
  if (dashboard.error || !dashboard.data) return <ErrorState message={(dashboard.error as Error)?.message ?? "首页数据不可用"} onRetry={() => dashboard.refetch()} />;
  const value = dashboard.data;
  const dateFormat = normalizeDateFormat(data.settings.dateFormat);
  const showReviewNudge = shouldPromptDailyReview({
    progress: value.overview.progress,
    total: value.overview.total,
    hasReview: Boolean(review.data?.content?.trim()),
    hour: new Date().getHours(),
  });
  const weekReview = buildWeekReview(
    {
      planItems: data.planItems,
      workouts: data.workouts,
      mediaContents: data.mediaContents,
      consultingFollowups: data.consultingFollowups,
    },
    date,
    normalizeWeekStart(data.settings.weekStart),
  );
  const matrixBuckets = buildEisenhowerMatrix(
    data.planItems.map((item) => {
      const fromDash = [...value.timeline, ...value.unscheduled].find((plan) => plan.id === item.id);
      return fromDash ? { ...item, display_title: fromDash.display_title } : item;
    }),
    date,
  );
  return (
    <div className="dashboard-page">
      <PageHeader icon={<ModuleArtwork module="dashboard" />} eyebrow={new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(new Date())} title={`${new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date())}，从重点开始`} description="今天的行动、提醒和工作生活状态都在这里。" actions={<Button onClick={() => navigate("/today?new=1")}><Plus size={17} />添加今日事项</Button>} />
      <div className="overview-strip">
        <div><span>今日进度</span><strong>{value.overview.progress}<small>%</small></strong></div>
        <div className="progress-track"><span style={{ width: `${value.overview.progress}%` }} /></div>
        <div><span>已完成</span><strong>{value.overview.completed}<small> / {value.overview.total}</small></strong></div>
        <div><span>已安排</span><strong>{formatDuration(value.overview.scheduledMinutes)}</strong></div>
      </div>
      {showReviewNudge ? (
        <div className="review-nudge glass-clear" role="status">
          <Notebook size={18} />
          <div>
            <strong>写一句今日复盘</strong>
            <span>{value.overview.progress >= 70 ? "今天推进得差不多了，记一下最值得留下的一点。" : "傍晚了，用一句话收束今天。"}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate("/today?review=1")}>去写复盘</Button>
        </div>
      ) : null}
      <nav className="dashboard-command-strip glass-clear" aria-label="快速操作">
        <span>快速操作</span>
        <button onClick={() => navigate("/today?new=1")}><ListPlus size={17} />新建计划</button>
        <button onClick={() => memoInput.current?.focus()}><NotePencil size={17} />记录备忘</button>
        <button onClick={() => navigate("/development?new=work-item")}><Bug size={17} />添加工作项</button>
        <button onClick={() => navigate("/fitness?new=workout")}><Barbell size={17} />记录训练</button>
        <button onClick={() => navigate("/diet?new=meal")}><ForkKnife size={17} />记录饮食</button>
      </nav>
      <Section
        title="轻重缓急"
        description="按重要 × 紧急四象限查看今日未完成事项；可在格内调整归类。"
        action={<Button variant="ghost" size="sm" onClick={() => navigate("/today")}>打开计划<ArrowRight size={15} /></Button>}
      >
        <EisenhowerMatrix
          buckets={matrixBuckets}
          onMove={(id, quadrant) => {
            const title = String(matrixBuckets.flatMap((b) => b.items).find((item) => item.id === id)?.title || "计划事项");
            void run(() => api.update("planItems", id, { matrix_quadrant: quadrant })).then(() => notifySuccess("已调整象限", title));
          }}
        />
      </Section>
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          <Section title="今日时间线" description="有明确开始时间的事项" action={<Button variant="ghost" size="sm" onClick={() => navigate("/today")}>打开计划<ArrowRight size={15} /></Button>}>
            {value.timeline.length ? <div className="timeline-list">{value.timeline.map((item) => <PlanRow key={item.id} item={item} onComplete={() => requestComplete(item)} onPostpone={() => postponeItem(item)} onOpenSource={item.source_module ? () => navigate(sourceFocusPath(item.source_module, item.source_entity_id)) : undefined} />)}</div> : <EmptyState title="今天还没有时间安排" description="把最重要的一件事放进时间线。" hint="先写标题，时间可以稍后补" action={<Button variant="secondary" size="sm" onClick={() => navigate("/today?new=1")}>添加事项</Button>} />}
          </Section>
          <Section title="待安排" description="属于今天，但还没有具体时间">
            {value.unscheduled.length ? <div className="plain-list">{value.unscheduled.map((item) => <PlanRow key={item.id} item={item} onComplete={() => requestComplete(item)} onPostpone={() => postponeItem(item)} onOpenSource={item.source_module ? () => navigate(sourceFocusPath(item.source_module, item.source_entity_id)) : undefined} />)}</div> : <p className="quiet-line">所有今日事项都已经安排妥当。</p>}
          </Section>
        </div>
        <aside className="dashboard-aside">
          <Section title="快速备忘" description="停顿后自动保存" className="memo-section">
            <div className="memo-pad"><NotePencil size={19} /><textarea ref={memoInput} aria-label="快速备忘" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="记下一闪而过的想法……" />{memoError ? <small className="field-error">{memoError}</small> : null}</div>
            {memoId ? <div className="memo-actions">
              <Button size="sm" variant="ghost" onClick={async () => { await run(() => api.convertMemo(memoId, "planItems", { plan_date: date })); setMemo(""); setSavedMemo(""); setMemoId(null); notifySuccess("已转为今日事项"); }}>转为今日事项</Button>
              <Button size="sm" variant="ghost" onClick={async () => { await run(() => api.convertMemo(memoId, "mediaContents", { stage: "idea" })); setMemo(""); setSavedMemo(""); setMemoId(null); notifySuccess("已转为内容灵感"); }}>转为内容灵感</Button>
              <label className="memo-convert-more">
                <span className="sr-only">转为其他模块记录</span>
                <select
                  aria-label="转为其他模块记录"
                  defaultValue=""
                  onChange={async (event) => {
                    const target = memoConvertTargets.find((item) => item.collection === event.target.value);
                    event.target.value = "";
                    if (!target) return;
                    await run(() => api.convertMemo(memoId, target.collection, target.fields ?? {}));
                    setMemo("");
                    setSavedMemo("");
                    setMemoId(null);
                    notifySuccess(`已转为${target.label}`);
                  }}
                >
                  <option value="" disabled>转为其他…</option>
                  {memoConvertTargets.map((target) => <option key={target.collection} value={target.collection}>{target.label}</option>)}
                </select>
              </label>
            </div> : null}
            {archivedMemos.length ? (
              <div className="memo-archive">
                <button type="button" className="text-button memo-archive-toggle" onClick={() => setShowMemoArchive((open) => !open)}>
                  {showMemoArchive ? "收起备忘箱" : `备忘箱（${archivedMemos.length}）`}
                </button>
                {showMemoArchive ? (
                  <div className="memo-archive-list">
                    {archivedMemos.map((item) => (
                      <article key={item.id}>
                        <div>
                          <strong>{String(item.content || "空备忘").slice(0, 48)}</strong>
                          <small>已转为 {memoConvertedLabel(item.converted_type)}{item.archived_at ? ` · ${formatDate(item.archived_at, dateFormat)}` : ""}</small>
                        </div>
                        <div className="memo-archive-actions">
                          {canOpenConverted(item.converted_type, item.converted_id) ? (
                            <button type="button" className="text-button" onClick={() => navigate(collectionFocusPath(String(item.converted_type), String(item.converted_id)))}>打开来源</button>
                          ) : null}
                          <button type="button" className="text-button" onClick={() => void restoreMemo(item)}>恢复编辑</button>
                          <label className="memo-convert-more">
                            <span className="sr-only">再次转出</span>
                            <select
                              aria-label="再次转出"
                              defaultValue=""
                              onChange={(event) => {
                                const value = event.target.value;
                                event.target.value = "";
                                if (value === "planItems") void reconvertMemo(item, "planItems", { plan_date: date });
                                else if (value === "mediaContents") void reconvertMemo(item, "mediaContents", { stage: "idea" });
                                else {
                                  const target = memoConvertTargets.find((entry) => entry.collection === value);
                                  if (target) void reconvertMemo(item, target.collection, target.fields ?? {});
                                }
                              }}
                            >
                              <option value="" disabled>再次转出…</option>
                              <option value="planItems">今日事项</option>
                              <option value="mediaContents">内容灵感</option>
                              {memoConvertTargets.map((target) => <option key={target.collection} value={target.collection}>{target.label}</option>)}
                            </select>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Section>
          <Section title="需要关注" description="到期、跟进与今日提醒">
            {value.attention.length ? <div className="attention-list">{value.attention.map((item) => <button key={`${item.attention_type}-${item.id}`} onClick={() => navigate(moduleFocusPath(String(item.module || "today"), String(item.id)))}><span className="attention-mark" /><div><strong>{item.display_title || item.title || item.name || item.content}</strong><small>{item.attention_reason || (item.due_date ? `截止 ${formatDate(item.due_date, dateFormat)}` : item.followup_at ? `跟进 ${formatDate(item.followup_at, dateFormat)}` : "需要处理")}</small></div><ArrowRight size={16} /></button>)}</div> : <p className="quiet-line">目前没有紧急事项。</p>}
          </Section>
        </aside>
      </div>
      <Section
        title="本周回顾"
        description={`${formatDate(weekReview.start, dateFormat)} – ${formatDate(weekReview.end, dateFormat)} · 只读摘要，不做自定义仪表盘`}
      >
        <div className="week-review-strip" role="list">
          <div role="listitem"><span>计划完成率</span><strong>{weekReview.planProgress}<small>%</small></strong><small>{weekReview.planCompleted}/{weekReview.planTotal}</small></div>
          <div role="listitem"><span>训练次数</span><strong>{weekReview.workouts}</strong><small>次</small></div>
          <div role="listitem"><span>内容发布</span><strong>{weekReview.published}</strong><small>条</small></div>
          <div role="listitem"><span>跟进完成</span><strong>{weekReview.followupsDone}</strong><small>次</small></div>
        </div>
      </Section>
      <Section title="各模块摘要" description="只展示近期真正需要留意的内容">
        <div className="summary-grid">{Object.entries(summaryMeta).filter(([key]) => !Array.isArray(data.settings.dashboardModules) || data.settings.dashboardModules.includes(key)).map(([key, meta]) => {
          const items = value.summaries[key] ?? [];
          return <button className="summary-tile" data-module={key} key={key} onClick={() => navigate(items[0]?.id ? withFocus(meta.route, String(items[0].id)) : meta.route)}><div className="summary-top"><ModuleArtwork module={meta.module} loading="lazy" /><span>{meta.title}</span><ArrowRight size={16} /></div>{items.length ? <><strong>{items[0].title || items[0].name || items[0].content}</strong><small>{items.length > 1 ? `另外还有 ${items.length - 1} 项` : "查看详情"}</small></> : <small>{meta.empty}</small>}</button>;
        })}</div>
      </Section>
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

function PlanRow({ item, onComplete, onPostpone, onOpenSource }: {
  item: Record<string, any>;
  onComplete: () => void;
  onPostpone: () => Promise<any>;
  onOpenSource?: () => void;
}) {
  const done = item.status === "done";
  return (
    <div className={classNames("plan-row", done && "is-done")}>
      <button className="complete-control" aria-label={done ? "已完成" : "标记完成"} disabled={done} onClick={() => void onComplete()}>{done ? <Check size={14} weight="bold" /> : null}</button>
      {item.start_time ? <span className="plan-time"><Clock size={14} />{item.start_time}</span> : <span className="plan-time"><CalendarBlank size={14} />待安排</span>}
      <div className="plan-copy">
        <strong>{item.display_title || item.title}</strong>
        {item.notes ? <small>{item.notes}</small> : null}
        <div className="plan-row-actions">
          {onOpenSource ? <button type="button" className="text-button source-link" onClick={onOpenSource}>打开来源 <ArrowRight size={13} /></button> : null}
          {!done ? <button type="button" className="text-button" onClick={() => void onPostpone()}><ArrowBendDownRight size={13} />移到明天</button> : null}
        </div>
      </div>
      <Badge tone={item.priority === "high" ? "warning" : "neutral"}>{item.priority === "high" ? "高优先" : item.estimated_minutes ? `${item.estimated_minutes} 分钟` : "普通"}</Badge>
    </div>
  );
}
