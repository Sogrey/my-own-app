// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../server/app.js";
import { localWriteHeaders, makeTestDirectory, removeTestDirectory } from "../helpers.js";

let directory = "";
afterEach(() => { if (directory) removeTestDirectory(directory); directory = ""; });

describe("application health", () => {
  it("starts on loopback and reports a healthy migrated database", async () => {
    directory = makeTestDirectory("health");
    const app = await buildApp({ dataDir: directory, autoBackup: false });
    await app.listen({ host: "127.0.0.1", port: 0 });
    try {
      const address = app.server.address();
      expect(address && typeof address === "object" ? address.address : "").toBe("127.0.0.1");
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({
        application: "muzi-workspace",
        buildId: "development",
        status: "ok",
        database: "ok",
        schemaVersion: "002_workout_body_part.sql",
      });
    } finally {
      await app.close();
    }
  });

  it("rejects state-changing requests from non-local or missing browser origins", async () => {
    directory = makeTestDirectory("origin");
    const app = await buildApp({ dataDir: directory, autoBackup: false });
    try {
      const remote = await app.inject({
        method: "POST",
        url: "/api/collections/planItems",
        headers: { origin: "https://example.com" },
        payload: { title: "不应写入", plan_date: "2026-08-02" },
      });
      expect(remote.statusCode).toBe(403);

      const missing = await app.inject({
        method: "POST",
        url: "/api/collections/planItems",
        payload: { title: "缺少 Origin", plan_date: "2026-08-02" },
      });
      expect(missing.statusCode).toBe(403);

      const local = await app.inject({
        method: "POST",
        url: "/api/collections/planItems",
        headers: localWriteHeaders(),
        payload: { title: "本机写入", plan_date: "2026-08-02" },
      });
      expect(local.statusCode).toBe(201);
    } finally {
      await app.close();
    }
  });

  it("only opens data-directory or saved project local paths", async () => {
    directory = makeTestDirectory("open-path");
    const projectDir = makeTestDirectory("open-path-project");
    const outside = makeTestDirectory("open-path-outside");
    const app = await buildApp({ dataDir: directory, autoBackup: false });
    try {
      await app.inject({
        method: "POST",
        url: "/api/collections/devProjects",
        headers: localWriteHeaders(),
        payload: { name: "可打开项目", local_path: projectDir },
      });

      const allowedProject = await app.inject({
        method: "POST",
        url: "/api/system/open-path",
        headers: localWriteHeaders(),
        payload: { path: projectDir },
      });
      expect(allowedProject.statusCode).toBe(200);

      const allowedData = await app.inject({
        method: "POST",
        url: "/api/system/open-path",
        headers: localWriteHeaders(),
        payload: { path: directory },
      });
      expect(allowedData.statusCode).toBe(200);

      const denied = await app.inject({
        method: "POST",
        url: "/api/system/open-path",
        headers: localWriteHeaders(),
        payload: { path: outside },
      });
      expect(denied.statusCode).toBe(400);
      expect(denied.json().error.message).toMatch(/只能打开数据目录或已保存的项目本地目录/);
    } finally {
      await app.close();
      removeTestDirectory(projectDir);
      removeTestDirectory(outside);
    }
  });

  it("checkpoints SQLite before scheduling a user-requested shutdown", async () => {
    directory = makeTestDirectory("save-exit");
    let shutdownReason = "";
    const app = await buildApp({ dataDir: directory, autoBackup: false, requestShutdown: (reason) => { shutdownReason = reason; } });
    try {
      const created = await app.inject({ method: "POST", headers: localWriteHeaders(), url: "/api/collections/quickMemos", payload: { content: "退出前必须保存" } });
      expect(created.statusCode).toBe(201);
      const response = await app.inject({ method: "POST", headers: localWriteHeaders(), url: "/api/system/save-and-exit" });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ database: "ok", exiting: true });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(shutdownReason).toBe("user-exit");
      const state = await app.inject({ method: "GET", url: "/api/state" });
      expect(state.json().data.quickMemos[0].content).toBe("退出前必须保存");
    } finally {
      await app.close();
    }
  });
});
