import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { acceptanceFile, assertWritable, resolveInside } from "../src/paths.js";
import { createTools } from "../src/tools.js";

describe("paths", () => {
  it("allows paths inside root and rejects parent", () => {
    const root = "/tmp/rsi-root";
    assert.equal(resolveInside(root, "src/llm.js"), resolve(root, "src/llm.js"));
    assert.throws(() => resolveInside(root, "../secret"), /越界/);
  });

  it("blocks writes to frozen acceptance", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsi-path-"));
    const runDir = join(root, "state", "run1");
    await mkdir(runDir, { recursive: true });
    const frozen = acceptanceFile(runDir);
    await writeFile(frozen, "npm test", "utf8");
    assert.throws(() => assertWritable(root, runDir, frozen), /冻结验收/);
    const tools = createTools({ root, runDir });
    await assert.rejects(tools("write", { path: "state/run1/acceptance.txt", content: "true" }), /冻结验收/);
  });
});
