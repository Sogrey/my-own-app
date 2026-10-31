import { describe, expect, it } from "vitest";
import { collectionFocusPath, moduleFocusPath, sourceFocusPath, withFocus } from "../../src/moduleRoutes";

describe("module deep-link helpers", () => {
  it("appends focus query without breaking existing params", () => {
    expect(withFocus("/media", "abc")).toBe("/media?focus=abc");
    expect(withFocus("/today?new=1", "abc")).toBe("/today?new=1&focus=abc");
  });

  it("maps collections and source modules to focused routes", () => {
    expect(collectionFocusPath("mediaContents", "m1")).toBe("/media?focus=m1");
    expect(collectionFocusPath("devWorkItems", "w1")).toBe("/development?focus=w1");
    expect(sourceFocusPath("consulting", "d1")).toBe("/consulting?focus=d1");
    expect(moduleFocusPath("fitness", "wo1")).toBe("/fitness?focus=wo1");
  });
});
