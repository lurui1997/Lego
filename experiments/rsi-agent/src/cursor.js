import { spawn } from "node:child_process";

export function cursorBin() {
  return process.env.RSI_CURSOR_BIN || "agent";
}

export function cursorArgs({ workspace, prompt, model }) {
  const args = [
    "--print",
    "--trust",
    "--force",
    "--sandbox",
    "disabled",
    "--workspace",
    workspace,
    "--output-format",
    "text",
  ];
  if (model) args.push("--model", model);
  args.push(prompt);
  return args;
}

export function runCursorTurn({
  root,
  prompt,
  bin = cursorBin(),
  model = process.env.RSI_MODEL || "",
  timeout = Number(process.env.RSI_CURSOR_TIMEOUT_MS || 600_000),
  spawnImpl = spawn,
} = {}) {
  return new Promise((resolve) => {
    const args = cursorArgs({ workspace: root, prompt, model });
    const child = spawnImpl(bin, args, { cwd: root });
    let stdout = "";
    let stderr = "";
    const finish = (result) => {
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill?.("SIGTERM");
      finish({ ok: false, code: 1, stdout, stderr: `${stderr}\ntimeout ${timeout}ms` });
    }, timeout);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      finish({ ok: false, code: 1, stdout, stderr: err.message });
    });
    child.on("close", (code) => {
      finish({ ok: code === 0, code: code ?? 1, stdout, stderr });
    });
  });
}
