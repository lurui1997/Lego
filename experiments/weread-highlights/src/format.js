export function formatBook(book) {
  const lines = [`# ${book.title}`];
  if (book.author) lines.push(`作者：${book.author}`);
  if (book.isbn) lines.push(`ISBN：${book.isbn}`);
  if (book.progress) lines.push(`进度：${book.progress}`);
  if (book.lastReadDate) lines.push(`最近阅读：${book.lastReadDate}`);
  if (book.finishedDate) lines.push(`读完：${book.finishedDate}`);
  lines.push(
    `划线：${book.highlightCount}  想法：${book.noteCount}  书评：${book.reviews.length}`,
  );

  if (book.reviews.length) {
    lines.push("", "## 书评");
    for (const review of book.reviews) {
      lines.push("", review);
    }
  }

  for (const chapter of book.chapters) {
    lines.push("", `## ${chapter.title || "未分章"}`);
    for (const item of chapter.items) {
      lines.push("", item.text);
      if (item.note) lines.push(`想法：${item.note}`);
    }
  }

  return lines.join("\n").trimEnd();
}

export function formatCorpus(books, { sourceDir, generatedAt }) {
  const highlightCount = books.reduce((n, book) => n + book.highlightCount, 0);
  const noteCount = books.reduce((n, book) => n + book.noteCount, 0);
  const reviewCount = books.reduce((n, book) => n + book.reviews.length, 0);
  const header = [
    "# 微信读书划线",
    "",
    `来源：${sourceDir}`,
    `生成：${generatedAt}`,
    `书籍：${books.length}  划线：${highlightCount}  想法：${noteCount}  书评：${reviewCount}`,
    "",
    "每本书用一行 `=====` 分隔。章下先原文划线，有点评则另起一行写「想法：」。",
  ];
  const body = books.map((book) => formatBook(book)).join("\n\n=====\n\n");
  return `${header.join("\n")}\n\n=====\n\n${body}\n`;
}

export function sortBooks(books) {
  return [...books].sort((a, b) => {
    const date = (b.lastReadDate || "").localeCompare(a.lastReadDate || "");
    if (date) return date;
    return a.title.localeCompare(b.title, "zh");
  });
}
