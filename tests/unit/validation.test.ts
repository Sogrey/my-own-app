// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ValidationError } from "../../server/errors.js";
import { validateCollectionInput, validateSettingsInput } from "../../server/validation.js";

describe("collection and settings validation", () => {
  it("accepts matrix quadrant on plan items", () => {
    expect(validateCollectionInput("planItems", {
      title: "A",
      plan_date: "2026-08-02",
      priority: "medium",
      matrix_quadrant: "do",
      status: "todo",
    }, "create")).toMatchObject({ matrix_quadrant: "do" });
    expect(validateCollectionInput("planItems", { matrix_quadrant: "delegate" }, "update")).toEqual({ matrix_quadrant: "delegate" });
  });

  it("rejects invalid plan priority and media stage", () => {
    expect(() => validateCollectionInput("planItems", { title: "A", plan_date: "2026-08-02", priority: "urgent" }, "create")).toThrow(ValidationError);
    expect(() => validateCollectionInput("mediaContents", { title: "A", stage: "draft" }, "create")).toThrow(ValidationError);
  });

  it("accepts known media stages and coerces numeric fields", () => {
    expect(validateCollectionInput("mediaContents", { title: "A", stage: "ready", views: "12" }, "create")).toMatchObject({
      title: "A",
      stage: "ready",
      views: 12,
    });
  });

  it("validates known settings enums while keeping unknown keys", () => {
    expect(validateSettingsInput({ theme: "dark", launcherPersistence: "keep-me" })).toMatchObject({
      theme: "dark",
      launcherPersistence: "keep-me",
    });
    expect(() => validateSettingsInput({ appearance: "classic" })).toThrow(ValidationError);
  });

  it("validates high-frequency consulting, development and diet enums", () => {
    expect(() => validateCollectionInput("consultingProjects", { client_id: "c1", name: "A", status: "open" }, "create")).toThrow(ValidationError);
    expect(validateCollectionInput("consultingFollowups", {
      project_id: "p1",
      followup_at: "2026-08-02T10:00",
      content: "跟进",
      status: "todo",
    }, "create")).toMatchObject({ status: "todo" });
    expect(() => validateCollectionInput("devWorkItems", { project_id: "p1", title: "Bug", item_type: "hotfix" }, "create")).toThrow(ValidationError);
    expect(validateCollectionInput("meals", {
      meal_date: "2026-08-02",
      meal_type: "dinner",
      name: "晚餐",
      entry_kind: "actual",
    }, "create")).toMatchObject({ meal_type: "dinner" });
    expect(validateCollectionInput("foods", { name: "鸡胸肉", protein: "25.5" }, "create")).toMatchObject({
      name: "鸡胸肉",
      protein: 25.5,
    });
    expect(() => validateCollectionInput("entertainmentItems", { name: "游戏", status: "finished" }, "create")).toThrow(ValidationError);
  });
});
