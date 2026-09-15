import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { runCursorTurn } from "./cursor.js";
import { runCommand } from "./exec.js";
import { commitIteration, initSnapshot, resetHard } from "./git.js";
import { freezeAcceptance, loadTask, readFrozenAcceptance } from "./task.js";
import { experimentRoot } from "./paths.js";
import { saveRunRecord } from "./records.js";
import { smoke } from "./smoke.js";
import { listTree } from "./tree.js";
import { exportSite } from "./export-site.js";

function runId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function loadSystemPrompt(root) {
  return readFile(join(root, "prompts/system.md"), "utf8");
}

export async function buildTurnPrompt({ root, task, frozen, iteration, notes }) {
  const files = await listTree(root);
  return [
    await loadSystemPrompt(root),
    `目标：${task.goal}`,
    `冻结验收（勿改这份命令，用它验收）：${frozen}`,
    `轮次：${iteration}/${task.maxIterations}`,
    `文件：\n${files.join("\n")}`,
    notes.length ? `上一轮：\n${notes.at(-1)}` : "上一轮：（无）",
    "不要再启动 `src/cli.js run`，也不要改 state 里的冻结验收。只改本实验目录。",
  ].join("\n\n");
}

async function archiveRun(root, record) {
  try {
    await saveRunRecord(root, record);
    await exportSite(root);
  } catch {
    /* archive is best-effort so a full disk does not fail the run */
  }
}

export async function runLoop({
  taskDir,
  root = experimentRoot(),
  runTurn = runCursorTurn,
} = {}) {
  const task = await loadTask(taskDir);
  const id = runId();
  const runDir = join(root, "state", id);
  await mkdir(join(runDir, "iters"), { recursive: true });
  await freezeAcceptance(runDir, task.acceptance);
  let lastGood = await initSnapshot(root, runDir);
  const notes = [];
  let result = { ok: false, runDir, iterations: task.maxIterations };

  for (let i = 1; i <= task.maxIterations; i += 1) {
    if (i > 1 && task.intervalSeconds > 0) {
      await sleep(task.intervalSeconds * 1000);
    }
    const frozen = await readFrozenAcceptance(runDir);
    const prompt = await buildTurnPrompt({
      root,
      task,
      frozen,
      iteration: i,
      notes,
    });
    let modelNote = "";
    try {
      const turn = await runTurn({ root, prompt });
      modelNote = [turn.stdout, turn.stderr].filter(Boolean).join("\n");
      if (!turn.ok) modelNote = `Cursor CLI 失败 exit ${turn.code}\n${modelNote}`;
    } catch (err) {
      modelNote = `Cursor CLI 异常：${err.message}`;
    }

    await commitIteration(root, runDir, i);
    const smoked = await smoke(root);
    if (!smoked.ok) {
      await resetHard(root, runDir, lastGood);
      const log = `冒烟失败，已回滚 ${lastGood.slice(0, 7)}\n${smoked.detail}\n${modelNote}`;
      notes.push(log);
      await writeFile(join(runDir, "iters", `${i}.md`), log, "utf8");
      continue;
    }
    lastGood = await commitIteration(root, runDir, `${i}-good`);
    const accepted = await runCommand(frozen, { cwd: root });
    const log = [modelNote, `验收 exit ${accepted.code}`, accepted.stdout, accepted.stderr]
      .filter(Boolean)
      .join("\n");
    await writeFile(join(runDir, "iters", `${i}.md`), log, "utf8");
    notes.push(log);
    if (accepted.ok) {
      result = { ok: true, runDir, iterations: i };
      break;
    }
  }

  await archiveRun(root, {
    id,
    taskId: basename(taskDir),
    goal: task.goal,
    ok: result.ok,
    iterations: result.iterations,
    acceptance: task.acceptance,
    summary: notes.at(-1) ?? "",
  });
  return result;
}
