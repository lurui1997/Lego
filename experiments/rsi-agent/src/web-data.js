import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { loadArchivedRuns } from "./records.js";

export async function loadTasks(root) {
  const dir = join(root, "tasks");
  let names = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const tasks = [];
  for (const name of names.sort()) {
    try {
      const raw = await readFile(join(dir, name, "task.json"), "utf8");
      const task = JSON.parse(raw);
      if (!task.goal || !task.acceptance) continue;
      tasks.push({
        id: name,
        goal: String(task.goal),
        acceptance: String(task.acceptance),
        maxIterations: Number(task.max_iterations ?? 5),
        intervalSeconds: Number(task.interval_seconds ?? 0),
      });
    } catch {
      /* skip incomplete task dirs */
    }
  }
  return tasks;
}

export async function loadLiveStateRuns(root) {
  const dir = join(root, "state");
  let names = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const runs = [];
  for (const id of names) {
    const runDir = join(dir, id);
    try {
      const info = await stat(runDir);
      if (!info.isDirectory()) continue;
      let acceptance = "";
      try {
        acceptance = (await readFile(join(runDir, "acceptance.txt"), "utf8")).trim();
      } catch {
        acceptance = "";
      }
      let iterationFiles = [];
      try {
        iterationFiles = (await readdir(join(runDir, "iters"))).filter((f) => f.endsWith(".md"));
      } catch {
        iterationFiles = [];
      }
      runs.push({
        id,
        acceptance,
        iterations: iterationFiles.length,
      });
    } catch {
      /* skip */
    }
  }
  return runs;
}

export async function loadRuns(root) {
  const [archived, live] = await Promise.all([loadArchivedRuns(root), loadLiveStateRuns(root)]);
  const map = new Map();
  for (const row of live) map.set(row.id, row);
  for (const row of archived) {
    const prev = map.get(row.id) ?? {};
    map.set(row.id, { ...prev, ...row });
  }
  return [...map.values()].sort((a, b) => String(b.id).localeCompare(String(a.id))).slice(0, 12);
}

export async function loadSitePayload(root) {
  const [tasks, runs] = await Promise.all([loadTasks(root), loadRuns(root)]);
  return { tasks, runs };
}
