import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { acceptanceFile } from "./paths.js";

export async function loadTask(taskDir) {
  const raw = await readFile(resolve(taskDir, "task.json"), "utf8");
  const task = JSON.parse(raw);
  if (!task.goal || !task.acceptance) {
    throw new Error("task.json 需要 goal 和 acceptance");
  }
  return {
    goal: String(task.goal),
    acceptance: String(task.acceptance),
    maxIterations: Number(task.max_iterations ?? 5),
    intervalSeconds: Number(task.interval_seconds ?? 0),
  };
}

export async function freezeAcceptance(runDir, acceptance) {
  await mkdir(runDir, { recursive: true });
  const dest = acceptanceFile(runDir);
  await writeFile(dest, acceptance, "utf8");
  return dest;
}

export async function readFrozenAcceptance(runDir) {
  return (await readFile(acceptanceFile(runDir), "utf8")).trim();
}
