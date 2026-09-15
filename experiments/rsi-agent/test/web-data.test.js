import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSitePayload } from "../src/web-data.js";

describe("web data", () => {
  it("lists tasks and recent runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsi-web-"));
    await mkdir(join(root, "tasks", "demo"), { recursive: true });
    await writeFile(
      join(root, "tasks", "demo", "task.json"),
      JSON.stringify({
        goal: "g",
        acceptance: "true",
        max_iterations: 3,
        interval_seconds: 1,
      }),
    );
    await mkdir(join(root, "state", "run-1", "iters"), { recursive: true });
    await writeFile(join(root, "state", "run-1", "acceptance.txt"), "true\n");
    await writeFile(join(root, "state", "run-1", "iters", "1.md"), "ok");
    const payload = await loadSitePayload(root);
    assert.equal(payload.tasks[0].id, "demo");
    assert.equal(payload.tasks[0].maxIterations, 3);
    assert.equal(payload.runs[0].iterations, 1);
    assert.equal(payload.runs[0].acceptance, "true");
  });
});
