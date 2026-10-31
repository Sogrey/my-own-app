import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Plus, Play, Check, Barbell, TrendUp, CalendarPlus } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { MonthCalendar } from "../components/MonthCalendar";
import { formatDate, localDate } from "../utils";
import { Badge, Button, EmptyState, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import type { Entity, WorkspaceState } from "../types";
import type { DialogState, WorkspaceRun } from "./pageTypes";
import { FitnessDialog } from "./fitness/FitnessDialog";
import { findPreviousSet, getWorkoutBodyPart, getWorkoutExerciseSummaries } from "./fitness/fitnessHelpers";

export function FitnessPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [templateId, setTemplateId] = useState<string | null>(data.workoutTemplates[0]?.id ?? null);
  const [calendarMonth, setCalendarMonth] = useState(localDate().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(localDate());
  useEffect(() => { if (!templateId && data.workoutTemplates[0]) setTemplateId(data.workoutTemplates[0].id); }, [data.workoutTemplates, templateId]);
  useEffect(() => { const value = params.get("new"); if (value) setDialog({ type: value }); }, [params]);
  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const workout = data.workouts.find((item) => item.id === focusId);
    if (workout) {
      setSelectedDate(workout.workout_date || localDate());
      setCalendarMonth((workout.workout_date || localDate()).slice(0, 7));
      if (workout.template_id) setTemplateId(workout.template_id);
      setDialog({ type: "workout", item: workout });
      setParams({});
      return;
    }
    const template = data.workoutTemplates.find((item) => item.id === focusId);
    if (template) {
      setTemplateId(template.id);
      setDialog({ type: "template", item: template });
      setParams({});
      return;
    }
    const metric = data.bodyMetrics.find((item) => item.id === focusId);
    if (metric) {
      setDialog({ type: "metric", item: metric });
      setParams({});
    }
  }, [data.bodyMetrics, data.workoutTemplates, data.workouts, params, setParams]);
  const close = () => { setDialog(null); setParams({}); };
  const template = data.workoutTemplates.find((item) => item.id === templateId);
  const templateExercises = data.workoutTemplateExercises.filter((item) => item.template_id === templateId).sort((a, b) => a.sort_order - b.sort_order);
  const recentWorkouts = [...data.workouts].sort((a, b) => b.workout_date.localeCompare(a.workout_date));
  const activeWorkout = recentWorkouts.find((item) => item.status === "in_progress");
  const activeExercises = data.workoutExercises.filter((item) => item.workout_id === activeWorkout?.id).sort((a, b) => a.sort_order - b.sort_order);
  const selectedWorkouts = recentWorkouts.filter((item) => item.workout_date === selectedDate);
  const startWorkout = async () => {
    if (!template) return;
    await run(() => api.startWorkoutFromTemplate(template.id, localDate()));
  };
  const weightChart = [...data.bodyMetrics].sort((a, b) => a.metric_date.localeCompare(b.metric_date)).slice(-12).map((item) => ({ date: item.metric_date.slice(5), weight: item.weight }));
  return (
    <div>
      <PageHeader icon={<ModuleArtwork module="fitness" />} eyebrow="训练与身体数据" title="健身计划" description="用训练模板开始，逐组记录实际完成情况，并保留历史。" actions={<><Button variant="secondary" onClick={() => setDialog({ type: "metric" })}><TrendUp size={17} />记录身体数据</Button><Button onClick={() => setDialog({ type: "template" })}><Plus size={17} />新建训练模板</Button></>} />
      {activeWorkout ? <Section title={`正在训练 · ${activeWorkout.name}`} description={`开始于 ${new Date(activeWorkout.started_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`} action={<Button onClick={() => void run(() => api.update("workouts", activeWorkout.id, { status: "completed", completed_at: new Date().toISOString() }))}><Check size={16} />完成训练</Button>}>
        <div className="active-workout">{activeExercises.map((exercise) => {
          const sets = data.workoutSets.filter((item) => item.workout_exercise_id === exercise.id).sort((a, b) => a.set_number - b.set_number);
          const previous = findPreviousSet(data, String(exercise.name), activeWorkout.id);
          return <article className="exercise-block" key={exercise.id}><header><div><Barbell size={19} /><h3>{exercise.name}</h3></div><small>{previous ? `上次：${previous.weight ?? 0} kg × ${previous.reps ?? 0}` : "第一次记录"}</small></header><div className="sets-table"><span>组</span><span>次数</span><span>重量 kg</span><span>完成</span>{sets.map((set) => <SetRow key={set.id} set={set} run={run} />)}</div></article>;
        })}</div>
      </Section> : null}
      <Section title="训练日历" description="按天查看训练部位、动作和实际重复次数">
        <MonthCalendar month={calendarMonth} selectedDate={selectedDate} onMonthChange={setCalendarMonth} onSelectDate={(date) => { setSelectedDate(date); setCalendarMonth(date.slice(0, 7)); }} renderDay={(date) => <WorkoutCalendarDay date={date} data={data} />} />
        <div className="calendar-selected-detail"><header><div><span>选中日期</span><strong>{formatDate(selectedDate)}</strong></div><Badge tone={selectedWorkouts.some((item) => item.status === "completed") ? "success" : "neutral"}>{selectedWorkouts.length} 次训练</Badge></header>{selectedWorkouts.length ? <div className="calendar-detail-list">{selectedWorkouts.map((workout) => <article key={workout.id}><div><strong>{getWorkoutBodyPart(data, workout)}</strong><small>{workout.name}</small></div><p>{getWorkoutExerciseSummaries(data, workout).join(" · ") || "尚未记录动作和次数"}</p></article>)}</div> : <p className="quiet-line">这一天没有训练安排或记录。</p>}</div>
      </Section>
      <div className="fitness-grid">
        <Section title="训练模板" description="选择模板查看动作并开始训练">
          {data.workoutTemplates.length ? <><div className="template-tabs">{data.workoutTemplates.map((item) => <button className={item.id === templateId ? "active" : ""} key={item.id} onClick={() => setTemplateId(item.id)}>{item.name}</button>)}</div>{template ? <div className="template-detail"><div className="template-heading"><div><h3>{template.name}</h3><p>{template.notes || "没有补充说明"}</p></div><Button size="sm" onClick={() => void startWorkout()} disabled={Boolean(activeWorkout)}><Play size={15} />开始训练</Button></div>{templateExercises.map((item) => <div className="template-exercise" key={item.id}><strong>{item.name}</strong><span>{item.target_sets} 组 × {item.target_reps || "自定"} 次</span><small>{item.target_weight ? `${item.target_weight} kg` : "自重或未设重量"}</small></div>)}<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "exercise" })}><Plus size={14} />添加动作</Button></div> : null}</> : <EmptyState title="还没有训练模板" description="建立一个模板，加入动作后即可开始训练。" />}
        </Section>
        <Section title="体重趋势" description="最近十二次身体数据记录">
          {weightChart.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={240}><LineChart data={weightChart}><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis domain={["dataMin - 2", "dataMax + 2"]} tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: "var(--surface)", stroke: "var(--accent)", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="还没有身体数据" description="记录体重后，这里会出现趋势。" />}
        </Section>
      </div>
      <Section title="近期训练" description="历史训练保留当时的动作与组数据" action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "workout" })}><CalendarPlus size={15} />安排训练</Button>}>
        {recentWorkouts.length ? <div className="history-table">{recentWorkouts.slice(0, 10).map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{formatDate(item.workout_date)}</small></div><Badge tone={item.status === "completed" ? "success" : item.status === "in_progress" ? "warning" : "neutral"}>{item.status === "completed" ? "已完成" : item.status === "in_progress" ? "进行中" : "已计划"}</Badge><p>{item.feeling || "没有训练感受"}</p></article>)}</div> : <p className="quiet-line">还没有训练记录。</p>}
      </Section>
      <FitnessDialog dialog={dialog} close={close} template={template} run={run} />
    </div>
  );
}

function SetRow({ set, run }: { set: Entity; run: WorkspaceRun }) {
  const [reps, setReps] = useState(set.reps ?? "");
  const [weight, setWeight] = useState(set.weight ?? "");
  return (
    <>
      <strong>{set.set_number}</strong>
      <input aria-label={`第${set.set_number}组次数`} type="number" value={reps} onChange={(event) => setReps(event.target.value)} onBlur={() => void run(() => api.update("workoutSets", set.id, { reps: reps === "" ? null : Number(reps) }))} />
      <input aria-label={`第${set.set_number}组重量`} type="number" step="0.5" value={weight} onChange={(event) => setWeight(event.target.value)} onBlur={() => void run(() => api.update("workoutSets", set.id, { weight: weight === "" ? null : Number(weight) }))} />
      <button className={`set-check ${set.completed ? "active" : ""}`} onClick={() => void run(() => api.update("workoutSets", set.id, { completed: set.completed ? 0 : 1 }))}><Check size={14} /></button>
    </>
  );
}

function WorkoutCalendarDay({ date, data }: { date: string; data: WorkspaceState }) {
  const workouts = data.workouts.filter((item) => item.workout_date === date);
  if (!workouts.length) return null;
  return (
    <>
      {workouts.slice(0, 2).map((workout) => (
        <div className={`calendar-entry workout-${workout.status}`} key={workout.id}>
          <strong>{getWorkoutBodyPart(data, workout)}</strong>
          <span>{getWorkoutExerciseSummaries(data, workout).slice(0, 2).join(" · ") || workout.name}</span>
        </div>
      ))}
      {workouts.length > 2 ? <small className="calendar-more">另有 {workouts.length - 2} 次</small> : null}
    </>
  );
}
