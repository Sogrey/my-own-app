// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../server/app.js";
import { localWriteHeaders, makeTestDirectory, removeTestDirectory } from "../helpers.js";

let directory = "";
let app: FastifyInstance;
beforeEach(async () => {
  directory = makeTestDirectory("import");
  app = await buildApp({ dataDir: directory, autoBackup: false });
});
afterEach(async () => {
  await app.close();
  removeTestDirectory(directory);
});

describe("selective import", () => {
  it("imports new media rows and skips existing ids", async () => {
    const created = await app.inject({
      method: "POST",
      headers: localWriteHeaders(),
      url: "/api/collections/mediaContents",
      payload: { title: "已有内容", stage: "idea" },
    });
    expect(created.statusCode).toBe(201);
    const existingId = created.json().data.id as string;

    const imported = await app.inject({
      method: "POST",
      headers: localWriteHeaders(),
      url: "/api/import",
      payload: {
        collections: {
          mediaContents: [
            { id: existingId, title: "应被跳过", stage: "ready" },
            { id: "import-media-1", title: "新导入内容", stage: "planning", platform: "B站" },
          ],
        },
      },
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().data.summary.mediaContents).toEqual({ created: 1, skipped: 1, failed: 0 });

    const list = await app.inject({ method: "GET", url: "/api/collections/mediaContents" });
    const titles = list.json().data.map((item: { title: string }) => item.title).sort();
    expect(titles).toEqual(["已有内容", "新导入内容"]);
  });
});
