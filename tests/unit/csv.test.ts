import { describe, expect, it } from "vitest";
import { parseCsv } from "../../shared/csv";

describe("parseCsv", () => {
  it("parses quoted commas and escaped quotes", () => {
    const rows = parseCsv(`"id","title"\n"a","hello, ""world"""\n"b",plain\n`);
    expect(rows).toEqual([
      { id: "a", title: 'hello, "world"' },
      { id: "b", title: "plain" },
    ]);
  });
});
