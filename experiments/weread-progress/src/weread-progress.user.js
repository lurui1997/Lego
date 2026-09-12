// ==UserScript==
// @name         微信读书书架进度
// @namespace    https://github.com/lurui1997/Lego
// @version      0.1.0
// @description  在微信读书网页版书架 / 书单上展示「读完」与「已读到 x%」
// @match        https://weread.qq.com/web/shelf
// @match        https://weread.qq.com/web/shelf/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const STYLE_ID = "lego-weread-progress-style";
  const BADGE_CLASS = "lego-weread-progress";

  function normalizeProgress(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.trunc(n)));
  }

  function isFinished(book) {
    if (!book || typeof book !== "object") return false;
    const progress = normalizeProgress(book.progress);
    if (progress === 100) return true;
    if (book.finishReading === 1 || book.finishReading === true) return true;
    if (book.finished === 1 || book.finished === true) return true;
    if (book.finishTime) return true;
    return false;
  }

  function progressLabel(book) {
    const percent = normalizeProgress(book?.progress);
    if (isFinished(book)) {
      return { kind: "finished", text: "读完", percent: 100 };
    }
    if (percent > 0) {
      return { kind: "reading", text: `已读到 ${percent}%`, percent };
    }
    return { kind: "unread", text: "未开始", percent: 0 };
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      a.shelfBook { position: relative; }
      .${BADGE_CLASS} {
        position: absolute;
        left: 0;
        right: 0;
        bottom: auto;
        z-index: 2;
        pointer-events: none;
      }
      .${BADGE_CLASS}[data-kind="finished"] {
        top: 8px;
        left: auto;
        right: 6px;
        width: auto;
        padding: 2px 6px;
        border-radius: 2px;
        background: #1a9e5c;
        color: #fff;
        font-size: 11px;
        line-height: 16px;
      }
      .${BADGE_CLASS}[data-kind="reading"],
      .${BADGE_CLASS}[data-kind="unread"] {
        top: 0;
        height: 185px;
        display: flex;
        align-items: flex-end;
      }
      .${BADGE_CLASS}__bar {
        width: 100%;
        padding: 4px 6px 6px;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.62));
        color: #fff;
        font-size: 11px;
        line-height: 14px;
      }
      a.shelfBook .info.lego-weread-info {
        display: block;
        height: auto;
        -webkit-line-clamp: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function vueOf(el) {
    return (
      el.__vue__ ||
      el.__vueParentComponent?.proxy ||
      el.__vueParentComponent?.ctx ||
      null
    );
  }

  function bookFromCard(card) {
    const vue = vueOf(card);
    if (vue?.book && vue.book.bookId) return vue.book;
    let node = card;
    for (let i = 0; i < 6 && node; i += 1) {
      const inst = vueOf(node);
      if (inst?.book?.bookId) return inst.book;
      node = node.parentElement;
    }
    return null;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function progressByBookId(bookId) {
    const data = await fetchJson(
      `/web/book/getProgress?bookId=${encodeURIComponent(bookId)}`,
    );
    const book = data?.book || data;
    if (!book) return null;
    return {
      bookId,
      progress: book.progress,
      finishTime: book.finishTime,
      isStartReading: book.isStartReading,
    };
  }

  async function shelfIndex() {
    const data = await fetchJson("/web/shelf/sync");
    const books = Array.isArray(data?.books) ? data.books : [];
    const map = new Map();
    for (const book of books) {
      if (book?.bookId) map.set(String(book.bookId), book);
    }
    return map;
  }

  function paint(card, book) {
    const label = progressLabel(book);
    let badge = card.querySelector(`.${BADGE_CLASS}`);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = BADGE_CLASS;
      const cover = card.querySelector(".cover") || card.firstElementChild;
      if (cover) cover.insertAdjacentElement("afterbegin", badge);
      else card.insertBefore(badge, card.firstChild);
    }
    badge.dataset.kind = label.kind;
    if (label.kind === "finished") {
      badge.textContent = label.text;
    } else {
      badge.innerHTML = `<div class="${BADGE_CLASS}__bar">${label.text}</div>`;
    }

    let info = card.querySelector(".info");
    if (!info) {
      info = document.createElement("div");
      info.className = "info";
      card.appendChild(info);
    }
    info.classList.add("lego-weread-info");
    info.textContent = label.text;
  }

  const progressCache = new Map();
  let shelfPromise = null;

  function getShelf() {
    if (!shelfPromise) shelfPromise = shelfIndex().catch(() => new Map());
    return shelfPromise;
  }

  async function resolveBook(card) {
    const local = bookFromCard(card);
    if (local && (local.progress != null || local.finishReading != null)) {
      return local;
    }
    const bookId = local?.bookId;
    const shelf = await getShelf();
    if (bookId && shelf.has(String(bookId))) {
      return { ...local, ...shelf.get(String(bookId)) };
    }
    const title = card.querySelector(".title")?.textContent?.trim();
    if (title) {
      for (const book of shelf.values()) {
        if (book.title === title) return { ...local, ...book };
      }
    }
    if (bookId) {
      if (!progressCache.has(bookId)) {
        progressCache.set(bookId, progressByBookId(bookId));
      }
      const extra = await progressCache.get(bookId);
      if (extra) return { ...local, ...extra };
    }
    return local;
  }

  async function enhance() {
    ensureStyle();
    const cards = document.querySelectorAll("a.shelfBook:not(.shelfBook_add)");
    for (const card of cards) {
      const book = await resolveBook(card);
      if (!book) continue;
      paint(card, book);
    }
  }

  let timer = 0;
  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      enhance().catch(() => {});
    }, 200);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
