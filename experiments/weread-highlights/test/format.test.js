import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBook, sortBooks } from "../src/format.js";

describe("formatBook", () => {
  it("writes a plain reading dump", () => {
    const text = formatBook({
      title: "小王子",
      author: "圣埃克絮佩里",
      isbn: "9787532778232",
      progress: "98%",
      lastReadDate: "2024-02-03",
      finishedDate: "2024-07-31",
      highlightCount: 1,
      noteCount: 1,
      reviews: ["值得重读"],
      chapters: [
        {
          title: "21",
          items: [{ text: "只有用心才能看见。", note: "记住" }],
        },
      ],
    });
    assert.equal(
      text,
      [
        "# 小王子",
        "作者：圣埃克絮佩里",
        "ISBN：9787532778232",
        "进度：98%",
        "最近阅读：2024-02-03",
        "读完：2024-07-31",
        "划线：1  想法：1  书评：1",
        "",
        "## 书评",
        "",
        "值得重读",
        "",
        "## 21",
        "",
        "只有用心才能看见。",
        "想法：记住",
      ].join("\n"),
    );
  });
});

describe("sortBooks", () => {
  it("puts newer lastReadDate first", () => {
    const sorted = sortBooks([
      { title: "旧", lastReadDate: "2022-01-01" },
      { title: "新", lastReadDate: "2024-02-03" },
    ]);
    assert.deepEqual(
      sorted.map((book) => book.title),
      ["新", "旧"],
    );
  });
});
