import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadTask } from "./task.js";

export function slugTaskId(id) {
  const slug = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug.length > 64) {
    const err = new Error("任务 id 需为 1–64 位小写字母、数字或连字符");
    err.status = 400;
    throw err;
  }
  return slug;
}

export async function writeTask(root, input) {
  const id = slugTaskId(input.taskId || `web-${Date.now().toString(36)}`);
  const goal = String(input.goal || "").trim();
  const acceptance = String(input.acceptance || "").trim();
  if (!goal || !acceptance) {
    const err = new Error("需要 goal 和 acceptance");
    err.status = 400;
    throw err;
  }
  const task = {
    goal,
    acceptance,
    max_iterations: Number(input.max_iterations ?? input.maxIterations ?? 5),
    interval_seconds: Number(input.interval_seconds ?? input.intervalSeconds ?? 0),
  };
  const dir = join(root, "tasks", id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return { id, dir, task };
}

export async function resolveTaskDir(root, body = {}) {
  const existing = String(body.taskId || "").trim();
  const custom = String(body.goal || "").trim();
  if (existing && !custom) {
    const dir = join(root, "tasks", slugTaskId(existing));
    await loadTask(dir);
    return { id: slugTaskId(existing), dir };
  }
  const written = await writeTask(root, body);
  return { id: written.id, dir: written.dir };
}

export function publicJob(job) {
  if (!job) return { status: "idle" };
  return {
    status: job.status,
    taskId: job.taskId,
    startedAt: job.startedAt,
    error: job.error,
    result: job.result,
  };
}

export function createJobRunner({ root, runLoop }) {
  let current = null;

  return {
    snapshot() {
      return publicJob(current);
    },
    async start(body) {
      if (current?.status === "running") {
        const err = new Error("已有任务在跑");
        err.status = 409;
        throw err;
      }
      const resolved = await resolveTaskDir(root, body);
      current = {
        status: "running",
        taskId: resolved.id,
        startedAt: new Date().toISOString(),
        error: null,
        result: null,
      };
      runLoop({ taskDir: resolved.dir, root })
        .then((result) => {
          current = {
            ...current,
            status: "done",
            result: {
              ok: Boolean(result?.ok),
              iterations: result?.iterations ?? 0,
              runDir: result?.runDir ?? "",
            },
          };
        })
        .catch((err) => {
          current = {
            ...current,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
          };
        });
      return publicJob(current);
    },
  };
}
