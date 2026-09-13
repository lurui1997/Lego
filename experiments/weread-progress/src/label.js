/**
 * 进度文案口径对齐微信读书官方 skill：
 * https://github.com/Tencent/WeChatReading/blob/main/skills/book.md
 *
 * progress 是 0–100 的整数；1 表示 1%，不是 100%。
 * 只有 progress === 100，或书架 finishReading === 1，才表示读完。
 * books[].finished 是书是否完结，不是阅读完成，不能当「读完」。
 */

export function normalizeProgress(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(n)));
}

export function isFinished(book) {
  if (!book || typeof book !== "object") return false;
  if (normalizeProgress(book.progress) === 100) return true;
  if (book.finishReading === 1 || book.finishReading === true) return true;
  return false;
}

export function hasStarted(book) {
  if (!book || typeof book !== "object") return false;
  if (normalizeProgress(book.progress) > 0) return true;
  if (book.isStartReading === 1 || book.isStartReading === true) return true;
  if (Number(book.readingTime) > 0) return true;
  return false;
}

/**
 * @returns {{ kind: "finished" | "reading" | "unread"; text: string; percent: number }}
 */
export function progressLabel(book) {
  const percent = normalizeProgress(book?.progress);
  if (isFinished(book)) {
    return { kind: "finished", text: "读完", percent: 100 };
  }
  if (hasStarted(book)) {
    return { kind: "reading", text: `已读到 ${percent}%`, percent };
  }
  return { kind: "unread", text: "未开始", percent: 0 };
}
