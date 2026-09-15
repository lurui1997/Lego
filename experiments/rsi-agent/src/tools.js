import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import { runCommand } from "./exec.js";
import { assertWritable, resolveInside } from "./paths.js";

const READ_CAP = 1_000_000;

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "read",
      description: "Read a UTF-8 file inside the experiment root.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write",
      description: "Write a UTF-8 file inside the experiment root. Cannot overwrite frozen acceptance.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "shell",
      description: "Run a command with cwd locked to the experiment root.",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
];

export function createTools({ root, runDir }) {
  return async function execTool(name, args) {
    switch (name) {
      case "read": {
        const abs = resolveInside(root, args.path);
        const text = await readFile(abs, "utf8");
        return text.length > READ_CAP ? text.slice(0, READ_CAP) + "\n…truncated" : text;
      }
      case "write": {
        const abs = resolveInside(root, args.path);
        assertWritable(root, runDir, abs);
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, args.content, "utf8");
        return `wrote ${relative(root, abs)}`;
      }
      case "shell": {
        const result = await runCommand(String(args.command ?? ""), { cwd: root });
        const out = [result.stdout, result.stderr].filter(Boolean).join("\n");
        return `exit ${result.code}\n${out}`.slice(0, READ_CAP);
      }
      default:
        return `unknown tool: ${name}`;
    }
  };
}
