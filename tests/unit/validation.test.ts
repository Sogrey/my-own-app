// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ValidationError } from "../../server/errors.js";
import { validateCollectionInput, validateSettingsInput } from "../../server/validation.js";

describe("collection and settings validation", () => {
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
});
