import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFinished, progressLabel } from "../src/label.js";

describe("progressLabel", () => {
  it("marks 100 as finished", () => {
    assert.deepEqual(progressLabel({ progress: 100, finishTime: 1748563200 }), {
      kind: "finished",
      text: "读完",
      percent: 100,
    });
  });

  it("treats 1 as one percent, not finished", () => {
    assert.deepEqual(progressLabel({ progress: 1 }), {
      kind: "reading",
      text: "已读到 1%",
      percent: 1,
    });
  });

  it("shows in-progress percent", () => {
    assert.deepEqual(progressLabel({ progress: 45 }), {
      kind: "reading",
      text: "已读到 45%",
      percent: 45,
    });
  });

  it("shows unread when progress is 0", () => {
    assert.deepEqual(progressLabel({ progress: 0 }), {
      kind: "unread",
      text: "未开始",
      percent: 0,
    });
  });

  it("uses finishReading from shelf sync", () => {
    assert.equal(isFinished({ progress: 80, finishReading: 1 }), true);
    assert.equal(progressLabel({ progress: 80, finishReading: 1 }).text, "读完");
  });
});
