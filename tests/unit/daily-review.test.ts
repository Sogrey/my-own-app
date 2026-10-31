import { describe, expect, it } from "vitest";
import { shouldPromptDailyReview } from "../../src/dailyReview";

describe("shouldPromptDailyReview", () => {
  it("prompts near completion or in the evening when review is empty", () => {
    expect(shouldPromptDailyReview({ progress: 80, total: 4, hasReview: false, hour: 10 })).toBe(true);
    expect(shouldPromptDailyReview({ progress: 20, total: 4, hasReview: false, hour: 18 })).toBe(true);
  });

  it("stays quiet when already reviewed, empty day, or mid-day with low progress", () => {
    expect(shouldPromptDailyReview({ progress: 100, total: 3, hasReview: true, hour: 20 })).toBe(false);
    expect(shouldPromptDailyReview({ progress: 0, total: 0, hasReview: false, hour: 20 })).toBe(false);
    expect(shouldPromptDailyReview({ progress: 40, total: 5, hasReview: false, hour: 14 })).toBe(false);
  });
});
