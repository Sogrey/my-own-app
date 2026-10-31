// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { createTestStore, removeTestDirectory } from "../helpers.js";

let directory = "";
let close: (() => void) | null = null;

afterEach(() => {
  close?.();
  close = null;
  if (directory) removeTestDirectory(directory);
  directory = "";
});

describe("AppStore domain behavior", () => {
  it("soft-deletes into trash without cascading children, then permanent-delete clears the subtree", () => {
    const harness = createTestStore("store-delete");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    const project = store.create("devProjects", { name: "父项目" });
    const work = store.create("devWorkItems", { project_id: project.id, title: "子工作项", item_type: "feature", status: "todo" });

    store.softDelete("devProjects", project.id);
    expect(store.list("devProjects")).toHaveLength(0);
    expect(store.list("devWorkItems")).toEqual([expect.objectContaining({ id: work.id })]);
    expect(store.trash()).toEqual([expect.objectContaining({ collection: "devProjects", entity_id: project.id })]);

    store.permanentDelete("devProjects", project.id);
    expect(store.list("devProjects", true)).toHaveLength(0);
    expect(store.list("devWorkItems", true)).toHaveLength(0);
    expect(store.trash()).toHaveLength(0);
  });

  it("resolves plan source titles from live business records", () => {
    const harness = createTestStore("store-source");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    const media = store.create("mediaContents", { title: "来源标题", stage: "producing" });
    expect(store.sourceTitle("media_content", media.id)).toBe("来源标题");
    store.update("mediaContents", media.id, { title: "更新后的来源" });
    expect(store.sourceTitle("media_content", media.id)).toBe("更新后的来源");
  });

  it("treats percent and underscore in search as literal characters", () => {
    const harness = createTestStore("store-search");
    directory = harness.directory;
    close = () => harness.manager.close();
    const { store } = harness;

    store.create("mediaContents", { title: "100%完成进度", stage: "idea" });
    store.create("mediaContents", { title: "普通进度记录", stage: "idea" });
    store.create("planItems", { title: "任务_草稿", plan_date: "2026-08-02" });

    expect(store.search("100%").map((item) => item.title)).toEqual(["100%完成进度"]);
    expect(store.search("任务_").map((item) => item.title)).toEqual(["任务_草稿"]);
    expect(store.search("%完成")).toHaveLength(1);
  });
});
