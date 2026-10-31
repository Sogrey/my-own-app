import { DEFAULT_CONSULTING_STALE_DAYS, normalizeConsultingStaleDays } from "../shared/schema.js";
import type { AppStore, Entity } from "./store.js";

function plusDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${later.slice(0, 10)}T12:00:00`).getTime();
  return Math.floor((b - a) / 86_400_000);
}

export function buildDashboard(store: AppStore, date: string): Record<string, any> {
  const planItems: Entity[] = store.list("planItems").map((item) => ({
    ...item,
    display_title: store.sourceTitle(item.source_entity_type, item.source_entity_id) || item.title,
  }));
  const todayItems = planItems.filter((item) => item.plan_date === date && item.status !== "cancelled");
  const timeline = todayItems.filter((item) => item.start_time).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const unscheduled = todayItems.filter((item) => !item.start_time);
  const completed = todayItems.filter((item) => item.status === "done").length;
  const totalMinutes = todayItems.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
  const horizon = plusDays(date, 3);
  const staleDays = normalizeConsultingStaleDays(store.getSettings().consultingStaleDays ?? DEFAULT_CONSULTING_STALE_DAYS);

  const attention: Entity[] = [];
  attention.push(
    ...planItems
      .filter((item) => item.plan_date < date && !["done", "cancelled"].includes(item.status))
      .map((item) => ({
        ...item,
        attention_type: "overdue",
        module: "today",
        attention_reason: `计划日期 ${item.plan_date}，已逾期`,
      })),
  );
  attention.push(
    ...store
      .list("consultingDeliverables")
      .filter((item) => item.due_date && item.due_date <= horizon && item.status !== "done")
      .map((item) => ({
        ...item,
        attention_type: "deliverable",
        module: "consulting",
        attention_reason: item.due_date <= date ? `交付截止 ${item.due_date}` : `即将截止 ${item.due_date}`,
      })),
  );
  attention.push(
    ...store
      .list("consultingFollowups")
      .filter((item) => item.followup_at?.slice(0, 10) <= date && item.status !== "done")
      .map((item) => ({
        ...item,
        attention_type: "followup",
        module: "consulting",
        title: item.content,
        attention_reason: `跟进安排于 ${String(item.followup_at).slice(0, 10)}`,
      })),
  );
  attention.push(
    ...store
      .list("workouts")
      .filter((item) => item.workout_date === date && item.status !== "completed")
      .map((item) => ({
        ...item,
        attention_type: "workout",
        module: "fitness",
        title: item.name,
        attention_reason: "今日训练尚未完成",
      })),
  );

  const interactions = store.list("consultingInteractions");
  const lastInteractionByProject = new Map<string, string>();
  for (const item of interactions) {
    const day = String(item.occurred_at || "").slice(0, 10);
    if (!item.project_id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const previous = lastInteractionByProject.get(item.project_id);
    if (!previous || day > previous) lastInteractionByProject.set(item.project_id, day);
  }
  for (const project of store.list("consultingProjects").filter((item) => item.status === "active")) {
    const last = lastInteractionByProject.get(project.id);
    const idleDays = last ? daysBetween(last, date) : Number.POSITIVE_INFINITY;
    if (idleDays < staleDays) continue;
    attention.push({
      ...project,
      attention_type: "stale-consulting",
      module: "consulting",
      attention_reason: last
        ? `超过 ${staleDays} 天未沟通（最近 ${last}）`
        : `超过 ${staleDays} 天未沟通（尚无沟通记录）`,
    });
  }

  const media = store.list("mediaContents");
  const devItems = store.list("devWorkItems");
  const followups = store.list("consultingFollowups");
  const workouts = store.list("workouts");
  const meals = store.list("meals");
  const entertainment = store.list("entertainmentItems");

  // 非压力型提醒：正在进行且写了下次目标的娱乐项，进关注列表但不抢紧急位。
  attention.push(
    ...entertainment
      .filter((item) => item.status === "playing" && String(item.next_goal || "").trim())
      .slice(0, 3)
      .map((item) => ({
        ...item,
        attention_type: "entertainment-goal",
        module: "entertainment",
        title: item.name,
        attention_reason: `下次目标：${String(item.next_goal).trim()}`,
      })),
  );

  return {
    date,
    overview: {
      completed,
      total: todayItems.length,
      progress: todayItems.length ? Math.round((completed / todayItems.length) * 100) : 0,
      scheduledMinutes: totalMinutes,
    },
    timeline,
    unscheduled,
    attention: attention.slice(0, 12),
    consultingStaleDays: staleDays,
    summaries: {
      media: media.filter((item) => ["producing", "ready"].includes(item.stage)).slice(0, 3),
      development: devItems.filter((item) => item.priority === "high" && item.status !== "done").slice(0, 3),
      consulting: followups.filter((item) => item.status !== "done").slice(0, 3),
      fitness: workouts.filter((item) => item.workout_date >= date).slice(0, 3),
      diet: meals.filter((item) => item.meal_date === date).slice(0, 4),
      entertainment: entertainment.filter((item) => item.status === "playing").slice(0, 3),
    },
  };
}
