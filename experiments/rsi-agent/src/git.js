import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function snapshotEnv(root, runDir) {
  return {
    GIT_DIR: join(runDir, "snapshot.git"),
    GIT_WORK_TREE: root,
    GIT_AUTHOR_NAME: "rsi-agent",
    GIT_AUTHOR_EMAIL: "rsi-agent@local",
    GIT_COMMITTER_NAME: "rsi-agent",
    GIT_COMMITTER_EMAIL: "rsi-agent@local",
  };
}

export async function git(root, runDir, args) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      env: { ...process.env, ...snapshotEnv(root, runDir) },
    });
    return stdout.trim();
  } catch (err) {
    const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join("\n");
    throw new Error(detail);
  }
}

export async function initSnapshot(root, runDir) {
  await mkdir(runDir, { recursive: true });
  await git(root, runDir, ["init"]);
  await git(root, runDir, ["config", "user.name", "rsi-agent"]);
  await git(root, runDir, ["config", "user.email", "rsi-agent@local"]);
  await writeFile(join(runDir, "snapshot.git", "info", "exclude"), "state/\n", "utf8");
  await git(root, runDir, ["add", "-A"]);
  await git(root, runDir, ["commit", "-m", "rsi baseline", "--allow-empty"]);
  return git(root, runDir, ["rev-parse", "HEAD"]);
}

export async function commitIteration(root, runDir, n) {
  await git(root, runDir, ["add", "-A"]);
  try {
    await git(root, runDir, ["commit", "-m", `rsi iteration ${n}`]);
  } catch (err) {
    if (!/nothing to commit/.test(err.message)) throw err;
  }
  return git(root, runDir, ["rev-parse", "HEAD"]);
}

export async function resetHard(root, runDir, sha) {
  await git(root, runDir, ["reset", "--hard", sha]);
}
