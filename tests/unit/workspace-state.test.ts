import { describe, expect, it } from "vitest";
import type { WorkspaceState } from "../../src/types";
import { applyWorkspaceMutation } from "../../src/workspaceState";

function baseState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    planItems: [], quickMemos: [], mediaContents: [], devProjects: [], devMilestones: [], devWorkItems: [], devLogs: [],
    clients: [], consultingProjects: [], consultingInteractions: [], consultingDeliverables: [], consultingFollowups: [], consultingTimeEntries: [],
    workoutTemplates: [], workoutTemplateExercises: [], workouts: [], workoutExercises: [], workoutSets: [], bodyMetrics: [], nutritionTargets: [],
    foods: [], meals: [], mealItems: [], entertainmentItems: [], playSessions: [], settings: {}, trash: [],
    ...overrides,
  };
}

describe("applyWorkspaceMutation", () => {
  it("upserts entities and soft-deletes into trash without a full reload", () => {
    const created = applyWorkspaceMutation(baseState(), {
      type: "upsert",
      collection: "mediaContents",
      entity: { id: "m1", title: "标题", stage: "idea" },
    });
    expect(created.mediaContents).toEqual([expect.objectContaining({ id: "m1", title: "标题" })]);

    const removed = applyWorkspaceMutation(created, {
      type: "soft-delete",
      collection: "mediaContents",
      entity: { id: "m1", title: "标题", deleted_at: "2026-08-02T00:00:00.000Z" },
    });
    expect(removed.mediaContents).toHaveLength(0);
    expect(removed.trash[0]).toMatchObject({ collection: "mediaContents", entity_id: "m1", display_title: "标题" });
  });

  it("clears a project subtree on permanent delete", () => {
    const state = baseState({
      devProjects: [{ id: "p1", name: "项目" }],
      devWorkItems: [{ id: "w1", project_id: "p1", title: "工作项" }],
      trash: [{ id: "t1", collection: "devProjects", entity_id: "p1", display_title: "项目" }],
    });
    const next = applyWorkspaceMutation(state, { type: "permanent-delete", collection: "devProjects", id: "p1" });
    expect(next.devProjects).toHaveLength(0);
    expect(next.devWorkItems).toHaveLength(0);
    expect(next.trash).toHaveLength(0);
  });

  it("converts memos and merges settings locally", () => {
    const state = baseState({
      quickMemos: [{ id: "memo1", content: "想法" }],
      settings: { theme: "light" },
    });
    const converted = applyWorkspaceMutation(state, {
      type: "memo-convert",
      memoId: "memo1",
      collection: "planItems",
      entity: { id: "plan1", title: "想法", plan_date: "2026-08-02" },
      archivedAt: "2026-08-02T12:00:00.000Z",
    });
    expect(converted.planItems[0]).toMatchObject({ id: "plan1", title: "想法" });
    expect(converted.quickMemos[0]).toMatchObject({ converted_id: "plan1", archived_at: "2026-08-02T12:00:00.000Z" });

    const settings = applyWorkspaceMutation(converted, { type: "settings", settings: { theme: "dark", appearance: "neo" } });
    expect(settings.settings).toMatchObject({ theme: "dark", appearance: "neo" });
  });
});
