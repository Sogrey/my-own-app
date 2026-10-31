import { describe, expect, it } from "vitest";
import { consultingFormConfig } from "../../src/pages/consulting/formConfig";
import { developmentFormConfig } from "../../src/pages/development/formConfig";

describe("detail panel form configs", () => {
  it("keeps consulting create and edit titles distinct", () => {
    const followup = consultingFormConfig("followup", "c1", { id: "p1" } as any);
    expect(followup.collection).toBe("consultingFollowups");
    expect(followup.title).toBe("安排跟进");
    expect(followup.editTitle).toBe("编辑跟进");
    expect(followup.defaults.project_id).toBe("p1");
  });

  it("wires development work items to milestones options", () => {
    const work = developmentFormConfig("work", { id: "dev1" } as any, [{ id: "m1", name: "Alpha" } as any]);
    expect(work.collection).toBe("devWorkItems");
    const milestoneField = work.fields.find((field) => field.name === "milestone_id");
    expect(milestoneField?.options).toEqual([{ value: "m1", label: "Alpha" }]);
  });
});
