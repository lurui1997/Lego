import { join } from "node:path";
import { runCommand } from "./exec.js";

export async function smoke(root) {
  const check = await runCommand("node --check src/cli.js", { cwd: root });
  if (!check.ok) {
    return { ok: false, detail: check.stderr || check.stdout };
  }
  const help = await runCommand("node src/cli.js --help", { cwd: root });
  if (!help.ok) {
    return { ok: false, detail: help.stderr || help.stdout };
  }
  return { ok: true, detail: join(root, "src/cli.js") };
}
