import { describe, expect, it } from "vitest";
import {
  commandSectionTitle,
  createCommands,
  filterStaticCommands,
  matchesCommand,
  staticCommands,
} from "../../src/commandPalette";

describe("command palette", () => {
  it("shows actions and create shortcuts when the query is empty", () => {
    const items = filterStaticCommands("");
    expect(items.some((item) => item.id === "action-save")).toBe(true);
    expect(items.some((item) => item.id === "create-today")).toBe(true);
    expect(items.some((item) => item.id === "create-game")).toBe(true);
    expect(items.filter((item) => item.kind === "navigate")).toHaveLength(4);
  });

  it("filters by keywords across label and aliases", () => {
    const save = staticCommands.find((item) => item.id === "action-save")!;
    expect(matchesCommand(save, "保存")).toBe(true);
    expect(matchesCommand(save, "checkpoint")).toBe(true);

    const games = filterStaticCommands("游戏");
    expect(games.map((item) => item.id)).toContain("create-game");
    expect(games.map((item) => item.id)).toContain("nav-entertainment");
  });

  it("requires every query token to match", () => {
    const save = staticCommands.find((item) => item.id === "action-save")!;
    expect(matchesCommand(save, "手动 保存")).toBe(true);
    expect(matchesCommand(save, "手动 导出")).toBe(false);
  });

  it("includes entertainment in create commands for quick-add parity", () => {
    expect(createCommands.some((item) => item.href === "/entertainment?new=1")).toBe(true);
  });

  it("labels command sections for the palette UI", () => {
    expect(commandSectionTitle("action")).toBe("动作");
    expect(commandSectionTitle("create")).toBe("新建");
    expect(commandSectionTitle("navigate")).toBe("前往");
    expect(commandSectionTitle("result")).toBe("搜索结果");
  });
});
