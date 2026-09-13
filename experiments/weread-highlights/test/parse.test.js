import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBook } from "../src/parse.js";

const sample = `---
title: 罗马史纲
author: 某人
isbn: "123"
progress: 10%
lastReadDate: 2022-10-05
---
# 元数据
> [!abstract] 罗马史纲

# 高亮划线
## 前言

> 📌 [吾生也有涯，而知也无涯。](<weread://bestbookmark?bookId=1&chapterUid=4>)
 💭 孔老夫子又说，朝闻道，夕死可矣 
 ⏱ 2022-10-05 18:27:23 ^39127565-4-2329-2351

> 📌 [历史学就必须是炼金术](<weread://bestbookmark?bookId=1&chapterUid=4>)
> ⏱ 2022-10-05 18:28:25 ^39127565-4-3347-3383

# 读书笔记
## 前言
### 划线评论
> 📌 吾生也有涯，而知也无涯。 ^21458552-7CMEzoA6x
    💭 孔老夫子又说，朝闻道，夕死可矣
    ⏱ 2022-10-05 18:27:53

# 本书评论
## 书评 No.1
逻辑思辨能力有硬伤 ^21458552-7Tt1K4RRE
⏱ 2024-08-15 18:39:06
`;

describe("parseBook", () => {
  it("keeps highlight text, chapter, and thought once", () => {
    const book = parseBook(sample, "罗马史纲.md");
    assert.equal(book.title, "罗马史纲");
    assert.equal(book.author, "某人");
    assert.equal(book.highlightCount, 2);
    assert.equal(book.noteCount, 1);
    assert.deepEqual(book.chapters, [
      {
        title: "前言",
        items: [
          { text: "吾生也有涯，而知也无涯。", note: "孔老夫子又说，朝闻道，夕死可矣" },
          { text: "历史学就必须是炼金术", note: "" },
        ],
      },
    ]);
    assert.deepEqual(book.reviews, ["逻辑思辨能力有硬伤"]);
  });

  it("decodes html entities in thoughts", () => {
    const book = parseBook(`---
title: x
---
# 高亮划线
> 📌 [过程](<weread://bestbookmark?bookId=1>)
 💭 优质的过程&gt;优质的目标 
# 读书笔记
# 本书评论
`);
    assert.equal(book.chapters[0].items[0].note, "优质的过程>优质的目标");
  });

  it("keeps text that contains markdown brackets", () => {
    const book = parseBook(`---
title: x
---
# 高亮划线
> 📌 [小白一份时间卖一次（见图1–4）。[插图]图1-4](<weread://bestbookmark?bookId=1>)
> ⏱ 2026-01-01 00:00:00 ^1
# 读书笔记
# 本书评论
`);
    assert.equal(book.chapters[0].items[0].text, "小白一份时间卖一次（见图1–4）。[插图]图1-4");
  });

  it("attaches thoughts that only live under 读书笔记", () => {
    const book = parseBook(`---
title: 如何阅读一本书
---
# 高亮划线
## 附录二
> 📌 [虽然名气很大，牛顿仍然一直保持朴实的本质。他在临死之前写道：“真理的大海则横陈在我面前。”](<weread://bestbookmark?bookId=1>)
> ⏱ 2023-11-04 20:50:16 ^1
# 读书笔记
## 附录二
### 划线评论
> 📌 他在临死之前写道：“真理的大海则横陈在我面前。” ^21458552-7MtEbNViC
    💭 such modest and humble
    ⏱ 2023-11-04 20:51:07
# 本书评论
`);
    assert.equal(book.noteCount, 1);
    assert.equal(book.chapters[0].items[0].note, "such modest and humble");
  });

  it("drops empty highlight links", () => {
    const book = parseBook(`---
title: x
---
# 高亮划线
> 📌 [](<weread://bestbookmark?bookId=1>)
> ⏱ 2024-01-01 00:00:00 ^1
# 读书笔记
# 本书评论
`);
    assert.equal(book.highlightCount, 0);
  });

  it("skips empty reviews", () => {
    const book = parseBook(`---
title: x
---
# 高亮划线
# 读书笔记
# 本书评论
## 书评 No.1
 ^21458552-7L81HnKeW
⏱ 2023-09-10 21:29:44
`);
    assert.deepEqual(book.reviews, []);
    assert.equal(book.highlightCount, 0);
  });
});
