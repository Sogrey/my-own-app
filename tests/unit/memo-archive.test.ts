import { describe, expect, it } from "vitest";
import { isArchivedMemo, memoConvertedLabel, recentArchivedMemos } from "../../src/features/memoArchive";

describe("memo archive helpers", () => {
  it("lists recent archived memos with converted labels", () => {
    const list = recentArchivedMemos([
      { id: "1", content: "新", archived_at: "2026-08-03T10:00:00.000Z", converted_type: "planItems", converted_id: "p1" },
      { id: "2", content: "旧", archived_at: "2026-08-01T10:00:00.000Z", converted_type: "mediaContents", converted_id: "m1" },
      { id: "3", content: "活跃" },
    ]);
    expect(list.map((item) => item.id)).toEqual(["1", "2"]);
    expect(isArchivedMemo(list[0])).toBe(true);
    expect(memoConvertedLabel("mediaContents")).toBe("内容灵感");
  });
});
