import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAppPaths } from "../server/config.js";
import { DatabaseManager } from "../server/database.js";
import { AppStore } from "../server/store.js";

export const LOCAL_ORIGIN = "http://127.0.0.1";

/** 写操作要求本机 Origin；集成测试统一带上。 */
export function localWriteHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { origin: LOCAL_ORIGIN, ...extra };
}

export function makeTestDirectory(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `muzi-${label}-`));
}

export function removeTestDirectory(directory: string): void {
  const resolved = path.resolve(directory);
  if (!path.basename(resolved).startsWith("muzi-")) throw new Error("Refusing to remove an unexpected test directory");
  fs.rmSync(resolved, { recursive: true, force: true });
}

/** 领域单测用的临时 SQLite + AppStore。调用方负责 manager.close()。 */
export function createTestStore(label: string): { directory: string; manager: DatabaseManager; store: AppStore } {
  const directory = makeTestDirectory(label);
  const manager = new DatabaseManager(getAppPaths(directory));
  return { directory, manager, store: new AppStore(manager) };
}
