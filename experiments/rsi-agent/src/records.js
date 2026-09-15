import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_RUNS = 50;
const SUMMARY_CAP = 4_000;

export function recordsFile(root) {
  return join(root, "web", "data", "runs.json");
}

export async function loadArchivedRuns(root) {
  try {
    const raw = JSON.parse(await readFile(recordsFile(root), "utf8"));
    const list = Array.isArray(raw?.runs) ? raw.runs : Array.isArray(raw) ? raw : [];
    return list.filter((row) => row && row.id);
  } catch {
    return [];
  }
}

export function normalizeRecord(record) {
  return {
    id: String(record.id),
    taskId: String(record.taskId ?? ""),
    goal: String(record.goal ?? ""),
    ok: Boolean(record.ok),
    iterations: Number(record.iterations ?? 0),
    acceptance: String(record.acceptance ?? ""),
    endedAt: String(record.endedAt ?? new Date().toISOString()),
    summary: String(record.summary ?? "").slice(0, SUMMARY_CAP),
  };
}

export async function saveRunRecord(root, record) {
  const next = normalizeRecord(record);
  const runs = await loadArchivedRuns(root);
  const merged = [next, ...runs.filter((row) => row.id !== next.id)].slice(0, MAX_RUNS);
  await mkdir(join(root, "web", "data"), { recursive: true });
  await writeFile(recordsFile(root), `${JSON.stringify({ runs: merged }, null, 2)}\n`, "utf8");
  return next;
}
