import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { cursorArgs, runCursorTurn } from "../src/cursor.js";

function fakeSpawn(bin, args) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  queueMicrotask(() => {
    child.stdout.emit("data", Buffer.from(`${bin} ${args[0]} ${args.at(-1)}`));
    child.emit("close", 0);
  });
  return child;
}

describe("cursor cli", () => {
  it("prints non-interactively against the experiment workspace", () => {
    const args = cursorArgs({ workspace: "/tmp/rsi", prompt: "fix retry" });
    assert.deepEqual(args.slice(0, 9), [
      "--print",
      "--trust",
      "--force",
      "--sandbox",
      "disabled",
      "--workspace",
      "/tmp/rsi",
      "--output-format",
      "text",
    ]);
    assert.equal(args.at(-1), "fix retry");
  });

  it("runs the injected binary and keeps stdout", async () => {
    const turn = await runCursorTurn({
      root: "/tmp/rsi",
      prompt: "hi",
      bin: "/usr/bin/agent",
      spawnImpl: fakeSpawn,
    });
    assert.equal(turn.ok, true);
    assert.equal(turn.stdout, "/usr/bin/agent --print hi");
  });
});
