import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeAcceptance, loadTask, readFrozenAcceptance } from "../src/task.js";

describe("frozen acceptance", () => {
  it("keeps the copied command after task.json changes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rsi-task-"));
    const taskDir = join(dir, "task");
    const runDir = join(dir, "run");
    await mkdir(taskDir, { recursive: true });
    await writeFile(
      join(taskDir, "task.json"),
      JSON.stringify({
        goal: "x",
        acceptance: "node --test test/retry.test.js",
        max_iterations: 2,
      }),
      "utf8",
    );
    const task = await loadTask(taskDir);
    await freezeAcceptance(runDir, task.acceptance);
    await writeFile(
      join(taskDir, "task.json"),
      JSON.stringify({ goal: "x", acceptance: "true" }),
      "utf8",
    );
    assert.equal(await readFrozenAcceptance(runDir), "node --test test/retry.test.js");
    const disk = await readFile(join(runDir, "acceptance.txt"), "utf8");
    assert.equal(disk.trim(), "node --test test/retry.test.js");
  });
});
