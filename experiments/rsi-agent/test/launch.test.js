import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJobRunner, resolveTaskDir, slugTaskId } from "../src/launch.js";

describe("launch", () => {
  it("starts one job and rejects a second while running", async () => {
    assert.equal(slugTaskId("Retry On 429"), "retry-on-429");
    const root = await mkdtemp(join(tmpdir(), "rsi-launch-"));
    await mkdir(join(root, "tasks", "demo"), { recursive: true });
    await writeFile(
      join(root, "tasks", "demo", "task.json"),
      JSON.stringify({ goal: "g", acceptance: "true" }),
    );
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const runner = createJobRunner({
      root,
      runLoop: async () => {
        await gate;
        return { ok: true, iterations: 1, runDir: "/tmp/run" };
      },
    });
    const first = await runner.start({ taskId: "demo" });
    assert.equal(first.status, "running");
    await assert.rejects(() => runner.start({ taskId: "demo" }), /已有任务在跑/);
    release();
    for (let i = 0; i < 30 && runner.snapshot().status === "running"; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.equal(runner.snapshot().status, "done");
    const created = await resolveTaskDir(root, {
      taskId: "from-web",
      goal: "new goal",
      acceptance: "true",
      max_iterations: 2,
    });
    assert.equal(created.id, "from-web");
  });
});
