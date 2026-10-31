// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { buildDashboard } from "../../server/dashboard.js";
import { createTestStore, removeTestDirectory } from "../helpers.js";

let directory = "";
let close: (() => void) | null = null;

afterEach(() => {
  close?.();
  close = null;
  if (directory) removeTestDirectory(directory);
  directory = "";
});

describe("buildDashboard", () => {
  it("separates timed and unscheduled items and computes progress", () => {
    const harness = createTestStore("dashboard-plan");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    store.create("planItems", { title: "上午会", plan_date: "2026-08-02", start_time: "09:30", estimated_minutes: 30, status: "done" });
    store.create("planItems", { title: "待安排", plan_date: "2026-08-02", estimated_minutes: 45, status: "todo" });
    store.create("planItems", { title: "已取消", plan_date: "2026-08-02", start_time: "11:00", status: "cancelled" });

    const dashboard = buildDashboard(store, "2026-08-02");
    expect(dashboard.overview).toMatchObject({ completed: 1, total: 2, progress: 50, scheduledMinutes: 75 });
    expect(dashboard.timeline.map((item: { title: string }) => item.title)).toEqual(["上午会"]);
    expect(dashboard.unscheduled.map((item: { title: string }) => item.title)).toEqual(["待安排"]);
  });

  it("surfaces overdue plans, followups and unfinished workouts in attention", () => {
    const harness = createTestStore("dashboard-attention");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    store.create("planItems", { title: "逾期事项", plan_date: "2026-08-01", status: "todo" });
    const client = store.create("clients", { name: "客户甲" });
    const project = store.create("consultingProjects", { client_id: client.id, name: "咨询项目" });
    store.create("consultingFollowups", { project_id: project.id, content: "今日跟进", followup_at: "2026-08-02T10:00:00.000Z", status: "todo" });
    store.create("workouts", { name: "腿部训练", workout_date: "2026-08-02", status: "planned" });
    store.create("entertainmentItems", { name: "游戏", status: "playing" });

    const dashboard = buildDashboard(store, "2026-08-02");
    expect(dashboard.attention.map((item: { attention_type: string }) => item.attention_type)).toEqual(
      expect.arrayContaining(["overdue", "followup", "workout", "stale-consulting"]),
    );
    expect(dashboard.attention.find((item: { attention_type: string }) => item.attention_type === "stale-consulting").attention_reason).toContain("超过 14 天未沟通");
    expect(dashboard.summaries.entertainment).toEqual([expect.objectContaining({ name: "游戏" })]);
  });

  it("surfaces playing entertainment next goals as soft attention", () => {
    const harness = createTestStore("dashboard-entertainment");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    store.create("entertainmentItems", { name: "黑神话", status: "playing", next_goal: "打通第三章" });
    store.create("entertainmentItems", { name: "想玩清单", status: "wishlist", next_goal: "有空再开" });

    const dashboard = buildDashboard(store, "2026-08-02");
    const goals = dashboard.attention.filter((item: { attention_type: string }) => item.attention_type === "entertainment-goal");
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ name: "黑神话", attention_reason: "下次目标：打通第三章" });
  });

  it("respects consultingStaleDays when flagging inactive projects", () => {
    const harness = createTestStore("dashboard-stale");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    store.setSettings({ consultingStaleDays: 7 });
    const client = store.create("clients", { name: "客户乙" });
    const fresh = store.create("consultingProjects", { client_id: client.id, name: "仍活跃", status: "active" });
    const stale = store.create("consultingProjects", { client_id: client.id, name: "已沉默", status: "active" });
    store.create("consultingInteractions", { project_id: fresh.id, occurred_at: "2026-08-01T10:00:00.000Z", interaction_type: "call", notes: "刚聊过" });
    store.create("consultingInteractions", { project_id: stale.id, occurred_at: "2026-07-20T10:00:00.000Z", interaction_type: "call", notes: "很久以前" });

    const dashboard = buildDashboard(store, "2026-08-02");
    const staleItems = dashboard.attention.filter((item: { attention_type: string }) => item.attention_type === "stale-consulting");
    expect(staleItems.map((item: { name: string }) => item.name)).toEqual(["已沉默"]);
    expect(staleItems[0].attention_reason).toContain("超过 7 天未沟通");
  });

  it("uses live source titles for linked plan items", () => {
    const harness = createTestStore("dashboard-source");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    const media = store.create("mediaContents", { title: "最新片源标题", stage: "producing" });
    store.create("planItems", {
      title: "旧副本",
      plan_date: "2026-08-02",
      start_time: "14:00",
      source_module: "media",
      source_entity_type: "media_content",
      source_entity_id: media.id,
    });

    const dashboard = buildDashboard(store, "2026-08-02");
    expect(dashboard.timeline[0].display_title).toBe("最新片源标题");
  });
});
