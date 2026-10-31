import { describe, expect, it } from "vitest";
import { todayPlanPayload } from "../../src/planLink";

describe("todayPlanPayload", () => {
  it("builds a linked today plan with stable source fields", () => {
    const payload = todayPlanPayload({
      title: "推进内容：选题",
      sourceModule: "media",
      sourceEntityType: "media_content",
      sourceEntityId: "abc",
      priority: "high",
    });
    expect(payload).toMatchObject({
      title: "推进内容：选题",
      source_module: "media",
      source_entity_type: "media_content",
      source_entity_id: "abc",
      priority: "high",
      notes: "",
    });
    expect(payload.plan_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults priority to medium and keeps optional notes", () => {
    const payload = todayPlanPayload({
      title: "跟进客户",
      sourceModule: "consulting",
      sourceEntityType: "consulting_followup",
      sourceEntityId: "f1",
      notes: "电话确认方案",
    });
    expect(payload.priority).toBe("medium");
    expect(payload.notes).toBe("电话确认方案");
  });
});
