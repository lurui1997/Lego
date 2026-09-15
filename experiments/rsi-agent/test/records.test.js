import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadArchivedRuns, saveRunRecord } from "../src/records.js";
import { loadSitePayload } from "../src/web-data.js";
import { exportSite } from "../src/export-site.js";

describe("run records", () => {
  it("archives a run and prefers it over live state", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsi-rec-"));
    await mkdir(join(root, "tasks", "demo"), { recursive: true });
    await writeFile(
      join(root, "tasks", "demo", "task.json"),
      JSON.stringify({ goal: "g", acceptance: "true" }),
    );
    await saveRunRecord(root, {
      id: "run-keep",
      taskId: "demo",
      goal: "g",
      ok: true,
      iterations: 2,
      acceptance: "true",
      summary: "done",
    });
    const listed = await loadArchivedRuns(root);
    assert.equal(listed[0].ok, true);
    assert.equal(listed[0].taskId, "demo");
    const payload = await loadSitePayload(root);
    assert.equal(payload.runs[0].id, "run-keep");
    const dest = await exportSite(root);
    assert.match(dest, /site\.json$/);
  });
});
