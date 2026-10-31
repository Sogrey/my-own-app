import { describe, expect, it } from "vitest";
import { collectionDefinitions } from "../../server/collections.js";
import { appearanceValues, collectionNames, dateFormatValues, knownSettingKeys, themeValues, weekStartValues } from "../../shared/schema.js";

describe("shared schema", () => {
  it("keeps collection names aligned with server definitions", () => {
    expect([...collectionNames].sort()).toEqual(Object.keys(collectionDefinitions).sort());
  });

  it("exports the known settings whitelist used by validation", () => {
    expect(knownSettingKeys).toEqual(["theme", "appearance", "weekStart", "dateFormat", "dashboardModules"]);
    expect(themeValues).toContain("dark");
    expect(appearanceValues).toContain("neo");
    expect(weekStartValues).toContain("monday");
    expect(dateFormatValues).toContain("iso");
  });
});
