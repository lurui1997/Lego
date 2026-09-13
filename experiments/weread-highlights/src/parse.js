const SECTION_HEADING = /^# (元数据|高亮划线|读书笔记|本书评论)\s*$/;
const CHAPTER_HEADING = /^(#{2,3})\s+(.+?)\s*$/;
const HIGHLIGHT_LINK = /^>\s*📌\s*\[(.*)\]\(<[^>]*>\)\s*$/;
const HIGHLIGHT_PLAIN = /^>\s*📌\s+(.+?)(?:\s+\^[^\s]+)?\s*$/;
const NOTE_HEADING = /^###\s+划线评论\s*$/;
const THOUGHT = /^>?\s*💭\s*(.+?)\s*$/;
const CLOCK = /^>?\s*⏱/;
const REVIEW_HEADING = /^##\s+书评/;
const REVIEW_ANCHOR = /\s+\^[^\s]+$/;

export function decodeEntities(text) {
  return text
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { meta: {}, body: raw };
  const yaml = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const meta = {};
  for (const line of yaml.split("\n")) {
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body };
}

export function splitSections(body) {
  const sections = {};
  let current = null;
  const buf = [];
  const flush = () => {
    if (current) sections[current] = buf.join("\n");
  };
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(SECTION_HEADING);
    if (match) {
      flush();
      current = match[1];
      buf.length = 0;
      continue;
    }
    if (current) buf.push(line);
  }
  flush();
  return sections;
}

function startChapter(chapters, title) {
  const last = chapters.at(-1);
  if (last && last.title === title) return last;
  const chapter = { title, items: [] };
  chapters.push(chapter);
  return chapter;
}

export function parseHighlights(section) {
  if (!section?.trim()) return [];
  const chapters = [];
  let chapterTitle = "";
  let pending = null;

  const commit = () => {
    if (!pending?.text) {
      pending = null;
      return;
    }
    startChapter(chapters, chapterTitle).items.push(pending);
    pending = null;
  };

  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const heading = line.match(CHAPTER_HEADING);
    if (heading) {
      commit();
      chapterTitle = heading[2].trim();
      continue;
    }
    if (CLOCK.test(line)) continue;
    const thought = line.match(THOUGHT);
    if (thought && pending) {
      pending.note = decodeEntities(thought[1].trim());
      continue;
    }
    const linked = line.match(HIGHLIGHT_LINK);
    const plain = linked ? null : line.match(HIGHLIGHT_PLAIN);
    if (linked || plain) {
      commit();
      const text = decodeEntities((linked?.[1] ?? plain[1]).trim());
      pending = text ? { text, note: "" } : null;
    }
  }
  commit();
  return chapters.filter((chapter) => chapter.items.length > 0);
}

export function parseNoteComments(section) {
  if (!section?.trim()) return [];
  const notes = [];
  let chapterTitle = "";
  let pending = null;
  const commit = () => {
    if (pending?.note) notes.push(pending);
    pending = null;
  };
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (NOTE_HEADING.test(line)) continue;
    const heading = line.match(CHAPTER_HEADING);
    if (heading) {
      commit();
      chapterTitle = heading[2].trim();
      continue;
    }
    if (CLOCK.test(line)) continue;
    const thought = line.match(THOUGHT);
    if (thought && pending) {
      pending.note = decodeEntities(thought[1].trim());
      continue;
    }
    const quoted = line.match(HIGHLIGHT_PLAIN);
    if (quoted) {
      commit();
      pending = {
        chapter: chapterTitle,
        quote: decodeEntities(quoted[1].trim()),
        note: "",
      };
    }
  }
  commit();
  return notes;
}

function findHighlight(chapters, quote) {
  const needle = quote.trim();
  if (!needle) return null;
  const exact = [];
  const fuzzy = [];
  for (const chapter of chapters) {
    for (const item of chapter.items) {
      if (item.text === needle) exact.push(item);
      else if (item.text.includes(needle) || needle.includes(item.text)) fuzzy.push(item);
    }
  }
  if (exact.length) return exact[0];
  if (!fuzzy.length) return null;
  fuzzy.sort((a, b) => a.text.length - b.text.length);
  return fuzzy[0];
}

export function attachNotes(chapters, notes) {
  for (const note of notes) {
    const item = findHighlight(chapters, note.quote);
    if (item) {
      if (!item.note) item.note = note.note;
      continue;
    }
    startChapter(chapters, note.chapter).items.push({ text: note.quote, note: note.note });
  }
}

export function parseReviews(section) {
  if (!section?.trim()) return [];
  const reviews = [];
  let collecting = false;
  const buf = [];
  const flush = () => {
    if (!collecting) return;
    const text = decodeEntities(buf.join("\n").trim()).replace(REVIEW_ANCHOR, "").trim();
    if (text) reviews.push(text);
    buf.length = 0;
    collecting = false;
  };
  for (const raw of section.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (REVIEW_HEADING.test(line)) {
      flush();
      collecting = true;
      continue;
    }
    if (!collecting) continue;
    if (CLOCK.test(line)) continue;
    if (/^\s*\^[^\s]+\s*$/.test(line)) continue;
    buf.push(line);
  }
  flush();
  return reviews;
}

export function parseBook(raw, sourceFile = "") {
  const { meta, body } = parseFrontmatter(raw);
  const sections = splitSections(body);
  const chapters = parseHighlights(sections["高亮划线"] ?? "");
  attachNotes(chapters, parseNoteComments(sections["读书笔记"] ?? ""));
  const reviews = parseReviews(sections["本书评论"] ?? "");
  const highlightCount = chapters.reduce((n, chapter) => n + chapter.items.length, 0);
  const noteCount = chapters.reduce(
    (n, chapter) => n + chapter.items.filter((item) => item.note).length,
    0,
  );
  return {
    sourceFile,
    title: meta.title || sourceFile.replace(/\.md$/, ""),
    author: meta.author || "",
    isbn: meta.isbn || "",
    progress: meta.progress || "",
    lastReadDate: meta.lastReadDate || "",
    finishedDate: meta.finishedDate || "",
    chapters,
    reviews,
    highlightCount,
    noteCount,
  };
}

export function bookHasContent(book) {
  return book.highlightCount > 0 || book.reviews.length > 0;
}
