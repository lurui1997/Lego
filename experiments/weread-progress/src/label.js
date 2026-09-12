/**
 * 进度文案口径对齐微信读书官方 skill：
 * https://github.com/Tencent/WeChatReading/blob/main/skills/book.md
 *
 * progress 是 0–100 的整数；1 表示 1%，不是 100%。
 * 只有 progress === 100 才表示读完；finishTime 通常同时存在。
 * 书架 sync 的 finishReading === 1 也表示读完。
 */

export function normalizeProgress(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(n)));
}

export function isFinished(book) {
  if (!book || typeof book !== "object") return false;
  const progress = normalizeProgress(book.progress);
  if (progress === 100) return true;
  if (book.finishReading === 1 || book.finishReading === true) return true;
  if (book.finished === 1 || book.finished === true) return true;
  if (book.finishTime) return true;
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
  if (percent > 0) {
    return { kind: "reading", text: `已读到 ${percent}%`, percent };
  }
  return { kind: "unread", text: "未开始", percent: 0 };
}
