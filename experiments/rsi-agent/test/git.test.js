import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commitIteration, initSnapshot, resetHard } from "../src/git.js";
import { smoke } from "../src/smoke.js";

describe("snapshot rollback", () => {
  it("restores last good tree after a broken smoke", async () => {
    const root = await mkdtemp(join(tmpdir(), "rsi-git-"));
    const runDir = join(root, "state", "run");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "cli.js"), "console.log('ok');\n", "utf8");
    const lastGood = await initSnapshot(root, runDir);
    await writeFile(join(root, "src", "cli.js"), "this is not js {\n", "utf8");
    await commitIteration(root, runDir, 1);
    const smoked = await smoke(root);
    assert.equal(smoked.ok, false);
    await resetHard(root, runDir, lastGood);
    const restored = await readFile(join(root, "src", "cli.js"), "utf8");
    assert.equal(restored, "console.log('ok');\n");
  });
});
