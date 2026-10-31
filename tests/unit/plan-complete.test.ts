import { afterEach, describe, expect, it, vi } from "vitest";
import { canOfferSourceSync, sourceSyncOffer } from "../../src/planComplete";

describe("plan complete source sync", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers explicit sync for consulting and development sources", () => {
    expect(sourceSyncOffer("consulting_followup")?.collection).toBe("consultingFollowups");
    expect(sourceSyncOffer("dev_work_item")?.patch).toEqual({ status: "done" });
    expect(canOfferSourceSync({ source_entity_type: "consulting_deliverable", source_entity_id: "d1" })).toBe(true);
  });

  it("offers media publish and entertainment completion patches", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00"));
    expect(sourceSyncOffer("media_content")).toMatchObject({
      collection: "mediaContents",
      patch: { stage: "published", published_at: "2026-10-31" },
    });
    expect(sourceSyncOffer("entertainment_item")).toMatchObject({
      collection: "entertainmentItems",
      patch: { status: "completed", completed_date: "2026-10-31" },
    });
    expect(canOfferSourceSync({ source_entity_type: "media_content", source_entity_id: "m1" })).toBe(true);
  });

  it("stamps follow-up completion time when offering sync", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T08:30:00.000Z"));
    expect(sourceSyncOffer("consulting_followup")?.patch).toEqual({
      status: "done",
      completed_at: "2026-10-31T08:30:00.000Z",
    });
  });

  it("does not offer sync for ambiguous or missing sources", () => {
    expect(sourceSyncOffer("workout")).toBeNull();
    expect(sourceSyncOffer("meal")).toBeNull();
    expect(sourceSyncOffer(undefined)).toBeNull();
    expect(canOfferSourceSync({ source_entity_type: "dev_work_item" })).toBe(false);
    expect(canOfferSourceSync({ source_entity_id: "x" })).toBe(false);
  });
});
