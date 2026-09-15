import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLoop } from "./loop.js";

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    return { help: true };
  }
  if (argv[0] === "run" && argv[1]) {
    return { help: false, taskDir: resolve(argv[1]) };
  }
  throw new Error("用法：node src/cli.js run <task-dir>");
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write("用法：node src/cli.js run <task-dir>\n每轮调用本机 agent（Cursor CLI）--print --trust --force。\n");
    return;
  }
  const result = await runLoop({ taskDir: args.taskDir });
  process.stdout.write(
    `${result.ok ? "通过" : "未通过"} ${result.iterations} 轮 → ${result.runDir}\n`,
  );
  if (!result.ok) process.exitCode = 1;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
