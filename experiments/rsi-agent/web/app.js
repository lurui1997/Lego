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
  if (!root) return;
  if (!tasks.length) return;
  root.replaceChildren(
    ...tasks.map((task) =>
      el(`<article class="card">
        <p class="kicker">${escapeHtml(task.id)}</p>
        <h3>${escapeHtml(task.goal)}</h3>
        <p class="meta">最多 ${escapeHtml(task.maxIterations)} 轮 · 间隔 ${escapeHtml(
          task.intervalSeconds,
        )} 秒<br />验收 <code>${escapeHtml(task.acceptance)}</code></p>
        <button class="btn btn-primary launch-existing" type="button" data-task="${escapeHtml(
          task.id,
        )}">发起此任务</button>
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

function fillTaskSelect(tasks) {
  const select = document.querySelector("#task-select");
  if (!select) return;
  const current = select.value;
  select.replaceChildren(el(`<option value="">新建任务</option>`));
  for (const task of tasks) {
    const opt = document.createElement("option");
    opt.value = task.id;
    opt.textContent = `${task.id} · ${task.goal}`;
    select.append(opt);
  }
  if ([...select.options].some((o) => o.value === current)) select.value = current;
  toggleCustomFields();
}

function toggleCustomFields() {
  const select = document.querySelector("#task-select");
  const custom = document.querySelector("#custom-fields");
  if (!select || !custom) return;
  custom.hidden = Boolean(select.value);
}

function setLaunchEnabled(enabled, job) {
  const form = document.querySelector("#launch-form");
  const hint = document.querySelector("#launch-hint");
  const status = document.querySelector("#launch-status");
  const submit = document.querySelector("#launch-submit");
  if (!form || !hint || !status || !submit) return;
  form.dataset.launch = enabled ? "1" : "0";
  submit.disabled = !enabled || job?.status === "running";
  if (!enabled) {
    hint.innerHTML =
      "GitHub Pages 是静态站，不能拉起本机 agent。在仓库里执行 <code>npm run web</code>，打开 <a href=\"http://127.0.0.1:3847/#start\">http://127.0.0.1:3847/#start</a> 发起。";
    return;
  }
  if (job?.status === "running") {
    status.textContent = `正在跑 ${job.taskId || "任务"}…`;
  } else if (job?.status === "done") {
    status.textContent = job.result?.ok
      ? `通过 ${job.result.iterations} 轮`
      : `未通过 ${job.result?.iterations ?? ""} 轮`;
  } else if (job?.status === "error") {
    status.textContent = job.error || "启动失败";
  }
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

async function refresh() {
  const data = await loadPayload();
  renderTasks(data.tasks || []);
  renderRuns(data.runs || []);
  fillTaskSelect(data.tasks || []);
  setLaunchEnabled(Boolean(data.launch), data.job);
  return data;
}

function formBody(form) {
  const taskId = form.taskId.value.trim();
  if (taskId) return { taskId };
  return {
    taskId: form.newTaskId.value.trim(),
    goal: form.goal.value.trim(),
    acceptance: form.acceptance.value.trim(),
    max_iterations: Number(form.max_iterations.value || 5),
    interval_seconds: Number(form.interval_seconds.value || 0),
  };
}

async function launch(body) {
  const status = document.querySelector("#launch-status");
  const res = await fetch("api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (status) status.textContent = data.error || `无法发起（${res.status}）`;
    return;
  }
  if (status) status.textContent = `已开始 ${data.taskId || ""}`;
  pollJob();
}

let pollTimer = 0;
function pollJob() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const data = await refresh();
      if (data.job?.status !== "running") clearInterval(pollTimer);
    } catch {
      clearInterval(pollTimer);
    }
  }, 2000);
}

async function boot() {
  try {
    const data = await refresh();
    if (data.job?.status === "running") pollJob();
  } catch {
    setLaunchEnabled(false, { status: "idle" });
  }

  const select = document.querySelector("#task-select");
  select?.addEventListener("change", toggleCustomFields);

  document.querySelector("#task-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest(".launch-existing");
    if (!btn) return;
    const form = document.querySelector("#launch-form");
    const picker = document.querySelector("#task-select");
    if (!form || !picker) return;
    picker.value = btn.dataset.task;
    toggleCustomFields();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#launch-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.launch !== "1") return;
    await launch(formBody(form));
  });
}

boot();
