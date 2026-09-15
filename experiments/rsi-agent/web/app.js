function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTasks(tasks) {
  const root = document.querySelector("#task-list");
  if (!root || !tasks.length) return;
  root.replaceChildren(
    ...tasks.map((task) =>
      el(`<article class="card">
        <p class="kicker">${escapeHtml(task.id)}</p>
        <h3>${escapeHtml(task.goal)}</h3>
        <p class="meta">最多 ${escapeHtml(task.maxIterations)} 轮 · 间隔 ${escapeHtml(
          task.intervalSeconds,
        )} 秒<br />验收 <code>${escapeHtml(task.acceptance)}</code></p>
      </article>`),
    ),
  );
}

function renderRuns(runs) {
  const root = document.querySelector("#run-list");
  if (!root) return;
  if (!runs.length) {
    root.replaceChildren(el(`<p class="empty">暂无运行记录。</p>`));
    return;
  }
  root.replaceChildren(
    ...runs.map((run) => {
      const status = Object.hasOwn(run, "ok") ? (run.ok ? "通过" : "未通过") : "进行中";
      const task = run.taskId ? `${escapeHtml(run.taskId)} · ` : "";
      const summary = run.summary
        ? `<p class="meta">${escapeHtml(run.summary).slice(0, 280)}</p>`
        : "";
      return el(`<article class="run">
        <p class="kicker">${task}${escapeHtml(run.id)}</p>
        <h3>${escapeHtml(status)} · ${escapeHtml(run.iterations)} 轮</h3>
        <p class="meta">${
          run.acceptance ? `冻结验收 <code>${escapeHtml(run.acceptance)}</code>` : "尚无冻结验收"
        }</p>
        ${summary}
      </article>`);
    }),
  );
}

async function loadPayload() {
  try {
    const api = await fetch("api/site");
    if (api.ok) return api.json();
  } catch {
    /* fall through to the committed snapshot */
  }
  const file = await fetch("data/site.json");
  if (!file.ok) throw new Error("no site payload");
  return file.json();
}

async function boot() {
  try {
    const data = await loadPayload();
    renderTasks(data.tasks || []);
    renderRuns(data.runs || []);
  } catch {
    /* static fallback already in HTML */
  }
}

boot();
