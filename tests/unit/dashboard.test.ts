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
      expect.arrayContaining(["overdue", "followup", "workout"]),
    );
    expect(dashboard.summaries.entertainment).toEqual([expect.objectContaining({ name: "游戏" })]);
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
