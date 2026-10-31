import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, weekRange } from "../../src/utils";

describe("date settings helpers", () => {
  it("formats dates with zh-CN or iso preferences", () => {
    expect(formatDate("2026-08-03", "iso")).toBe("2026-08-03");
    expect(formatDate("2026-08-03", "zh-CN")).toMatch(/8/);
    expect(formatDateTime("2026-08-03T15:30:00.000Z", "iso")).toMatch(/2026-08-03 \d{2}:\d{2}/);
  });

  it("builds a natural week from monday or sunday", () => {
    expect(weekRange("2026-08-05", "monday")).toEqual({ start: "2026-08-03", end: "2026-08-09" });
    expect(weekRange("2026-08-05", "sunday")).toEqual({ start: "2026-08-02", end: "2026-08-08" });
  });
});
