import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ponytail: no chroot — only cwd is pinned; a `cd /` inside the string still escapes.
export async function runCommand(command, { cwd, timeout = 60_000 } = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 2_000_000,
    });
    return { ok: true, code: 0, stdout, stderr };
  } catch (err) {
    return {
      ok: false,
      code: typeof err.code === "number" ? err.code : 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? String(err.message ?? err),
    };
  }
}
